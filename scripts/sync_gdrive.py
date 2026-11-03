#!/usr/bin/env python3
"""Import direct Drive PDF/EPUB files into the Readersity Supabase library.

Subfolders are skipped unless explicitly requested. EPUB covers are extracted;
PDF covers are rendered from page one. Both are stored in Supabase Storage.
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from ebooklib import epub
from PIL import Image
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DRIVE_KEY_FILE = Path(os.getenv("GDRIVE_SERVICE_ACCOUNT_FILE", "gdrive_key.json"))
if not DRIVE_KEY_FILE.is_absolute():
    DRIVE_KEY_FILE = ROOT / DRIVE_KEY_FILE
DRIVE_ROOT_ID = os.getenv("GDRIVE_ROOT_FOLDER_ID", "").strip()
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL", "")).rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
BUCKET = os.getenv("SUPABASE_LIBRARY_BUCKET", "library-files").strip()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("readersity-sync")

MIME_TYPES = {
    ".pdf": "application/pdf",
    ".epub": "application/epub+zip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
SLUG_RE = re.compile(r"[^a-z0-9]+")


class SyncError(RuntimeError):
    pass


def api_request(
    method: str,
    path: str,
    *,
    body: Any = None,
    raw_body: bytes | None = None,
    content_type: str = "application/json",
    extra_headers: dict[str, str] | None = None,
    allow_status: tuple[int, ...] = (),
) -> tuple[int, Any]:
    """Call Supabase REST or Storage using the sync-only service key."""
    payload = raw_body if raw_body is not None else (
        json.dumps(body).encode("utf-8") if body is not None else None
    )
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    if payload is not None:
        headers["Content-Type"] = content_type
    if extra_headers:
        headers.update(extra_headers)

    request = Request(f"{SUPABASE_URL}{path}", data=payload, headers=headers, method=method)
    try:
        with urlopen(request, timeout=90) as response:
            data = response.read()
            status = response.status
    except HTTPError as exc:
        data = exc.read()
        status = exc.code
        if status not in allow_status:
            message = data.decode("utf-8", errors="replace")[:600]
            raise SyncError(f"Supabase returned HTTP {status}: {message}") from exc
    except URLError as exc:
        raise SyncError(f"Could not reach Supabase: {exc.reason}") from exc

    if not data:
        return status, None
    try:
        return status, json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return status, data


def ensure_public_bucket() -> None:
    path = f"/storage/v1/bucket/{quote(BUCKET, safe='')}"
    # Supabase Storage may return a JSON 404 payload with HTTP 400 for a
    # missing bucket, so accept both statuses and inspect the response body.
    status, bucket = api_request("GET", path, allow_status=(400, 404))
    missing = status == 404 or (
        status == 400
        and isinstance(bucket, dict)
        and (
            bucket.get("code") == "NoSuchBucket"
            or str(bucket.get("statusCode", "")) == "404"
        )
    )
    if missing:
        api_request(
            "POST",
            "/storage/v1/bucket",
            body={
                "id": BUCKET,
                "name": BUCKET,
                "public": True,
                "allowed_mime_types": sorted(set(MIME_TYPES.values())),
            },
        )
        log.info("Created public Storage bucket %s", BUCKET)
    elif status != 200 or not isinstance(bucket, dict):
        raise SyncError(f"Unexpected response checking Storage bucket '{BUCKET}': {bucket}")
    elif not bucket.get("public"):
        raise SyncError(
            f"Storage bucket '{BUCKET}' already exists but is not public. "
            "Since this app has no sign-ins, make it public in Supabase Storage settings."
        )


def drive_client():
    credentials = service_account.Credentials.from_service_account_file(
        str(DRIVE_KEY_FILE), scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


def list_children(drive, parent_id: str, folders: bool) -> list[dict[str, Any]]:
    query = f"'{parent_id}' in parents and trashed=false"
    if folders:
        query += " and mimeType='application/vnd.google-apps.folder'"
    else:
        query += " and mimeType!='application/vnd.google-apps.folder'"

    result: list[dict[str, Any]] = []
    token = None
    while True:
        response = drive.files().list(
            q=query,
            fields="nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum)",
            pageSize=100,
            pageToken=token,
            corpora="allDrives",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        ).execute()
        result.extend(response.get("files", []))
        token = response.get("nextPageToken")
        if not token:
            return result


def eligible_format(file: dict[str, Any]) -> str | None:
    extension = Path(file.get("name", "")).suffix.lower()
    mime_type = file.get("mimeType", "")
    if extension == ".pdf" or mime_type == "application/pdf":
        return "pdf"
    if extension == ".epub" or mime_type == "application/epub+zip":
        return "epub"
    return None


def is_excluded_document(file: dict[str, Any]) -> bool:
    """Exclude items explicitly attributed to Anna's Archive."""
    name = file.get("name", "").casefold()
    normalized = re.sub(r"[^a-z0-9]+", " ", name).strip()
    compact = normalized.replace(" ", "")
    return "anna s archive" in normalized or "annasarchive" in compact


def is_over_size_limit(file: dict[str, Any]) -> bool:
    try:
        return int(file.get("size", 0)) >= MAX_FILE_SIZE_BYTES
    except (TypeError, ValueError):
        return False


def filter_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    excluded = [item for item in documents if is_excluded_document(item)]
    for item in excluded:
        log.info("Skipping excluded source: %s", item.get("name", item.get("id")))
    if excluded:
        log.info("Excluded %d Anna's Archive document(s)", len(excluded))
    oversized = [item for item in documents if not is_excluded_document(item) and is_over_size_limit(item)]
    for item in oversized:
        size_mb = int(item.get("size", 0)) / (1024 * 1024)
        log.info("Skipping file over 5 MiB (%.2f MiB): %s", size_mb, item.get("name", item.get("id")))
    if oversized:
        log.info("Skipped %d file(s) at or above 5 MiB", len(oversized))
    return [item for item in documents if not is_excluded_document(item) and not is_over_size_limit(item)]


def download_drive_file(drive, file_id: str) -> bytes:
    request = drive.files().get_media(fileId=file_id, supportsAllDrives=True)
    stream = io.BytesIO()
    downloader = MediaIoBaseDownload(stream, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return stream.getvalue()


def metadata_text(values: list[Any] | None) -> list[str]:
    result = []
    for value in values or []:
        text = value[0] if isinstance(value, tuple) and value else value
        cleaned = str(text or "").strip()
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def parse_epub(data: bytes) -> dict[str, Any]:
    from ebooklib import ITEM_IMAGE

    with tempfile.NamedTemporaryFile(suffix=".epub") as temporary:
        temporary.write(data)
        temporary.flush()
        book = epub.read_epub(temporary.name)

    title = metadata_text(book.get_metadata("DC", "title"))
    authors = metadata_text(book.get_metadata("DC", "creator"))
    languages = metadata_text(book.get_metadata("DC", "language"))
    descriptions = metadata_text(book.get_metadata("DC", "description"))
    subjects = metadata_text(book.get_metadata("DC", "subject"))
    description = ""
    if descriptions:
        from bs4 import BeautifulSoup

        description = " ".join(BeautifulSoup(descriptions[0], "html.parser").get_text(" ", strip=True).split())[:2000]

    cover_bytes = None
    cover_mime = None
    try:
        image_items = list(book.get_items_of_type(ITEM_IMAGE))
        image_items.sort(
            key=lambda item: int("cover" in (item.get_name() or "").lower() or "cover" in (item.id or "").lower()),
            reverse=True,
        )
        if image_items:
            cover_bytes = image_items[0].get_content()
            cover_mime = image_items[0].get_media_type()
    except Exception as exc:  # malformed/missing cover should not block the book
        log.debug("Could not extract EPUB cover: %s", exc)

    return {
        "title": title[0] if title else "",
        "authors": authors,
        "language": languages[0] if languages else "en",
        "description": description,
        "subjects": subjects,
        "cover_bytes": cover_bytes,
        "cover_mime": cover_mime,
    }


def parse_pdf(data: bytes) -> dict[str, str]:
    from pypdf import PdfReader

    try:
        metadata = PdfReader(io.BytesIO(data), strict=False).metadata
    except Exception as exc:
        log.debug("Could not read PDF metadata: %s", exc)
        return {}
    if not metadata:
        return {}
    return {
        "title": str(metadata.title or "").strip(),
        "author": str(metadata.author or "").strip(),
    }


def render_pdf_first_page_cover(data: bytes) -> bytes | None:
    """Render a small JPEG cover from the first page of a PDF."""
    document = page = bitmap = image = None
    try:
        document = pdfium.PdfDocument(data)
        if len(document) == 0:
            return None
        page = document[0]
        width, height = page.get_size()
        if width <= 0 or height <= 0:
            return None

        scale = min(2.0, 900 / max(width, height))
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil().convert("RGB")
        image.thumbnail((640, 960), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=82, optimize=True)
        return output.getvalue()
    except Exception as exc:  # malformed, encrypted, or unsupported PDFs still sync
        log.warning("Could not render first-page cover: %s", exc)
        return None
    finally:
        if image is not None:
            image.close()
        if bitmap is not None:
            bitmap.close()
        if page is not None:
            page.close()
        if document is not None:
            document.close()


def slugify(value: str) -> str:
    slug = re.sub(r"-{2,}", "-", SLUG_RE.sub("-", value.lower()).strip("-"))
    return slug or "untitled"


def normalize_timestamp(value: str | None) -> str | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()


def upload_object(path: str, data: bytes, mime_type: str) -> None:
    encoded_path = quote(path, safe="/")
    api_request(
        "POST",
        f"/storage/v1/object/{quote(BUCKET, safe='')}/{encoded_path}",
        raw_body=data,
        content_type=mime_type,
        extra_headers={"x-upsert": "true", "cache-control": "3600"},
    )


def upsert_row(table: str, conflict_column: str, row: dict[str, Any]) -> dict[str, Any]:
    query = quote(conflict_column, safe="")
    _, response = api_request(
        "POST",
        f"/rest/v1/{table}?on_conflict={query}",
        body=row,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if not isinstance(response, list) or not response:
        raise SyncError(f"Supabase did not return the upserted {table} row")
    return response[0]


def rows_for_book(book_id: str) -> list[dict[str, Any]]:
    query = quote(
        f"select=id,gdrive_file_id,storage_path,drive_modified_at&book_id=eq.{book_id}", safe="=,&.-_"
    )
    _, response = api_request("GET", f"/rest/v1/library_files?{query}")
    return response if isinstance(response, list) else []


def existing_book_rating(source_key: str) -> float | None:
    query = quote(f"select=rating&source_key=eq.{source_key}", safe="=,&.-_")
    _, response = api_request("GET", f"/rest/v1/library_books?{query}")
    return response[0].get("rating") if isinstance(response, list) and response else None


def mark_file_unavailable(file_row: dict[str, Any]) -> None:
    path = quote(file_row["storage_path"], safe="/")
    api_request(
        "DELETE",
        f"/storage/v1/object/{quote(BUCKET, safe='')}",
        body={"prefixes": [file_row["storage_path"]]},
        allow_status=(404,),
    )
    row_id = quote(file_row["id"], safe="-")
    api_request(
        "PATCH",
        f"/rest/v1/library_files?id=eq.{row_id}",
        body={"is_available": False, "updated_at": datetime.now(timezone.utc).isoformat()},
        extra_headers={"Prefer": "return=minimal"},
    )
    log.info("Removed Drive file from catalog: %s", path)


def mime_for_cover(mime: str | None) -> tuple[str, str] | None:
    mapping = {
        "image/jpeg": ("jpg", "image/jpeg"),
        "image/png": ("png", "image/png"),
        "image/webp": ("webp", "image/webp"),
    }
    return mapping.get(mime or "")


def collect_documents(
    drive, folder_id: str, *, recursive: bool = False, visited: set[str] | None = None
) -> list[dict[str, Any]]:
    """Collect direct PDFs/EPUBs; descend only when explicitly requested."""
    visited = visited if visited is not None else set()
    if folder_id in visited:
        return []
    visited.add(folder_id)

    documents = [item for item in list_children(drive, folder_id, folders=False) if eligible_format(item)]
    if recursive:
        for child in list_children(drive, folder_id, folders=True):
            documents.extend(collect_documents(drive, child["id"], recursive=True, visited=visited))
    return documents


def process_document(drive, item: dict[str, Any]) -> bool:
    file_id = item["id"]
    file_format = eligible_format(item)
    if not file_format:
        return False
    extension = ".epub" if file_format == "epub" else ".pdf"
    mime_type = MIME_TYPES[extension]
    data = download_drive_file(drive, file_id)
    if len(data) >= MAX_FILE_SIZE_BYTES:
        log.info("Skipping file at or above 5 MiB after download: %s", item.get("name", file_id))
        return False

    if file_format == "epub":
        metadata = parse_epub(data)
        title = metadata.get("title") or Path(item.get("name", "Untitled")).stem
        authors = metadata.get("authors") or []
        description = metadata.get("description") or ""
        language = metadata.get("language") or "en"
        cover_bytes = metadata.get("cover_bytes")
        cover_info = mime_for_cover(metadata.get("cover_mime"))
    else:
        metadata = parse_pdf(data)
        title = metadata.get("title") or Path(item.get("name", "Untitled")).stem.replace("_", " ")
        authors = [metadata["author"]] if metadata.get("author") else []
        description = ""
        language = "en"
        cover_bytes = render_pdf_first_page_cover(data)
        cover_info = ("jpg", "image/jpeg") if cover_bytes else None

    title = " ".join(str(title).split()) or "Untitled document"
    slug = f"{slugify(title)[:64]}-{file_id[:8].lower()}"
    cover_path = None
    if cover_bytes and cover_info:
        cover_extension, cover_mime = cover_info
        cover_path = f"covers/{file_id}.{cover_extension}"
        upload_object(cover_path, cover_bytes, cover_mime)
        log.info("Uploaded cover image for %s", title)

    saved_rating = existing_book_rating(file_id)
    modified_at = normalize_timestamp(item.get("modifiedTime"))
    book_row = upsert_row(
        "library_books",
        "source_key",
        {
            "source_key": file_id,
            "slug": slug,
            "title": title,
            "authors": authors,
            "description": description,
            "language": language,
            "cover_path": cover_path,
            "cover_mime_type": cover_info[1] if cover_info else None,
            "rating": saved_rating,
            "is_published": True,
            "drive_modified_at": modified_at,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    book_id = book_row["id"]
    storage_path = f"books/{file_id}{extension}"
    previous_rows = rows_for_book(book_id)
    previous = next((row for row in previous_rows if row["gdrive_file_id"] == file_id), None)
    if not previous or normalize_timestamp(previous.get("drive_modified_at")) != modified_at:
        upload_object(storage_path, data, mime_type)

    upsert_row(
        "library_files",
        "gdrive_file_id",
        {
            "book_id": book_id,
            "gdrive_file_id": file_id,
            "file_name": item.get("name") or f"{slug}{extension}",
            "format": file_format,
            "storage_path": storage_path,
            "mime_type": mime_type,
            "file_size_bytes": len(data),
            "drive_modified_at": modified_at,
            "is_available": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    log.info("Published %s (%s)", title, file_format.upper())
    return True


def inventory_folder(drive, folder: dict[str, Any], depth: int = 0, visited: set[str] | None = None) -> tuple[int, int, int]:
    """Read-only folder summary to validate the Drive layout before import."""
    visited = visited if visited is not None else set()
    folder_id = folder["id"]
    if folder_id in visited or depth > 12:
        return 0, 0, 0
    visited.add(folder_id)

    subfolders = list_children(drive, folder_id, folders=True)
    files = list_children(drive, folder_id, folders=False)
    pdf_count = sum(eligible_format(item) == "pdf" for item in files)
    epub_count = sum(eligible_format(item) == "epub" for item in files)
    log.info("%s%s — %d PDF, %d EPUB, %d subfolder(s)", "  " * depth, folder.get("name", "(unnamed)"), pdf_count, epub_count, len(subfolders))

    totals = (pdf_count, epub_count, 1)
    for child in subfolders:
        child_totals = inventory_folder(drive, child, depth + 1, visited)
        totals = tuple(a + b for a, b in zip(totals, child_totals))
    return totals


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync PDF/EPUB books from Google Drive to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Scan Drive and report without writing")
    parser.add_argument("--inventory", action="store_true", help="Summarize Drive folders recursively without downloading or writing")
    parser.add_argument("--include-subfolders", action="store_true", help="Also scan nested folders; by default only the configured root is scanned")
    parser.add_argument("--only", help="Process one Drive book-folder ID")
    args = parser.parse_args()

    if not DRIVE_KEY_FILE.is_file():
        log.error("Google service-account file not found at the configured path")
        return 1
    if not DRIVE_ROOT_ID and not args.only:
        log.error("GDRIVE_ROOT_FOLDER_ID is not set")
        return 1
    if not (args.dry_run or args.inventory) and (not SUPABASE_URL or not SUPABASE_SERVICE_KEY):
        log.error("Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local .env")
        return 1

    try:
        drive = drive_client()
        if args.inventory:
            if args.only:
                folder = drive.files().get(fileId=args.only, fields="id,name,mimeType,size,modifiedTime", supportsAllDrives=True).execute()
                folders = [folder]
            else:
                folders = list_children(drive, DRIVE_ROOT_ID, folders=True)
            totals = (0, 0, 0)
            visited: set[str] = set()
            for folder in folders:
                part = inventory_folder(drive, folder, visited=visited)
                totals = tuple(a + b for a, b in zip(totals, part))
            log.info("Inventory total: %d PDF, %d EPUB across %d folder(s)", *totals)
            return 0

        if args.dry_run:
            if args.only:
                folder = drive.files().get(fileId=args.only, fields="id,name,mimeType,size,modifiedTime", supportsAllDrives=True).execute()
                documents = [folder] if eligible_format(folder) else collect_documents(drive, folder["id"], recursive=args.include_subfolders)
            else:
                documents = collect_documents(drive, DRIVE_ROOT_ID, recursive=args.include_subfolders)
            documents = filter_documents(documents)
            pdf_count = sum(eligible_format(item) == "pdf" for item in documents)
            epub_count = sum(eligible_format(item) == "epub" for item in documents)
            log.info("Dry run complete: %d documents (%d PDF, %d EPUB)", len(documents), pdf_count, epub_count)
            for item in documents[:20]:
                log.info("  %s (%s)", item.get("name"), eligible_format(item).upper())
            if len(documents) > 20:
                log.info("  ...and %d more document(s)", len(documents) - 20)
            return 0

        ensure_public_bucket()
        if args.only:
            folder = drive.files().get(fileId=args.only, fields="id,name,mimeType,size,modifiedTime", supportsAllDrives=True).execute()
            documents = [folder] if eligible_format(folder) else collect_documents(drive, folder["id"], recursive=args.include_subfolders)
        else:
            documents = collect_documents(drive, DRIVE_ROOT_ID, recursive=args.include_subfolders)
        documents = filter_documents(documents)

        errors = 0
        skipped = 0
        for item in documents:
            try:
                if not process_document(drive, item):
                    skipped += 1
            except Exception:
                errors += 1
                log.exception("Failed to sync document %s", item.get("name", item.get("id")))
        log.info("Sync complete: %d documents scanned, %d skipped, %d failed", len(documents), skipped, errors)
        return 2 if errors else 0
    except Exception:
        log.exception("Sync failed")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

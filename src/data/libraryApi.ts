import {Book, BookFile} from './books';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const bucket = process.env.EXPO_PUBLIC_SUPABASE_LIBRARY_BUCKET || 'library-files';

type LibraryFileRow = {
  id: string;
  format: 'pdf' | 'epub';
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
};

type LibraryBookRow = {
  id: string;
  title: string;
  authors: string[] | null;
  description: string | null;
  language: string | null;
  cover_path: string | null;
  rating: number | string | null;
  library_files: LibraryFileRow[] | null;
};

export const isLibraryConfigured = Boolean(supabaseUrl && supabaseKey);
export const LIBRARY_PAGE_SIZE = 20;

function publicStorageUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function requestLibraryBooks(filters: Record<string, string>): Promise<Book[]> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to connect the library.');
  }

  const query = new URLSearchParams({
    select: 'id,title,authors,description,language,cover_path,rating,library_files(id,format,file_name,storage_path,mime_type,file_size_bytes)',
    is_published: 'eq.true',
    'library_files.is_available': 'eq.true',
    ...filters,
  }).toString();

  const response = await fetch(`${supabaseUrl}/rest/v1/library_books?${query}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Library request failed (${response.status}): ${detail}`);
  }

  const rows = await response.json() as LibraryBookRow[];
  return rows.map(row => {
    const files: BookFile[] = (row.library_files || []).map(file => ({
      id: file.id,
      format: file.format,
      fileName: file.file_name,
      publicUrl: publicStorageUrl(file.storage_path),
      mimeType: file.mime_type,
      fileSizeBytes: file.file_size_bytes,
    }));
    const rating = row.rating == null ? undefined : String(row.rating);
    return {
      id: row.id,
      title: row.title,
      author: row.authors?.length ? row.authors.join(', ') : 'Unknown author',
      cover: row.cover_path ? {uri: publicStorageUrl(row.cover_path)} : undefined,
      summary: row.description || '',
      rating,
      files,
    };
  });
}

export async function fetchLibraryPage(offset: number): Promise<{books: Book[]; hasMore: boolean}> {
  const rows = await requestLibraryBooks({
    order: 'title.asc',
    limit: String(LIBRARY_PAGE_SIZE),
    offset: String(offset),
  });
  return {books: rows, hasMore: rows.length === LIBRARY_PAGE_SIZE};
}

export function fetchTopRatedBooks(): Promise<Book[]> {
  return requestLibraryBooks({order: 'rating.desc.nullslast,title.asc', limit: '5'});
}

export async function fetchBookOfTheMonth(): Promise<Book | undefined> {
  const results = await requestLibraryBooks({title: 'ilike.*The Power of Focus*', limit: '1'});
  return results[0];
}

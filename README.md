# Readersity React Native

An Expo/React Native implementation of the supplied Figma flow: Splash, Home, Search, Shelf, and Book Details. App state coordinates the screens, search, selected book, and shelf; no navigation library is required.

## Project structure

```text
App.tsx                 Screen selection and shared app state
src/
  components/            Shared headers, book rows, search field, and tab bar
  data/books.ts          Book types, local fallback catalog, and image assets
  data/libraryApi.ts     Public catalog fetch and Storage URL mapping
  screens/               Splash, Home, Search, Shelf, and Book Details screens
  theme/colors.ts         Shared colors and typography
supabase/migrations/      Public-read library schema and row policies
scripts/sync_gdrive.py    Admin-side Drive to Supabase import
sync/requirements.txt     Python sync dependencies
```

## Run

```bash
npm install
npx expo start
```

The Expo config enables React Native's New Architecture (`newArchEnabled: true`).

## Supabase document library

The app reads published book metadata from Supabase and opens the selected PDF/EPUB with the device's default handler. The catalog is public-read because the app has no sign-in. The `library-files` Storage bucket is public, so anyone with a file URL can open it. The app only contains the publishable/anon key; uploads use a service-role key in the local sync process.

1. Apply `supabase/migrations/20261103000000_create_public_library.sql` in the Supabase SQL Editor.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in the local `.env`. The key must be the publishable key (or legacy anon key), never a service-role/secret key.
3. By default the sync scans only PDF/EPUB files directly inside the configured Drive root; it skips all subfolders. Files at or above 5 MiB and filenames attributed to Anna's Archive are skipped. Each included file becomes a catalog entry. EPUB covers are extracted and PDF covers are rendered from page one; cover images are uploaded to Supabase Storage. Add `--include-subfolders` only if you later want nested folders included. The Drive folder can remain private; share it with the read-only Google service account used by the sync.
4. Set `SUPABASE_SERVICE_ROLE_KEY` in the local `.env`. Keep it out of the app and Git. The sync script creates the public `library-files` bucket on its first run.
5. Install sync dependencies with `python -m pip install -r sync/requirements.txt`, then preview and run:

   ```bash
   python scripts/sync_gdrive.py --dry-run
   python scripts/sync_gdrive.py
   ```

The app falls back to its bundled sample catalog if the Supabase environment values are missing or the catalog request fails. It fetches 20 catalog books at a time; Search loads more as you scroll, and advances through pages automatically when a search has no match in the books already loaded. The home page's Explore section intentionally shows five books; Search can reach the full catalog. After changing Expo environment values, restart Expo so they are picked up.

## Asset handoff

The app's design images are exported from the [Readersity Figma file](https://www.figma.com/design/fSgaAS5LGgpeyrz4OClaT3/Readersity) and stored in `assets/`. The starter shelf covers are from the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers). `src/data/books.ts` maps the local files into the app, so runtime image loading does not depend on remote image URLs.


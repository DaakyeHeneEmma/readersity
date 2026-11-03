create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  slug text not null unique,
  title text not null,
  authors text[] not null default '{}',
  description text not null default '',
  language text not null default 'en',
  cover_path text,
  cover_mime_type text,
  rating numeric(2, 1),
  is_published boolean not null default true,
  drive_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.library_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books(id) on delete cascade,
  gdrive_file_id text not null unique,
  file_name text not null,
  format text not null check (format in ('pdf', 'epub')),
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  drive_modified_at timestamptz,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_books_published_title_idx
  on public.library_books (is_published, title);
create index if not exists library_files_book_available_idx
  on public.library_files (book_id, is_available);

alter table public.library_books enable row level security;
alter table public.library_files enable row level security;

grant select on public.library_books, public.library_files to anon, authenticated;

drop policy if exists "Anyone can read published library books" on public.library_books;
create policy "Anyone can read published library books"
  on public.library_books for select to anon, authenticated
  using (is_published);

drop policy if exists "Anyone can read files for published books" on public.library_files;
create policy "Anyone can read files for published books"
  on public.library_files for select to anon, authenticated
  using (
    is_available and exists (
      select 1 from public.library_books b
      where b.id = library_files.book_id and b.is_published
    )
  );

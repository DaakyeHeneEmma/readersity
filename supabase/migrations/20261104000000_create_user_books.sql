create table if not exists public.user_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists user_books_user_created_idx
  on public.user_books (user_id, created_at desc);

alter table public.user_books enable row level security;
grant select, insert, delete on public.user_books to authenticated;

drop policy if exists "Users can read their own shelf" on public.user_books;
create policy "Users can read their own shelf"
  on public.user_books for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add books to their own shelf" on public.user_books;
create policy "Users can add books to their own shelf"
  on public.user_books for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove books from their own shelf" on public.user_books;
create policy "Users can remove books from their own shelf"
  on public.user_books for delete to authenticated
  using (auth.uid() = user_id);

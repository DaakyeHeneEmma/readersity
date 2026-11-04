create or replace function public.enforce_user_shelf_book_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  shelf_size integer;
begin
  -- Serialize additions for one user so concurrent requests cannot exceed the limit.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  -- Allow duplicate inserts to reach the table's ON CONFLICT DO NOTHING behavior.
  if exists (
    select 1
    from public.user_books
    where user_id = new.user_id and book_id = new.book_id
  ) then
    return new;
  end if;

  select count(*) into shelf_size
  from public.user_books
  where user_id = new.user_id;

  if shelf_size >= 10 then
    raise exception 'Shelf limit reached: each user may save at most 10 books.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_user_shelf_book_limit on public.user_books;
create trigger enforce_user_shelf_book_limit
before insert on public.user_books
for each row
execute function public.enforce_user_shelf_book_limit();

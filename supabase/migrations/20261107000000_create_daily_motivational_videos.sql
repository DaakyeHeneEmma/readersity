create table if not exists public.daily_motivational_videos (
  video_date date primary key,
  video_id text not null,
  title text not null,
  channel_title text not null default '',
  thumbnail_url text,
  created_at timestamptz not null default now()
);

alter table public.daily_motivational_videos enable row level security;

revoke all on public.daily_motivational_videos from anon, authenticated;
grant select on public.daily_motivational_videos to anon, authenticated;
grant all on public.daily_motivational_videos to service_role;

drop policy if exists "Read recent daily motivational videos" on public.daily_motivational_videos;
create policy "Read recent daily motivational videos"
  on public.daily_motivational_videos
  for select
  to anon, authenticated
  using (video_date between current_date - 29 and current_date);

create index if not exists daily_motivational_videos_recent_idx
  on public.daily_motivational_videos (video_date desc);

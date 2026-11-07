-- Before running this script:
-- 1. Enable pg_cron, pg_net, and Vault in the Supabase Dashboard.
-- 2. Add Vault secrets named "project_url" and "daily_video_cron_secret".
--    The URL is https://YOUR_PROJECT_REF.supabase.co. The cron secret must
--    match DAILY_VIDEO_CRON_SECRET configured for the Edge Function.

select cron.schedule(
  'prune-old-motivational-videos',
  '10 0 * * *',
  $$
    delete from public.daily_motivational_videos
    where video_date < current_date - 29;
  $$
);

select cron.schedule(
  'daily-motivational-video',
  '5 0 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_url'
      ) || '/functions/v1/daily-motivational-video',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'publishable_key'
        ),
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'daily_video_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

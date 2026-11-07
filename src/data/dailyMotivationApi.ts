import {supabase} from './supabaseClient';

export type DailyMotivationalVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
};

type DailyMotivationalVideoRow = {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string | null;
};

export async function fetchDailyMotivationalVideo(): Promise<DailyMotivationalVideo | null> {
  if (!supabase) return null;

  const videoDate = new Date().toISOString().slice(0, 10);
  const {data, error} = await supabase
    .from('daily_motivational_videos')
    .select('video_id,title,channel_title,thumbnail_url')
    .eq('video_date', videoDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DailyMotivationalVideoRow;
  return {
    videoId: row.video_id,
    title: row.title,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
  };
}

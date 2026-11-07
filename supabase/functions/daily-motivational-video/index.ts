import {createClient} from 'npm:@supabase/supabase-js@2';

const topics = [
  'motivational speech personal growth',
  'daily motivation discipline and focus',
  'inspirational speech keep going',
  'morning motivation achieve your goals',
  'motivation habits success mindset',
  'self improvement motivational talk',
  'motivational speech overcoming challenges',
];

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {videoId?: string};
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: Record<string, {url?: string}>;
    };
  }>;
  error?: {message?: string};
};

type DailyVideoRow = {
  video_date: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  });
}

function thumbnailUrl(thumbnails?: Record<string, {url?: string}>): string | null {
  return thumbnails?.maxres?.url
    || thumbnails?.standard?.url
    || thumbnails?.high?.url
    || thumbnails?.medium?.url
    || thumbnails?.default?.url
    || null;
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);

  const expectedSecret = Deno.env.get('DAILY_VIDEO_CRON_SECRET');
  if (!expectedSecret || request.headers.get('x-cron-secret') !== expectedSecret) {
    return json({error: 'Unauthorized'}, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const configuredSecretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  let supabaseSecretKey: string | undefined;
  if (configuredSecretKeys) {
    try {
      supabaseSecretKey = (JSON.parse(configuredSecretKeys) as Record<string, string>).default;
    } catch (error) {
      console.error('Could not read the Supabase secret key configuration:', error);
      return json({error: 'The daily video service is not configured.'}, 500);
    }
  }
  // Compatibility with projects that have not enabled the new API keys yet.
  supabaseSecretKey ||= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || undefined;
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!supabaseUrl || !supabaseSecretKey || !youtubeApiKey) {
    console.error('Missing Supabase URL/key or YOUTUBE_API_KEY.');
    return json({error: 'The daily video service is not configured.'}, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  });
  const today = new Date().toISOString().slice(0, 10);

  const {data: current, error: currentError} = await supabase
    .from('daily_motivational_videos')
    .select('video_date,video_id,title,channel_title,thumbnail_url')
    .eq('video_date', today)
    .maybeSingle();
  if (currentError) {
    console.error('Could not read today’s video:', currentError);
    return json({error: 'Could not read the daily video record.'}, 500);
  }
  if (current) return json({video: current, alreadySelected: true});

  const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const {data: recent, error: recentError} = await supabase
    .from('daily_motivational_videos')
    .select('video_id')
    .gte('video_date', cutoff)
    .lt('video_date', today);
  if (recentError) {
    console.error('Could not read recently selected videos:', recentError);
    return json({error: 'Could not read recent video history.'}, 500);
  }

  const topicsIndex = Math.floor(Math.random() * topics.length);
  const query = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: topics[topicsIndex],
    videoEmbeddable: 'true',
    videoDuration: 'medium',
    safeSearch: 'moderate',
    order: 'relevance',
    maxResults: '25',
    key: youtubeApiKey,
  });
  const youtubeResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${query.toString()}`,
  );
  const searchResult = await youtubeResponse.json() as YouTubeSearchResponse;
  if (!youtubeResponse.ok) {
    console.error('YouTube search failed:', searchResult.error?.message || youtubeResponse.status);
    return json({error: 'YouTube search failed. Check the API key and quota.'}, 502);
  }

  const candidates = (searchResult.items || [])
    .map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title?.trim(),
      channelTitle: item.snippet?.channelTitle?.trim() || '',
      thumbnailUrl: thumbnailUrl(item.snippet?.thumbnails),
    }))
    .filter(video => video.videoId && video.title);

  if (!candidates.length) {
    return json({error: 'YouTube did not return any embeddable videos.'}, 502);
  }

  const recentlyShownIds = new Set((recent || []).map(row => row.video_id));
  const freshCandidates = candidates.filter(video => !recentlyShownIds.has(video.videoId!));
  const pool = freshCandidates.length ? freshCandidates : candidates;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const row: DailyVideoRow = {
    video_date: today,
    video_id: selected.videoId!,
    title: selected.title!,
    channel_title: selected.channelTitle,
    thumbnail_url: selected.thumbnailUrl,
  };

  const {data: saved, error: saveError} = await supabase
    .from('daily_motivational_videos')
    .insert(row)
    .select('video_date,video_id,title,channel_title,thumbnail_url')
    .single();

  if (saveError?.code === '23505') {
    const {data: winner, error: winnerError} = await supabase
      .from('daily_motivational_videos')
      .select('video_date,video_id,title,channel_title,thumbnail_url')
      .eq('video_date', today)
      .single();
    if (!winnerError && winner) return json({video: winner, alreadySelected: true});
  }
  if (saveError || !saved) {
    console.error('Could not save today’s video:', saveError);
    return json({error: 'Could not save today’s video.'}, 500);
  }

  const {error: cleanupError} = await supabase
    .from('daily_motivational_videos')
    .delete()
    .lt('video_date', cutoff);
  if (cleanupError) console.error('Could not prune old daily video records:', cleanupError);

  return json({video: saved, alreadySelected: false});
});

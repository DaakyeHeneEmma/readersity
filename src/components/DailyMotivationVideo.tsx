import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {fetchDailyMotivationalVideo} from '../data/dailyMotivationApi';
import type {DailyMotivationalVideo as DailyVideo} from '../data/dailyMotivationApi';
import {colors, fontFamily} from '../theme/colors';

const fallbackVideo: DailyVideo = {
  videoId: 'KE_NjRYb85w',
  title: 'Act As If Everything Works Out for You',
  channelTitle: '',
  thumbnailUrl: null,
};
const appOrigin = 'https://com.daakyeheneemma.readersity';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

function createPlayerHtml(video: DailyVideo): string {
  const videoId = /^[a-zA-Z0-9_-]{11}$/.test(video.videoId) ? video.videoId : fallbackVideo.videoId;
  const title = escapeHtml(video.title);
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111827}iframe{border:0;width:100%;height:100%}</style>
  </head>
  <body>
    <iframe
      src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&autoplay=0&origin=${encodeURIComponent(appOrigin)}"
      title="${title}"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  </body>
</html>`;
}

export function DailyMotivationVideo() {
  const [video, setVideo] = useState(fallbackVideo);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDailyMotivationalVideo()
      .then(dailyVideo => {
        if (active && dailyVideo) {
          setVideo(dailyVideo);
          setLoading(true);
          setFailed(false);
        }
      })
      .catch(error => console.warn('Could not load today’s motivational video:', error));
    return () => { active = false; };
  }, []);

  return <View style={styles.section}>
    <Text style={styles.heading}>Daily Motivation</Text>
    <Text style={styles.title}>{video.title}</Text>
    <View style={styles.player}>
      {!failed ? <WebView
        key={video.videoId}
        source={{html: createPlayerHtml(video), baseUrl: `${appOrigin}/`}}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
        onHttpError={() => { setLoading(false); setFailed(true); }}
      /> : <View style={styles.error}><Text style={styles.errorText}>This video couldn’t load. Check your connection and try again.</Text></View>}
      {loading && !failed ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={colors.gold} size="large" /><Text style={styles.loadingText}>Loading today’s motivation…</Text></View> : null}
    </View>
    <Text style={styles.caption}>{video.channelTitle || 'A little inspiration for your day'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  section: {marginHorizontal: 22, marginTop: 28},
  heading: {fontFamily, fontSize: 18, fontWeight: '700', color: colors.blue},
  title: {fontFamily, fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 8, marginBottom: 12},
  player: {width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111827'},
  webview: {flex: 1, backgroundColor: '#111827'}, webviewContainer: {flex: 1, backgroundColor: '#111827'},
  loading: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#111827'}, loadingText: {fontFamily, color: colors.white, fontSize: 12},
  error: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20}, errorText: {fontFamily, color: colors.white, fontSize: 12, textAlign: 'center', lineHeight: 18},
  caption: {fontFamily, color: colors.muted, fontSize: 11, marginTop: 8, marginBottom: 20},
});

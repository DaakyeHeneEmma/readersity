import React, {useState} from 'react';
import {ActivityIndicator, Image, Platform, Pressable, StyleSheet, StatusBar, Text, View} from 'react-native';
import Pdf from 'react-native-pdf';
import {BookFile, assets} from '../data/books';
import {colors, fontFamily} from '../theme/colors';

type Props = {file: BookFile; title: string; onBack: () => void};

export function PdfReaderScreen({file, title, onBack}: Props) {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(false);

  return <View style={styles.screen}>
    <View style={[styles.header, Platform.OS === 'android' && {paddingTop: StatusBar.currentHeight || 0}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to book details" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.titleWrap}><Text numberOfLines={1} style={styles.title}>{title}</Text><Text style={styles.subtitle}>{error ? 'Could not load this PDF' : pageCount ? `${pageCount} pages` : file.fileName}</Text></View>
    </View>
    {error ? <View style={styles.error}><Text style={styles.errorText}>This PDF could not be opened. Check your connection and try again.</Text></View> : <View style={styles.pdfContainer}>
      <Pdf
        source={{uri: file.publicUrl, cache: true}}
        style={styles.pdf}
        trustAllCerts={false}
        enablePaging={false}
        onLoadProgress={progress => setLoadProgress(Math.max(0, Math.min(1, progress)))}
        onLoadComplete={pages => { setPageCount(pages); setLoading(false); }}
        onError={pdfError => {
          console.warn('Could not load PDF in reader:', pdfError);
          setError(true);
          setLoading(false);
        }}
        renderActivityIndicator={() => <ActivityIndicator color={colors.blue} size="large" />}
      />
      {loading ? <View style={styles.loadingOverlay} pointerEvents="none">
        <Image source={assets.logo} resizeMode="contain" fadeDuration={0} style={styles.loadingLogo} />
        <ActivityIndicator color={colors.white} size="large" style={styles.loadingSpinner} />
        <Text style={styles.loadingTitle}>Opening your book</Text>
        <Text style={styles.loadingMessage}>{loadProgress > 0 ? `Loading PDF… ${Math.round(loadProgress * 100)}%` : 'Loading it into your reader…'}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, {width: `${Math.max(5, loadProgress * 100)}%`}]} /></View>
      </View> : null}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#E9EAF0'},
  header: {minHeight: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blue},
  backButton: {width: 42, height: 48, alignItems: 'center', justifyContent: 'center'}, backText: {fontSize: 38, lineHeight: 42, color: colors.white},
  titleWrap: {flex: 1, paddingLeft: 8}, title: {fontFamily, color: colors.white, fontSize: 15, fontWeight: '700'}, subtitle: {fontFamily, color: 'rgba(255,255,255,.78)', fontSize: 11, marginTop: 3},
  pdf: {flex: 1, width: '100%', backgroundColor: '#E9EAF0'},
  pdfContainer: {flex: 1, position: 'relative'},
  loadingOverlay: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.blue},
  loadingLogo: {width: 190, height: 70}, loadingSpinner: {marginTop: 26}, loadingTitle: {fontFamily, fontSize: 18, fontWeight: '700', color: colors.white, marginTop: 16}, loadingMessage: {fontFamily, fontSize: 13, color: 'rgba(255,255,255,.82)', marginTop: 7},
  progressTrack: {width: '72%', height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.24)', marginTop: 18, overflow: 'hidden'}, progressFill: {height: 5, borderRadius: 3, backgroundColor: colors.gold},
  error: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32}, errorText: {fontFamily, textAlign: 'center', color: colors.muted, fontSize: 15, lineHeight: 22},
});

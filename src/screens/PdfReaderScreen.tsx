import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import Pdf from 'react-native-pdf';
import {BookFile} from '../data/books';
import {colors, fontFamily} from '../theme/colors';

type Props = {file: BookFile; title: string; onBack: () => void};

export function PdfReaderScreen({file, title, onBack}: Props) {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  return <View style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to book details" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.titleWrap}><Text numberOfLines={1} style={styles.title}>{title}</Text><Text style={styles.subtitle}>{error ? 'Could not load this PDF' : pageCount ? `${pageCount} pages` : file.fileName}</Text></View>
    </View>
    {error ? <View style={styles.error}><Text style={styles.errorText}>This PDF could not be opened. Check your connection and try again.</Text></View> : <Pdf
      source={{uri: file.publicUrl, cache: true}}
      style={styles.pdf}
      trustAllCerts={false}
      enablePaging={false}
      onLoadComplete={pages => setPageCount(pages)}
      onError={pdfError => {
        console.warn('Could not load PDF in reader:', pdfError);
        setError(true);
      }}
      renderActivityIndicator={() => <ActivityIndicator color={colors.blue} size="large" />}
    />}
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#E9EAF0'},
  header: {minHeight: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blue},
  backButton: {width: 42, height: 48, alignItems: 'center', justifyContent: 'center'}, backText: {fontSize: 38, lineHeight: 42, color: colors.white},
  titleWrap: {flex: 1, paddingLeft: 8}, title: {fontFamily, color: colors.white, fontSize: 15, fontWeight: '700'}, subtitle: {fontFamily, color: 'rgba(255,255,255,.78)', fontSize: 11, marginTop: 3},
  pdf: {flex: 1, width: '100%', backgroundColor: '#E9EAF0'},
  error: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32}, errorText: {fontFamily, textAlign: 'center', color: colors.muted, fontSize: 15, lineHeight: 22},
});

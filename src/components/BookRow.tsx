import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Book} from '../data/books';
import {colors, fontFamily} from '../theme/colors';

type Props = {book: Book; onPress: () => void; compact?: boolean; onRemove?: () => void};

export function BookRow({book, onPress, compact = false, onRemove}: Props) {
  return <View style={[styles.row, compact && styles.compact]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${book.title}`} onPress={onPress} style={styles.bookPress}>
      {book.cover ? <Image source={book.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={[styles.cover, compact && styles.compactCover]} /> : <View style={[styles.cover, styles.placeholder, compact && styles.compactCover]} />}
      <View style={styles.info}>
        <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}{book.files?.length ? `  ·  ${book.files.map(file => file.format.toUpperCase()).join(' / ')}` : ''}</Text>
      </View>
      {compact ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
    {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${book.title} from shelf`} hitSlop={8} onPress={onRemove} style={styles.removeButton}><Text style={styles.removeText}>×</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: {minHeight: 164, flexDirection: 'row', alignItems: 'center'},
  compact: {minHeight: 72, borderRadius: 10, backgroundColor: 'rgba(217,215,215,.47)', paddingHorizontal: 12},
  bookPress: {flex: 1, minHeight: 72, flexDirection: 'row', gap: 18, alignItems: 'center'},
  cover: {width: 169, height: 164, borderRadius: 5, backgroundColor: '#3D3535'},
  compactCover: {width: 44, height: 56, borderRadius: 5},
  placeholder: {backgroundColor: '#D9D7D7'},
  info: {flex: 1},
  title: {fontFamily, fontWeight: '700', fontSize: 24, color: '#000'},
  compactTitle: {fontSize: 16, color: colors.ink},
  author: {fontFamily, fontWeight: '700', fontSize: 15, color: 'rgba(0,0,0,.8)', marginTop: 7},
  chevron: {fontSize: 28, color: colors.blue},
  removeButton: {width: 36, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4},
  removeText: {fontSize: 25, fontWeight: '500', color: '#B42318'},
});

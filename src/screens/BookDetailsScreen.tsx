import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets, books} from '../data/books';
import {colors, fontFamily} from '../theme/colors';
import {ScreenHeader} from '../components/ScreenHeader';

type Props = {book: Book; inShelf: boolean; backLabel: string; onAdd: () => void; onRemove: () => void; onBack: () => void; onBookPress: (book: Book) => void};

export function BookDetailsScreen({book, inShelf, backLabel, onAdd, onRemove, onBack, onBookPress}: Props) {
  const recommendations = books.filter(item => item.id !== book.id).slice(0, 2);
  const longTitle = book.title.length > 24;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <ScreenHeader style={styles.header} backgroundImage={assets.shelfHeader} backgroundImageStyle={styles.headerImage}>
      <Text style={styles.pageTitle}>Book Details</Text>
    </ScreenHeader>
    <View style={styles.hero}>
      {book.cover ? <Image source={book.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.cover} /> : <View style={styles.cover} />}
      <View style={styles.name}><Text numberOfLines={3} style={[styles.title, longTitle && styles.longTitle]}>{book.title}</Text><Text style={styles.author}>{book.author}</Text>{book.rating ? <Text style={styles.rating}>★ {book.rating}</Text> : null}</View>
    </View>
    <View style={styles.summary}><Text style={styles.sectionTitle}>Summary</Text><Text style={styles.summaryText}>{book.summary || 'A thoughtful read selected for your shelf.'}</Text></View>
    <Pressable accessibilityRole="button" onPress={inShelf ? onRemove : onAdd} style={[styles.action, styles.readAction, inShelf && styles.removeAction]}><Text style={styles.actionText}>{inShelf ? 'Remove From Shelf  ×' : 'Want To Read  →'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onBack} style={[styles.action, styles.backAction]}><Text style={styles.actionText}>←  {backLabel}</Text></Pressable>
    <View style={styles.divider} />
    <Text style={styles.recommendTitle}>You may also like</Text>
    <View style={styles.recommendations}>{recommendations.map(item => <Pressable key={item.id} onPress={() => onBookPress(item)} style={styles.recommendation}>{item.cover ? <Image source={item.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.recCover} /> : null}<Text style={styles.recTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.recAuthor}>{item.author}</Text></Pressable>)}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.white}, content: {paddingBottom: 86}, header: {height: 230}, headerImage: {top: -72, left: -93, width: 560, height: 375, opacity: 0.18},
  pageTitle: {position: 'absolute', top: 145, left: 208, color: colors.white, fontFamily, fontWeight: '700', fontSize: 28},
  hero: {height: 253, marginTop: -117, marginHorizontal: 14, flexDirection: 'row', alignItems: 'flex-end'}, cover: {width: 176, height: 253, borderRadius: 20, backgroundColor: '#3D3535'},
  name: {flex: 1, paddingLeft: 40, paddingBottom: 34},
  title: {fontFamily, fontWeight: '700', fontSize: 22, lineHeight: 26, color: '#000'}, longTitle: {fontSize: 18, lineHeight: 22}, author: {fontFamily, fontWeight: '700', fontSize: 14, color: 'rgba(0,0,0,.8)', marginTop: 7}, rating: {fontFamily, fontWeight: '700', marginTop: 8, color: colors.blue},
  summary: {marginTop: 44, marginHorizontal: 23}, sectionTitle: {fontFamily, fontWeight: '700', fontSize: 24}, summaryText: {fontFamily, fontSize: 12, lineHeight: 15, color: 'rgba(0,0,0,.8)', marginTop: 7},
  action: {height: 46, marginHorizontal: 42, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 42, elevation: 4}, readAction: {backgroundColor: colors.blue}, removeAction: {backgroundColor: '#B42318'}, backAction: {backgroundColor: colors.gold, marginTop: 19}, actionText: {fontFamily, fontSize: 19, fontWeight: '700', color: colors.white},
  divider: {height: 1, backgroundColor: '#D8D8D8', marginHorizontal: 32, marginTop: 18}, recommendTitle: {fontFamily, fontWeight: '700', color: colors.blue, marginHorizontal: 18, marginTop: 14}, recommendations: {flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 9}, recommendation: {width: 150}, recCover: {width: 118, height: 93, borderRadius: 5}, recTitle: {fontFamily, fontWeight: '700', fontSize: 14, marginTop: 8}, recAuthor: {fontFamily, fontWeight: '700', fontSize: 12, color: 'rgba(0,0,0,.8)'},
});

import React, {useEffect, useRef, useState} from 'react';
import {Animated, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets, books} from '../data/books';
import {colors, fontFamily} from '../theme/colors';
import {ScreenHeader} from '../components/ScreenHeader';

type Props = {onSearch: () => void; onBookPress: (book: Book) => void};
const monthBookIds = ['power-of-focus', 'miracle-morning', '5am-club'];
const featureCardWidth = 222;

export function HomeScreen({onSearch, onBookPress}: Props) {
  const [category, setCategory] = useState<'All Books' | 'Popular'>('All Books');
  const [featureIndex, setFeatureIndex] = useState(() => Math.floor(Math.random() * books.length));
  const featureSlideX = useRef(new Animated.Value(0)).current;
  const visibleBooks = category === 'Popular' ? [...books].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 5) : books;
  const monthBooks = monthBookIds.map(id => books.find(book => book.id === id)).filter((book): book is Book => Boolean(book));
  const featuredBook = books[featureIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(featureSlideX, {toValue: -featureCardWidth, duration: 220, useNativeDriver: true}).start(() => {
        setFeatureIndex(current => {
          if (books.length < 2) return current;
          let next = current;
          while (next === current) next = Math.floor(Math.random() * books.length);
          return next;
        });
        featureSlideX.setValue(featureCardWidth);
        Animated.timing(featureSlideX, {toValue: 0, duration: 260, useNativeDriver: true}).start();
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [featureIndex, featureSlideX]);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader style={styles.header}>
      <Image source={assets.hero} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.heroArt} />
      <Text style={styles.question}>Read Anything Today?</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Search books" onPress={onSearch} style={styles.searchButton}><Text style={styles.searchIcon}>⌕</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${featuredBook.title} by ${featuredBook.author}`} onPress={() => onBookPress(featuredBook)} style={styles.featureCard}>
        <Animated.View style={[styles.featureContents, {transform: [{translateX: featureSlideX}]}]}>
          {featuredBook.cover ? <Image source={featuredBook.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.featureCover} /> : <View style={styles.featureCover} />}
          <View style={styles.featureInfo}><Text numberOfLines={2} style={styles.featureTitle}>{featuredBook.title}</Text><Text numberOfLines={2} style={styles.featureAuthor}>{featuredBook.author}</Text><Text style={styles.featureMeta}>★ {featuredBook.rating || '—'}</Text></View>
        </Animated.View>
      </Pressable>
    </ScreenHeader>
    <View style={styles.categoryTabs}>
      {(['All Books', 'Popular'] as const).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{selected: category === item}} onPress={() => setCategory(item)}><Text style={category === item ? styles.activeTab : styles.tab}>{item}</Text></Pressable>)}
    </View>
    <View style={styles.heading}><Text style={styles.headingText}>{category === 'Popular' ? 'Popular books' : 'Book of the month'}</Text></View>
    {category === 'Popular' ? <View style={styles.popularList}>{visibleBooks.map(book => <Pressable key={book.id} onPress={() => onBookPress(book)} style={styles.popularItem}><Text style={styles.popularTitle}>{book.title}</Text><Text style={styles.popularAuthor}>{book.author}  ·  ★ {book.rating}</Text></Pressable>)}</View>
      : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>{monthBooks.map(book => <Pressable key={book.id} onPress={() => onBookPress(book)} style={styles.monthCard}>{book.cover ? <Image source={book.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.monthCover} /> : null}<Text style={styles.monthText}>{book.title}</Text></Pressable>)}</ScrollView>}
    <View style={styles.catalogHeading}><Text style={styles.headingText}>Explore the catalog</Text><Pressable onPress={onSearch}><Text style={styles.browse}>See all</Text></Pressable></View>
    <View style={styles.catalog}>{books.slice(0, 5).map(book => <Pressable key={book.id} onPress={() => onBookPress(book)}><Text style={styles.catalogTitle}>{book.title}</Text><Text style={styles.catalogAuthor}>{book.author}</Text></Pressable>)}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.white}, content: {paddingBottom: 86},
  header: {height: 395}, heroArt: {position: 'absolute', top: 0, left: -97, width: 592, height: 396},
  question: {position: 'absolute', top: 125, left: 35, color: colors.white, fontFamily, fontWeight: '700', fontSize: 16},
  searchButton: {position: 'absolute', top: 122, right: 20, width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}, searchIcon: {fontSize: 32, color: colors.white, fontWeight: '700'},
  featureCard: {position: 'absolute', top: 210, left: 27, width: featureCardWidth, height: 160, borderRadius: 20, backgroundColor: colors.white, elevation: 4, overflow: 'hidden'},
  featureContents: {width: featureCardWidth, height: 160, flexDirection: 'row', padding: 9, gap: 8},
  featureCover: {width: 113, height: 140, borderRadius: 8, backgroundColor: '#D9D7D7'}, featureInfo: {flex: 1, justifyContent: 'center'}, featureTitle: {fontFamily, fontWeight: '700', fontSize: 13}, featureAuthor: {fontFamily, fontSize: 11, marginTop: 3}, featureMeta: {alignSelf: 'flex-start', marginTop: 8, color: colors.white, backgroundColor: 'rgba(28,84,227,.75)', borderRadius: 10, fontSize: 8, paddingHorizontal: 6, paddingVertical: 3},
  categoryTabs: {marginTop: 32, marginHorizontal: 52, height: 34, borderRadius: 10, backgroundColor: 'rgba(15,54,191,.12)', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}, activeTab: {color: colors.blue, fontFamily, fontWeight: '700', fontSize: 14}, tab: {color: '#5D5FEF', fontFamily, fontWeight: '700', fontSize: 14},
  heading: {marginTop: 26, marginHorizontal: 29}, headingText: {fontFamily, fontWeight: '700', color: colors.blue, fontSize: 18}, monthRow: {paddingLeft: 28, gap: 19, paddingTop: 18}, monthCard: {width: 137}, monthCover: {width: 137, height: 160, borderRadius: 20}, monthText: {fontFamily, fontWeight: '700', color: colors.blue, fontSize: 12, marginTop: 8},
  popularList: {paddingHorizontal: 22, paddingTop: 12, gap: 8}, popularItem: {padding: 14, borderRadius: 12, backgroundColor: '#F2F4FA'}, popularTitle: {fontFamily, fontWeight: '700', color: colors.ink, fontSize: 16}, popularAuthor: {fontFamily, color: colors.muted, fontSize: 13, marginTop: 4},
  catalogHeading: {marginHorizontal: 29, marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, browse: {fontFamily, color: colors.blue, fontWeight: '700'}, catalog: {marginHorizontal: 29, marginTop: 12, gap: 10}, catalogTitle: {fontFamily, fontWeight: '700', color: colors.ink}, catalogAuthor: {fontFamily, color: colors.muted, fontSize: 12},
});

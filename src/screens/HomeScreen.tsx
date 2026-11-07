import React, {useEffect, useRef, useState} from 'react';
import {Animated, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets} from '../data/books';
import {colors, fontFamily} from '../theme/colors';
import {ScreenHeader} from '../components/ScreenHeader';
import {DailyMotivationVideo} from '../components/DailyMotivationVideo';

type Props = {books: Book[]; popularBooks?: Book[]; bookOfMonth?: Book; catalogUnavailable?: boolean; onBookPress: (book: Book) => void};
const featureCardWidth = 222;

export function HomeScreen({books, popularBooks = [], bookOfMonth, catalogUnavailable = false, onBookPress}: Props) {
  const [category, setCategory] = useState<'All Books' | 'Popular'>('All Books');
  const [featureIndex, setFeatureIndex] = useState(0);
  const featureSlideX = useRef(new Animated.Value(0)).current;
  const visibleBooks = category === 'Popular' ? (popularBooks.length ? popularBooks : [...books].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 5)) : books;
  const monthBook = bookOfMonth;
  const featuredBook = books.length ? books[featureIndex % books.length] : undefined;

  useEffect(() => {
    if (books.length < 2) return;
    const timer = setInterval(() => {
      Animated.timing(featureSlideX, {toValue: -featureCardWidth, duration: 220, useNativeDriver: true}).start(() => {
        setFeatureIndex(current => {
          const currentIndex = current % books.length;
          let next = currentIndex;
          while (next === currentIndex) next = Math.floor(Math.random() * books.length);
          return next;
        });
        featureSlideX.setValue(featureCardWidth);
        Animated.timing(featureSlideX, {toValue: 0, duration: 260, useNativeDriver: true}).start();
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [books.length, featureSlideX]);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader style={styles.header}>
      <Image source={assets.hero} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.heroArt} />
      <Text style={styles.question}>Read Anything Today?</Text>

      {featuredBook ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${featuredBook.title} by ${featuredBook.author}`} onPress={() => onBookPress(featuredBook)} style={styles.featureCard}>
        <Animated.View style={[styles.featureContents, {transform: [{translateX: featureSlideX}]}]}>
          {featuredBook.cover ? <Image source={featuredBook.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.featureCover} /> : <View style={styles.featureCover} />}
          <View style={styles.featureInfo}><Text numberOfLines={2} style={styles.featureTitle}>{featuredBook.title}</Text><Text numberOfLines={2} style={styles.featureAuthor}>{featuredBook.author}</Text><Text style={styles.featureMeta}>★ {featuredBook.rating || '—'}</Text></View>
        </Animated.View>
      </Pressable> : null}
    </ScreenHeader>
    {catalogUnavailable ? <Text style={styles.catalogWarning}>Online library unavailable. Pull down to try again.</Text> : null}
    <View style={styles.categoryTabs}>
      {(['All Books', 'Popular'] as const).map(item => {
        const selected = category === item;
        return <Pressable key={item} accessibilityRole="button" accessibilityState={{selected}} onPress={() => setCategory(item)} style={[styles.categoryButton, selected && styles.categoryButtonSelected]}><Text style={selected ? styles.activeTab : styles.tab}>{item}</Text></Pressable>;
      })}
    </View>
    {category === 'Popular' ? <View style={styles.heading}><Text style={styles.headingText}>Popular books</Text></View> : null}
    {category === 'Popular' ? <View style={styles.popularList}>{visibleBooks.length ? visibleBooks.map(book => <Pressable key={book.id} onPress={() => onBookPress(book)} style={styles.popularItem}><Text style={styles.popularTitle}>{book.title}</Text><Text style={styles.popularAuthor}>{book.author}{book.rating ? `  ·  ★ ${book.rating}` : ''}</Text></Pressable>) : <Text style={styles.catalogEmpty}>No books are available yet.</Text>}</View> : null}
    {category === 'All Books' ? <Pressable accessibilityRole={monthBook ? 'button' : undefined} accessibilityLabel={monthBook ? `View details for ${monthBook.title}` : 'Book of the Month'} onPress={monthBook ? () => onBookPress(monthBook) : undefined} style={styles.monthFeature}>
      {monthBook?.cover ? <Image source={monthBook.cover} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={styles.monthFeatureCover} /> : <View style={styles.monthFeatureCover} />}
      {monthBook ? <View style={styles.monthFeatureInfo}><Text style={styles.monthFeatureLabel}>Book of the Month</Text><Text style={styles.monthFeatureTitle}>{monthBook.title}</Text><Text style={styles.monthFeatureAuthor}>{monthBook.author}</Text><Text numberOfLines={2} style={styles.monthFeatureSummary}>{monthBook.summary}</Text><Text style={styles.monthFeatureLink}>View Details  →</Text></View> : <View style={styles.monthFeatureInfo}><Text style={styles.monthFeatureLabel}>Book of the Month</Text><Text style={styles.monthFeatureSummary}>A recommended book will appear here when the catalog is available.</Text></View>}
    </Pressable> : null}
    {category === 'All Books' ? <DailyMotivationVideo /> : null}
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
  categoryTabs: {marginTop: 32, marginHorizontal: 52, height: 42, padding: 4, borderRadius: 12, backgroundColor: 'rgba(15,54,191,.12)', flexDirection: 'row', alignItems: 'center'}, categoryButton: {flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center'}, categoryButtonSelected: {backgroundColor: colors.blue, elevation: 2}, activeTab: {color: colors.white, fontFamily, fontWeight: '700', fontSize: 14}, tab: {color: '#5D5FEF', fontFamily, fontWeight: '700', fontSize: 14},
  heading: {marginTop: 26, marginHorizontal: 29}, headingText: {fontFamily, fontWeight: '700', color: colors.blue, fontSize: 18}, monthFeature: {marginHorizontal: 28, marginTop: 16, minHeight: 160, padding: 12, borderRadius: 16, backgroundColor: '#F2F4FA', flexDirection: 'row', gap: 14}, monthFeatureCover: {width: 112, height: 144, borderRadius: 10, backgroundColor: '#D9D7D7'}, monthFeatureInfo: {flex: 1, justifyContent: 'center'}, monthFeatureLabel: {fontFamily, fontWeight: '700', color: colors.blue, fontSize: 11, marginBottom: 4}, monthFeatureTitle: {fontFamily, fontWeight: '700', color: colors.ink, fontSize: 16}, monthFeatureAuthor: {fontFamily, color: colors.muted, fontSize: 12, marginTop: 4}, monthFeatureSummary: {fontFamily, color: colors.ink, fontSize: 11, lineHeight: 15, marginTop: 9}, monthFeatureLink: {fontFamily, color: colors.blue, fontSize: 12, fontWeight: '700', marginTop: 9},
  popularList: {paddingHorizontal: 22, paddingTop: 12, gap: 8}, popularItem: {padding: 14, borderRadius: 12, backgroundColor: '#F2F4FA'}, popularTitle: {fontFamily, fontWeight: '700', color: colors.ink, fontSize: 16}, popularAuthor: {fontFamily, color: colors.muted, fontSize: 13, marginTop: 4},
  catalogWarning: {marginHorizontal: 20, marginTop: 12, color: '#8A4B08', fontFamily, fontSize: 12}, catalogEmpty: {fontFamily, color: colors.muted, fontSize: 13},
});

import React, {useEffect} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {Book, assets} from '../data/books';
import {colors} from '../theme/colors';
import {BookRow} from '../components/BookRow';
import {ScreenHeader} from '../components/ScreenHeader';
import {SearchField} from '../components/SearchField';

type Props = {query: string; onQueryChange: (query: string) => void; books: Book[]; hasMore: boolean; loadingMore: boolean; refreshing: boolean; onRefresh: () => void; onLoadMore: () => void; catalogUnavailable?: boolean; onBookPress: (book: Book) => void};

export function SearchScreen({query, onQueryChange, books, hasMore, loadingMore, refreshing, onRefresh, onLoadMore, catalogUnavailable = false, onBookPress}: Props) {
  useEffect(() => {
    if (query.trim() && books.length === 0 && hasMore && !loadingMore) onLoadMore();
  }, [query, books.length, hasMore, loadingMore, onLoadMore]);

  return <View style={styles.screen}>
    <ScreenHeader title="Search Books" style={styles.header} backgroundImage={assets.searchHeader} backgroundImageStyle={styles.headerImage}><View style={styles.search}><SearchField value={query} onChangeText={onQueryChange} placeholder="Search books" /></View></ScreenHeader>
    <FlatList
      data={books}
      keyExtractor={book => book.id}
      renderItem={({item}) => <BookRow book={item} onPress={() => onBookPress(item)} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.45}
      ListHeaderComponent={catalogUnavailable ? <Text style={styles.warning}>Online library unavailable. Showing the bundled sample catalog.</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>{loadingMore ? 'Searching the catalog…' : query.trim() ? `No books match “${query}”.` : 'No books are available yet.'}</Text>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.blue} style={styles.footer} /> : <View style={styles.footer} />}
    />
  </View>;
}

const styles = StyleSheet.create({screen: {flex: 1, backgroundColor: colors.white}, header: {height: 230}, headerImage: {top: -72, left: -135, width: 604, height: 404, opacity: 0.18}, search: {position: 'absolute', top: 120, left: 36, right: 36}, list: {paddingHorizontal: 12, paddingTop: 20, paddingBottom: 75, gap: 8}, warning: {padding: 12, color: '#8A4B08', backgroundColor: '#FFF3DF', borderRadius: 8}, empty: {padding: 24, textAlign: 'center', color: colors.muted}, footer: {height: 36, justifyContent: 'center'}});

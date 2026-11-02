import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets} from '../data/books';
import {colors} from '../theme/colors';
import {BookRow} from '../components/BookRow';
import {ScreenHeader} from '../components/ScreenHeader';
import {SearchField} from '../components/SearchField';

type Props = {query: string; onQueryChange: (query: string) => void; books: Book[]; onBookPress: (book: Book) => void};

export function SearchScreen({query, onQueryChange, books, onBookPress}: Props) {
  return <View style={styles.screen}>
    <ScreenHeader title="Search Books" style={styles.header} backgroundImage={assets.searchHeader} backgroundImageStyle={styles.headerImage}><View style={styles.search}><SearchField value={query} onChangeText={onQueryChange} placeholder="Search books" /></View></ScreenHeader>
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      {books.length ? books.map(book => <BookRow key={book.id} book={book} onPress={() => onBookPress(book)} />) : <Text style={styles.empty}>No books match “{query}”.</Text>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({screen: {flex: 1, backgroundColor: colors.white}, header: {height: 230}, headerImage: {top: -72, left: -135, width: 604, height: 404, opacity: 0.18}, search: {position: 'absolute', top: 120, left: 36, right: 36}, list: {paddingHorizontal: 12, paddingTop: 20, paddingBottom: 75, gap: 8}, empty: {padding: 24, textAlign: 'center', color: colors.muted}});

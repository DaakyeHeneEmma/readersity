import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets} from '../data/books';
import {colors} from '../theme/colors';
import {BookRow} from '../components/BookRow';
import {ScreenHeader} from '../components/ScreenHeader';
import {SearchField} from '../components/SearchField';

type Props = {books: Book[]; signedIn: boolean; email?: string; onSignIn: () => void; onSignOut: () => void; onBookPress: (book: Book) => void; onRemove: (book: Book) => void};

export function ShelfScreen({books, signedIn, email, onSignIn, onSignOut, onBookPress, onRemove}: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase())), [books, query]);
  return <View style={styles.screen}>
    <ScreenHeader title="Your Shelf" style={styles.header} backgroundImage={assets.shelfHeader} backgroundImageStyle={styles.headerImage}><View style={styles.search}><SearchField value={query} onChangeText={setQuery} placeholder="Search your shelf" /></View></ScreenHeader>
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      {signedIn ? <View style={styles.account}><Text numberOfLines={1} style={styles.email}>{email || 'Signed in'}</Text><Text onPress={onSignOut} style={styles.signOut}>Sign out</Text></View> : null}
      {filtered.length ? filtered.map(book => <BookRow key={book.id} book={book} compact onPress={() => onBookPress(book)} onRemove={() => onRemove(book)} />) : <View><Text style={styles.empty}>{books.length ? 'No books match your search.' : signedIn ? 'Your shelf is empty. Add a book to keep it here.' : 'Sign in to see your personal shelf and keep it synced across devices.'}</Text>{!signedIn ? <Text accessibilityRole="button" onPress={onSignIn} style={styles.signIn}>Sign In or Create Account</Text> : null}</View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({screen: {flex: 1, backgroundColor: colors.white}, header: {height: 230}, headerImage: {top: -72, left: -135, width: 604, height: 404, opacity: 0.18}, search: {position: 'absolute', top: 120, left: 36, right: 36}, list: {paddingHorizontal: 15, paddingTop: 22, paddingBottom: 75, gap: 11}, empty: {padding: 24, textAlign: 'center', color: colors.muted}, account: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, paddingBottom: 6}, email: {color: colors.muted, fontSize: 12, flex: 1}, signOut: {color: colors.blue, fontWeight: '700', padding: 5}, signIn: {textAlign: 'center', color: colors.blue, fontWeight: '700', padding: 12}});

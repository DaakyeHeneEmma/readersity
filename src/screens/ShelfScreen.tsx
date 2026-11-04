import React, {useMemo, useState} from 'react';
import {Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Book, assets} from '../data/books';
import {colors} from '../theme/colors';
import {BookRow} from '../components/BookRow';
import {ScreenHeader} from '../components/ScreenHeader';
import {SearchField} from '../components/SearchField';
import {AuthScreen} from './AuthScreen';

type Props = {books: Book[]; signedIn: boolean; email?: string; refreshing: boolean; onRefresh: () => void; onAuthenticated: () => void; onContinueBrowsing: () => void; onSignOut: () => void; onBookPress: (book: Book) => void; onSetBookOfMonth: (book: Book) => void; onRemove: (book: Book) => void};

export function ShelfScreen({books, signedIn, email, refreshing, onRefresh, onAuthenticated, onContinueBrowsing, onSignOut, onBookPress, onSetBookOfMonth, onRemove}: Props) {
  const [query, setQuery] = useState('');
  const [actionBook, setActionBook] = useState<Book | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const filtered = useMemo(() => books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase())), [books, query]);
  const closeActions = () => { setActionBook(null); setConfirmingRemoval(false); };
  const openActions = (book: Book) => { setActionBook(book); setConfirmingRemoval(false); };
  const setAsBookOfMonth = () => {
    if (actionBook) onSetBookOfMonth(actionBook);
    closeActions();
  };
  const removeBook = () => {
    if (actionBook) onRemove(actionBook);
    closeActions();
  };
  return <View style={styles.screen}>
    <ScreenHeader title="Your Shelf" style={styles.header} backgroundImage={assets.shelfHeader} backgroundImageStyle={styles.headerImage}>{signedIn ? <View style={styles.search}><SearchField value={query} onChangeText={setQuery} placeholder="Search your shelf" /></View> : null}</ScreenHeader>
    {signedIn ? <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} />}>
      <View style={styles.account}><Text numberOfLines={1} style={styles.email}>{email || 'Signed in'}</Text><Text onPress={onSignOut} style={styles.signOut}>Sign out</Text></View>
      {filtered.length ? filtered.map(book => <BookRow key={book.id} book={book} compact onPress={() => onBookPress(book)} onMoreOptions={() => openActions(book)} />) : <Text style={styles.empty}>{books.length ? 'No books match your search.' : 'Your shelf is empty. Add a book to keep it here.'}</Text>}
    </ScrollView> : <AuthScreen onAuthenticated={onAuthenticated} onBack={onContinueBrowsing} />}
    <Modal visible={Boolean(actionBook)} transparent animationType="fade" statusBarTranslucent onRequestClose={closeActions}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close book actions" onPress={closeActions} style={StyleSheet.absoluteFill} />
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{confirmingRemoval ? 'Remove this book?' : actionBook?.title}</Text>
          <Text style={styles.dialogMessage}>{confirmingRemoval ? 'This book will be removed from your shelf.' : 'Choose an action for this book.'}</Text>
          {confirmingRemoval ? <>
            <Pressable accessibilityRole="button" onPress={removeBook} style={[styles.dialogAction, styles.removeAction]}><Text style={styles.removeActionText}>Remove from Shelf</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmingRemoval(false)} style={styles.cancelAction}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </> : <>
            <Pressable accessibilityRole="button" onPress={setAsBookOfMonth} style={styles.dialogAction}><Text style={styles.dialogActionText}>Set as Book of the Month</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmingRemoval(true)} style={[styles.dialogAction, styles.removeAction]}><Text style={styles.removeActionText}>Remove from Shelf</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={closeActions} style={styles.cancelAction}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </>}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.white}, header: {height: 230}, headerImage: {top: -72, left: -135, width: 604, height: 404, opacity: 0.18}, search: {position: 'absolute', top: 120, left: 36, right: 36}, list: {paddingHorizontal: 15, paddingTop: 22, paddingBottom: 75, gap: 11}, empty: {padding: 24, textAlign: 'center', color: colors.muted}, account: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, paddingBottom: 6}, email: {color: colors.muted, fontSize: 12, flex: 1}, signOut: {color: colors.blue, fontWeight: '700', padding: 5},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,.48)', justifyContent: 'center', alignItems: 'center', padding: 26}, dialog: {width: '100%', maxWidth: 360, padding: 22, borderRadius: 20, backgroundColor: colors.white, elevation: 12}, dialogTitle: {fontSize: 19, lineHeight: 24, fontWeight: '700', color: colors.ink}, dialogMessage: {fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 8, marginBottom: 18}, dialogAction: {minHeight: 48, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 14}, dialogActionText: {fontSize: 15, fontWeight: '700', color: colors.white}, removeAction: {backgroundColor: '#FEF0F0'}, removeActionText: {fontSize: 15, fontWeight: '700', color: '#B42318'}, cancelAction: {minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4}, cancelText: {fontSize: 15, fontWeight: '600', color: colors.muted},
});

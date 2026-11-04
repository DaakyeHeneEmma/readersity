import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, BackHandler, Linking, Modal, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';
import type {Session} from '@supabase/supabase-js';
import {BottomTabBar} from './src/components/BottomTabBar';
import {Book, BookEntry, BookFile, books} from './src/data/books';
import {fetchBookOfTheMonth, fetchLibraryPage, fetchTopRatedBooks, isLibraryConfigured, LIBRARY_PAGE_SIZE} from './src/data/libraryApi';
import {addBookToUserShelf, fetchUserShelf, removeBookFromUserShelf} from './src/data/shelfApi';
import {supabase} from './src/data/supabaseClient';
import {AuthScreen} from './src/screens/AuthScreen';
import {BookDetailsScreen} from './src/screens/BookDetailsScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {SearchScreen} from './src/screens/SearchScreen';
import {ShelfScreen} from './src/screens/ShelfScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {colors} from './src/theme/colors';

type Screen = 'splash' | 'home' | 'search' | 'shelf' | 'details';
function mergeBooks(...groups: Book[][]): Book[] {
  const byId = new Map<string, Book>();
  groups.flat().forEach(book => byId.set(book.id, book));
  return Array.from(byId.values());
}
function sameBook(left: Book, right: Book): boolean {
  return left.id === right.id || left.title.trim().toLowerCase() === right.title.trim().toLowerCase();
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [shelf, setShelf] = useState<BookEntry[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const [pendingShelfBook, setPendingShelfBook] = useState<Book | null>(null);
  const [catalog, setCatalog] = useState<Book[]>(books);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [bookOfMonth, setBookOfMonth] = useState<Book | undefined>();
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book>(books[0]);
  const [detailReturnScreen, setDetailReturnScreen] = useState<Screen>('search');
  const {width} = useWindowDimensions();
  const scale = Math.min(width / 390, 1.18);
  const nextCatalogOffset = useRef(LIBRARY_PAGE_SIZE);
  const catalogHasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) { setShelf([]); return; }
    let active = true;
    fetchUserShelf().then(userShelf => { if (active) setShelf(userShelf); }).catch(error => {
      console.warn('Could not load your shelf:', error);
      if (active) Alert.alert('Could not load shelf', 'Please check your connection and try again.');
    });
    return () => { active = false; };
  }, [session?.user.id]);

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(term));
  }, [catalog, query]);

  useEffect(() => {
    if (!isLibraryConfigured) return;
    let active = true;
    fetchLibraryPage(0)
      .then(page => {
        if (!active) return;
        setCatalog(page.books);
        nextCatalogOffset.current = page.books.length;
        catalogHasMoreRef.current = page.hasMore;
        setCatalogHasMore(page.hasMore);
        setCatalogUnavailable(false);
        const remoteByTitle = new Map(page.books.map(book => [book.title.trim().toLowerCase(), book]));
        setShelf(current => current.map(book => remoteByTitle.get(book.title.trim().toLowerCase()) || book));
      })
      .catch(error => {
        console.warn('Could not load the Supabase library:', error);
        if (active) setCatalogUnavailable(true);
      });
    fetchTopRatedBooks().then(remoteBooks => {
      if (active) setPopularBooks(remoteBooks);
    }).catch(error => console.warn('Could not load top-rated books:', error));
    fetchBookOfTheMonth().then(remoteBook => {
      if (active && remoteBook) setBookOfMonth(remoteBook);
    }).catch(error => console.warn('Could not load the book of the month:', error));
    return () => { active = false; };
  }, []);

  const loadMoreCatalog = useCallback(async () => {
    if (!isLibraryConfigured || loadingMoreRef.current || !catalogHasMoreRef.current) return;
    loadingMoreRef.current = true;
    setCatalogLoadingMore(true);
    try {
      const page = await fetchLibraryPage(nextCatalogOffset.current);
      nextCatalogOffset.current += page.books.length;
      catalogHasMoreRef.current = page.hasMore;
      setCatalogHasMore(page.hasMore);
      setCatalog(current => mergeBooks(current, page.books));
      const remoteByTitle = new Map(page.books.map(book => [book.title.trim().toLowerCase(), book]));
      setShelf(current => current.map(book => remoteByTitle.get(book.title.trim().toLowerCase()) || book));
    } catch (error) {
      console.warn('Could not load the next library page:', error);
      catalogHasMoreRef.current = false;
      setCatalogHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setCatalogLoadingMore(false);
    }
  }, []);

  const openBook = (book: Book) => {
    if (screen !== 'details') setDetailReturnScreen(screen);
    setSelectedBook(book);
    setScreen('details');
  };

  const addToShelf = async (book: Book) => {
    if (!session?.user.id) {
      setPendingShelfBook(book);
      setAuthVisible(true);
      return;
    }
    if (shelf.some(item => sameBook(item, book))) return;
    try {
      const bookId = await addBookToUserShelf(session.user.id, book);
      setShelf(current => current.some(item => item.id === bookId || sameBook(item, book)) ? current : [...current, {...book, id: bookId}]);
    } catch (error) {
      console.warn('Could not save book to your shelf:', error);
      Alert.alert('Could not add book', 'Please try again. If this continues, refresh the catalog and retry.');
    }
  };

  const removeFromShelf = (book: Book) => {
    if (!session?.user.id) return;
    removeBookFromUserShelf(session.user.id, book.id).then(() => setShelf(current => current.filter(item => item.id !== book.id))).catch(error => {
      console.warn('Could not remove book from your shelf:', error);
      Alert.alert('Could not remove book', 'Please try again.');
    });
  };

  const finishAuthentication = async () => {
    const {data} = await supabase!.auth.getSession();
    const nextSession = data.session;
    setSession(nextSession);
    if (nextSession && pendingShelfBook) {
      const book = pendingShelfBook;
      try {
        const bookId = await addBookToUserShelf(nextSession.user.id, book);
        setShelf(current => current.some(item => item.id === bookId || sameBook(item, book)) ? current : [...current, {...book, id: bookId}]);
      } catch (error) {
        console.warn('Could not save book to your shelf:', error);
        Alert.alert('Could not add book', 'Your account is ready, but this book could not be added. Please try again.');
      }
      setPendingShelfBook(null);
    }
    setAuthVisible(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    const {error} = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
    else { setShelf([]); setScreen('home'); }
  };

  const requestSignIn = () => {
    setPendingShelfBook(null);
    setAuthVisible(true);
  };

  const openBookFile = (file: BookFile) => {
    Linking.openURL(file.publicUrl).catch(() => {
      Alert.alert('Unable to open file', `Could not open ${file.fileName}.`);
    });
  };

  const confirmRemoveFromShelf = (book: Book) => {
    Alert.alert(
      'Remove book from shelf?',
      `Are you sure you want to remove “${book.title}” from your shelf?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => removeFromShelf(book)},
      ],
    );
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'details') {
        setScreen(detailReturnScreen);
        return true;
      }
      if (screen === 'search' || screen === 'shelf') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, detailReturnScreen]);

  const detailBackLabel = detailReturnScreen === 'home' ? 'Back To Home' : detailReturnScreen === 'shelf' ? 'Back To Shelf' : 'Back To Search';
  const selectedShelfBook = shelf.find(book => sameBook(book, selectedBook));

  const body = screen === 'splash' ? <SplashScreen onReady={() => setScreen('home')} />
    : screen === 'home' ? <HomeScreen books={catalog} popularBooks={popularBooks} bookOfMonth={bookOfMonth} catalogUnavailable={catalogUnavailable} onSearch={() => setScreen('search')} onBookPress={openBook} />
    : screen === 'search' ? <SearchScreen query={query} onQueryChange={setQuery} books={filteredBooks} hasMore={catalogHasMore} loadingMore={catalogLoadingMore} onLoadMore={loadMoreCatalog} catalogUnavailable={catalogUnavailable} onBookPress={openBook} />
    : screen === 'shelf' ? <ShelfScreen books={shelf} signedIn={Boolean(session)} email={session?.user.email} onSignIn={requestSignIn} onSignOut={signOut} onBookPress={openBook} onRemove={confirmRemoveFromShelf} />
    : <BookDetailsScreen book={selectedBook} books={catalog} inShelf={Boolean(selectedShelfBook)} backLabel={detailBackLabel} onAdd={() => addToShelf(selectedBook)} onRemove={() => confirmRemoveFromShelf(selectedShelfBook || selectedBook)} onOpenFile={openBookFile} onBack={() => setScreen(detailReturnScreen)} onBookPress={openBook} />;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={[styles.canvas, {width: 390 * scale}]}>
      {body}
      {screen !== 'splash' && <BottomTabBar screen={screen} onNavigate={setScreen} />}
    </View>
    <Modal visible={authVisible} transparent animationType="slide" onRequestClose={() => { setAuthVisible(false); setPendingShelfBook(null); }}>
      <View style={styles.authBackdrop}>
        <View style={styles.authModal}>
          <AuthScreen onAuthenticated={finishAuthentication} onBack={() => { setAuthVisible(false); setPendingShelfBook(null); }} />
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.blue, alignItems: 'center'},
  canvas: {flex: 1, maxWidth: 456, overflow: 'hidden', backgroundColor: colors.white},
  authBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)'},
  authModal: {height: '90%', overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.white},
});

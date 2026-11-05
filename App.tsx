import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, BackHandler, Linking, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Session} from '@supabase/supabase-js';
import {BottomTabBar} from './src/components/BottomTabBar';
import {Book, BookEntry, BookFile} from './src/data/books';
import {fetchLibraryPage, fetchTopRatedBooks, isLibraryConfigured, LIBRARY_PAGE_SIZE} from './src/data/libraryApi';
import {addBookToUserShelf, fetchUserShelf, MAX_BOOKS_PER_SHELF, removeBookFromUserShelf} from './src/data/shelfApi';
import {supabase} from './src/data/supabaseClient';
import {AuthScreen} from './src/screens/AuthScreen';
import {BookDetailsScreen} from './src/screens/BookDetailsScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {PdfReaderScreen} from './src/screens/PdfReaderScreen';
import {SearchScreen} from './src/screens/SearchScreen';
import {ShelfScreen} from './src/screens/ShelfScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {colors} from './src/theme/colors';

type Screen = 'splash' | 'home' | 'search' | 'shelf' | 'details' | 'reader';
function mergeBooks(...groups: Book[][]): Book[] {
  const byId = new Map<string, Book>();
  groups.flat().forEach(book => byId.set(book.id, book));
  return Array.from(byId.values());
}
function sameBook(left: Book, right: Book): boolean {
  return left.id === right.id || left.title.trim().toLowerCase() === right.title.trim().toLowerCase();
}
function shelfErrorMessage(error: unknown): string {
  const detail = error && typeof error === 'object' ? error as {message?: string; code?: string} : undefined;
  const message = detail?.message || (error instanceof Error ? error.message : String(error));
  if (detail?.code === '23514' || /shelf limit.*10|at most 10 books/i.test(message)) {
    return 'Your shelf is full. You can save up to 10 books; remove one before adding another.';
  }
  if (/user_books|PGRST205|42P01/i.test(message) && /missing|not exist|schema cache|relation|table/i.test(message)) {
    return 'The Supabase shelf table is missing. Run supabase/migrations/20261104000000_create_user_books.sql in the Supabase SQL Editor.';
  }
  if (/row-level security|42501|permission denied/i.test(message)) {
    return 'Supabase denied this shelf change. Apply the user_books migration so its user-specific access policies are installed.';
  }
  if (/foreign key|23503/i.test(message)) {
    return 'This book is not present in the Supabase catalog yet. Refresh the catalog and try another listed book.';
  }
  return message;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [shelf, setShelf] = useState<BookEntry[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingShelfBook, setPendingShelfBook] = useState<Book | null>(null);
  const [catalog, setCatalog] = useState<Book[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [randomBookOfMonth, setRandomBookOfMonth] = useState<Book | undefined>();
  const [selectedBookOfMonthId, setSelectedBookOfMonthId] = useState<string | null>(null);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [shelfRefreshing, setShelfRefreshing] = useState(false);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedFile, setSelectedFile] = useState<BookFile | null>(null);
  const [detailReturnScreen, setDetailReturnScreen] = useState<Screen>('search');
  const {width} = useWindowDimensions();
  const scale = Math.min(width / 390, 1.18);
  const nextCatalogOffset = useRef(LIBRARY_PAGE_SIZE);
  const catalogHasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const refreshingCatalogRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) { setShelf([]); return; }
    let active = true;
    Promise.all([
      fetchUserShelf(),
      AsyncStorage.getItem(`readersity.bookOfMonth.${session.user.id}`),
    ]).then(([userShelf, savedBookId]) => {
      if (!active) return;
      setShelf(userShelf);
      setSelectedBookOfMonthId(savedBookId && userShelf.some(book => book.id === savedBookId) ? savedBookId : null);
    }).catch(error => {
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
        setRandomBookOfMonth(page.books.length ? page.books[Math.floor(Math.random() * page.books.length)] : undefined);
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
    return () => { active = false; };
  }, []);

  const loadMoreCatalog = useCallback(async () => {
    if (!isLibraryConfigured || refreshingCatalogRef.current || loadingMoreRef.current || !catalogHasMoreRef.current) return;
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

  const refreshCatalog = useCallback(async () => {
    if (refreshingCatalogRef.current || loadingMoreRef.current) return;
    refreshingCatalogRef.current = true;
    setCatalogRefreshing(true);
    try {
      if (!isLibraryConfigured) {
        setCatalogUnavailable(true);
        return;
      }
      const page = await fetchLibraryPage(0);
      setCatalog(page.books);
      setRandomBookOfMonth(page.books.length ? page.books[Math.floor(Math.random() * page.books.length)] : undefined);
      nextCatalogOffset.current = page.books.length;
      catalogHasMoreRef.current = page.hasMore;
      setCatalogHasMore(page.hasMore);
      setCatalogUnavailable(false);
    } catch (error) {
      console.warn('Could not refresh the Supabase library:', error);
      Alert.alert('Could not refresh books', 'Check your connection and pull down to try again.');
    } finally {
      refreshingCatalogRef.current = false;
      setCatalogRefreshing(false);
    }
  }, []);

  const refreshShelf = useCallback(async () => {
    if (!session?.user.id || shelfRefreshing) return;
    setShelfRefreshing(true);
    try {
      const nextShelf = await fetchUserShelf();
      setShelf(nextShelf);
      if (selectedBookOfMonthId && !nextShelf.some(book => book.id === selectedBookOfMonthId)) {
        setSelectedBookOfMonthId(null);
        await AsyncStorage.removeItem(`readersity.bookOfMonth.${session.user.id}`);
      }
    } catch (error) {
      console.warn('Could not refresh your shelf:', error);
      Alert.alert('Could not refresh shelf', 'Check your connection and pull down to try again.');
    } finally {
      setShelfRefreshing(false);
    }
  }, [session?.user.id, selectedBookOfMonthId, shelfRefreshing]);

  const setBookOfMonthFromShelf = useCallback(async (book: Book) => {
    if (!session?.user.id || !shelf.some(item => item.id === book.id)) return;
    try {
      await AsyncStorage.setItem(`readersity.bookOfMonth.${session.user.id}`, book.id);
      setSelectedBookOfMonthId(book.id);
    } catch (error) {
      console.warn('Could not save your Book of the Month:', error);
      Alert.alert('Could not update Book of the Month', 'Please try again.');
    }
  }, [session?.user.id, shelf]);

  const openBook = (book: Book) => {
    if (screen !== 'details') setDetailReturnScreen(screen);
    setSelectedBook(book);
    setScreen('details');
  };

  const addToShelf = async (book: Book) => {
    if (shelf.some(item => sameBook(item, book))) return;
    if (shelf.length >= MAX_BOOKS_PER_SHELF) {
      Alert.alert('Shelf is full', `You can save up to ${MAX_BOOKS_PER_SHELF} books. Remove one before adding another.`);
      return;
    }
    if (!session?.user.id) {
      setPendingShelfBook(book);
      setScreen('shelf');
      return;
    }
    try {
      const bookId = await addBookToUserShelf(session.user.id, book);
      setShelf(current => current.some(item => item.id === bookId || sameBook(item, book)) ? current : [...current, {...book, id: bookId}]);
    } catch (error) {
      console.warn('Could not save book to your shelf:', error);
      Alert.alert('Could not add book', shelfErrorMessage(error));
    }
  };

  const removeFromShelf = (book: Book) => {
    if (!session?.user.id) return;
    removeBookFromUserShelf(session.user.id, book.id).then(() => {
      setShelf(current => current.filter(item => item.id !== book.id));
      if (selectedBookOfMonthId === book.id) {
        setSelectedBookOfMonthId(null);
        AsyncStorage.removeItem(`readersity.bookOfMonth.${session.user.id}`).catch(error => console.warn('Could not clear your Book of the Month:', error));
      }
    }).catch(error => {
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
        Alert.alert('Could not add book', shelfErrorMessage(error));
      }
      setPendingShelfBook(null);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const {error} = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
    else { setShelf([]); setSelectedBookOfMonthId(null); setScreen('home'); }
  };

  const openBookFile = (file: BookFile) => {
    if (file.format !== 'pdf') {
      Linking.openURL(file.publicUrl).catch(() => {
        Alert.alert('Unable to open file', `Could not open ${file.fileName}.`);
      });
      return;
    }
    setSelectedFile(file);
    setScreen('reader');
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
      if (screen === 'reader') {
        setScreen('details');
        return true;
      }
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
  const selectedShelfBook = selectedBook ? shelf.find(book => sameBook(book, selectedBook)) : undefined;
  const bookOfMonth = (session ? shelf.find(book => book.id === selectedBookOfMonthId) : undefined) || randomBookOfMonth;

  const body = screen === 'splash' ? <SplashScreen onReady={() => setScreen('home')} />
    : screen === 'home' ? <HomeScreen books={catalog} popularBooks={popularBooks} bookOfMonth={bookOfMonth} catalogUnavailable={catalogUnavailable} onSearch={() => setScreen('search')} onBookPress={openBook} />
    : screen === 'search' ? <SearchScreen query={query} onQueryChange={setQuery} books={filteredBooks} hasMore={catalogHasMore} loadingMore={catalogLoadingMore} refreshing={catalogRefreshing} onRefresh={refreshCatalog} onLoadMore={loadMoreCatalog} catalogUnavailable={catalogUnavailable} onBookPress={openBook} />
    : screen === 'shelf' ? <ShelfScreen books={shelf} signedIn={Boolean(session)} email={session?.user.email} refreshing={shelfRefreshing} onRefresh={refreshShelf} onAuthenticated={finishAuthentication} onContinueBrowsing={() => { setPendingShelfBook(null); setScreen('home'); }} onSignOut={signOut} onBookPress={openBook} onSetBookOfMonth={setBookOfMonthFromShelf} onRemove={removeFromShelf} />
    : screen === 'details' && selectedBook ? <BookDetailsScreen book={selectedBook} books={catalog} inShelf={Boolean(selectedShelfBook)} backLabel={detailBackLabel} onAdd={() => addToShelf(selectedBook)} onRemove={() => confirmRemoveFromShelf(selectedShelfBook || selectedBook)} onOpenFile={openBookFile} onBack={() => setScreen(detailReturnScreen)} onBookPress={openBook} />
    : screen === 'reader' && selectedBook && selectedFile ? <PdfReaderScreen file={selectedFile} title={selectedBook.title} onBack={() => setScreen('details')} />
    : <HomeScreen books={catalog} popularBooks={popularBooks} bookOfMonth={bookOfMonth} catalogUnavailable={catalogUnavailable} onSearch={() => setScreen('search')} onBookPress={openBook} />;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={[styles.canvas, {width: 390 * scale}]}>
      {body}
      {screen !== 'splash' && screen !== 'reader' && <BottomTabBar screen={screen} onNavigate={setScreen} />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.blue, alignItems: 'center'},
  canvas: {flex: 1, maxWidth: 456, overflow: 'hidden', backgroundColor: colors.white},
});

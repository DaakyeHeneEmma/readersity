import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, BackHandler, Linking, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';
import {BottomTabBar} from './src/components/BottomTabBar';
import {Book, BookEntry, BookFile, books, initialShelf} from './src/data/books';
import {fetchBookOfTheMonth, fetchLibraryPage, fetchTopRatedBooks, isLibraryConfigured, LIBRARY_PAGE_SIZE} from './src/data/libraryApi';
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

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [shelf, setShelf] = useState<BookEntry[]>(initialShelf);
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

  const addToShelf = (book: Book) => {
    setShelf(current => current.some(item => item.id === book.id) ? current : [...current, book]);
  };

  const removeFromShelf = (book: Book) => {
    setShelf(current => current.filter(item => item.id !== book.id));
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

  const body = screen === 'splash' ? <SplashScreen onReady={() => setScreen('home')} />
    : screen === 'home' ? <HomeScreen books={catalog} popularBooks={popularBooks} bookOfMonth={bookOfMonth} catalogUnavailable={catalogUnavailable} onSearch={() => setScreen('search')} onBookPress={openBook} />
    : screen === 'search' ? <SearchScreen query={query} onQueryChange={setQuery} books={filteredBooks} hasMore={catalogHasMore} loadingMore={catalogLoadingMore} onLoadMore={loadMoreCatalog} catalogUnavailable={catalogUnavailable} onBookPress={openBook} />
    : screen === 'shelf' ? <ShelfScreen books={shelf} onBookPress={openBook} onRemove={confirmRemoveFromShelf} />
    : <BookDetailsScreen book={selectedBook} books={catalog} inShelf={shelf.some(book => book.id === selectedBook.id)} backLabel={detailBackLabel} onAdd={() => addToShelf(selectedBook)} onRemove={() => confirmRemoveFromShelf(selectedBook)} onOpenFile={openBookFile} onBack={() => setScreen(detailReturnScreen)} onBookPress={openBook} />;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={[styles.canvas, {width: 390 * scale}]}>
      {body}
      {screen !== 'splash' && <BottomTabBar screen={screen} onNavigate={setScreen} />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.blue, alignItems: 'center'},
  canvas: {flex: 1, maxWidth: 456, overflow: 'hidden', backgroundColor: colors.white},
});

import React, {useEffect, useMemo, useState} from 'react';
import {Alert, BackHandler, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';
import {BottomTabBar} from './src/components/BottomTabBar';
import {Book, BookEntry, books, initialShelf} from './src/data/books';
import {BookDetailsScreen} from './src/screens/BookDetailsScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {SearchScreen} from './src/screens/SearchScreen';
import {ShelfScreen} from './src/screens/ShelfScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {colors} from './src/theme/colors';

type Screen = 'splash' | 'home' | 'search' | 'shelf' | 'details';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [shelf, setShelf] = useState<BookEntry[]>(initialShelf);
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book>(books[0]);
  const [detailReturnScreen, setDetailReturnScreen] = useState<Screen>('search');
  const {width} = useWindowDimensions();
  const scale = Math.min(width / 390, 1.18);

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(term));
  }, [query]);

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
    : screen === 'home' ? <HomeScreen onSearch={() => setScreen('search')} onBookPress={openBook} />
    : screen === 'search' ? <SearchScreen query={query} onQueryChange={setQuery} books={filteredBooks} onBookPress={openBook} />
    : screen === 'shelf' ? <ShelfScreen books={shelf} onBookPress={openBook} onRemove={confirmRemoveFromShelf} />
    : <BookDetailsScreen book={selectedBook} inShelf={shelf.some(book => book.id === selectedBook.id)} backLabel={detailBackLabel} onAdd={() => addToShelf(selectedBook)} onRemove={() => confirmRemoveFromShelf(selectedBook)} onBack={() => setScreen(detailReturnScreen)} onBookPress={openBook} />;

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

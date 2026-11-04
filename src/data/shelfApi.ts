import {Book, BookEntry} from './books';
import {supabase} from './supabaseClient';

type ShelfRow = {
  book_id: string;
  library_books: {
    id: string;
    title: string;
    authors: string[] | null;
    description: string | null;
    cover_path: string | null;
    rating: number | string | null;
  } | null;
};

function coverUrl(path: string): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
  const bucket = process.env.EXPO_PUBLIC_SUPABASE_LIBRARY_BUCKET || 'library-files';
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function fetchUserShelf(): Promise<BookEntry[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const {data, error} = await supabase.from('user_books').select('book_id, library_books(id,title,authors,description,cover_path,rating)').order('created_at', {ascending: false});
  if (error) throw error;
  return ((data || []) as unknown as ShelfRow[]).flatMap(row => {
    const book = row.library_books;
    if (!book) return [];
    const mapped: Book = {
      id: book.id,
      title: book.title,
      author: book.authors?.length ? book.authors.join(', ') : 'Unknown author',
      summary: book.description || '',
      cover: book.cover_path ? {uri: coverUrl(book.cover_path)} : undefined,
      rating: book.rating == null ? undefined : String(book.rating),
    };
    return [mapped];
  });
}

export async function addBookToUserShelf(userId: string, book: Book): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  let bookId = book.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId)) {
    const {data, error: lookupError} = await supabase.from('library_books').select('id').eq('title', book.title).maybeSingle();
    if (lookupError) throw lookupError;
    if (!data) throw new Error('This book is not in the online catalog yet.');
    bookId = data.id;
  }
  const {error} = await supabase.from('user_books').upsert({user_id: userId, book_id: bookId}, {onConflict: 'user_id,book_id', ignoreDuplicates: true});
  if (error) throw error;
  return bookId;
}

export async function removeBookFromUserShelf(userId: string, bookId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const {error} = await supabase.from('user_books').delete().eq('user_id', userId).eq('book_id', bookId);
  if (error) throw error;
}

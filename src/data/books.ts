import type {ImageSourcePropType} from 'react-native';

export type Book = {
  id: string;
  title: string;
  author: string;
  cover?: ImageSourcePropType;
  summary?: string;
  rating?: string;
  files?: BookFile[];
};

export type BookFile = {
  id: string;
  format: 'pdf' | 'epub';
  fileName: string;
  publicUrl: string;
  mimeType: string;
  fileSizeBytes: number;
};

export type BookEntry = Book;

export const assets = {
  hero: require('../../assets/optimized/home-hero.png'),
  searchHeader: require('../../assets/optimized/search-header.jpg'),
  shelfHeader: require('../../assets/optimized/shelf-header.jpg'),
  logo: require('../../assets/optimized/brand-art.png'),
};

import type {ImageSourcePropType} from 'react-native';

export type Book = {
  id: string;
  title: string;
  author: string;
  cover?: ImageSourcePropType;
  summary?: string;
  rating?: string;
};

export type BookEntry = Book;

export const assets = {
  hero: require('../../assets/optimized/home-hero.png'),
  searchHeader: require('../../assets/optimized/search-header.jpg'),
  shelfHeader: require('../../assets/optimized/shelf-header.jpg'),
  alchemist: require('../../assets/optimized/alchemist.jpg'),
  eatThatFrog: require('../../assets/optimized/eat-that-frog.jpg'),
  sevenHabits: require('../../assets/optimized/seven-habits.jpg'),
  virgin: require('../../assets/optimized/featured-cover.jpg'),
  focus: require('../../assets/optimized/power-of-focus.jpg'),
  miracle: require('../../assets/optimized/miracle-morning.jpg'),
  club: require('../../assets/optimized/5am-club.jpg'),
  elon: require('../../assets/optimized/elon-musk.jpg'),
  subtle: require('../../assets/optimized/subtle-art.jpg'),
  zero: require('../../assets/optimized/zero-to-one.jpg'),
  logo: require('../../assets/optimized/brand-art.png'),
};

export const books: Book[] = [
  {
    id: 'virgin-way', title: 'The Virgin Way', author: 'Richard Branson', cover: assets.virgin,
    summary: 'Richard Branson shares lessons on leadership, business, listening, and building a company with a human touch.', rating: '4.5',
  },
  {
    id: 'elon-musk', title: 'Elon Musk', author: 'Walter Isaacson', cover: assets.elon,
    summary: 'When Elon Musk was a kid in South Africa, he was regularly beaten by bullies. This biography follows the experiences and ambitions that shaped his life and work.', rating: '4.5',
  },
  {
    id: 'subtle-art', title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', cover: assets.subtle,
    summary: 'Mark Manson challenges familiar ideas about positivity and offers a practical look at choosing what deserves your attention.', rating: '4.2',
  },
  {
    id: 'zero-to-one', title: 'Zero to One', author: 'Peter Thiel', cover: assets.zero,
    summary: 'Peter Thiel explores how people can build new things and create lasting value by moving from zero to one.', rating: '4.1',
  },
  {
    id: 'alchemist', title: 'The Alchemist', author: 'Paulo Coelho', cover: assets.alchemist,
    summary: 'A young shepherd travels in search of a treasure and discovers lessons about following his dreams.', rating: '4.6',
  },
  {
    id: 'eat-that-frog', title: 'Eat That Frog', author: 'Brian Tracy', cover: assets.eatThatFrog,
    summary: 'Brian Tracy shares practical ways to tackle important tasks and make better use of your time.', rating: '4.3',
  },
  {
    id: 'seven-habits', title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', cover: assets.sevenHabits,
    summary: 'Stephen R. Covey presents principles for personal effectiveness, relationships, and lasting growth.', rating: '4.5',
  },
  {
    id: 'power-of-focus', title: 'The Power of Focus', author: 'Jack Canfield, Mark Victor Hansen & Les Hewitt', cover: assets.focus,
    summary: 'Practical strategies for improving focus and reaching personal and professional goals.', rating: '4.2',
  },
  {
    id: 'miracle-morning', title: 'The Miracle Morning', author: 'Hal Elrod', cover: assets.miracle,
    summary: 'A morning routine designed to help readers build habits for a more purposeful day.', rating: '4.3',
  },
  {
    id: '5am-club', title: 'The 5AM Club', author: 'Robin Sharma', cover: assets.club,
    summary: 'A story about building a morning routine around focus, personal growth, and wellbeing.', rating: '4.1',
  },
];

const initialShelfIds = new Set(['alchemist', 'eat-that-frog', 'seven-habits']);
export const initialShelf: BookEntry[] = books.filter(book => initialShelfIds.has(book.id));

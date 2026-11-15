export const BOOK_GENRES = [
  'Fiction',
  'Non-Fiction',
  'Philosophy',
  'Science & Nature',
  'Sci-Fi & Fantasy',
  'Biography & History',
  'Design & Art',
  'Psychology',
  'Poetry',
  'Other',
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];

export const BOOK_FIELD_LIMITS = {
  MAX_ID_LENGTH: 128,
  MAX_TITLE_LENGTH: 200,
  MAX_AUTHOR_LENGTH: 150,
  MAX_SUMMARY_LENGTH: 5000,
  MAX_TAKEAWAY_LENGTH: 500,
  MAX_DATE_LENGTH: 32,
  MAX_COVER_LENGTH: 350000,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

export interface BookRecord {
  id: string;
  ownerId: string;
  title: string;
  author: string;
  genre: BookGenre;
  rating: 1 | 2 | 3 | 4 | 5;
  summary: string;
  keyTakeaway: string;
  dateFinished: string;
  coverImage: string;
  createdAtMs: number;
  updatedAtMs: number;
  isSample?: boolean;
}

export interface BookDraftInput {
  title: string;
  author: string;
  genre: BookGenre;
  rating: 1 | 2 | 3 | 4 | 5;
  summary: string;
  keyTakeaway: string;
  dateFinished: string;
  coverImage: string;
}

export type SortOption = 'recent' | 'rating-desc' | 'title-asc' | 'finished-desc';
export type ViewMode = 'grid' | 'catalog';

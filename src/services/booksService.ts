import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BOOK_FIELD_LIMITS,
  BOOK_GENRES,
  BookDraftInput,
  BookGenre,
  BookRecord,
} from '../types/book';
import { STARTER_BOOK_DRAFTS } from '../data/starterBooks';

const BOOKS_COLLECTION = 'books';

function sanitizeBookId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleaned || cleaned.length > BOOK_FIELD_LIMITS.MAX_ID_LENGTH) {
    throw new Error('Invalid document identifier.');
  }
  return cleaned;
}

function generateBookId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `book_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDraftInput(draft: BookDraftInput): BookDraftInput {
  const title = draft.title.trim().slice(0, BOOK_FIELD_LIMITS.MAX_TITLE_LENGTH);
  const author = draft.author.trim().slice(0, BOOK_FIELD_LIMITS.MAX_AUTHOR_LENGTH);
  const summary = draft.summary.trim().slice(0, BOOK_FIELD_LIMITS.MAX_SUMMARY_LENGTH);
  const keyTakeaway = draft.keyTakeaway.trim().slice(0, BOOK_FIELD_LIMITS.MAX_TAKEAWAY_LENGTH);
  const dateFinished = draft.dateFinished.trim().slice(0, BOOK_FIELD_LIMITS.MAX_DATE_LENGTH);
  const coverImage = draft.coverImage.trim().slice(0, BOOK_FIELD_LIMITS.MAX_COVER_LENGTH);

  if (!title) {
    throw new Error('Book title is required.');
  }
  if (!author) {
    throw new Error('Author name is required.');
  }
  if (!BOOK_GENRES.includes(draft.genre)) {
    throw new Error('Please choose a valid genre.');
  }
  const rating = Math.min(5, Math.max(1, Math.round(Number(draft.rating)))) as 1 | 2 | 3 | 4 | 5;

  return {
    title,
    author,
    genre: draft.genre,
    rating,
    summary,
    keyTakeaway,
    dateFinished,
    coverImage,
  };
}

function mapSnapshotDoc(id: string, data: Record<string, unknown>): BookRecord {
  const genreCandidate = typeof data.genre === 'string' ? data.genre : 'Other';
  const genre: BookGenre = (BOOK_GENRES as readonly string[]).includes(genreCandidate)
    ? (genreCandidate as BookGenre)
    : 'Other';

  const rawRating = typeof data.rating === 'number' ? data.rating : 3;
  const rating = Math.min(5, Math.max(1, Math.round(rawRating))) as 1 | 2 | 3 | 4 | 5;

  const createdAtMs =
    data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  const updatedAtMs =
    data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : createdAtMs;

  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    author: typeof data.author === 'string' ? data.author : 'Unknown Author',
    genre,
    rating,
    summary: typeof data.summary === 'string' ? data.summary : '',
    keyTakeaway: typeof data.keyTakeaway === 'string' ? data.keyTakeaway : '',
    dateFinished: typeof data.dateFinished === 'string' ? data.dateFinished : '',
    coverImage: typeof data.coverImage === 'string' ? data.coverImage : '',
    createdAtMs,
    updatedAtMs,
  };
}

export function subscribeToUserBooks(
  ownerId: string,
  onData: (books: BookRecord[]) => void,
  onError: (error: Error) => void
): () => void {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const books = snapshot.docs
        .map((docSnap) => mapSnapshotDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(books);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, BOOKS_COLLECTION);
      } catch (wrappedError) {
        onError(
          wrappedError instanceof Error
            ? wrappedError
            : new Error('Unable to load your library.')
        );
      }
    }
  );
}

export async function createUserBook(
  ownerId: string,
  draft: BookDraftInput
): Promise<string> {
  const safeOwnerId = sanitizeBookId(ownerId);
  const normalized = normalizeDraftInput(draft);
  const bookId = generateBookId();
  const docPath = `${BOOKS_COLLECTION}/${bookId}`;

  try {
    await setDoc(doc(db, BOOKS_COLLECTION, bookId), {
      ownerId: safeOwnerId,
      title: normalized.title,
      author: normalized.author,
      genre: normalized.genre,
      rating: normalized.rating,
      summary: normalized.summary,
      keyTakeaway: normalized.keyTakeaway,
      dateFinished: normalized.dateFinished,
      coverImage: normalized.coverImage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return bookId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateUserBook(
  bookId: string,
  draft: BookDraftInput
): Promise<void> {
  const safeId = sanitizeBookId(bookId);
  const normalized = normalizeDraftInput(draft);
  const docPath = `${BOOKS_COLLECTION}/${safeId}`;

  try {
    await updateDoc(doc(db, BOOKS_COLLECTION, safeId), {
      title: normalized.title,
      author: normalized.author,
      genre: normalized.genre,
      rating: normalized.rating,
      summary: normalized.summary,
      keyTakeaway: normalized.keyTakeaway,
      dateFinished: normalized.dateFinished,
      coverImage: normalized.coverImage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteUserBook(bookId: string): Promise<void> {
  const safeId = sanitizeBookId(bookId);
  const docPath = `${BOOKS_COLLECTION}/${safeId}`;

  try {
    await deleteDoc(doc(db, BOOKS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function seedStarterBooksForUser(ownerId: string): Promise<void> {
  const safeOwnerId = sanitizeBookId(ownerId);
  const batch = writeBatch(db);

  for (const draft of STARTER_BOOK_DRAFTS) {
    const normalized = normalizeDraftInput(draft);
    const bookId = generateBookId();
    const ref = doc(db, BOOKS_COLLECTION, bookId);
    batch.set(ref, {
      ownerId: safeOwnerId,
      title: normalized.title,
      author: normalized.author,
      genre: normalized.genre,
      rating: normalized.rating,
      summary: normalized.summary,
      keyTakeaway: normalized.keyTakeaway,
      dateFinished: normalized.dateFinished,
      coverImage: normalized.coverImage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, BOOKS_COLLECTION);
  }
}

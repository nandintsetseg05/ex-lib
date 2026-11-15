import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  BookOpen,
  LayoutGrid,
  Library,
  List,
  LogIn,
  LogOut,
  Plus,
  Search,
} from 'lucide-react';
import { BookCoverImage } from './components/BookCoverImage';
import { BookDetailModal } from './components/BookDetailModal';
import { BookFormModal } from './components/BookFormModal';
import { StarRating } from './components/StarRating';
import { buildSampleBooks } from './data/starterBooks';
import { auth, googleProvider } from './lib/firebase';
import {
  createUserBook,
  deleteUserBook,
  seedStarterBooksForUser,
  subscribeToUserBooks,
  updateUserBook,
} from './services/booksService';
import {
  BOOK_GENRES,
  BookDraftInput,
  BookGenre,
  BookRecord,
  SortOption,
  ViewMode,
} from './types/book';

const LOCAL_PREVIEW_STORAGE_KEY = 'exlibris_preview_books_v1';

type RatingFilter = 'all' | '5' | '4plus' | '3plus' | 'under3';

function loadPreviewBooks(): BookRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_PREVIEW_STORAGE_KEY);
    if (!raw) return buildSampleBooks();
    const parsed = JSON.parse(raw) as BookRecord[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return buildSampleBooks();
  } catch {
    return buildSampleBooks();
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [cloudBooks, setCloudBooks] = useState<BookRecord[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [previewBooks, setPreviewBooks] = useState<BookRecord[]>(() =>
    loadPreviewBooks()
  );

  // Filters & browsing state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<'All' | BookGenre>('All');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);

  const shelfRef = useRef<HTMLElement>(null);
  const genreBarRef = useRef<HTMLDivElement>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time subscription when signed in
  useEffect(() => {
    if (!authReady || !user) {
      setCloudBooks([]);
      setBooksLoading(false);
      setBooksError(null);
      return;
    }

    setBooksLoading(true);
    setBooksError(null);
    const unsubscribe = subscribeToUserBooks(
      user.uid,
      (books) => {
        setCloudBooks(books);
        setBooksLoading(false);
      },
      (error) => {
        setBooksError(error.message);
        setBooksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Persist local preview edits when browsing signed out
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(
        LOCAL_PREVIEW_STORAGE_KEY,
        JSON.stringify(previewBooks)
      );
    } catch {
      // Ignore quota errors in local preview mode
    }
  }, [previewBooks, user]);

  const activeBooks = user ? cloudBooks : previewBooks;

  const selectedBook = useMemo(
    () => activeBooks.find((b) => b.id === selectedBookId) ?? null,
    [activeBooks, selectedBookId]
  );

  // Metrics for the 4-column strip
  const stats = useMemo(() => {
    const total = activeBooks.length;
    const uniqueGenres = new Set(activeBooks.map((b) => b.genre)).size;
    const avgRating =
      total > 0
        ? (
            activeBooks.reduce((sum, b) => sum + b.rating, 0) / total
          ).toFixed(1)
        : '0.0';
    const fiveStarCount = activeBooks.filter((b) => b.rating === 5).length;

    return { total, uniqueGenres, avgRating, fiveStarCount };
  }, [activeBooks]);

  // Genre counts for interactive filter bar
  const genreCounts = useMemo(() => {
    const counts = new Map<BookGenre, number>();
    for (const book of activeBooks) {
      counts.set(book.genre, (counts.get(book.genre) ?? 0) + 1);
    }
    return counts;
  }, [activeBooks]);

  const visibleGenres = useMemo(() => {
    return BOOK_GENRES.filter(
      (g) => (genreCounts.get(g) ?? 0) > 0 || g === selectedGenre
    );
  }, [genreCounts, selectedGenre]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = activeBooks.filter((book) => {
      if (selectedGenre !== 'All' && book.genre !== selectedGenre) {
        return false;
      }

      if (ratingFilter === '5' && book.rating !== 5) return false;
      if (ratingFilter === '4plus' && book.rating < 4) return false;
      if (ratingFilter === '3plus' && book.rating < 3) return false;
      if (ratingFilter === 'under3' && book.rating >= 3) return false;

      if (q) {
        const haystack =
          `${book.title} ${book.author} ${book.genre} ${book.summary} ${book.keyTakeaway}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
    } else if (sortBy === 'rating-desc') {
      sorted.sort((a, b) => b.rating - a.rating || b.createdAtMs - a.createdAtMs);
    } else if (sortBy === 'title-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'finished-desc') {
      sorted.sort((a, b) =>
        (b.dateFinished || '').localeCompare(a.dateFinished || '')
      );
    }

    return sorted;
  }, [activeBooks, searchQuery, selectedGenre, ratingFilter, sortBy]);

  async function handleSignIn() {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Google sign-in was cancelled or blocked.'
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    setSelectedBookId(null);
    await signOut(auth);
  }

  async function handleSaveBook(draft: BookDraftInput) {
    if (user) {
      if (editingBook) {
        await updateUserBook(editingBook.id, draft);
      } else {
        const newId = await createUserBook(user.uid, draft);
        setSelectedBookId(newId);
      }
      return;
    }

    // Local preview fallback when signed out
    const now = Date.now();
    if (editingBook) {
      setPreviewBooks((prev) =>
        prev.map((item) =>
          item.id === editingBook.id
            ? {
                ...item,
                ...draft,
                updatedAtMs: now,
              }
            : item
        )
      );
    } else {
      const newBook: BookRecord = {
        id: `preview-${now}`,
        ownerId: 'preview-reader',
        ...draft,
        createdAtMs: now,
        updatedAtMs: now,
      };
      setPreviewBooks((prev) => [newBook, ...prev]);
      setSelectedBookId(newBook.id);
    }
  }

  async function handleQuickSaveSummary(
    book: BookRecord,
    summary: string,
    keyTakeaway: string,
    rating: 1 | 2 | 3 | 4 | 5
  ) {
    const updatedDraft: BookDraftInput = {
      title: book.title,
      author: book.author,
      genre: book.genre,
      rating,
      summary,
      keyTakeaway,
      dateFinished: book.dateFinished,
      coverImage: book.coverImage,
    };

    if (user) {
      await updateUserBook(book.id, updatedDraft);
      return;
    }

    setPreviewBooks((prev) =>
      prev.map((item) =>
        item.id === book.id
          ? {
              ...item,
              summary: summary.trim(),
              keyTakeaway: keyTakeaway.trim(),
              rating,
              updatedAtMs: Date.now(),
            }
          : item
      )
    );
  }

  async function handleDeleteBook(book: BookRecord) {
    if (user) {
      await deleteUserBook(book.id);
      return;
    }
    setPreviewBooks((prev) => prev.filter((item) => item.id !== book.id));
  }

  async function handleSeedStarterBooks() {
    if (!user) return;
    setIsSeeding(true);
    setBooksError(null);
    try {
      await seedStarterBooksForUser(user.uid);
    } catch (error) {
      setBooksError(
        error instanceof Error ? error.message : 'Unable to load starter books.'
      );
    } finally {
      setIsSeeding(false);
    }
  }

  function openNewBookModal() {
    setEditingBook(null);
    setIsFormOpen(true);
  }

  function openEditBookModal(book: BookRecord) {
    setSelectedBookId(null);
    setEditingBook(book);
    setIsFormOpen(true);
  }

  function resetFilters() {
    setSearchQuery('');
    setSelectedGenre('All');
    setRatingFilter('all');
    setSortBy('recent');
  }

  function scrollToShelf(mode?: 'all' | 'genres' | 'top') {
    if (mode === 'all') {
      resetFilters();
    } else if (mode === 'top') {
      setSelectedGenre('All');
      setRatingFilter('5');
      setSortBy('rating-desc');
    }
    const target = mode === 'genres' ? genreBarRef.current : shelfRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#161513]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#F8F7F4]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4 lg:px-10">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-serif text-xl font-medium tracking-tight text-[#161513] whitespace-nowrap shrink-0"
          >
            Ex Libris
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600"
          >
            <button
              type="button"
              onClick={() => scrollToShelf('all')}
              className="hover:text-[#161513] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              All Books
            </button>
            <button
              type="button"
              onClick={() => scrollToShelf('genres')}
              className="hover:text-[#161513] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Genres
            </button>
            <button
              type="button"
              onClick={() => scrollToShelf('top')}
              className="hover:text-[#161513] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Top Rated
            </button>
            <a
              href="#guide"
              className="hover:text-[#161513] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reading Guide
            </a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openNewBookModal}
              className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#172E6E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Book
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Editorial Intro & Archive Account Strip */}
        <section className="mx-auto max-w-[1360px] px-6 pt-10 pb-8 lg:px-10 lg:pt-12 lg:pb-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="font-mono text-xs uppercase tracking-widest text-stone-500">
                Personal Reading Catalog
              </p>
              <h1 className="mt-2.5 font-serif text-3xl font-medium leading-[1.14] tracking-tight text-[#161513] text-balance sm:text-4xl lg:text-[42px]">
                A quiet archive of books read and ideas kept.
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-600">
                Organize your shelf by genre and rating, upload cover photography for visual browsing, and click any volume to record or revisit what you understood.
              </p>
            </div>

            {/* Clean Account Sync Panel */}
            <div className="lg:col-span-5 lg:flex lg:justify-end">
              <div className="w-full max-w-md rounded-md border border-stone-200 bg-white p-5">
                {!authReady ? (
                  <p className="text-sm text-stone-500">
                    Connecting to reading archive...
                  </p>
                ) : user ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-mono uppercase tracking-wider text-stone-500">
                        Cloud Library Synced
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-[#161513]">
                        {user.displayName || user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 whitespace-nowrap shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-stone-500">
                        Preview Shelf
                      </p>
                      <p className="mt-0.5 text-sm text-stone-700">
                        Sign in to sync your books across devices.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-[#FAF9F6] px-4 py-2 text-xs font-medium text-[#161513] transition-colors hover:bg-stone-200/70 disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <LogIn className="h-3.5 w-3.5 text-[#1E3A8A]" />
                      {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                    </button>
                  </div>
                )}

                {authError && (
                  <p className="mt-2.5 text-xs text-red-700">{authError}</p>
                )}
              </div>
            </div>
          </div>

          {/* 4-Column Archive Summary Strip */}
          <div className="mt-8 grid grid-cols-2 divide-y divide-stone-200 border-y border-stone-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="py-4 pr-4 sm:py-5">
              <p className="text-xs font-medium text-stone-500">Volumes Read</p>
              <p className="mt-1 font-serif text-2xl font-medium text-[#161513] tabular-nums sm:text-3xl">
                {stats.total}
              </p>
            </div>
            <div className="py-4 pl-4 sm:px-6 sm:py-5">
              <p className="text-xs font-medium text-stone-500">Genres Explored</p>
              <p className="mt-1 font-serif text-2xl font-medium text-[#161513] tabular-nums sm:text-3xl">
                {stats.uniqueGenres}
              </p>
            </div>
            <div className="py-4 pr-4 sm:px-6 sm:py-5">
              <p className="text-xs font-medium text-stone-500">Average Rating</p>
              <p className="mt-1 font-serif text-2xl font-medium text-[#161513] tabular-nums sm:text-3xl">
                {stats.avgRating}
                <span className="ml-1 font-mono text-sm font-normal text-stone-400">
                  / 5
                </span>
              </p>
            </div>
            <div className="py-4 pl-4 sm:py-5 sm:pl-6">
              <p className="text-xs font-medium text-stone-500">5-Star Essentials</p>
              <p className="mt-1 font-serif text-2xl font-medium text-[#161513] tabular-nums sm:text-3xl">
                {stats.fiveStarCount}
              </p>
            </div>
          </div>
        </section>

        {/* Workspace Filter & Visual Browsing Section */}
        <section
          ref={shelfRef}
          aria-label="Book collection"
          className="mx-auto max-w-[1360px] px-6 pb-16 lg:px-10"
        >
          {/* Search, Rating, Sort & View Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, author, or what you understood..."
                aria-label="Search books"
                className="w-full rounded-md border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="rating-filter">
                Filter by rating
              </label>
              <select
                id="rating-filter"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                className="rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars Only</option>
                <option value="4plus">4+ Stars</option>
                <option value="3plus">3+ Stars</option>
                <option value="under3">1–2 Stars</option>
              </select>

              <label className="sr-only" htmlFor="sort-select">
                Sort books
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="recent">Recently Added</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="finished-desc">Date Finished</option>
                <option value="title-asc">Title A–Z</option>
              </select>

              <div
                role="group"
                aria-label="Display mode"
                className="inline-flex items-center rounded-md border border-stone-300 bg-white p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === 'grid'
                      ? 'bg-[#161513] text-white'
                      : 'text-stone-600 hover:text-[#161513]'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Covers
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('catalog')}
                  aria-pressed={viewMode === 'catalog'}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === 'catalog'
                      ? 'bg-[#161513] text-white'
                      : 'text-stone-600 hover:text-[#161513]'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Catalog
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Genre Filter Bar */}
          <div
            ref={genreBarRef}
            className="mt-5 flex items-center gap-2 overflow-x-auto border-b border-stone-200 pb-4"
          >
            <button
              type="button"
              onClick={() => setSelectedGenre('All')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedGenre === 'All'
                  ? 'bg-[#161513] text-white'
                  : 'bg-[#EFECE6] text-stone-700 hover:bg-stone-300/70'
              }`}
            >
              All Genres
              <span className="ml-1.5 font-mono opacity-75 tabular-nums">
                {activeBooks.length}
              </span>
            </button>

            {visibleGenres.map((genre) => {
              const count = genreCounts.get(genre) ?? 0;
              const active = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#161513] text-white'
                      : 'bg-[#EFECE6] text-stone-700 hover:bg-stone-300/70'
                  }`}
                >
                  {genre}
                  <span className="ml-1.5 font-mono opacity-75 tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          {booksError && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-900"
            >
              Unable to sync your library right now. Please refresh or check your sign-in session.
            </div>
          )}

          {/* Library Content States */}
          {booksLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="space-y-3">
                  <div className="aspect-[3/4] w-full rounded-sm bg-stone-200/80" />
                  <div className="h-3 w-24 rounded bg-stone-200/80" />
                  <div className="h-5 w-4/5 rounded bg-stone-200/80" />
                </div>
              ))}
            </div>
          ) : activeBooks.length === 0 ? (
            <div className="mt-12 rounded-md border border-stone-200 bg-white px-6 py-16 text-center">
              <BookOpen
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-stone-400"
              />
              <h2 className="mt-4 font-serif text-2xl font-medium text-[#161513]">
                Your personal shelf is ready
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                Start documenting the books you have finished—upload cover photos, assign genres and ratings, and capture what you understood.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openNewBookModal}
                  className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#172E6E]"
                >
                  <Plus className="h-4 w-4" />
                  Document Your First Book
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={handleSeedStarterBooks}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-[#161513] hover:bg-stone-100 disabled:opacity-60"
                  >
                    <Library className="h-4 w-4 text-[#1E3A8A]" />
                    {isSeeding ? 'Adding Starter Books...' : 'Import 5 Starter Books'}
                  </button>
                )}
              </div>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="mt-12 rounded-md border border-stone-200 bg-white px-6 py-14 text-center">
              <p className="font-serif text-xl font-medium text-[#161513]">
                No books match those filters
              </p>
              <p className="mt-1.5 text-sm text-stone-600">
                Try clearing your search query or switching back to all genres and ratings.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-[#161513] hover:bg-stone-100"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Visual Cover Grid */
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredBooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBookId(book.id)}
                  className="group flex flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]"
                >
                  <div className="w-full transition-transform duration-150 ease-out group-hover:-translate-y-1">
                    <BookCoverImage
                      src={book.coverImage}
                      title={book.title}
                      author={book.author}
                      genre={book.genre}
                      className="shadow-sm transition-shadow duration-150 group-hover:shadow-md"
                    />
                  </div>

                  {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                    <span className="truncate max-w-[120px]">{book.genre}</span>
                    <span aria-hidden="true">·</span>
                    <StarRating value={book.rating} size="sm" />
                  </div>

                  <h3 className="mt-1.5 font-serif text-lg font-medium leading-snug text-[#161513] group-hover:text-[#1E3A8A] transition-colors line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-600 truncate w-full">
                    {book.author}
                  </p>

                  {book.summary && (
                    <p className="mt-2 text-xs leading-relaxed text-stone-500 line-clamp-2">
                      {book.summary}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Archival Catalog List View */
            <div className="mt-6 overflow-x-auto rounded-md border border-stone-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-[#FAF9F6] text-xs font-medium uppercase tracking-wider text-stone-500">
                    <th className="py-3.5 pl-5 pr-4">Volume</th>
                    <th className="px-4 py-3.5">Genre</th>
                    <th className="px-4 py-3.5">Rating</th>
                    <th className="px-4 py-3.5">Finished</th>
                    <th className="py-3.5 pl-4 pr-5">What I Understood</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredBooks.map((book) => (
                    <tr
                      key={book.id}
                      onClick={() => setSelectedBookId(book.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedBookId(book.id);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-[#FAF9F6] focus-visible:bg-[#FAF9F6] focus-visible:outline-none"
                    >
                      <td className="py-4 pl-5 pr-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 shrink-0">
                            <BookCoverImage
                              src={book.coverImage}
                              title={book.title}
                              author={book.author}
                              genre={book.genre}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-serif text-base font-medium text-[#161513] truncate max-w-[240px]">
                              {book.title}
                            </p>
                            <p className="text-xs text-stone-500 truncate max-w-[240px]">
                              {book.author}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-stone-700 whitespace-nowrap">
                        {book.genre}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StarRating value={book.rating} size="sm" />
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-stone-500 tabular-nums whitespace-nowrap">
                        {book.dateFinished || '—'}
                      </td>
                      <td className="py-4 pl-4 pr-5 text-xs leading-relaxed text-stone-600 max-w-md">
                        <p className="line-clamp-2">
                          {book.summary || book.keyTakeaway || 'Click to add reading notes.'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quiet Editorial Reading Guide */}
        <section
          id="guide"
          className="border-t border-stone-200 bg-white/60 py-14"
        >
          <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
            <div className="max-w-xl">
              <h2 className="font-serif text-2xl font-medium text-[#161513]">
                How to keep your reading archive
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Built for readers who want a visual, distraction-free record of every book finished and the essential thoughts worth keeping.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 border-t border-stone-200 pt-8 md:grid-cols-3">
              <div>
                <p className="font-mono text-xs text-stone-400">01.</p>
                <h3 className="mt-1.5 font-serif text-lg font-medium text-[#161513]">
                  Upload cover photography
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  Snap a photo of your physical paperback or upload a cover image. Covers are automatically sized into crisp 3:4 plates for effortless visual browsing.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-stone-400">02.</p>
                <h3 className="mt-1.5 font-serif text-lg font-medium text-[#161513]">
                  Sort by genre and rating
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  Categorize across ten literary disciplines and rate from 1 to 5 stars so you can filter straight to your favorites when recommending a book.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-stone-400">03.</p>
                <h3 className="mt-1.5 font-serif text-lg font-medium text-[#161513]">
                  Click any volume for notes
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  Open a book’s dossier anytime to read or refine your personal summary of what you understood and the single line that stayed with you.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-[#F8F7F4] py-6">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-3 px-6 text-xs text-stone-500 sm:flex-row lg:px-10">
          <p className="font-serif text-sm text-[#161513]">Ex Libris</p>
          <p>Personal Book Archive & Reading Notes</p>
        </div>
      </footer>

      {/* Reading Dossier Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBookId(null)}
        onEdit={openEditBookModal}
        onDelete={handleDeleteBook}
        onQuickSaveSummary={handleQuickSaveSummary}
      />

      {/* Add / Edit Book Modal */}
      <BookFormModal
        isOpen={isFormOpen}
        editingBook={editingBook}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBook(null);
        }}
        onSave={handleSaveBook}
      />
    </div>
  );
}

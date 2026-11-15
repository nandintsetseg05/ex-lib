import { useEffect, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { BookRecord } from '../types/book';
import { BookCoverImage } from './BookCoverImage';
import { StarRating } from './StarRating';

interface BookDetailModalProps {
  book: BookRecord | null;
  onClose: () => void;
  onEdit: (book: BookRecord) => void;
  onDelete: (book: BookRecord) => Promise<void>;
  onQuickSaveSummary: (
    book: BookRecord,
    summary: string,
    keyTakeaway: string,
    rating: 1 | 2 | 3 | 4 | 5
  ) => Promise<void>;
}

function formatFinishedDate(dateStr: string): string {
  if (!dateStr) return 'Not recorded';
  const [year, month] = dateStr.split('-');
  if (year && month) {
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  return dateStr;
}

export function BookDetailModal({
  book,
  onClose,
  onEdit,
  onDelete,
  onQuickSaveSummary,
}: BookDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInlineEditingNotes, setIsInlineEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [takeawayDraft, setTakeawayDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!book) return;
    setConfirmDelete(false);
    setIsDeleting(false);
    setIsInlineEditingNotes(false);
    setNoteDraft(book.summary);
    setTakeawayDraft(book.keyTakeaway);
    setRatingDraft(book.rating);
    setActionError(null);
  }, [book]);

  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting && !isSavingNotes) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, isDeleting, isSavingNotes, onClose]);

  if (!book) return null;

  const paragraphs = book.summary
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  async function handleConfirmDelete() {
    if (!book) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await onDelete(book);
      onClose();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Unable to delete this entry.'
      );
      setIsDeleting(false);
    }
  }

  async function handleSaveInlineNotes() {
    if (!book) return;
    setIsSavingNotes(true);
    setActionError(null);
    try {
      await onQuickSaveSummary(book, noteDraft, takeawayDraft, ratingDraft);
      setIsInlineEditingNotes(false);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Unable to save your notes.'
      );
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-book-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting && !isSavingNotes) {
          onClose();
        }
      }}
    >
      <article className="my-auto w-full max-w-5xl rounded-md border border-stone-200 bg-[#FAF9F6] shadow-2xl">
        {/* Top Utility Strip */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-mono uppercase tracking-wider">{book.genre}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatFinishedDate(book.dateFinished)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(book)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 text-xs font-medium text-[#161513] transition-colors hover:bg-stone-100 whitespace-nowrap shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Entry
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete book"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex h-9 items-center rounded-md bg-red-700 px-3 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="inline-flex h-9 items-center rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close reading dossier"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-[#161513]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Two-Column Editorial Reading Canvas */}
        <div className="grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: Cover Exhibition & Accession Metadata */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-sm bg-[#EFECE6] p-4 sm:p-5">
              <BookCoverImage
                src={book.coverImage}
                title={book.title}
                author={book.author}
                genre={book.genre}
                className="shadow-md"
              />
            </div>

            <dl className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  Author
                </dt>
                <dd className="text-right font-medium text-[#161513]">
                  {book.author}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  Genre
                </dt>
                <dd className="text-right text-[#161513]">{book.genre}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  Rating
                </dt>
                <dd>
                  <StarRating value={book.rating} size="sm" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  Finished
                </dt>
                <dd className="text-right font-mono text-xs text-stone-700 tabular-nums">
                  {formatFinishedDate(book.dateFinished)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Right: Title, Key Takeaway & Summary of What Was Understood */}
          <div className="lg:col-span-8 flex flex-col">
            {actionError && (
              <div
                role="alert"
                className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
              >
                {actionError}
              </div>
            )}

            <header className="border-b border-stone-200 pb-6">
              <h2
                id="dossier-book-title"
                className="font-serif text-3xl font-medium tracking-tight text-[#161513] text-balance sm:text-4xl"
              >
                {book.title}
              </h2>
              <p className="mt-2 text-base text-stone-600">by {book.author}</p>
            </header>

            {!isInlineEditingNotes ? (
              <div className="mt-6 flex-1 space-y-7">
                {book.keyTakeaway && (
                  <blockquote className="border-y border-stone-200 py-5">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-stone-500">
                      Core Takeaway
                    </span>
                    <p className="font-serif text-lg italic leading-relaxed text-[#161513] sm:text-xl">
                      “{book.keyTakeaway}”
                    </p>
                  </blockquote>
                )}

                <div>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">
                      Summary & What I Understood
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setNoteDraft(book.summary);
                        setTakeawayDraft(book.keyTakeaway);
                        setRatingDraft(book.rating);
                        setIsInlineEditingNotes(true);
                      }}
                      className="text-xs font-medium text-[#1E3A8A] hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      Edit Understanding Notes
                    </button>
                  </div>

                  {paragraphs.length > 0 ? (
                    <div className="max-w-prose space-y-4 text-[15px] leading-[1.8] text-stone-800">
                      {paragraphs.map((paragraph, idx) => (
                        <p
                          key={idx}
                          className={
                            idx === 0
                              ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-medium first-letter:leading-none first-letter:text-[#161513]'
                              : ''
                          }
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-stone-300 bg-white/70 px-5 py-8 text-center">
                      <p className="text-sm text-stone-600">
                        You haven’t written your summary for this book yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsInlineEditingNotes(true)}
                        className="mt-3 rounded-md bg-[#1E3A8A] px-4 py-2 text-xs font-medium text-white hover:bg-[#172E6E]"
                      >
                        Write Summary Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-600">
                    Update Rating
                  </span>
                  <StarRating
                    value={ratingDraft}
                    size="md"
                    onChange={(r) => setRatingDraft(r)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="inline-takeaway"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-600"
                  >
                    Core Takeaway
                  </label>
                  <input
                    id="inline-takeaway"
                    type="text"
                    maxLength={500}
                    value={takeawayDraft}
                    onChange={(e) => setTakeawayDraft(e.target.value)}
                    placeholder="One sentence summarizing the core insight..."
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inline-summary"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-600"
                  >
                    Summary & What I Understood
                  </label>
                  <textarea
                    id="inline-summary"
                    rows={8}
                    maxLength={5000}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Summarize the key ideas and what you understood..."
                    className="w-full resize-y rounded-md border border-stone-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInlineEditingNotes(false)}
                    disabled={isSavingNotes}
                    className="rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInlineNotes}
                    disabled={isSavingNotes}
                    className="rounded-md bg-[#1E3A8A] px-5 py-2 text-xs font-medium text-white hover:bg-[#172E6E] disabled:opacity-60"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

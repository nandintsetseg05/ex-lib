import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, Link as LinkIcon, Trash2, Upload, X } from 'lucide-react';
import {
  BOOK_FIELD_LIMITS,
  BOOK_GENRES,
  BookDraftInput,
  BookGenre,
  BookRecord,
} from '../types/book';
import { compressBookCoverFile } from '../utils/imageProcessor';
import { BookCoverImage } from './BookCoverImage';
import { StarRating } from './StarRating';

interface BookFormModalProps {
  isOpen: boolean;
  editingBook: BookRecord | null;
  onClose: () => void;
  onSave: (draft: BookDraftInput) => Promise<void>;
}

const EMPTY_DRAFT: BookDraftInput = {
  title: '',
  author: '',
  genre: 'Fiction',
  rating: 5,
  summary: '',
  keyTakeaway: '',
  dateFinished: new Date().toISOString().slice(0, 7),
  coverImage: '',
};

export function BookFormModal({
  isOpen,
  editingBook,
  onClose,
  onSave,
}: BookFormModalProps) {
  const [draft, setDraft] = useState<BookDraftInput>(EMPTY_DRAFT);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingBook) {
      setDraft({
        title: editingBook.title,
        author: editingBook.author,
        genre: editingBook.genre,
        rating: editingBook.rating,
        summary: editingBook.summary,
        keyTakeaway: editingBook.keyTakeaway,
        dateFinished: editingBook.dateFinished,
        coverImage: editingBook.coverImage,
      });
      setUrlValue(
        editingBook.coverImage.startsWith('http') ? editingBook.coverImage : ''
      );
      setShowUrlInput(editingBook.coverImage.startsWith('http'));
    } else {
      setDraft({
        ...EMPTY_DRAFT,
        dateFinished: new Date().toISOString().slice(0, 7),
      });
      setUrlValue('');
      setShowUrlInput(false);
    }
    setErrorMessage(null);
    setIsCompressing(false);
    setIsSubmitting(false);
  }, [editingBook, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  async function processSelectedFile(file: File) {
    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const compressedDataUri = await compressBookCoverFile(file);
      setDraft((prev) => ({ ...prev, coverImage: compressedDataUri }));
      setUrlValue('');
      setShowUrlInput(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to process image.'
      );
    } finally {
      setIsCompressing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
  }

  function handleApplyUrl() {
    const cleaned = urlValue.trim();
    if (!cleaned) {
      setDraft((prev) => ({ ...prev, coverImage: '' }));
      return;
    }
    if (cleaned.length > BOOK_FIELD_LIMITS.MAX_COVER_LENGTH) {
      setErrorMessage('Image URL is too long.');
      return;
    }
    setErrorMessage(null);
    setDraft((prev) => ({ ...prev, coverImage: cleaned }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (!draft.title.trim()) {
      setErrorMessage('Please enter the book title.');
      return;
    }
    if (!draft.author.trim()) {
      setErrorMessage('Please enter the author name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(draft);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this book.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="my-auto w-full max-w-4xl rounded-md border border-stone-200 bg-[#FAF9F6] shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-6 py-4 sm:px-8">
          <div>
            <h2
              id="book-form-title"
              className="font-serif text-xl font-medium text-[#161513] sm:text-2xl"
            >
              {editingBook ? 'Edit Book Record' : 'Document a Book'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close form"
            className="flex h-10 w-10 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-200/70 hover:text-[#161513] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Left Column: Cover Photo Upload Studio */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider uppercase text-stone-600">
                  Book Cover
                </span>
                {draft.coverImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, coverImage: '' }));
                      setUrlValue('');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-sm transition-colors ${
                  isDragging ? 'ring-2 ring-[#1E3A8A] ring-offset-2' : ''
                }`}
              >
                <BookCoverImage
                  src={draft.coverImage}
                  title={draft.title}
                  author={draft.author}
                  genre={draft.genre}
                />
                {isCompressing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-medium text-[#161513]">
                    Optimizing cover image...
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-[#161513] transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A] whitespace-nowrap"
                >
                  {draft.coverImage ? (
                    <>
                      <ImagePlus className="h-4 w-4 text-[#1E3A8A]" />
                      Replace Cover Photo
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-[#1E3A8A]" />
                      Upload Cover Photo
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-stone-500 hover:text-[#161513] transition-colors"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {showUrlInput ? 'Hide image URL field' : 'Or paste cover image URL'}
                </button>

                {showUrlInput && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="url"
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      placeholder="https://..."
                      className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 whitespace-nowrap shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-stone-500">
                  Drag and drop a book photo or upload from your device. Automatically sized for crisp browsing.
                </p>
              </div>
            </div>

            {/* Right Column: Book Metadata & Reading Notes */}
            <div className="md:col-span-8 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="book-title-input"
                    className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Book Title
                  </label>
                  <input
                    id="book-title-input"
                    type="text"
                    required
                    maxLength={BOOK_FIELD_LIMITS.MAX_TITLE_LENGTH}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., The Left Hand of Darkness"
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="book-author-input"
                    className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Author
                  </label>
                  <input
                    id="book-author-input"
                    type="text"
                    required
                    maxLength={BOOK_FIELD_LIMITS.MAX_AUTHOR_LENGTH}
                    value={draft.author}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, author: e.target.value }))
                    }
                    placeholder="e.g., Ursula K. Le Guin"
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="book-genre-select"
                    className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Genre
                  </label>
                  <select
                    id="book-genre-select"
                    value={draft.genre}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        genre: e.target.value as BookGenre,
                      }))
                    }
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
                  >
                    {BOOK_GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-stone-600">
                    Your Rating
                  </span>
                  <div className="flex h-[42px] items-center rounded-md border border-stone-300 bg-white px-2">
                    <StarRating
                      value={draft.rating}
                      size="md"
                      onChange={(rating) =>
                        setDraft((prev) => ({ ...prev, rating }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="book-finished-input"
                    className="mb-1.5 block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Date Finished
                  </label>
                  <input
                    id="book-finished-input"
                    type="month"
                    maxLength={BOOK_FIELD_LIMITS.MAX_DATE_LENGTH}
                    value={draft.dateFinished}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, dateFinished: e.target.value }))
                    }
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-sm text-[#161513] focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="book-takeaway-input"
                    className="block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Core Idea or Favorite Line (Optional)
                  </label>
                  <span className="font-mono text-[11px] text-stone-400 tabular-nums">
                    {draft.keyTakeaway.length}/{BOOK_FIELD_LIMITS.MAX_TAKEAWAY_LENGTH}
                  </span>
                </div>
                <input
                  id="book-takeaway-input"
                  type="text"
                  maxLength={BOOK_FIELD_LIMITS.MAX_TAKEAWAY_LENGTH}
                  value={draft.keyTakeaway}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, keyTakeaway: e.target.value }))
                  }
                  placeholder="One sentence capturing the central idea you want to remember..."
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="book-summary-input"
                    className="block text-xs font-medium tracking-wider uppercase text-stone-600"
                  >
                    Summary & What I Understood
                  </label>
                  <span className="font-mono text-[11px] text-stone-400 tabular-nums">
                    {draft.summary.length}/{BOOK_FIELD_LIMITS.MAX_SUMMARY_LENGTH}
                  </span>
                </div>
                <textarea
                  id="book-summary-input"
                  rows={6}
                  maxLength={BOOK_FIELD_LIMITS.MAX_SUMMARY_LENGTH}
                  value={draft.summary}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  placeholder="Write a concise summary of the book in your own words, key arguments, or what shifted in how you think..."
                  className="w-full resize-y rounded-md border border-stone-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-[#161513] placeholder:text-stone-400 focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing}
                  className="rounded-md bg-[#1E3A8A] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#172E6E] disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingBook
                      ? 'Save Changes'
                      : 'Add to Archive'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

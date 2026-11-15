import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { BookGenre } from '../types/book';

interface BookCoverImageProps {
  src?: string;
  title: string;
  author: string;
  genre: BookGenre;
  className?: string;
  priority?: boolean;
}

const GENRE_CLOTH_PALETTES: Record<BookGenre, { bg: string; ink: string; rule: string }> = {
  Fiction: { bg: 'bg-[#263238]', ink: 'text-[#F5F2EB]', rule: 'border-[#C5B38E]/40' },
  'Non-Fiction': { bg: 'bg-[#1E3A5F]', ink: 'text-[#F8F7F4]', rule: 'border-[#93C5FD]/30' },
  Philosophy: { bg: 'bg-[#2D2A26]', ink: 'text-[#F6F3EC]', rule: 'border-[#D4AF37]/35' },
  'Science & Nature': { bg: 'bg-[#1E3A2F]', ink: 'text-[#F3F5F0]', rule: 'border-[#A7F3D0]/30' },
  'Sci-Fi & Fantasy': { bg: 'bg-[#1F243D]', ink: 'text-[#F4F3F8]', rule: 'border-[#FBBF24]/35' },
  'Biography & History': { bg: 'bg-[#3E2723]', ink: 'text-[#FAF5EE]', rule: 'border-[#E6CCB2]/35' },
  'Design & Art': { bg: 'bg-[#1E3A8A]', ink: 'text-[#F8F7F4]', rule: 'border-[#DBEAFE]/35' },
  Psychology: { bg: 'bg-[#332E3C]', ink: 'text-[#F7F5F9]', rule: 'border-[#D8B4FE]/30' },
  Poetry: { bg: 'bg-[#3B332B]', ink: 'text-[#FAF7F2]', rule: 'border-[#E7D8C9]/35' },
  Other: { bg: 'bg-[#292724]', ink: 'text-[#F8F7F4]', rule: 'border-stone-400/35' },
};

export function BookCoverImage({
  src,
  title,
  author,
  genre,
  className = '',
}: BookCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const trimmedSrc = src?.trim() || '';
  const showImage = Boolean(trimmedSrc) && !hasError;
  const palette = GENRE_CLOTH_PALETTES[genre] || GENRE_CLOTH_PALETTES.Other;

  if (showImage) {
    return (
      <div
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-stone-200 bg-stone-100 ${className}`}
      >
        <img
          src={trimmedSrc}
          alt={`Cover of ${title} by ${author}`}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`Cloth cover placeholder for ${title} by ${author}`}
      className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-sm border border-stone-300/60 p-5 ${palette.bg} ${palette.ink} ${className}`}
    >
      <div className={`flex h-full flex-col justify-between border p-4 ${palette.rule}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase opacity-75">
            {genre}
          </span>
          <BookOpen className="h-3.5 w-3.5 opacity-60 shrink-0" aria-hidden="true" />
        </div>

        <div className="my-auto py-3">
          <h4 className="font-serif text-lg leading-snug font-medium line-clamp-4">
            {title || 'Untitled Volume'}
          </h4>
        </div>

        <div className="border-t border-current/20 pt-2.5">
          <p className="text-xs tracking-wide opacity-85 truncate">
            {author || 'Unknown Author'}
          </p>
        </div>
      </div>
    </div>
  );
}

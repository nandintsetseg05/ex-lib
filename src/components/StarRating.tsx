import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  size?: 'sm' | 'md';
  showNumeric?: boolean;
}

export function StarRating({
  value,
  onChange,
  size = 'sm',
  showNumeric = true,
}: StarRatingProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const isInteractive = typeof onChange === 'function';

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="inline-flex items-center gap-0.5"
        role={isInteractive ? 'radiogroup' : undefined}
        aria-label={isInteractive ? 'Book rating' : `Rated ${value} out of 5`}
      >
        {([1, 2, 3, 4, 5] as const).map((star) => {
          const filled = star <= value;
          if (isInteractive) {
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`Rate ${star} out of 5 stars`}
                onClick={() => onChange(star)}
                className="flex h-10 w-9 items-center justify-center rounded-md transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
              >
                <Star
                  className={`${iconSize} transition-colors duration-150 ${
                    filled
                      ? 'fill-[#B45309] text-[#B45309]'
                      : 'fill-transparent text-stone-300 hover:text-stone-400'
                  }`}
                />
              </button>
            );
          }

          return (
            <Star
              key={star}
              aria-hidden="true"
              className={`${iconSize} ${
                filled ? 'fill-[#B45309] text-[#B45309]' : 'fill-transparent text-stone-300'
              }`}
            />
          );
        })}
      </div>

      {showNumeric && (
        <span className="font-mono text-xs text-stone-500 tabular-nums">
          {value}/5
        </span>
      )}
    </div>
  );
}

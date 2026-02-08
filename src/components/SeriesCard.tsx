

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormatBadge } from './FormatBadge';
import type { MediaFormat, TMDBData } from '@/types';
import { storageService, tmdbService } from '@/services';

interface SeriesCardProps {
  title: string;
  year?: number;
  tmdbData?: TMDBData;
  coverImagePath?: string | null;
  seasonsOwned: number;
  seasonsTotal?: number | null;
  formats: MediaFormat[];
  onClick?: () => void;
  className?: string;
}

export function SeriesCard({
  title,
  year,
  tmdbData,
  coverImagePath,
  seasonsOwned,
  seasonsTotal,
  formats,
  onClick,
  className,
}: SeriesCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatBadges = useMemo(() => {
    const unique = Array.from(new Set(formats));
    return {
      visible: unique.slice(0, 2),
      extraCount: Math.max(0, unique.length - 2),
    };
  }, [formats]);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);

      if (tmdbData?.posterPath) {
        const url = tmdbService.getImageUrl(tmdbData.posterPath, 'w342');
        if (url) {
          setImageUrl(url);
          setIsLoading(false);
          return;
        }
      }

      if (coverImagePath) {
        try {
          const localImage = await storageService.loadImage(coverImagePath);
          if (localImage) {
            setImageUrl(localImage);
          }
        } catch (error) {
          console.error('Failed to load series cover image:', error);
        }
      }

      setIsLoading(false);
    };

    loadImage();
  }, [coverImagePath, tmdbData?.posterPath]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className={cn('media-card cursor-pointer group', className)}
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] bg-secondary overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary text-muted-foreground">
            <Film className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs opacity-50">Ingen bild</span>
          </div>
        )}

        <div className="absolute inset-0 media-card-overlay pointer-events-none" />

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {formatBadges.visible.map((format) => (
            <FormatBadge key={format} format={format} />
          ))}
          {formatBadges.extraCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-background/80 text-foreground">
              +{formatBadges.extraCount}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
            {title}
          </h3>
          <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            <span>
              Säsonger: {seasonsOwned}
              {seasonsTotal ? ` / ${seasonsTotal}` : ''}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

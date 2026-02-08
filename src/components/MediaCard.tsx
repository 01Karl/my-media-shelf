

import { motion } from 'framer-motion';
import { Film, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormatBadge } from './FormatBadge';
import type { MediaItem, TMDBData } from '@/types';
import { tmdbService } from '@/services';
import { useEffect, useState } from 'react';
import { storageService } from '@/services';
import { useTranslation } from '@/hooks/useTranslation';

interface MediaCardProps {
  item: MediaItem;
  tmdbData?: TMDBData;
  onClick?: () => void;
  className?: string;
}

export function MediaCard({ item, tmdbData, onClick, className }: MediaCardProps) {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      
      
      const seasonPosterPath =
        item.type === 'series' && item.season
          ? tmdbData?.seasons?.find((season) => season.seasonNumber === item.season)?.posterPath
          : undefined;

      if (seasonPosterPath || tmdbData?.posterPath) {
        const url = tmdbService.getImageUrl(seasonPosterPath ?? tmdbData?.posterPath, 'w342');
        if (url) {
          setImageUrl(url);
          setIsLoading(false);
          return;
        }
      }
      
      
      if (item.frontImagePath) {
        try {
          const localImage = await storageService.loadImage(item.frontImagePath);
          if (localImage) {
            setImageUrl(localImage);
          }
        } catch (error) {
          console.error('Failed to load local image:', error);
        }
      }
      
      setIsLoading(false);
    };

    loadImage();
  }, [item.frontImagePath, item.season, item.type, tmdbData?.posterPath, tmdbData?.seasons]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'media-card cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      
      <div className="relative aspect-[2/3] bg-secondary overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary text-muted-foreground">
            <Film className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs opacity-50">{t('search.noImage')}</span>
          </div>
        )}
        
        
        <div className="absolute inset-0 media-card-overlay pointer-events-none" />
        
        
        <div className="absolute top-2 right-2">
          <FormatBadge format={item.format} />
        </div>
        
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {item.year && <span>{item.year}</span>}
            {item.season && <span>S{item.season}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

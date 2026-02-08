

import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TMDBData } from '@/types';
import { storageService, tmdbService } from '@/services';

interface MediaThumbnailProps {
  title: string;
  tmdbData?: TMDBData;
  imagePath?: string | null;
  className?: string;
}

export function MediaThumbnail({ title, tmdbData, imagePath, className }: MediaThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);

      if (tmdbData?.posterPath) {
        const url = tmdbService.getImageUrl(tmdbData.posterPath, 'w185');
        if (url) {
          setImageUrl(url);
          setIsLoading(false);
          return;
        }
      }

      if (imagePath) {
        try {
          const localImage = await storageService.loadImage(imagePath);
          if (localImage) {
            setImageUrl(localImage);
          }
        } catch (error) {
          console.error('Failed to load thumbnail image:', error);
        }
      }

      setIsLoading(false);
    };

    loadImage();
  }, [imagePath, tmdbData?.posterPath]);

  return (
    <div className={cn('relative overflow-hidden rounded bg-secondary', className)}>
      {isLoading ? (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Film className="w-5 h-5 opacity-50" />
        </div>
      )}
    </div>
  );
}

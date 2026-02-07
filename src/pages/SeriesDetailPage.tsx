// Series detail page - shows seasons for a series

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Film, Layers } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MediaCard } from '@/components/MediaCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { itemRepository, libraryRepository, tmdbCacheRepository } from '@/db';
import { tmdbService } from '@/services';
import type { Library, MediaItem, TMDBData } from '@/types';

const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

export default function SeriesDetailPage() {
  const { seriesId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [tmdbData, setTmdbData] = useState<TMDBData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const libraryId = searchParams.get('libraryId') || '';
  const titleParam = searchParams.get('title') || '';
  const yearParam = searchParams.get('year');
  const tmdbIdParam = searchParams.get('tmdbId');
  const parsedYear = yearParam ? Number(yearParam) : undefined;
  const parsedTmdbId = tmdbIdParam ? Number(tmdbIdParam) : undefined;

  useEffect(() => {
    if (libraryId) {
      loadSeries();
    }
  }, [libraryId, seriesId]);

  const loadSeries = async () => {
    setIsLoading(true);

    try {
      const lib = await libraryRepository.getById(libraryId);
      setLibrary(lib);

      const libraryItems = await itemRepository.getByLibrary(libraryId);
      const normalizedTitle = normalizeTitle(titleParam);
      const seriesItems = libraryItems.filter(item => {
        if (item.type !== 'series') return false;
        if (parsedTmdbId && item.tmdbId) {
          return item.tmdbId === parsedTmdbId;
        }
        if (!titleParam) return false;
        const sameTitle = normalizeTitle(item.title) === normalizedTitle;
        const sameYear = parsedYear ? item.year === parsedYear : true;
        return sameTitle && sameYear;
      });

      setItems(seriesItems);

      if (parsedTmdbId) {
        const cached = await tmdbCacheRepository.get(parsedTmdbId);
        if (cached) {
          setTmdbData(cached);
        } else {
          const data = await tmdbService.getDetails(parsedTmdbId, 'series');
          if (data) {
            setTmdbData(data);
          }
        }
      } else if (titleParam) {
        const results = await tmdbService.search(titleParam, 'series', parsedYear);
        if (results.length > 0) {
          const match = results[0];
          const details = await tmdbService.getDetails(match.id, 'series');
          if (details) {
            setTmdbData(details);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    }

    setIsLoading(false);
  };

  const seasons = useMemo(() => {
    return [...items].sort((a, b) => {
      const seasonA = a.season ?? Number.MAX_SAFE_INTEGER;
      const seasonB = b.season ?? Number.MAX_SAFE_INTEGER;
      return seasonA - seasonB;
    });
  }, [items]);

  const ownedSeasons = useMemo(() => {
    const seasonNumbers = seasons
      .map((item) => item.season)
      .filter((season): season is number => typeof season === 'number');
    if (seasonNumbers.length === 0) {
      return seasons.length;
    }
    return new Set(seasonNumbers).size;
  }, [seasons]);

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="Laddar..." showBack />
        <div className="p-4 grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="page-container">
        <PageHeader title="Serie hittas inte" showBack />
        <EmptyState
          icon={Film}
          title="Serie hittas inte"
          description="Detta bibliotek verkar inte finnas"
          actionLabel="Gå tillbaka"
          onAction={() => navigate('/libraries')}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="Serie hittas inte" showBack />
        <EmptyState
          icon={Film}
          title="Inga säsonger hittades"
          description="Säsongerna verkar saknas i biblioteket"
          actionLabel="Gå tillbaka"
          onAction={() => navigate(`/libraries/${libraryId}`)}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="px-4 pt-4">
        <Button
          variant="ghost"
          size="icon"
          className="mb-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{titleParam || items[0].title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            {parsedYear && <span>{parsedYear}</span>}
            <span className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              Ägda säsonger: {ownedSeasons}
              {tmdbData?.numberOfSeasons ? ` / ${tmdbData.numberOfSeasons}` : ''}
            </span>
          </div>
          {tmdbData?.overview && (
            <p className="text-sm text-muted-foreground mt-3">
              {tmdbData.overview}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Säsonger</h2>
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence>
              {seasons.map((item, index) => (
                <motion.div
                  key={item.itemId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <MediaCard
                    item={item}
                    tmdbData={item.tmdbId ? tmdbData ?? undefined : undefined}
                    onClick={() => navigate(`/items/${item.itemId}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

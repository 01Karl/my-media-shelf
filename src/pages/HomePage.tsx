

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Plus, Clock, Star, Folder } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MediaCard } from '@/components/MediaCard';
import { LibraryCard } from '@/components/LibraryCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { libraryRepository, itemRepository, tmdbCacheRepository } from '@/db';
import type { Library, MediaItem, TMDBData } from '@/types';

export default function HomePage() {
  const navigate = useNavigate();
  const { currentOwner, isOnline } = useAppStore();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [recentItems, setRecentItems] = useState<MediaItem[]>([]);
  const [libraryCounts, setLibraryCounts] = useState<Record<string, number>>({});
  const [tmdbCache, setTmdbCache] = useState<Record<number, TMDBData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentOwner]);

  const loadData = async () => {
    if (!currentOwner) return;

    setIsLoading(true);

    try {
      
      const userLibraries = await libraryRepository.getByOwner(currentOwner.ownerId);
      setLibraries(userLibraries);

      
      const counts: Record<string, number> = {};
      for (const lib of userLibraries) {
        counts[lib.libraryId] = await libraryRepository.getItemCount(lib.libraryId);
      }
      setLibraryCounts(counts);

      
      const allItems = await itemRepository.getByOwner(currentOwner.ownerId);
      const sorted = allItems.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setRecentItems(sorted.slice(0, 10));

      
      const cache: Record<number, TMDBData> = {};
      for (const item of sorted.slice(0, 10)) {
        if (item.tmdbId) {
          const data = await tmdbCacheRepository.get(item.tmdbId);
          if (data) {
            cache[item.tmdbId] = data;
          }
        }
      }
      setTmdbCache(cache);
    } catch (error) {
      console.error('Failed to load data:', error);
    }

    setIsLoading(false);
  };

  const totalItems = Object.values(libraryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="page-container">
      <PageHeader 
        title={`Hej, ${currentOwner?.displayName || 'Användare'}!`}
        subtitle={`${totalItems} objekt i ${libraries.length} bibliotek`}
        rightAction={
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        }
      />

      <div className="px-4 py-6 space-y-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <Button 
            className="flex-1"
            onClick={() => navigate('/add')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till
          </Button>
          <Button 
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/libraries')}
          >
            <Folder className="w-4 h-4 mr-2" />
            Bibliotek
          </Button>
        </motion.div>

        
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Mina bibliotek</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/libraries')}
            >
              Visa alla
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : libraries.length > 0 ? (
            <div className="space-y-3">
              {libraries.slice(0, 3).map((library, index) => (
                <motion.div
                  key={library.libraryId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <LibraryCard
                    library={library}
                    itemCount={libraryCounts[library.libraryId] || 0}
                    onClick={() => navigate(`/libraries/${library.libraryId}`)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Folder}
              title="Inga bibliotek ännu"
              description="Skapa ditt första bibliotek för att börja organisera din samling"
              actionLabel="Skapa bibliotek"
              onAction={() => navigate('/libraries/create')}
            />
          )}
        </section>

        
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Senast tillagda
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {recentItems.slice(0, 6).map((item, index) => (
                <motion.div
                  key={item.itemId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MediaCard
                    item={item}
                    tmdbData={item.tmdbId ? tmdbCache[item.tmdbId] : undefined}
                    onClick={() => navigate(`/items/${item.itemId}`)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Film}
              title="Inga objekt ännu"
              description="Lägg till din första film eller serie"
              actionLabel="Lägg till objekt"
              onAction={() => navigate('/add')}
            />
          )}
        </section>
      </div>
    </div>
  );
}

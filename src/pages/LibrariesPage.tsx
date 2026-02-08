

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LibraryCard } from '@/components/LibraryCard';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { libraryRepository } from '@/db';
import type { Library } from '@/types';

export default function LibrariesPage() {
  const navigate = useNavigate();
  const { currentOwner } = useAppStore();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [libraryCounts, setLibraryCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLibraries();
  }, [currentOwner]);

  const loadLibraries = async () => {
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
    } catch (error) {
      console.error('Failed to load libraries:', error);
    }

    setIsLoading(false);
  };

  const filteredLibraries = libraries.filter(lib =>
    lib.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedLibraries = filteredLibraries.filter(lib => lib.sharedLibraryId);
  const privateLibraries = filteredLibraries.filter(lib => !lib.sharedLibraryId);

  return (
    <div className="page-container">
      <PageHeader
        title="Bibliotek"
        subtitle={`${libraries.length} bibliotek`}
        rightAction={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate('/libraries/create')}
          >
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Sök bibliotek..."
          className="mb-6"
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : filteredLibraries.length > 0 ? (
          <div className="space-y-6">
            
            {sharedLibraries.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Delade bibliotek
                </h3>
                <div className="space-y-3">
                  <AnimatePresence>
                    {sharedLibraries.map((library, index) => (
                      <motion.div
                        key={library.libraryId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <LibraryCard
                          library={library}
                          itemCount={libraryCounts[library.libraryId] || 0}
                          onClick={() => navigate(`/libraries/${library.libraryId}`)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            
            {privateLibraries.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Privata bibliotek
                </h3>
                <div className="space-y-3">
                  <AnimatePresence>
                    {privateLibraries.map((library, index) => (
                      <motion.div
                        key={library.libraryId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <LibraryCard
                          library={library}
                          itemCount={libraryCounts[library.libraryId] || 0}
                          onClick={() => navigate(`/libraries/${library.libraryId}`)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        ) : searchQuery ? (
          <EmptyState
            icon={Folder}
            title="Inga träffar"
            description={`Hittade inga bibliotek som matchar "${searchQuery}"`}
          />
        ) : (
          <EmptyState
            icon={Folder}
            title="Inga bibliotek ännu"
            description="Skapa ditt första bibliotek för att börja organisera din samling"
            actionLabel="Skapa bibliotek"
            onAction={() => navigate('/libraries/create')}
          />
        )}
      </div>
    </div>
  );
}

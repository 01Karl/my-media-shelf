// Library detail page - shows items in a library

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Filter, Grid, List, MoreVertical, Pencil, Trash2, Users, Share, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MediaCard } from '@/components/MediaCard';
import { SeriesCard } from '@/components/SeriesCard';
import { MediaThumbnail } from '@/components/MediaThumbnail';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { FormatBadge } from '@/components/FormatBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { libraryRepository, itemRepository, tmdbCacheRepository } from '@/db';
import type { Library, MediaItem, MediaType, MediaFormat, TMDBData } from '@/types';
import { Film } from 'lucide-react';

export default function LibraryDetailPage() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [tmdbCache, setTmdbCache] = useState<Record<number, TMDBData>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<MediaFormat | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (libraryId) {
      loadLibrary();
    }
  }, [libraryId]);

  const loadLibrary = async () => {
    if (!libraryId) return;

    setIsLoading(true);

    try {
      const lib = await libraryRepository.getById(libraryId);
      setLibrary(lib);

      if (lib) {
        const libraryItems = await itemRepository.getByLibrary(libraryId);
        setItems(libraryItems);

        // Load TMDB cache
        const cache: Record<number, TMDBData> = {};
        for (const item of libraryItems) {
          if (item.tmdbId) {
            const data = await tmdbCacheRepository.get(item.tmdbId);
            if (data) {
              cache[item.tmdbId] = data;
            }
          }
        }
        setTmdbCache(cache);
      }
    } catch (error) {
      console.error('Failed to load library:', error);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!library) return;
    
    if (confirm(`Är du säker på att du vill ta bort "${library.name}"? Alla objekt i biblioteket kommer också att tas bort.`)) {
      await libraryRepository.delete(library.libraryId);
      navigate('/libraries');
    }
  };

  const normalizeTitle = (title: string) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');

  const createSeriesKey = (item: MediaItem) =>
    item.tmdbId ? `tmdb-${item.tmdbId}` : `${normalizeTitle(item.title)}-${item.year ?? 'unknown'}`;

  const matchesSearchQuery = (title: string) =>
    title.toLowerCase().includes(searchQuery.toLowerCase());

  const seriesItems = items.filter(item => item.type === 'series');
  const nonSeriesItems = items.filter(item => item.type !== 'series');

  const seriesGroups = seriesItems.reduce((acc, item) => {
    const key = createSeriesKey(item);
    if (!acc.has(key)) {
      acc.set(key, {
        key,
        title: item.title,
        year: item.year,
        tmdbId: item.tmdbId,
        coverImagePath: item.frontImagePath,
        seasons: [] as MediaItem[],
        formats: new Set<MediaFormat>(),
      });
    }
    const group = acc.get(key)!;
    group.seasons.push(item);
    group.formats.add(item.format);
    if (!group.coverImagePath && item.frontImagePath) {
      group.coverImagePath = item.frontImagePath;
    }
    if (!group.tmdbId && item.tmdbId) {
      group.tmdbId = item.tmdbId;
    }
    return acc;
  }, new Map<string, {
    key: string;
    title: string;
    year?: number;
    tmdbId?: number;
    coverImagePath?: string | null;
    seasons: MediaItem[];
    formats: Set<MediaFormat>;
  }>());

  const filteredSeriesGroups = Array.from(seriesGroups.values())
    .filter(group => {
      const matchesSearch = matchesSearchQuery(group.title);
      const matchesType = typeFilter === 'all' || typeFilter === 'series';
      const matchesFormat = formatFilter === 'all'
        || Array.from(group.formats).includes(formatFilter);
      return matchesSearch && matchesType && matchesFormat;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const filteredNonSeriesItems = nonSeriesItems.filter(item => {
    const matchesSearch = matchesSearchQuery(item.title);
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
    return matchesSearch && matchesType && matchesFormat;
  });

  const hasResults = filteredSeriesGroups.length > 0 || filteredNonSeriesItems.length > 0;

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="Laddar..." showBack />
        <div className="p-4">
          <div className="h-10 w-full rounded-full bg-secondary animate-pulse mb-6" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="page-container">
        <PageHeader title="Bibliotek hittas inte" showBack />
        <EmptyState
          icon={Film}
          title="Bibliotek hittas inte"
          description="Detta bibliotek verkar inte finnas"
          actionLabel="Gå tillbaka"
          onAction={() => navigate('/libraries')}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={library.name}
        subtitle={`${items.length} objekt`}
        showBack
        backPath="/libraries"
        rightAction={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/libraries/${libraryId}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Redigera
              </DropdownMenuItem>
              {library.sharedLibraryId && (
                <DropdownMenuItem onClick={() => navigate(`/sync?library=${libraryId}`)}>
                  <Share className="w-4 h-4 mr-2" />
                  Synka
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Shared library indicator */}
        {library.sharedLibraryId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-primary">Delat bibliotek</span>
          </div>
        )}

        {/* Search and filters */}
        <Button
          className="w-full"
          onClick={() => navigate(`/add?library=${libraryId}&scan=1`)}
        >
          <ScanLine className="mr-2 h-4 w-4" />
          Skanna omslag
        </Button>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Sök i biblioteket..."
        />

        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="movie">Film</SelectItem>
              <SelectItem value="series">Serie</SelectItem>
              <SelectItem value="documentary">Dokumentär</SelectItem>
              <SelectItem value="other">Övrigt</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla format</SelectItem>
              <SelectItem value="DVD">DVD</SelectItem>
              <SelectItem value="Blu-ray">Blu-ray</SelectItem>
              <SelectItem value="4K Blu-ray">4K Blu-ray</SelectItem>
              <SelectItem value="Digital">Digital</SelectItem>
              <SelectItem value="VHS">VHS</SelectItem>
              <SelectItem value="Other">Övrigt</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <div className="flex items-center border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Items */}
        {hasResults ? (
          viewMode === 'grid' ? (
            <div className="space-y-6">
              {filteredSeriesGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Serier</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {filteredSeriesGroups.map((group, index) => (
                      <motion.div
                        key={group.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <SeriesCard
                          title={group.title}
                          year={group.year}
                          tmdbData={group.tmdbId ? tmdbCache[group.tmdbId] : undefined}
                          coverImagePath={group.coverImagePath}
                          seasonsOwned={group.seasons.length}
                          seasonsTotal={group.tmdbId ? tmdbCache[group.tmdbId]?.numberOfSeasons : undefined}
                          formats={Array.from(group.formats)}
                          onClick={() => {
                            const params = new URLSearchParams({
                              libraryId: libraryId ?? '',
                              title: group.title,
                              year: group.year?.toString() ?? '',
                              tmdbId: group.tmdbId?.toString() ?? '',
                            });
                            navigate(`/series/${group.key}?${params.toString()}`);
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {filteredNonSeriesItems.length > 0 && (
                <div>
                  {filteredSeriesGroups.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Filmer & övrigt</h3>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {filteredNonSeriesItems.map((item, index) => (
                      <motion.div
                        key={item.itemId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <MediaCard
                          item={item}
                          tmdbData={item.tmdbId ? tmdbCache[item.tmdbId] : undefined}
                          onClick={() => navigate(`/items/${item.itemId}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSeriesGroups.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Serier</h3>
                  {filteredSeriesGroups.map((group, index) => (
                    <motion.div
                      key={group.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        const params = new URLSearchParams({
                          libraryId: libraryId ?? '',
                          title: group.title,
                          year: group.year?.toString() ?? '',
                          tmdbId: group.tmdbId?.toString() ?? '',
                        });
                        navigate(`/series/${group.key}?${params.toString()}`);
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <MediaThumbnail
                        title={group.title}
                        tmdbData={group.tmdbId ? tmdbCache[group.tmdbId] : undefined}
                        imagePath={group.coverImagePath}
                        className="w-12 h-16 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.year ? `${group.year} • ` : ''}Säsonger: {group.seasons.length}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {filteredNonSeriesItems.length > 0 && (
                <div className="space-y-2">
                  {filteredSeriesGroups.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground">Filmer & övrigt</h3>
                  )}
                  {filteredNonSeriesItems.map((item, index) => (
                    <motion.div
                      key={item.itemId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => navigate(`/items/${item.itemId}`)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <MediaThumbnail
                        title={item.title}
                        tmdbData={item.tmdbId ? tmdbCache[item.tmdbId] : undefined}
                        imagePath={item.frontImagePath}
                        className="w-12 h-16 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.year}{item.season && ` • S${item.season}`}
                        </p>
                      </div>
                      <FormatBadge format={item.format} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : searchQuery || typeFilter !== 'all' || formatFilter !== 'all' ? (
          <EmptyState
            icon={Filter}
            title="Inga träffar"
            description="Försök med andra filter eller sökord"
          />
        ) : (
          <EmptyState
            icon={Film}
            title="Tomt bibliotek"
            description="Lägg till din första film eller serie"
            actionLabel="Lägg till"
            onAction={() => navigate(`/add?library=${libraryId}`)}
          />
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="fab"
        onClick={() => navigate(`/add?library=${libraryId}`)}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

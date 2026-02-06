// Item detail page

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MoreVertical, Pencil, Trash2, Move, 
  Film, Calendar, Clock, Volume2, Monitor, 
  Languages, Subtitles, Star, ExternalLink
} from 'lucide-react';
import { FormatBadge } from '@/components/FormatBadge';
import { TypeBadge } from '@/components/TypeBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { itemRepository, libraryRepository, tmdbCacheRepository, ownerRepository } from '@/db';
import { tmdbService, storageService } from '@/services';
import type { MediaItem, TMDBData, Library, Owner } from '@/types';

export default function ItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [tmdbData, setTmdbData] = useState<TMDBData | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<'front' | 'back' | 'poster'>('front');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  const loadItem = async () => {
    if (!itemId) return;

    setIsLoading(true);

    try {
      const itemData = await itemRepository.getById(itemId);
      setItem(itemData);

      if (itemData) {
        // Load library
        const lib = await libraryRepository.getById(itemData.libraryId);
        setLibrary(lib);

        // Load owner
        const own = await ownerRepository.getById(itemData.ownerId);
        setOwner(own);

        // Load TMDB data
        if (itemData.tmdbId) {
          const cached = await tmdbCacheRepository.get(itemData.tmdbId);
          if (cached) {
            setTmdbData(cached);
          } else {
            // Try to fetch from API
            const data = await tmdbService.getDetails(itemData.tmdbId, itemData.type);
            if (data) {
              setTmdbData(data);
            }
          }
        }

        // Load images
        if (itemData.frontImagePath) {
          const img = await storageService.loadImage(itemData.frontImagePath);
          setFrontImageUrl(img);
        }
        if (itemData.backImagePath) {
          const img = await storageService.loadImage(itemData.backImagePath);
          setBackImageUrl(img);
        }
      }
    } catch (error) {
      console.error('Failed to load item:', error);
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!item) return;
    
    if (confirm(`Är du säker på att du vill ta bort "${item.title}"?`)) {
      // Delete images
      if (item.frontImagePath) {
        await storageService.deleteImage(item.frontImagePath);
      }
      if (item.backImagePath) {
        await storageService.deleteImage(item.backImagePath);
      }
      
      await itemRepository.delete(item.itemId);
      navigate(`/libraries/${item.libraryId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[40vh] bg-secondary animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 w-3/4 bg-secondary animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-secondary animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Objekt hittas inte</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Gå tillbaka
          </Button>
        </div>
      </div>
    );
  }

  const posterUrl = tmdbData?.posterPath 
    ? tmdbService.getImageUrl(tmdbData.posterPath, 'w500')
    : null;
  const backdropUrl = tmdbData?.backdropPath
    ? tmdbService.getImageUrl(tmdbData.backdropPath, 'w780')
    : null;

  useEffect(() => {
    if (posterUrl) {
      setActiveImage('poster');
      return;
    }
    if (frontImageUrl) {
      setActiveImage('front');
      return;
    }
    if (backImageUrl) {
      setActiveImage('back');
    }
  }, [posterUrl, frontImageUrl, backImageUrl]);

  const displayImage = (() => {
    if (activeImage === 'poster' && posterUrl) return posterUrl;
    if (activeImage === 'front' && frontImageUrl) return frontImageUrl;
    if (activeImage === 'back' && backImageUrl) return backImageUrl;
    return posterUrl || frontImageUrl || backImageUrl;
  })();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero image */}
      <div className="relative h-[45vh] bg-secondary overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : backdropUrl ? (
          <img
            src={backdropUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-20 h-20 text-muted-foreground opacity-30" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between safe-area-top">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/30 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/30 backdrop-blur-sm"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/items/${itemId}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Redigera
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Move className="w-4 h-4 mr-2" />
                Flytta till...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image selector */}
        {(frontImageUrl || backImageUrl || posterUrl) && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {posterUrl && (
              <button
                onClick={() => setActiveImage('poster')}
                className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImage === 'poster' ? 'border-primary' : 'border-transparent opacity-60'
                }`}
              >
                <img src={posterUrl} alt="Poster" className="w-full h-full object-cover" />
              </button>
            )}
            {frontImageUrl && (
              <button
                onClick={() => setActiveImage('front')}
                className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImage === 'front' ? 'border-primary' : 'border-transparent opacity-60'
                }`}
              >
                <img src={frontImageUrl} alt="Front" className="w-full h-full object-cover" />
              </button>
            )}
            {backImageUrl && (
              <button
                onClick={() => setActiveImage('back')}
                className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImage === 'back' ? 'border-primary' : 'border-transparent opacity-60'
                }`}
              >
                <img src={backImageUrl} alt="Back" className="w-full h-full object-cover" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TypeBadge type={item.type} />
              <FormatBadge format={item.format} />
            </div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              {item.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {item.year}
                </span>
              )}
              {item.season && (
                <span>Säsong {item.season}</span>
              )}
              {tmdbData?.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {tmdbData.runtime} min
                </span>
              )}
            </div>
          </div>

          {/* TMDB rating */}
          {tmdbData?.voteAverage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <span className="font-semibold">{tmdbData.voteAverage.toFixed(1)}</span>
              <span className="text-muted-foreground">/10 (TMDB)</span>
            </div>
          )}

          {/* Overview */}
          {tmdbData?.overview && (
            <div>
              <h3 className="font-semibold mb-2">Beskrivning</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {tmdbData.overview}
              </p>
            </div>
          )}

          {/* Technical details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Tekniska detaljer</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {item.audioInfo && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ljud</p>
                    <p className="text-sm font-medium">{item.audioInfo}</p>
                  </div>
                </div>
              )}
              
              {item.videoInfo && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bild</p>
                    <p className="text-sm font-medium">{item.videoInfo}</p>
                  </div>
                </div>
              )}

              {item.languages && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <Languages className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Språk</p>
                    <p className="text-sm font-medium">{item.languages}</p>
                  </div>
                </div>
              )}

              {item.subtitles && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <Subtitles className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Undertexter</p>
                    <p className="text-sm font-medium">{item.subtitles}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Genres */}
          {tmdbData?.genres && tmdbData.genres.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {tmdbData.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full bg-secondary text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <h3 className="font-semibold mb-2">Anteckningar</h3>
              <p className="text-muted-foreground text-sm p-3 rounded-lg bg-card border border-border">
                {item.notes}
              </p>
            </div>
          )}

          {/* Ownership info */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-semibold mb-3">Ägarskap</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{owner?.displayName || 'Okänd'}</p>
                <p className="text-xs text-muted-foreground">
                  {library?.name}
                </p>
              </div>
              <FormatBadge format={item.format} size="md" />
            </div>
          </div>

          {/* TMDB link */}
          {item.tmdbId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const url = item.type === 'movie'
                  ? `https://www.themoviedb.org/movie/${item.tmdbId}`
                  : `https://www.themoviedb.org/tv/${item.tmdbId}`;
                window.open(url, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visa på TMDB
            </Button>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground border-t border-border pt-4">
            <p>Tillagd: {new Date(item.createdAt).toLocaleDateString('sv-SE')}</p>
            <p>Senast ändrad: {new Date(item.updatedAt).toLocaleDateString('sv-SE')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

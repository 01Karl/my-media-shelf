


import { tmdbCacheRepository } from '@/db';
import { useAppStore } from '@/stores/appStore';
import { getDeviceLanguage } from '@/lib/language';
import type { AppLanguage } from '@/lib/language';
import type { MediaType, TMDBData, TMDBSearchResult } from '@/types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const FALLBACK_API_KEY = '';
const FALLBACK_LANGUAGE: AppLanguage = 'en-US';


const getApiKey = (): string | null => {
  return import.meta.env.VITE_TMDB_API_KEY || FALLBACK_API_KEY || null;
};


const isOnline = (): boolean => {
  return navigator.onLine;
};

const getPreferredLanguage = (): AppLanguage => {
  return useAppStore.getState().language || getDeviceLanguage();
};

const getFallbackLanguage = (preferredLanguage: AppLanguage): AppLanguage | null => {
  if (preferredLanguage === FALLBACK_LANGUAGE) {
    return null;
  }
  return FALLBACK_LANGUAGE;
};

const normalizeMovie = (movie: any): TMDBSearchResult => ({
  id: movie.id,
  title: movie.title,
  originalTitle: movie.original_title,
  overview: movie.overview,
  posterPath: movie.poster_path,
  releaseDate: movie.release_date,
  mediaType: 'movie' as MediaType,
});

const normalizeSeries = (series: any): TMDBSearchResult => ({
  id: series.id,
  title: series.name,
  originalTitle: series.original_name,
  overview: series.overview,
  posterPath: series.poster_path,
  releaseDate: series.first_air_date,
  mediaType: 'series' as MediaType,
});

const needsEnglishFallback = (data: { title?: string; overview?: string } | null): boolean => {
  if (!data) return true;
  const hasTitle = data.title && data.title.trim().length > 0;
  const hasOverview = data.overview && data.overview.trim().length > 0;
  return !hasTitle || !hasOverview;
};

export const tmdbService = {
  
  getImageUrl(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },

  
  async searchMovies(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      console.log('TMDB search unavailable: ', !apiKey ? 'no API key' : 'offline');
      return [];
    }

    try {
      const searchWithLanguage = async (language: string) => {
        const params = new URLSearchParams({
          api_key: apiKey,
          query,
          language,
          ...(year && { year: year.toString() }),
        });

        const response = await fetch(`${TMDB_API_BASE}/search/movie?${params}`);
        if (!response.ok) {
          console.error('TMDB search failed:', response.status);
          return [];
        }

      const data = await response.json();
      return data.results.map((movie: any) => normalizeMovie(movie));
      };

      const preferredLanguage = getPreferredLanguage();
      const fallbackLanguage = getFallbackLanguage(preferredLanguage);
      const preferredResults = await searchWithLanguage(preferredLanguage);
      if (preferredResults.length > 0 || !fallbackLanguage) {
        return preferredResults;
      }

      return await searchWithLanguage(fallbackLanguage);
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  
  async searchSeries(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return [];
    }

    try {
      const searchWithLanguage = async (language: string) => {
        const params = new URLSearchParams({
          api_key: apiKey,
          query,
          language,
          ...(year && { first_air_date_year: year.toString() }),
        });

        const response = await fetch(`${TMDB_API_BASE}/search/tv?${params}`);
        if (!response.ok) {
          return [];
        }

      const data = await response.json();
      return data.results.map((series: any) => normalizeSeries(series));
      };

      const preferredLanguage = getPreferredLanguage();
      const fallbackLanguage = getFallbackLanguage(preferredLanguage);
      const preferredResults = await searchWithLanguage(preferredLanguage);
      if (preferredResults.length > 0 || !fallbackLanguage) {
        return preferredResults;
      }

      return await searchWithLanguage(fallbackLanguage);
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  
  async search(query: string, type: MediaType, year?: number): Promise<TMDBSearchResult[]> {
    if (type === 'movie' || type === 'documentary') {
      return this.searchMovies(query, year);
    } else if (type === 'series') {
      return this.searchSeries(query, year);
    }
    return [];
  },

  
  async getMovieDetails(tmdbId: number): Promise<TMDBData | null> {
    
    const cached = await tmdbCacheRepository.get(tmdbId);
    if (cached) {
      return cached;
    }

    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return null;
    }

    try {
      const fetchMovie = async (language: string) => {
        const response = await fetch(
          `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=${language}`
        );
        if (!response.ok) {
          return null;
        }
        return response.json();
      };

      const preferredLanguage = getPreferredLanguage();
      const fallbackLanguage = getFallbackLanguage(preferredLanguage);
      const movie = await fetchMovie(preferredLanguage);
      if (!movie) {
        return null;
      }

      let fallbackMovie: any | null = null;
      if (fallbackLanguage && needsEnglishFallback({ title: movie.title, overview: movie.overview })) {
        fallbackMovie = await fetchMovie(fallbackLanguage);
      }

      const data: TMDBData = {
        id: movie.id,
        title: movie.title || fallbackMovie?.title,
        originalTitle: movie.original_title || fallbackMovie?.original_title,
        overview: movie.overview || fallbackMovie?.overview,
        posterPath: movie.poster_path || fallbackMovie?.poster_path,
        backdropPath: movie.backdrop_path || fallbackMovie?.backdrop_path,
        releaseDate: movie.release_date || fallbackMovie?.release_date,
        voteAverage: movie.vote_average ?? fallbackMovie?.vote_average,
        genres: movie.genres?.map((g: any) => g.name) ?? fallbackMovie?.genres?.map((g: any) => g.name),
        runtime: movie.runtime ?? fallbackMovie?.runtime,
      };

      
      await tmdbCacheRepository.set(tmdbId, 'movie', data);
      
      return data;
    } catch (error) {
      console.error('TMDB get movie error:', error);
      return null;
    }
  },

  
  async getSeriesDetails(tmdbId: number): Promise<TMDBData | null> {
    
    const cached = await tmdbCacheRepository.get(tmdbId);
    if (cached) {
      return cached;
    }

    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return null;
    }

    try {
      const fetchSeries = async (language: string) => {
        const response = await fetch(
          `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=${language}`
        );
        if (!response.ok) {
          return null;
        }
        return response.json();
      };

      const preferredLanguage = getPreferredLanguage();
      const fallbackLanguage = getFallbackLanguage(preferredLanguage);
      const series = await fetchSeries(preferredLanguage);
      if (!series) {
        return null;
      }

      let fallbackSeries: any | null = null;
      if (fallbackLanguage && needsEnglishFallback({ title: series.name, overview: series.overview })) {
        fallbackSeries = await fetchSeries(fallbackLanguage);
      }

      const data: TMDBData = {
        id: series.id,
        title: series.name || fallbackSeries?.name,
        originalTitle: series.original_name || fallbackSeries?.original_name,
        overview: series.overview || fallbackSeries?.overview,
        posterPath: series.poster_path || fallbackSeries?.poster_path,
        backdropPath: series.backdrop_path || fallbackSeries?.backdrop_path,
        releaseDate: series.first_air_date || fallbackSeries?.first_air_date,
        voteAverage: series.vote_average ?? fallbackSeries?.vote_average,
        genres: series.genres?.map((g: any) => g.name) ?? fallbackSeries?.genres?.map((g: any) => g.name),
        numberOfSeasons: series.number_of_seasons ?? fallbackSeries?.number_of_seasons,
        seasons: (series.seasons ?? fallbackSeries?.seasons ?? []).map((season: any) => ({
          seasonNumber: season.season_number,
          posterPath: season.poster_path ?? null,
        })),
      };

      
      await tmdbCacheRepository.set(tmdbId, 'series', data);
      
      return data;
    } catch (error) {
      console.error('TMDB get series error:', error);
      return null;
    }
  },

  
  async getDetails(tmdbId: number, type: MediaType): Promise<TMDBData | null> {
    if (type === 'movie' || type === 'documentary') {
      return this.getMovieDetails(tmdbId);
    } else if (type === 'series') {
      return this.getSeriesDetails(tmdbId);
    }
    return null;
  },

  
  isAvailable(): boolean {
    return !!getApiKey() && isOnline();
  },
};

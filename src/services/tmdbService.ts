// TMDB Service - fetches movie/series metadata
// API key should be set via environment variable VITE_TMDB_API_KEY

import { tmdbCacheRepository } from '@/db';
import type { MediaType, TMDBData, TMDBSearchResult } from '@/types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Get API key from environment
const getApiKey = (): string | null => {
  return import.meta.env.VITE_TMDB_API_KEY || null;
};

// Check if we're online
const isOnline = (): boolean => {
  return navigator.onLine;
};

export const tmdbService = {
  // Get full image URL
  getImageUrl(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },

  // Search for movies
  async searchMovies(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      console.log('TMDB search unavailable: ', !apiKey ? 'no API key' : 'offline');
      return [];
    }

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        query,
        ...(year && { year: year.toString() }),
      });

      const response = await fetch(`${TMDB_API_BASE}/search/movie?${params}`);
      
      if (!response.ok) {
        console.error('TMDB search failed:', response.status);
        return [];
      }

      const data = await response.json();
      
      return data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        mediaType: 'movie' as MediaType,
      }));
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  // Search for TV series
  async searchSeries(query: string, year?: number): Promise<TMDBSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        query,
        ...(year && { first_air_date_year: year.toString() }),
      });

      const response = await fetch(`${TMDB_API_BASE}/search/tv?${params}`);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      return data.results.map((series: any) => ({
        id: series.id,
        title: series.name,
        originalTitle: series.original_name,
        overview: series.overview,
        posterPath: series.poster_path,
        releaseDate: series.first_air_date,
        mediaType: 'series' as MediaType,
      }));
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  // Search both movies and series
  async search(query: string, type: MediaType, year?: number): Promise<TMDBSearchResult[]> {
    if (type === 'movie') {
      return this.searchMovies(query, year);
    } else if (type === 'series') {
      return this.searchSeries(query, year);
    }
    return [];
  },

  // Get movie details
  async getMovieDetails(tmdbId: number): Promise<TMDBData | null> {
    // Check cache first
    const cached = await tmdbCacheRepository.get(tmdbId);
    if (cached) {
      return cached;
    }

    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return null;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}`
      );
      
      if (!response.ok) {
        return null;
      }

      const movie = await response.json();
      
      const data: TMDBData = {
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        genres: movie.genres?.map((g: any) => g.name),
        runtime: movie.runtime,
      };

      // Cache the result
      await tmdbCacheRepository.set(tmdbId, 'movie', data);
      
      return data;
    } catch (error) {
      console.error('TMDB get movie error:', error);
      return null;
    }
  },

  // Get series details
  async getSeriesDetails(tmdbId: number): Promise<TMDBData | null> {
    // Check cache first
    const cached = await tmdbCacheRepository.get(tmdbId);
    if (cached) {
      return cached;
    }

    const apiKey = getApiKey();
    if (!apiKey || !isOnline()) {
      return null;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}`
      );
      
      if (!response.ok) {
        return null;
      }

      const series = await response.json();
      
      const data: TMDBData = {
        id: series.id,
        title: series.name,
        originalTitle: series.original_name,
        overview: series.overview,
        posterPath: series.poster_path,
        backdropPath: series.backdrop_path,
        releaseDate: series.first_air_date,
        voteAverage: series.vote_average,
        genres: series.genres?.map((g: any) => g.name),
        numberOfSeasons: series.number_of_seasons,
      };

      // Cache the result
      await tmdbCacheRepository.set(tmdbId, 'series', data);
      
      return data;
    } catch (error) {
      console.error('TMDB get series error:', error);
      return null;
    }
  },

  // Get details by type
  async getDetails(tmdbId: number, type: MediaType): Promise<TMDBData | null> {
    if (type === 'movie') {
      return this.getMovieDetails(tmdbId);
    } else if (type === 'series') {
      return this.getSeriesDetails(tmdbId);
    }
    return null;
  },

  // Check if TMDB is available
  isAvailable(): boolean {
    return !!getApiKey() && isOnline();
  },
};

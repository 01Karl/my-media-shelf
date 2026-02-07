import { getSetting, setSetting } from '@/db';
import { itemRepository } from '@/db/repositories/itemRepository';
import { libraryRepository } from '@/db/repositories/libraryRepository';
import { tmdbService } from '@/services/tmdbService';
import type { Library, MediaFormat, MediaType } from '@/types';

const ENABLE_SERIES_IMPORT = true;
const ENABLE_TMDB_LOOKUP = true;
const SERIES_IMPORT_SETTING_KEY = 'import:series:gemensamt';
const MOVIES_IMPORT_SETTING_KEY = 'import:movies:gemensamt';
const TMDB_ENRICH_SETTING_KEY = 'import:tmdb:gemensamt';
const TARGET_LIBRARY_NAME = 'Gemensamt';

const IMPORT_CSV_PATHS = {
  series: '/imports/series.csv',
  movies: '/imports/movies.csv',
} as const;

const importCsvCache = new Map<keyof typeof IMPORT_CSV_PATHS, string>();

async function loadImportCsv(type: keyof typeof IMPORT_CSV_PATHS): Promise<string> {
  const cached = importCsvCache.get(type);
  if (cached) {
    return cached;
  }

  const response = await fetch(IMPORT_CSV_PATHS[type]);
  if (!response.ok) {
    throw new Error(`Missing import CSV: ${IMPORT_CSV_PATHS[type]}`);
  }

  const content = await response.text();
  importCsvCache.set(type, content);
  return content;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current);
    rows.push(row.map(value => value.trim()));
  }

  return rows;
}

function parseTitle(title: string): { cleanTitle: string; year?: number } {
  const match = title.match(/\s*\((\d{4})(?:-\d{4})?\)\s*$/);
  if (!match) {
    return { cleanTitle: title.trim() };
  }

  const year = Number(match[1]);
  const cleanTitle = title.replace(match[0], '').trim();
  return { cleanTitle, year };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function createLookupKey(title: string, type: MediaType, year?: number, season?: number): string {
  return `${normalizeTitle(title)}|${type}|${year ?? 'unknown'}|${season ?? 0}`;
}

function normalizeResolution(resolution?: string): string | undefined {
  if (!resolution) return undefined;
  const trimmed = resolution.trim();
  if (trimmed === '720x576') return '720p';
  if (trimmed === '1920x1080') return '1080p';
  if (trimmed === '3840x2160') return '4K';
  return trimmed;
}

function parseSeasonValue(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

async function getOrCreateGemensamtLibrary(ownerId: string): Promise<Library> {
  const libraries = await libraryRepository.getByOwner(ownerId);
  const existing = libraries.find(
    library => library.name.trim().toLowerCase() === TARGET_LIBRARY_NAME.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  return libraryRepository.create(ownerId, TARGET_LIBRARY_NAME, {
    description: 'Delat bibliotek',
    icon: '🤝',
    isShared: true,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function runOneTimeSeriesImport(ownerId: string): Promise<{ imported: number; skipped: boolean }> {
  if (!ENABLE_SERIES_IMPORT) {
    return { imported: 0, skipped: true };
  }

  const shouldUseTmdb = ENABLE_TMDB_LOOKUP && tmdbService.isAvailable();
  const library = await getOrCreateGemensamtLibrary(ownerId);
  const [seriesCsv, moviesCsv] = await Promise.all([
    loadImportCsv('series'),
    loadImportCsv('movies'),
  ]);
  const seriesImported = await importFromCsv({
    csv: seriesCsv,
    type: 'series',
    defaultFormat: 'Digital',
    ownerId,
    library,
    settingKey: SERIES_IMPORT_SETTING_KEY,
    useYearColumn: false,
    useTmdbLookup: shouldUseTmdb,
  });

  const movieImported = await importFromCsv({
    csv: moviesCsv,
    type: 'movie',
    defaultFormat: 'Digital',
    ownerId,
    library,
    settingKey: MOVIES_IMPORT_SETTING_KEY,
    useYearColumn: true,
    useTmdbLookup: shouldUseTmdb,
  });

  if (shouldUseTmdb) {
    await enrichTmdbForLibrary({
      ownerId,
      libraryId: library.libraryId,
      settingKey: TMDB_ENRICH_SETTING_KEY,
      delayMs: 750,
      seriesCsv,
      moviesCsv,
    });
  }

  return {
    imported: seriesImported + movieImported,
    skipped: seriesImported === 0 && movieImported === 0 && !shouldUseTmdb,
  };
}

async function importFromCsv(options: {
  csv: string;
  type: MediaType;
  defaultFormat: MediaFormat;
  ownerId: string;
  library: Library;
  settingKey: string;
  useYearColumn: boolean;
  useTmdbLookup: boolean;
}): Promise<number> {
  const hasRun = await getSetting(options.settingKey);
  if (hasRun === 'done') {
    return 0;
  }

  const shouldUseTmdb = options.useTmdbLookup && tmdbService.isAvailable();
  const rows = parseCsvRows(options.csv);
  const dataRows = rows.slice(1);

  let imported = 0;

  for (const row of dataRows) {
    if (options.useYearColumn) {
      const [rawTitle, rawYear, sound, resolution] = row;
      if (!rawTitle) continue;

      const { cleanTitle, year } = parseTitle(rawTitle);
      const parsedYear = Number(rawYear);
      const resolvedYear = Number.isFinite(parsedYear) ? parsedYear : year;
      const tmdbId = shouldUseTmdb
        ? await lookupTmdbId(cleanTitle, options.type, resolvedYear)
        : undefined;
      await itemRepository.create(
        options.library.libraryId,
        options.ownerId,
        {
          type: options.type,
          title: cleanTitle,
          format: options.defaultFormat,
          year: resolvedYear,
          tmdbId: tmdbId ?? undefined,
          audioInfo: sound || undefined,
          videoInfo: normalizeResolution(resolution),
        },
        options.library.sharedLibraryId
      );
      imported += 1;
    } else {
      const [rawTitle, columnTwo, columnThree, columnFour] = row;
      if (!rawTitle) continue;

      const season = row.length >= 4 ? parseSeasonValue(columnTwo) : undefined;
      const sound = row.length >= 4 ? columnThree : columnTwo;
      const resolution = row.length >= 4 ? columnFour : columnThree;
      const { cleanTitle, year } = parseTitle(rawTitle);
      const tmdbId = shouldUseTmdb
        ? await lookupTmdbId(cleanTitle, options.type, year)
        : undefined;
      await itemRepository.create(
        options.library.libraryId,
        options.ownerId,
        {
          type: options.type,
          title: cleanTitle,
          format: options.defaultFormat,
          year,
          season,
          tmdbId: tmdbId ?? undefined,
          audioInfo: sound || undefined,
          videoInfo: normalizeResolution(resolution),
        },
        options.library.sharedLibraryId
      );
      imported += 1;
    }

    if (shouldUseTmdb) {
      await sleep(750);
    }
  }

  await setSetting(options.settingKey, 'done');
  return imported;
}

async function lookupTmdbId(title: string, type: MediaType, year?: number): Promise<number | null> {
  console.log(`[TMDB import] Searching: "${title}" (${type}${year ? `, ${year}` : ''})`);
  const results = await tmdbService.search(title, type, year);
  if (results.length === 0) {
    console.log(`[TMDB import] No match for: "${title}" (${type}${year ? `, ${year}` : ''})`);
    return null;
  }

  const match = results[0];
  console.log(`[TMDB import] Matched "${title}" -> TMDB ${match.id} (${match.title})`);
  await tmdbService.getDetails(match.id, type);
  return match.id;
}

async function enrichTmdbForLibrary(options: {
  ownerId: string;
  libraryId: string;
  settingKey: string;
  delayMs: number;
  seriesCsv: string;
  moviesCsv: string;
}): Promise<void> {
  const hasRun = await getSetting(options.settingKey);
  if (hasRun === 'done') {
    return;
  }

  const items = await itemRepository.getByLibrary(options.libraryId);
  const itemsByKey = new Map(
    items.map(item => [
      createLookupKey(item.title, item.type, item.year, item.season),
      item,
    ])
  );

  const seriesRows = parseCsvRows(options.seriesCsv).slice(1);
  for (const row of seriesRows) {
    const [rawTitle, columnTwo] = row;
    if (!rawTitle) continue;

    const season = row.length >= 4 ? parseSeasonValue(columnTwo) : undefined;
    const { cleanTitle, year } = parseTitle(rawTitle);
    const key = createLookupKey(cleanTitle, 'series', year, season);
    const existing = itemsByKey.get(key);
    if (!existing || existing.tmdbId) continue;

    const tmdbId = await lookupTmdbId(cleanTitle, 'series', year);
    if (!tmdbId) continue;

    await itemRepository.update(existing.itemId, { tmdbId });
    await sleep(options.delayMs);
  }

  const movieRows = parseCsvRows(options.moviesCsv).slice(1);
  for (const row of movieRows) {
    const [rawTitle, maybeYear] = row;
    if (!rawTitle) continue;

    const { cleanTitle, year: parsedYear } = parseTitle(rawTitle);
    const year = Number.isFinite(Number(maybeYear)) ? Number(maybeYear) : parsedYear;
    const key = createLookupKey(cleanTitle, 'movie', year);
    const existing = itemsByKey.get(key);
    if (!existing || existing.tmdbId) continue;

    const tmdbId = await lookupTmdbId(cleanTitle, 'movie', year);
    if (!tmdbId) continue;

    await itemRepository.update(existing.itemId, { tmdbId });
    await sleep(options.delayMs);
  }

  await setSetting(options.settingKey, 'done');
}

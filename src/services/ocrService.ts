// OCR Service - extracts text from images
// Uses Tesseract.js in web environments.

import type { OCRResult } from '@/types';

let workerPromise: Promise<import('tesseract.js').Worker> | null = null;
const OCR_LANGUAGES = 'swe+eng';

const getWorker = async (): Promise<import('tesseract.js').Worker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker({
        logger: (message) => {
          if (import.meta.env.DEV) {
            console.debug('OCR:', message);
          }
        },
      });
      await worker.loadLanguage(OCR_LANGUAGES);
      await worker.initialize(OCR_LANGUAGES);
      return worker;
    })();
  }
  return workerPromise;
};

// Common patterns for extracting metadata from scanned text
const YEAR_PATTERN = /\b(19|20)\d{2}\b/g;
const SEASON_PATTERN = /(?:säsong|season|s)\s*(\d+)/i;
const AUDIO_PATTERNS = [
  /dolby\s*(digital|atmos|truehd)/i,
  /dts[:\s-]*(hd|x|ma)?/i,
  /5\.1|7\.1/,
  /stereo/i,
];
const VIDEO_PATTERNS = [
  /4k\s*(uhd|ultra\s*hd)?/i,
  /1080p|1080i/i,
  /720p/i,
  /hdr(\d+)?/i,
  /dolby\s*vision/i,
];

// Extract potential title from OCR text
function extractTitle(text: string): string | undefined {
  // Take first non-empty line as potential title
  const lines = text.split('\n').filter(line => line.trim().length > 3);
  if (lines.length > 0) {
    // Clean up the line
    let title = lines[0].trim();
    // Remove common prefix/suffix noise
    title = title.replace(/^(the\s+)?/i, '');
    return title;
  }
  return undefined;
}

// Extract year from OCR text
function extractYear(text: string): number | undefined {
  const matches = text.match(YEAR_PATTERN);
  if (matches && matches.length > 0) {
    // Return the most likely year (last one found is often the release year)
    const years = matches.map(y => parseInt(y, 10));
    // Filter to reasonable range
    const validYears = years.filter(y => y >= 1920 && y <= new Date().getFullYear() + 1);
    if (validYears.length > 0) {
      return validYears[validYears.length - 1];
    }
  }
  return undefined;
}

// Extract season number for series
function extractSeason(text: string): number | undefined {
  const match = text.match(SEASON_PATTERN);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

// Extract audio info
function extractAudioInfo(text: string): string | undefined {
  const found: string[] = [];
  for (const pattern of AUDIO_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }
  return found.length > 0 ? found.join(', ') : undefined;
}

// Extract video info
function extractVideoInfo(text: string): string | undefined {
  const found: string[] = [];
  for (const pattern of VIDEO_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }
  return found.length > 0 ? found.join(', ') : undefined;
}

export const ocrService = {
  /**
   * Process an image and extract text
   */
  async processImage(imageDataUrl: string): Promise<OCRResult> {
    if (typeof window === 'undefined') {
      return {
        text: '',
        confidence: 0,
        suggestedTitle: undefined,
        suggestedYear: undefined,
      };
    }

    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(imageDataUrl);

      return {
        text: data.text || '',
        confidence: data.confidence ?? 0,
        suggestedTitle: undefined,
        suggestedYear: undefined,
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        text: '',
        confidence: 0,
        suggestedTitle: undefined,
        suggestedYear: undefined,
      };
    }
  },

  /**
   * Parse OCR text and extract metadata
   */
  parseText(text: string): {
    suggestedTitle?: string;
    suggestedYear?: number;
    suggestedSeason?: number;
    audioInfo?: string;
    videoInfo?: string;
  } {
    return {
      suggestedTitle: extractTitle(text),
      suggestedYear: extractYear(text),
      suggestedSeason: extractSeason(text),
      audioInfo: extractAudioInfo(text),
      videoInfo: extractVideoInfo(text),
    };
  },

  /**
   * Process both front and back images and combine results
   */
  async processMediaCovers(
    frontImageDataUrl?: string,
    backImageDataUrl?: string
  ): Promise<{
    ocrTextFront?: string;
    ocrTextBack?: string;
    suggestedTitle?: string;
    suggestedYear?: number;
    suggestedSeason?: number;
    audioInfo?: string;
    videoInfo?: string;
  }> {
    const results: {
      ocrTextFront?: string;
      ocrTextBack?: string;
      suggestedTitle?: string;
      suggestedYear?: number;
      suggestedSeason?: number;
      audioInfo?: string;
      videoInfo?: string;
    } = {};

    // Process front (usually has title)
    if (frontImageDataUrl) {
      const frontResult = await this.processImage(frontImageDataUrl);
      results.ocrTextFront = frontResult.text;
      
      const frontParsed = this.parseText(frontResult.text);
      results.suggestedTitle = frontParsed.suggestedTitle;
      results.suggestedYear = frontParsed.suggestedYear;
      results.suggestedSeason = frontParsed.suggestedSeason;
    }

    // Process back (usually has technical specs)
    if (backImageDataUrl) {
      const backResult = await this.processImage(backImageDataUrl);
      results.ocrTextBack = backResult.text;
      
      const backParsed = this.parseText(backResult.text);
      // Use back for audio/video info, or supplement from front
      results.audioInfo = backParsed.audioInfo;
      results.videoInfo = backParsed.videoInfo;
      
      // If no title from front, try back
      if (!results.suggestedTitle && backParsed.suggestedTitle) {
        results.suggestedTitle = backParsed.suggestedTitle;
      }
      if (!results.suggestedYear && backParsed.suggestedYear) {
        results.suggestedYear = backParsed.suggestedYear;
      }
    }

    return results;
  },

  /**
   * Check if OCR is available
   * Returns true if we have access to OCR functionality
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined';
  },
};

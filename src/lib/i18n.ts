import type { AppLanguage } from '@/lib/language';
import { enUS } from '@/lib/translations/en-US';
import { svSE } from '@/lib/translations/sv-SE';

const translations = {
  'sv-SE': svSE,
  'en-US': enUS,
} as const;

type TranslationMap = typeof translations['en-US'];

const getValue = (source: Record<string, any>, key: string): string | undefined => {
  return key.split('.').reduce((acc: any, part) => acc?.[part], source);
};

const interpolate = (value: string, params?: Record<string, string | number>): string => {
  if (!params) return value;
  return Object.entries(params).reduce(
    (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
    value
  );
};

export const translate = (
  language: AppLanguage,
  key: string,
  params?: Record<string, string | number>
): string => {
  const candidate = getValue(translations[language] as TranslationMap, key);
  const fallback = getValue(translations['en-US'] as TranslationMap, key);
  const value = candidate ?? fallback ?? key;
  return interpolate(String(value), params);
};

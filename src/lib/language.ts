export type AppLanguage = 'sv-SE' | 'en-US';

export const SUPPORTED_LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'sv-SE', label: 'Svenska' },
  { value: 'en-US', label: 'English' },
];

export const normalizeLanguage = (language?: string | null): AppLanguage => {
  if (!language) {
    return 'en-US';
  }
  const normalized = language.toLowerCase();
  if (normalized.startsWith('sv')) {
    return 'sv-SE';
  }
  return 'en-US';
};

export const getDeviceLanguage = (): AppLanguage => {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }
  const candidate = navigator.languages?.[0] || navigator.language;
  return normalizeLanguage(candidate);
};

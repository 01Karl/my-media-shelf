import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { translate } from '@/lib/i18n';

export const useTranslation = () => {
  const language = useAppStore((state) => state.language);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language]
  );

  return { t, language };
};

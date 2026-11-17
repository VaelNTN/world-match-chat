import { CountryOption, LanguageOption } from './chatTypes';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇲🇦' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa', flag: '🇮🇩' },
];

export const COUNTRIES: CountryOption[] = [
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'WORLD', name: 'Worldwide', flag: '🌍' },
];

export function getLangLabel(code: string): string {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? `${found.flag} ${found.name}` : code.toUpperCase();
}

export function getCountry(code: string): CountryOption {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

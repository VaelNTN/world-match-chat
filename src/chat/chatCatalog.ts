import { CountryOption, LanguageOption } from './chatTypes';

export const LANGUAGES: LanguageOption[] = [
  { code: 'nl', name: 'Nederlands', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'Engels', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spaans', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Frans', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Duits', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portugees', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiaans', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turks', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'Arabisch', nativeName: 'العربية', flag: '🇲🇦' },
  { code: 'pl', name: 'Pools', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Russisch', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japans', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Koreaans', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinees', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', name: 'Zweeds', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'el', name: 'Grieks', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'id', name: 'Indonesisch', nativeName: 'Bahasa', flag: '🇮🇩' },
];

export const COUNTRIES: CountryOption[] = [
  { code: 'NL', name: 'Nederland', flag: '🇳🇱' },
  { code: 'BE', name: 'België', flag: '🇧🇪' },
  { code: 'DE', name: 'Duitsland', flag: '🇩🇪' },
  { code: 'FR', name: 'Frankrijk', flag: '🇫🇷' },
  { code: 'ES', name: 'Spanje', flag: '🇪🇸' },
  { code: 'GB', name: 'VK', flag: '🇬🇧' },
  { code: 'US', name: 'VS', flag: '🇺🇸' },
  { code: 'BR', name: 'Brazilië', flag: '🇧🇷' },
  { code: 'IT', name: 'Italië', flag: '🇮🇹' },
  { code: 'TR', name: 'Turkije', flag: '🇹🇷' },
  { code: 'MA', name: 'Marokko', flag: '🇲🇦' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'Zuid-Korea', flag: '🇰🇷' },
  { code: 'SE', name: 'Zweden', flag: '🇸🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australië', flag: '🇦🇺' },
  { code: 'WORLD', name: 'Wereldwijd', flag: '🌍' },
];

export function getLangLabel(code: string): string {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? `${found.flag} ${found.name}` : code.toUpperCase();
}

export function getCountry(code: string): CountryOption {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

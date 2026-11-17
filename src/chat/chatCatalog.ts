import { CountryOption, Gender, LanguageOption, MatchPartner } from './chatTypes';

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

interface GlobalPersonaTemplate {
  nickname: string;
  gender: Gender;
  countryName: string;
  countryFlag: string;
  languages: string[];
  bio: string;
}

const GLOBAL_PERSONAS: GlobalPersonaTemplate[] = [
  { nickname: 'Sophie', gender: 'vrouw', countryName: 'Nederland', countryFlag: '🇳🇱', languages: ['nl', 'en'], bio: 'Houdt van reizen, muziek en gezellig kletsen ☕' },
  { nickname: 'Lotte', gender: 'vrouw', countryName: 'België', countryFlag: '🇧🇪', languages: ['nl', 'fr', 'en'], bio: 'Gent • Koffieliefhebber & festivalganger 🎧' },
  { nickname: 'Emma', gender: 'vrouw', countryName: 'VK', countryFlag: '🇬🇧', languages: ['en', 'es'], bio: 'London vibes, altijd in voor een leuke babbel!' },
  { nickname: 'Elena', gender: 'vrouw', countryName: 'Spanje', countryFlag: '🇪🇸', languages: ['es', 'en'], bio: 'Madrid • Strand, tapas en nieuwe mensen leren kennen ☀️' },
  { nickname: 'Camille', gender: 'vrouw', countryName: 'Frankrijk', countryFlag: '🇫🇷', languages: ['fr', 'en'], bio: 'Lyon • Kunst, koken en talen oefenen 🎨' },
  { nickname: 'Hannah', gender: 'vrouw', countryName: 'Duitsland', countryFlag: '🇩🇪', languages: ['de', 'en', 'nl'], bio: 'Hamburg • Altijd zin in nieuwe gesprekken!' },
  { nickname: 'Beatriz', gender: 'vrouw', countryName: 'Brazilië', countryFlag: '🇧🇷', languages: ['pt', 'es', 'en'], bio: 'Rio • Dansen, strand en goed humeur 🌴' },
  { nickname: 'Giulia', gender: 'vrouw', countryName: 'Italië', countryFlag: '🇮🇹', languages: ['it', 'en'], bio: 'Milaan • Pasta, espresso en fotografie 📸' },
  { nickname: 'Zeynep', gender: 'vrouw', countryName: 'Turkije', countryFlag: '🇹🇷', languages: ['tr', 'en', 'de'], bio: 'Istanbul • Thee & lange avondchats 🌙' },
  { nickname: 'Yuna', gender: 'vrouw', countryName: 'Japan', countryFlag: '🇯🇵', languages: ['ja', 'en'], bio: 'Tokyo • Anime, games en streetfood 🍜' },
  { nickname: 'Min-ji', gender: 'vrouw', countryName: 'Zuid-Korea', countryFlag: '🇰🇷', languages: ['ko', 'en'], bio: 'Seoul • K-pop, cafés en wereldreizen ✨' },
  { nickname: 'Maya', gender: 'vrouw', countryName: 'Canada', countryFlag: '🇨🇦', languages: ['en', 'fr'], bio: 'Toronto • Wandelen in de natuur & series kijken' },
  { nickname: 'Daan', gender: 'man', countryName: 'Nederland', countryFlag: '🇳🇱', languages: ['nl', 'en'], bio: 'Utrecht • Sport, gaming en goede gesprekken 🎮' },
  { nickname: 'Lucas', gender: 'man', countryName: 'België', countryFlag: '🇧🇪', languages: ['nl', 'fr', 'en'], bio: 'Antwerpen • Muziek maken & lachen 😄' },
  { nickname: 'Liam', gender: 'man', countryName: 'Australië', countryFlag: '🇦🇺', languages: ['en'], bio: 'Sydney • Surfen, reizen en relaxen 🏄' },
  { nickname: 'Mateo', gender: 'man', countryName: 'Spanje', countryFlag: '🇪🇸', languages: ['es', 'en', 'pt'], bio: 'Barcelona • Voetbal & zonsondergangen ⚽' },
  { nickname: 'Hugo', gender: 'man', countryName: 'Frankrijk', countryFlag: '🇫🇷', languages: ['fr', 'en'], bio: 'Parijs • Filmfanaat & avonturier 🎬' },
  { nickname: 'Jonas', gender: 'man', countryName: 'Duitsland', countryFlag: '🇩🇪', languages: ['de', 'en'], bio: 'Berlijn • Elektronica & verre reizen 🌍' },
  { nickname: 'Rafael', gender: 'man', countryName: 'Brazilië', countryFlag: '🇧🇷', languages: ['pt', 'en', 'es'], bio: 'São Paulo • Altijd positief en klaar voor een praatje!' },
  { nickname: 'Marco', gender: 'man', countryName: 'Italië', countryFlag: '🇮🇹', languages: ['it', 'en'], bio: 'Rome • Auto’s, pizza & gezelligheid 🍕' },
  { nickname: 'Emre', gender: 'man', countryName: 'Turkije', countryFlag: '🇹🇷', languages: ['tr', 'en', 'nl'], bio: 'Izmir • Vrienden maken over de hele wereld 🤝' },
  { nickname: 'Kenji', gender: 'man', countryName: 'Japan', countryFlag: '🇯🇵', languages: ['ja', 'en'], bio: 'Osaka • Tech, auto’s en reizen 🚄' },
  { nickname: 'Noah', gender: 'man', countryName: 'VS', countryFlag: '🇺🇸', languages: ['en', 'es'], bio: 'Austin • Gitaar spelen en mensen ontmoeten 🎸' },
  { nickname: 'Oskar', gender: 'man', countryName: 'Zweden', countryFlag: '🇸🇪', languages: ['sv', 'en', 'de'], bio: 'Stockholm • Buitenleven & fotografie 🌲' },
];

export function pickFallbackPartner(
  targetGender: Gender,
  preferredLangs: string[],
  allowGlobalFallback: boolean,
  recentNames: string[]
): MatchPartner | null {
  const byGender = GLOBAL_PERSONAS.filter((p) => p.gender === targetGender);
  const matchingLang = byGender.filter((p) =>
    p.languages.some((l) => preferredLangs.includes(l))
  );

  let pool = matchingLang.length > 0 ? matchingLang : allowGlobalFallback ? byGender : [];
  if (pool.length === 0) return null;

  const nonRecent = pool.filter((p) => !recentNames.includes(p.nickname));
  if (nonRecent.length > 0) pool = nonRecent;

  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `global-${picked.nickname.toLowerCase()}-${Date.now().toString(36)}`,
    nickname: picked.nickname,
    gender: picked.gender,
    countryName: picked.countryName,
    countryFlag: picked.countryFlag,
    languages: picked.languages,
    isRemoteHuman: false,
    bio: picked.bio,
  };
}

export function buildGreeting(partner: MatchPartner, userLangs: string[]): { text: string; lang: string } {
  const shared = partner.languages.find((l) => userLangs.includes(l)) || partner.languages[0] || 'en';
  const greets: Record<string, string[]> = {
    nl: [
      `Hoi! 👋 Leuk om je te treffen vanuit ${partner.countryName} ${partner.countryFlag}. Hoe is je dag?`,
      `Hey daar! Alles goed? Hier ${partner.nickname} uit ${partner.countryName} 😄`,
    ],
    en: [
      `Hey! 👋 Nice to meet you from ${partner.countryName} ${partner.countryFlag}! How's your day going?`,
      `Hi there! I'm ${partner.nickname} from ${partner.countryName}. Where are you chatting from?`,
    ],
    es: [
      `¡Hola! 👋 Encantado/a de conocerte desde ${partner.countryName} ${partner.countryFlag}. ¿Qué tal todo?`,
    ],
    fr: [
      `Coucou ! 👋 Ravi(e) de discuter avec toi depuis ${partner.countryName} ${partner.countryFlag}. Comment vas-tu ?`,
    ],
    de: [
      `Hey! 👋 Schöne Grüße aus ${partner.countryName} ${partner.countryFlag}! Wie läuft dein Tag?`,
    ],
    pt: [
      `Oi! 👋 Tudo bem? Falando de ${partner.countryName} ${partner.countryFlag}!`,
    ],
    it: [
      `Ciao! 👋 Che bello conoscerti da ${partner.countryName} ${partner.countryFlag}! Come stai?`,
    ],
    tr: [
      `Selam! 👋 ${partner.countryName} ${partner.countryFlag} selamlar! Nasılsın?`,
    ],
    ja: [
      `こんにちは！👋 ${partner.countryName}からチャットしてるよ！元気？`,
    ],
    ko: [
      `안녕! 👋 ${partner.countryName}에서 반가워요! 오늘 어때요?`,
    ],
  };

  const options = greets[shared] || greets.en;
  return {
    text: options[Math.floor(Math.random() * options.length)],
    lang: shared,
  };
}

export function generateContextualReply(
  partner: MatchPartner,
  userMessage: string,
  userCountryName: string,
  userLangs: string[]
): { text: string; lang: string } {
  const shared = partner.languages.find((l) => userLangs.includes(l)) || partner.languages[0] || 'en';
  const lower = userMessage.toLowerCase();

  const isNl = shared === 'nl';
  const isEs = shared === 'es';
  const isFr = shared === 'fr';
  const isDe = shared === 'de';

  if (/(hoi|hey|hallo|hi|hello|hola|salut|coucou|selam)/.test(lower)) {
    if (isNl) return { text: `Gezellig dat je er bent! Hoe gaat het met jou in ${userCountryName}? 😊`, lang: 'nl' };
    if (isEs) return { text: `¡Qué bien! ¿Cómo está el día por ${userCountryName}? 😄`, lang: 'es' };
    if (isFr) return { text: `Trop cool ! Tu fais quoi de beau aujourd'hui ? ✨`, lang: 'fr' };
    if (isDe) return { text: `Freut mich! Was machst du heute Schönes? 😊`, lang: 'de' };
    return { text: `So nice meeting someone from ${userCountryName}! What are you up to today? 😊`, lang: shared };
  }

  if (/(waar|where|land|country|woher|donde|d'où|vandaan)/.test(lower)) {
    if (isNl) return { text: `Ik woon in ${partner.countryName} ${partner.countryFlag}! En hoe bevalt het in ${userCountryName}?`, lang: 'nl' };
    if (isEs) return { text: `Soy de ${partner.countryName} ${partner.countryFlag} ¡Me encantaría visitar ${userCountryName} algún día!`, lang: 'es' };
    if (isFr) return { text: `Je suis en ${partner.countryName} ${partner.countryFlag}. C'est comment ${userCountryName} ?`, lang: 'fr' };
    if (isDe) return { text: `Ich komme aus ${partner.countryName} ${partner.countryFlag}! Warst du schon mal hier?`, lang: 'de' };
    return { text: `I'm from ${partner.countryName} ${partner.countryFlag}! Have you ever visited?`, lang: shared };
  }

  if (/(hobby|werk|studie|muziek|game|sport|film|eten|pizza|koffie|what do you|wat doe)/.test(lower)) {
    if (isNl) return { text: `Klinkt top! ${partner.bio} — wat doe jij het liefst in je vrije tijd?`, lang: 'nl' };
    return { text: `Love that! ${partner.bio}. What's your favorite way to relax? ✨`, lang: shared };
  }

  if (lower.includes('?')) {
    if (isNl) {
      const qa = [
        'Haha goede vraag! Ik moet zeggen dat ik dat echt leuk vind 😄 En jij zelf?',
        `Best goed hoor! Hier in ${partner.countryName} is het lekker rustig vandaag. Hoe zit dat bij jou?`,
        'Dat verschilt per dag! Maar wereldwijd mensen leren kennen zoals nu vind ik sowieso tof 🌍',
      ];
      return { text: qa[Math.floor(Math.random() * qa.length)], lang: 'nl' };
    }
    if (isEs) return { text: '¡Buena pregunta! Aquí todo genial, me encanta charlar con gente de todo el mundo 🌍 ¿Y tú?', lang: 'es' };
    if (isFr) return { text: 'Bonne question ! J’adore discuter avec des personnes du monde entier 🌍 Et toi ?', lang: 'fr' };
    if (isDe) return { text: 'Gute Frage! Ich finde es mega cool, Leute aus aller Welt kennenzulernen 🌍 Und du?', lang: 'de' };
    return { text: `Great question! Honest answer: I just love meeting fun people around the world 🌍 What about you?`, lang: shared };
  }

  if (isNl) {
    const nlReplies = [
      `Leuk om te horen! Over ${userMessage.slice(0, 26)} gesproken — ik snap helemaal wat je bedoelt 😊`,
      `Haha echt waar? Vertel eens meer! Wat vind je nog meer leuk om te doen?`,
      `Dat klinkt super gezellig 🙌 Wat is jouw favoriete plek om naartoe te reizen?`,
      `Mooi! Spreek je trouwens nog andere talen behalve Nederlands? 🌍`,
    ];
    return { text: nlReplies[Math.floor(Math.random() * nlReplies.length)], lang: 'nl' };
  }
  if (isEs) return { text: `¡Jaja qué guay! Cuéntame más sobre eso 😄 ¿Qué música te gusta?`, lang: 'es' };
  if (isFr) return { text: `Ah génial ! Tu as des projets sympas pour cette semaine ? 🌟`, lang: 'fr' };
  if (isDe) return { text: `Klingt richtig cool! Erzähl mir gern mehr darüber 🙌`, lang: 'de' };

  const enReplies = [
    `Haha that's awesome! Tell me more about it 😄`,
    `Really? I totally vibe with that! What kind of music or movies are you into? 🎧`,
    `Love talking to people from ${userCountryName}! What's your dream travel destination? ✈️`,
    `Sounds super fun 🙌 Do you speak multiple languages too?`,
  ];
  return { text: enReplies[Math.floor(Math.random() * enReplies.length)], lang: shared };
}

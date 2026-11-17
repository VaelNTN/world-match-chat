export type Gender = 'man' | 'vrouw';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface UserProfile {
  deviceId: string;
  nickname: string;
  gender: Gender;
  countryCode: string;
  languages: string[];
  allowGlobalFallback: boolean;
}

export interface MatchPartner {
  id: string;
  nickname: string;
  gender: Gender;
  countryName: string;
  countryFlag: string;
  languages: string[];
  isRemoteHuman: boolean;
  bio: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'partner' | 'system';
  senderName: string;
  text: string;
  lang?: string;
  createdAt: number;
}

export type SessionPhase = 'idle' | 'searching' | 'connected';

export interface SavedMatchSummary {
  partnerName: string;
  partnerGender: Gender;
  countryFlag: string;
  countryName: string;
  languages: string[];
  lastMessage: string;
  timestamp: number;
}

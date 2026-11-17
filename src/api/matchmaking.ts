import {
  buildGreeting,
  generateContextualReply,
  getCountry,
  pickFallbackPartner,
} from '../chat/chatCatalog';
import {
  ChatMessage,
  Gender,
  MatchPartner,
  SavedMatchSummary,
  SessionPhase,
  UserProfile,
} from '../chat/chatTypes';
import { chatSound } from '../chat/sound';

const KEY_PROFILE = 'wm_profile_v1';
const KEY_API = 'wm_api_url_v1';
const KEY_HISTORY = 'wm_match_history_v1';
const KEY_BLOCKED = 'wm_blocked_ids_v1';

function createDeviceId(): string {
  return `wm-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      return {
        deviceId: parsed.deviceId || createDeviceId(),
        nickname: parsed.nickname || 'Globetrotter',
        gender: parsed.gender === 'vrouw' ? 'vrouw' : 'man',
        countryCode: parsed.countryCode || 'NL',
        languages:
          Array.isArray(parsed.languages) && parsed.languages.length > 0
            ? parsed.languages
            : ['nl', 'en'],
        allowGlobalFallback: parsed.allowGlobalFallback !== false,
      };
    }
  } catch {
    // ignore
  }
  const fresh: UserProfile = {
    deviceId: createDeviceId(),
    nickname: 'Globetrotter',
    gender: 'man',
    countryCode: 'NL',
    languages: ['nl', 'en'],
    allowGlobalFallback: true,
  };
  saveProfile(fresh);
  return fresh;
}

export function saveProfile(p: UserProfile): void {
  try {
    localStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function getApiUrl(): string {
  try {
    const saved = localStorage.getItem(KEY_API);
    if (saved) return saved;
  } catch {
    // ignore
  }
  const envUrl =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '';
  return envUrl.trim().replace(/\/+$/, '');
}

export function setApiUrl(url: string): void {
  try {
    localStorage.setItem(KEY_API, url.trim().replace(/\/+$/, ''));
  } catch {
    // ignore
  }
}

export function loadBlockedIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY_BLOCKED);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function blockPartnerId(id: string): void {
  const list = loadBlockedIds();
  if (!list.includes(id)) {
    list.push(id);
    try {
      localStorage.setItem(KEY_BLOCKED, JSON.stringify(list.slice(-100)));
    } catch {
      // ignore
    }
  }
}

export function loadMatchHistory(): SavedMatchSummary[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    return raw ? (JSON.parse(raw) as SavedMatchSummary[]) : [];
  } catch {
    return [];
  }
}

function recordMatchHistory(partner: MatchPartner, lastMessage: string): void {
  const list = loadMatchHistory().filter((m) => m.partnerName !== partner.nickname);
  list.unshift({
    partnerName: partner.nickname,
    partnerGender: partner.gender,
    countryFlag: partner.countryFlag,
    countryName: partner.countryName,
    languages: partner.languages,
    lastMessage,
    timestamp: Date.now(),
  });
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(list.slice(0, 25)));
  } catch {
    // ignore
  }
}

export interface SessionState {
  phase: SessionPhase;
  searchStatus: string;
  partner: MatchPartner | null;
  partnerTyping: boolean;
  messages: ChatMessage[];
}

export class WorldChatSession {
  private profile: UserProfile;
  private onChange: (state: SessionState) => void;

  private phase: SessionPhase = 'idle';
  private searchStatus = '';
  private partner: MatchPartner | null = null;
  private partnerTyping = false;
  private messages: ChatMessage[] = [];

  private roomId: string | null = null;
  private lastPollSince = 0;
  private pollTimer: number | null = null;
  private fallbackTimer: number | null = null;
  private replyTimer: number | null = null;
  private bc: BroadcastChannel | null = null;
  private recentFallbackNames: string[] = [];

  constructor(profile: UserProfile, onChange: (state: SessionState) => void) {
    this.profile = profile;
    this.onChange = onChange;
  }

  updateProfile(p: UserProfile): void {
    this.profile = p;
  }

  getState(): SessionState {
    return {
      phase: this.phase,
      searchStatus: this.searchStatus,
      partner: this.partner,
      partnerTyping: this.partnerTyping,
      messages: [...this.messages],
    };
  }

  private emit(): void {
    this.onChange(this.getState());
  }

  private clearTimers(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.replyTimer !== null) {
      clearTimeout(this.replyTimer);
      this.replyTimer = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }

  startSearch(): void {
    this.leave(false);
    const targetGender: Gender = this.profile.gender === 'man' ? 'vrouw' : 'man';
    const targetLabel = targetGender === 'vrouw' ? 'Vrouw ♀️' : 'Man ♂️';

    this.phase = 'searching';
    this.partner = null;
    this.partnerTyping = false;
    this.messages = [];
    this.searchStatus = `Wereldwijd zoeken naar een ${targetLabel} in jouw talen...`;
    this.emit();

    // 1. Setup BroadcastChannel so 2 tabs/browsers on the same device can match live instantly
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('world-match-chat-lobby');
      this.bc.onmessage = (ev: MessageEvent<{
        type: string;
        roomId?: string;
        from?: UserProfile;
        toDeviceId?: string;
        message?: ChatMessage;
      }>) => {
        const d = ev.data;
        if (!d) return;
        if (d.type === 'SEEK' && this.phase === 'searching' && d.from) {
          if (d.from.deviceId === this.profile.deviceId) return;
          if (d.from.gender !== targetGender) return;
          const hasSharedLang = d.from.languages.some((l) => this.profile.languages.includes(l));
          if (!hasSharedLang && !this.profile.allowGlobalFallback) return;

          const room = `bc-${[this.profile.deviceId, d.from.deviceId].sort().join('-')}`;
          const c = getCountry(d.from.countryCode);
          this.bc?.postMessage({
            type: 'ACCEPT',
            roomId: room,
            from: this.profile,
            toDeviceId: d.from.deviceId,
          });
          this.connectToPartner(
            {
              id: d.from.deviceId,
              nickname: d.from.nickname,
              gender: d.from.gender,
              countryName: c.name,
              countryFlag: c.flag,
              languages: d.from.languages,
              isRemoteHuman: true,
              bio: `Live gebruiker uit ${c.name}`,
            },
            room
          );
        } else if (
          d.type === 'ACCEPT' &&
          this.phase === 'searching' &&
          d.toDeviceId === this.profile.deviceId &&
          d.from &&
          d.roomId
        ) {
          const c = getCountry(d.from.countryCode);
          this.connectToPartner(
            {
              id: d.from.deviceId,
              nickname: d.from.nickname,
              gender: d.from.gender,
              countryName: c.name,
              countryFlag: c.flag,
              languages: d.from.languages,
              isRemoteHuman: true,
              bio: `Live gebruiker uit ${c.name}`,
            },
            d.roomId
          );
        } else if (d.type === 'MSG' && d.roomId === this.roomId && d.message) {
          if (d.message.senderName === this.profile.nickname && d.from?.deviceId === this.profile.deviceId) {
            return;
          }
          this.messages.push({
            ...d.message,
            sender: 'partner',
          });
          chatSound.incoming();
          if (this.partner) recordMatchHistory(this.partner, d.message.text);
          this.emit();
        } else if (d.type === 'LEAVE' && d.roomId === this.roomId && this.phase === 'connected') {
          this.messages.push({
            id: `sys-${Date.now()}`,
            sender: 'system',
            senderName: 'Systeem',
            text: `${this.partner?.nickname || 'De ander'} heeft de chat verlaten. Tik op "Volgende" voor een nieuwe wereldwijde match!`,
            createdAt: Date.now(),
          });
          this.emit();
        }
      };

      this.bc.postMessage({ type: 'SEEK', from: this.profile });
    }

    // 2. Worker queue polling if Worker URL configured
    const api = getApiUrl();
    if (api) {
      void this.tryWorkerMatch(false);
      this.pollTimer = window.setInterval(() => {
        if (this.phase === 'searching') {
          void this.tryWorkerMatch(true);
        } else if (this.phase === 'connected' && this.roomId && !this.roomId.startsWith('bc-') && !this.roomId.startsWith('sim-')) {
          void this.pollWorkerRoom();
        }
      }, 1400);
    }

    // 3. After 2.6s (if still searching), broaden globally and match available global partner so user always finds someone!
    this.fallbackTimer = window.setTimeout(() => {
      if (this.phase !== 'searching') return;
      this.searchStatus = `Talen verruimen naar wereldwijd (${targetLabel})...`;
      this.emit();

      this.fallbackTimer = window.setTimeout(() => {
        if (this.phase !== 'searching') return;
        const partner = pickFallbackPartner(
          targetGender,
          this.profile.languages,
          this.profile.allowGlobalFallback,
          this.recentFallbackNames
        );
        if (!partner) {
          this.searchStatus =
            'Geen match gevonden met alleen deze taal. Zet "Wereldwijd alle talen" aan om direct iemand te vinden!';
          this.emit();
          return;
        }
        this.recentFallbackNames.push(partner.nickname);
        if (this.recentFallbackNames.length > 8) this.recentFallbackNames.shift();
        this.connectToPartner(partner, `sim-${Date.now().toString(36)}`);
      }, 1100);
    }, 1700);
  }

  private async tryWorkerMatch(allowGlobal: boolean): Promise<void> {
    const api = getApiUrl();
    if (!api || this.phase !== 'searching') return;
    const c = getCountry(this.profile.countryCode);
    try {
      const res = await fetch(`${api}/api/world-chat/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.profile.deviceId,
          nickname: this.profile.nickname,
          gender: this.profile.gender,
          countryName: c.name,
          countryFlag: c.flag,
          languages: this.profile.languages,
          allowGlobal: allowGlobal && this.profile.allowGlobalFallback,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        matched?: boolean;
        roomId?: string;
        partner?: MatchPartner;
      };
      if (data.matched && data.roomId && data.partner && this.phase === 'searching') {
        const blocked = loadBlockedIds();
        if (blocked.includes(data.partner.id)) return;
        this.connectToPartner({ ...data.partner, isRemoteHuman: true }, data.roomId);
      }
    } catch {
      // network silent; fallback covers user
    }
  }

  private async pollWorkerRoom(): Promise<void> {
    const api = getApiUrl();
    if (!api || !this.roomId) return;
    try {
      const res = await fetch(
        `${api}/api/world-chat/poll?roomId=${encodeURIComponent(this.roomId)}&deviceId=${encodeURIComponent(
          this.profile.deviceId
        )}&since=${this.lastPollSince}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        partnerLeft?: boolean;
        messages?: Array<{
          id: number;
          senderId: string;
          senderName: string;
          text: string;
          lang: string;
          createdAtMs: number;
        }>;
      };
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        for (const m of data.messages) {
          this.lastPollSince = Math.max(this.lastPollSince, m.createdAtMs);
          if (m.senderId === this.profile.deviceId) continue;
          this.messages.push({
            id: `srv-${m.id}`,
            sender: 'partner',
            senderName: m.senderName,
            text: m.text,
            lang: m.lang,
            createdAt: m.createdAtMs,
          });
          chatSound.incoming();
          if (this.partner) recordMatchHistory(this.partner, m.text);
        }
        this.emit();
      }
      if (data.partnerLeft) {
        this.messages.push({
          id: `sys-${Date.now()}`,
          sender: 'system',
          senderName: 'Systeem',
          text: `${this.partner?.nickname || 'De ander'} is weggegaan. Druk op Volgende ⏭️!`,
          createdAt: Date.now(),
        });
        this.leave(true);
      }
    } catch {
      // ignore
    }
  }

  private connectToPartner(partner: MatchPartner, roomId: string): void {
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.phase = 'connected';
    this.partner = partner;
    this.roomId = roomId;
    this.lastPollSince = 0;
    this.partnerTyping = false;

    const genderTxt = partner.gender === 'vrouw' ? 'Vrouw ♀️' : 'Man ♂️';
    this.messages = [
      {
        id: `sys-connect-${Date.now()}`,
        sender: 'system',
        senderName: 'Match',
        text: `Gematcht met ${partner.nickname} (${genderTxt}) uit ${partner.countryFlag} ${partner.countryName}!`,
        createdAt: Date.now(),
      },
    ];
    chatSound.matched();
    recordMatchHistory(partner, 'Gematcht!');
    this.emit();

    // If simulated global partner, send warm multilingual greeting after typing delay
    if (!partner.isRemoteHuman) {
      this.partnerTyping = true;
      this.emit();
      this.replyTimer = window.setTimeout(() => {
        if (this.phase !== 'connected' || !this.partner) return;
        this.partnerTyping = false;
        const g = buildGreeting(this.partner, this.profile.languages);
        this.messages.push({
          id: `p-${Date.now()}`,
          sender: 'partner',
          senderName: this.partner.nickname,
          text: g.text,
          lang: g.lang,
          createdAt: Date.now(),
        });
        chatSound.incoming();
        recordMatchHistory(this.partner, g.text);
        this.emit();
      }, 950);
    }
  }

  sendMessage(rawText: string): void {
    const text = rawText.trim();
    if (!text || this.phase !== 'connected' || !this.partner) return;

    const msg: ChatMessage = {
      id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'me',
      senderName: this.profile.nickname,
      text,
      lang: this.profile.languages[0] || 'nl',
      createdAt: Date.now(),
    };
    this.messages.push(msg);
    chatSound.sent();
    recordMatchHistory(this.partner, text);
    this.emit();

    if (this.roomId?.startsWith('bc-') && this.bc) {
      this.bc.postMessage({
        type: 'MSG',
        roomId: this.roomId,
        from: this.profile,
        message: msg,
      });
    } else if (this.roomId && !this.roomId.startsWith('sim-')) {
      const api = getApiUrl();
      if (api) {
        void fetch(`${api}/api/world-chat/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.roomId,
            senderId: this.profile.deviceId,
            senderName: this.profile.nickname,
            text,
            lang: msg.lang,
          }),
        }).catch(() => {});
      }
    } else if (!this.partner.isRemoteHuman) {
      if (this.replyTimer !== null) clearTimeout(this.replyTimer);
      this.partnerTyping = true;
      this.emit();
      const delay = 750 + Math.min(1300, text.length * 22);
      const userCountry = getCountry(this.profile.countryCode).name;
      this.replyTimer = window.setTimeout(() => {
        if (this.phase !== 'connected' || !this.partner) return;
        this.partnerTyping = false;
        const reply = generateContextualReply(
          this.partner,
          text,
          userCountry,
          this.profile.languages
        );
        this.messages.push({
          id: `p-${Date.now()}`,
          sender: 'partner',
          senderName: this.partner.nickname,
          text: reply.text,
          lang: reply.lang,
          createdAt: Date.now(),
        });
        chatSound.incoming();
        recordMatchHistory(this.partner, reply.text);
        this.emit();
      }, delay);
    }
  }

  leave(keepMessages = false): void {
    const oldRoom = this.roomId;
    if (oldRoom?.startsWith('bc-') && this.bc) {
      this.bc.postMessage({ type: 'LEAVE', roomId: oldRoom, from: this.profile });
    }
    const api = getApiUrl();
    if (api && oldRoom && !oldRoom.startsWith('bc-') && !oldRoom.startsWith('sim-')) {
      void fetch(`${api}/api/world-chat/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.profile.deviceId,
          roomId: oldRoom,
        }),
      }).catch(() => {});
    }

    this.clearTimers();
    this.roomId = null;
    this.partnerTyping = false;
    this.phase = 'idle';
    if (!keepMessages) {
      this.partner = null;
      this.messages = [];
    }
    this.emit();
  }
}

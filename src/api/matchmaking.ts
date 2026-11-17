import { getCountry } from '../chat/chatCatalog';
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
  serverConfigured: boolean;
  waitingOnlineCount: number | null;
  partner: MatchPartner | null;
  messages: ChatMessage[];
}

export class WorldChatSession {
  private profile: UserProfile;
  private onChange: (state: SessionState) => void;

  private phase: SessionPhase = 'idle';
  private searchStatus = '';
  private waitingOnlineCount: number | null = null;
  private partner: MatchPartner | null = null;
  private messages: ChatMessage[] = [];

  private roomId: string | null = null;
  private lastPollSince = 0;
  private searchStartedAt = 0;
  private pollTimer: number | null = null;
  private bc: BroadcastChannel | null = null;

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
      serverConfigured: Boolean(getApiUrl()),
      waitingOnlineCount: this.waitingOnlineCount,
      partner: this.partner,
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
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }

  startSearch(): void {
    this.leave(false);
    const targetGender: Gender = this.profile.gender === 'man' ? 'vrouw' : 'man';
    const targetLabel = targetGender === 'vrouw' ? 'Vrouw ♀️' : 'Man ♂️';
    const api = getApiUrl();

    this.phase = 'searching';
    this.partner = null;
    this.messages = [];
    this.waitingOnlineCount = null;
    this.searchStartedAt = Date.now();
    this.searchStatus = api
      ? `Zoeken naar een echte ${targetLabel} in jouw gekozen talen...`
      : `Geen live server URL ingesteld! Stel jouw Backend URL in bij ⚙️ Instellingen (zie RELEASE_STEP_BY_STEP.txt).`;
    this.emit();

    // BroadcastChannel allows 2 real tabs on the same device to test live 1-on-1 without fake bots
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
          const blocked = loadBlockedIds();
          if (blocked.includes(d.from.deviceId)) return;
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
              bio: `Live uit ${c.name}`,
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
              bio: `Live uit ${c.name}`,
            },
            d.roomId
          );
        } else if (d.type === 'MSG' && d.roomId === this.roomId && d.message) {
          if (d.from?.deviceId === this.profile.deviceId) return;
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
            text: `${this.partner?.nickname || 'De ander'} heeft de chat verlaten. Tik op "Volgende" voor een nieuwe echte match!`,
            createdAt: Date.now(),
          });
          this.emit();
        }
      };

      this.bc.postMessage({ type: 'SEEK', from: this.profile });
    }

    // Real Worker queue matchmaking (NO bots ever!)
    if (api) {
      void this.tryWorkerMatch(false);
      this.pollTimer = window.setInterval(() => {
        if (this.phase === 'searching') {
          const waitedMs = Date.now() - this.searchStartedAt;
          const allowGlobal = waitedMs >= 4000 && this.profile.allowGlobalFallback;
          if (allowGlobal) {
            this.searchStatus = `Wachten op een echte ${targetLabel} wereldwijd (alle talen)...`;
          }
          void this.tryWorkerMatch(allowGlobal);
        } else if (this.phase === 'connected' && this.roomId && !this.roomId.startsWith('bc-')) {
          void this.pollWorkerRoom();
        }
      }, 1500);
    }
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
      if (!res.ok) {
        this.searchStatus = `Server gaf fout (${res.status}). Controleer of de Cloudflare Worker + D1 gedeployed is.`;
        this.emit();
        return;
      }
      const data = (await res.json()) as {
        matched?: boolean;
        waitingCount?: number;
        roomId?: string;
        partner?: MatchPartner;
      };
      if (typeof data.waitingCount === 'number') {
        this.waitingOnlineCount = data.waitingCount;
        this.emit();
      }
      if (data.matched && data.roomId && data.partner && this.phase === 'searching') {
        const blocked = loadBlockedIds();
        if (blocked.includes(data.partner.id)) return;
        this.connectToPartner({ ...data.partner, isRemoteHuman: true }, data.roomId);
      }
    } catch {
      this.searchStatus =
        'Kan de match-server niet bereiken. Controleer je internet of Backend URL in ⚙️ Instellingen.';
      this.emit();
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
          text: `${this.partner?.nickname || 'De ander'} heeft de chat verlaten. Druk op Volgende ⏭️!`,
          createdAt: Date.now(),
        });
        this.leave(true);
      }
    } catch {
      // ignore transient network glitches
    }
  }

  private connectToPartner(partner: MatchPartner, roomId: string): void {
    this.phase = 'connected';
    this.partner = partner;
    this.roomId = roomId;
    this.lastPollSince = 0;

    const genderTxt = partner.gender === 'vrouw' ? 'Vrouw ♀️' : 'Man ♂️';
    this.messages = [
      {
        id: `sys-connect-${Date.now()}`,
        sender: 'system',
        senderName: 'Match',
        text: `Live gekoppeld met ${partner.nickname} (${genderTxt}) uit ${partner.countryFlag} ${partner.countryName}!`,
        createdAt: Date.now(),
      },
    ];
    chatSound.matched();
    recordMatchHistory(partner, 'Gekoppeld!');
    this.emit();
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
    } else if (this.roomId) {
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
    }
  }

  leave(keepMessages = false): void {
    const oldRoom = this.roomId;
    if (oldRoom?.startsWith('bc-') && this.bc) {
      this.bc.postMessage({ type: 'LEAVE', roomId: oldRoom, from: this.profile });
    }
    const api = getApiUrl();
    if (api) {
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
    this.phase = 'idle';
    if (!keepMessages) {
      this.partner = null;
      this.messages = [];
    }
    this.emit();
  }
}

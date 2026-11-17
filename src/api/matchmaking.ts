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
const KEY_BLOCKED_META = 'wm_blocked_meta_v1';

export interface BlockedUserEntry {
  id: string;
  nickname: string;
  countryFlag: string;
  blockedAt: number;
}

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
            : ['en', 'nl'],
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
    languages: ['en', 'nl'],
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
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean) {
      localStorage.removeItem(KEY_API);
    } else {
      localStorage.setItem(KEY_API, clean);
    }
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

function loadBlockedMetaMap(): Record<string, Omit<BlockedUserEntry, 'id'>> {
  try {
    const raw = localStorage.getItem(KEY_BLOCKED_META);
    return raw ? (JSON.parse(raw) as Record<string, Omit<BlockedUserEntry, 'id'>>) : {};
  } catch {
    return {};
  }
}

export function loadBlockedUsers(): BlockedUserEntry[] {
  const ids = loadBlockedIds();
  const meta = loadBlockedMetaMap();
  return ids.map((id) => ({
    id,
    nickname: meta[id]?.nickname || `User ${id.slice(-4)}`,
    countryFlag: meta[id]?.countryFlag || '🌍',
    blockedAt: meta[id]?.blockedAt || 0,
  }));
}

export function blockPartnerId(
  id: string,
  meta?: { nickname: string; countryFlag: string }
): void {
  const list = loadBlockedIds();
  if (!list.includes(id)) {
    list.push(id);
    try {
      localStorage.setItem(KEY_BLOCKED, JSON.stringify(list.slice(-100)));
    } catch {
      // ignore
    }
  }
  if (meta) {
    const map = loadBlockedMetaMap();
    map[id] = {
      nickname: meta.nickname,
      countryFlag: meta.countryFlag,
      blockedAt: Date.now(),
    };
    try {
      localStorage.setItem(KEY_BLOCKED_META, JSON.stringify(map));
    } catch {
      // ignore
    }
  }
}

export function unblockPartnerId(id: string): void {
  const list = loadBlockedIds().filter((item) => item !== id);
  const map = loadBlockedMetaMap();
  delete map[id];
  try {
    localStorage.setItem(KEY_BLOCKED, JSON.stringify(list));
    localStorage.setItem(KEY_BLOCKED_META, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function clearBlockedIds(): void {
  try {
    localStorage.removeItem(KEY_BLOCKED);
    localStorage.removeItem(KEY_BLOCKED_META);
  } catch {
    // ignore
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

export function clearMatchHistory(): void {
  try {
    localStorage.removeItem(KEY_HISTORY);
  } catch {
    // ignore
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
  partnerDisconnected: boolean;
  messages: ChatMessage[];
}

export class WorldChatSession {
  private profile: UserProfile;
  private onChange: (state: SessionState) => void;

  private phase: SessionPhase = 'idle';
  private searchStatus = '';
  private waitingOnlineCount: number | null = null;
  private partner: MatchPartner | null = null;
  private partnerDisconnected = false;
  private messages: ChatMessage[] = [];

  private roomId: string | null = null;
  private lastPollSince = 0;
  private searchStartedAt = 0;
  private pollTimer: number | null = null;
  private bc: BroadcastChannel | null = null;
  private sessionToken = 0;
  private isMatchPolling = false;
  private isRoomPolling = false;

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
      partnerDisconnected: this.partnerDisconnected,
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

  private cleanNickname(): string {
    return this.profile.nickname.trim().slice(0, 18) || 'Globetrotter';
  }

  startSearch(): void {
    this.resetSession(false, true);
    this.sessionToken += 1;
    const token = this.sessionToken;
    const targetGender: Gender = this.profile.gender === 'man' ? 'vrouw' : 'man';
    const api = getApiUrl();

    this.phase = 'searching';
    this.partner = null;
    this.partnerDisconnected = false;
    this.messages = [];
    this.waitingOnlineCount = null;
    this.searchStartedAt = Date.now();
    this.searchStatus = api
      ? 'Connecting to match server...'
      : 'Online matchmaking unavailable right now';
    this.emit();

    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('world-match-chat-lobby');
      this.bc.onmessage = (ev: MessageEvent<{
        type: string;
        roomId?: string;
        from?: UserProfile;
        toDeviceId?: string;
        message?: ChatMessage;
      }>) => {
        if (token !== this.sessionToken) return;
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
            from: { ...this.profile, nickname: this.cleanNickname() },
            toDeviceId: d.from.deviceId,
          });
          this.connectToPartner(
            {
              id: d.from.deviceId,
              nickname: d.from.nickname.trim() || 'Globetrotter',
              gender: d.from.gender,
              countryName: c.name,
              countryFlag: c.flag,
              languages: d.from.languages,
              isRemoteHuman: true,
              bio: `Live from ${c.name}`,
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
          const blocked = loadBlockedIds();
          if (blocked.includes(d.from.deviceId)) return;
          const c = getCountry(d.from.countryCode);
          this.connectToPartner(
            {
              id: d.from.deviceId,
              nickname: d.from.nickname.trim() || 'Globetrotter',
              gender: d.from.gender,
              countryName: c.name,
              countryFlag: c.flag,
              languages: d.from.languages,
              isRemoteHuman: true,
              bio: `Live from ${c.name}`,
            },
            d.roomId
          );
        } else if (d.type === 'MSG' && d.roomId === this.roomId && d.message) {
          if (d.from?.deviceId === this.profile.deviceId) return;
          if (this.messages.some((m) => m.id === d.message!.id)) return;
          this.messages.push({
            ...d.message,
            sender: 'partner',
          });
          chatSound.incoming();
          if (this.partner) recordMatchHistory(this.partner, d.message.text);
          this.emit();
        } else if (
          d.type === 'LEAVE' &&
          d.roomId === this.roomId &&
          this.phase === 'connected' &&
          !this.partnerDisconnected
        ) {
          this.handlePartnerLeft();
        }
      };

      this.bc.postMessage({
        type: 'SEEK',
        from: { ...this.profile, nickname: this.cleanNickname() },
      });
    }

    if (api) {
      void this.tryWorkerMatch(false, token);
      this.pollTimer = window.setInterval(() => {
        if (token !== this.sessionToken) return;
        if (this.phase === 'searching') {
          const waitedMs = Date.now() - this.searchStartedAt;
          const allowGlobal = waitedMs >= 4000 && this.profile.allowGlobalFallback;
          void this.tryWorkerMatch(allowGlobal, token);
        } else if (
          this.phase === 'connected' &&
          !this.partnerDisconnected &&
          this.roomId &&
          !this.roomId.startsWith('bc-')
        ) {
          void this.pollWorkerRoom(token);
        }
      }, 1500);
    }
  }

  private async tryWorkerMatch(allowGlobal: boolean, token: number): Promise<void> {
    if (this.isMatchPolling) return;
    const api = getApiUrl();
    if (!api || this.phase !== 'searching' || token !== this.sessionToken) return;
    const c = getCountry(this.profile.countryCode);
    this.isMatchPolling = true;
    try {
      const res = await fetch(`${api}/api/world-chat/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.profile.deviceId,
          nickname: this.cleanNickname(),
          gender: this.profile.gender,
          countryName: c.name,
          countryFlag: c.flag,
          languages: this.profile.languages,
          allowGlobal: allowGlobal && this.profile.allowGlobalFallback,
        }),
      });
      if (token !== this.sessionToken || this.phase !== 'searching') return;
      if (!res.ok) {
        this.searchStatus = 'Online matchmaking unavailable right now';
        this.emit();
        return;
      }
      const data = (await res.json()) as {
        matched?: boolean;
        waitingCount?: number;
        roomId?: string;
        partner?: MatchPartner;
      };
      if (token !== this.sessionToken || this.phase !== 'searching') return;

      if (typeof data.waitingCount === 'number') {
        this.waitingOnlineCount = data.waitingCount;
      }
      if (data.matched && data.roomId && data.partner) {
        const blocked = loadBlockedIds();
        if (blocked.includes(data.partner.id)) {
          this.searchStatus = allowGlobal
            ? 'Waiting for a real match worldwide...'
            : 'Waiting for a real match...';
          this.emit();
          return;
        }
        this.connectToPartner({ ...data.partner, isRemoteHuman: true }, data.roomId);
      } else {
        this.searchStatus = allowGlobal
          ? 'Waiting for a real match worldwide...'
          : 'Waiting for a real match...';
        this.emit();
      }
    } catch {
      if (token !== this.sessionToken || this.phase !== 'searching') return;
      this.searchStatus = 'Online matchmaking unavailable right now';
      this.emit();
    } finally {
      this.isMatchPolling = false;
    }
  }

  private async pollWorkerRoom(token: number): Promise<void> {
    if (this.isRoomPolling) return;
    const api = getApiUrl();
    const roomId = this.roomId;
    if (!api || !roomId || token !== this.sessionToken || this.partnerDisconnected) return;
    this.isRoomPolling = true;
    try {
      const res = await fetch(
        `${api}/api/world-chat/poll?roomId=${encodeURIComponent(roomId)}&deviceId=${encodeURIComponent(
          this.profile.deviceId
        )}&since=${this.lastPollSince}`
      );
      if (!res.ok || token !== this.sessionToken || this.roomId !== roomId) return;
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
      if (token !== this.sessionToken || this.roomId !== roomId) return;

      let hasNewMessage = false;
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        for (const m of data.messages) {
          this.lastPollSince = Math.max(this.lastPollSince, m.createdAtMs);
          if (m.senderId === this.profile.deviceId) continue;
          const msgId = `srv-${m.id}`;
          if (this.messages.some((existing) => existing.id === msgId)) continue;
          this.messages.push({
            id: msgId,
            sender: 'partner',
            senderName: m.senderName,
            text: m.text,
            lang: m.lang,
            createdAt: m.createdAtMs,
          });
          hasNewMessage = true;
          chatSound.incoming();
          if (this.partner) recordMatchHistory(this.partner, m.text);
        }
      }
      if (data.partnerLeft) {
        this.handlePartnerLeft();
        return;
      }
      if (hasNewMessage) {
        this.emit();
      }
    } catch {
      // ignore transient network glitches
    } finally {
      this.isRoomPolling = false;
    }
  }

  private handlePartnerLeft(): void {
    const oldRoom = this.roomId;
    this.clearTimers();
    this.roomId = null;
    this.partnerDisconnected = true;

    const api = getApiUrl();
    if (api && oldRoom && !oldRoom.startsWith('bc-')) {
      void fetch(`${api}/api/world-chat/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.profile.deviceId,
          roomId: oldRoom,
        }),
      }).catch(() => {});
    }

    this.messages.push({
      id: `sys-left-${Date.now()}`,
      sender: 'system',
      senderName: 'System',
      text: `${this.partner?.nickname || 'Your partner'} left the chat. Tap Next to find a new match!`,
      createdAt: Date.now(),
    });
    this.emit();
  }

  private connectToPartner(partner: MatchPartner, roomId: string): void {
    this.phase = 'connected';
    this.partner = partner;
    this.partnerDisconnected = false;
    this.roomId = roomId;
    this.lastPollSince = 0;

    const genderTxt = partner.gender === 'vrouw' ? 'Woman ♀️' : 'Man ♂️';
    this.messages = [
      {
        id: `sys-connect-${Date.now()}`,
        sender: 'system',
        senderName: 'Match',
        text: `Connected with ${partner.nickname} (${genderTxt}) from ${partner.countryFlag} ${partner.countryName}!`,
        createdAt: Date.now(),
      },
    ];
    chatSound.matched();
    recordMatchHistory(partner, 'Matched!');
    this.emit();
  }

  sendMessage(rawText: string): void {
    const text = rawText.trim();
    if (!text || this.phase !== 'connected' || !this.partner || this.partnerDisconnected) return;

    const senderName = this.cleanNickname();
    const msg: ChatMessage = {
      id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'me',
      senderName,
      text,
      lang: this.profile.languages[0] || 'en',
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
        from: { ...this.profile, nickname: senderName },
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
            senderName,
            text,
            lang: msg.lang,
          }),
        }).catch(() => {});
      }
    }
  }

  private resetSession(keepMessages: boolean, silent: boolean): void {
    this.sessionToken += 1;
    const oldRoom = this.roomId;
    if (oldRoom?.startsWith('bc-') && this.bc) {
      this.bc.postMessage({ type: 'LEAVE', roomId: oldRoom, from: this.profile });
    }
    const api = getApiUrl();
    if (api && (oldRoom || this.phase === 'searching')) {
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
    this.partnerDisconnected = false;
    this.phase = 'idle';
    if (!keepMessages) {
      this.partner = null;
      this.messages = [];
    }
    if (!silent) {
      this.emit();
    }
  }

  leave(keepMessages = false): void {
    this.resetSession(keepMessages, false);
  }
}

import './style.css';
import {
  blockPartnerId,
  clearBlockedIds,
  clearMatchHistory,
  getApiUrl,
  loadBlockedUsers,
  loadMatchHistory,
  loadProfile,
  saveProfile,
  SessionState,
  setApiUrl,
  unblockPartnerId,
  WorldChatSession,
} from './api/matchmaking';
import { COUNTRIES, getLangLabel, LANGUAGES } from './chat/chatCatalog';
import { ChatMessage, SessionPhase, UserProfile } from './chat/chatTypes';
import { chatSound } from './chat/sound';

const app = document.getElementById('app')!;

let profile: UserProfile = loadProfile();
let sessionState: SessionState = {
  phase: 'idle',
  searchStatus: '',
  serverConfigured: Boolean(getApiUrl()),
  waitingOnlineCount: null,
  partner: null,
  partnerDisconnected: false,
  messages: [],
};

const session = new WorldChatSession(profile, (st) => {
  sessionState = st;
  render();
});

let lastPhaseRendered: SessionPhase | null = null;
let currentChatRoomKey: string | null = null;
const renderedMsgIds = new Set<string>();
let langsExpanded = false;

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatLangSummary(codes: string[]): string {
  if (codes.length === LANGUAGES.length) return 'All (18)';
  const upper = codes.map((c) => c.toUpperCase());
  if (upper.length <= 3) return upper.join(', ');
  return `${upper.slice(0, 2).join(', ')} +${upper.length - 2}`;
}

function render(): void {
  if (sessionState.phase === 'idle') {
    lastPhaseRendered = 'idle';
    currentChatRoomKey = null;
    renderedMsgIds.clear();
    renderSetup();
  } else if (sessionState.phase === 'searching') {
    if (lastPhaseRendered === 'searching' && document.getElementById('search-status-text')) {
      updateSearchingIncremental();
    } else {
      lastPhaseRendered = 'searching';
      currentChatRoomKey = null;
      renderedMsgIds.clear();
      renderSearching();
    }
  } else {
    const p = sessionState.partner!;
    const roomKey = `${p.id}:${sessionState.messages[0]?.id || ''}`;
    if (
      lastPhaseRendered === 'connected' &&
      currentChatRoomKey === roomKey &&
      document.getElementById('messages-list')
    ) {
      syncChatIncremental(false);
    } else {
      lastPhaseRendered = 'connected';
      currentChatRoomKey = roomKey;
      renderedMsgIds.clear();
      renderChatShell();
      syncChatIncremental(true);
    }
  }
}

function renderSetup(): void {
  const targetText =
    profile.gender === 'man'
      ? 'Match with a Woman ♀️ worldwide'
      : 'Match with a Man ♂️ worldwide';

  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>🌍 WorldMatch Chat</h1>
          <span>18+ Global 1-on-1 Chat</span>
        </div>
        <div class="top-actions">
          <button class="icon-btn" id="btn-mute" aria-label="Toggle sound">${chatSound.isMuted() ? '🔇' : '🔊'}</button>
          <button class="icon-btn" id="btn-history" aria-label="Recent matches">🕘</button>
          <button class="icon-btn" id="btn-settings" aria-label="Settings">⚙️</button>
        </div>
      </div>

      <div class="main-scroll">
        <div class="card">
          <div class="section-label">
            <span>1. Who are you?</span>
            <span style="color:#f472b6;font-size:0.72rem;text-transform:none;">${targetText}</span>
          </div>
          <div class="gender-row">
            <button class="gender-btn man ${profile.gender === 'man' ? 'active' : ''}" id="pick-man">
              <span class="g-icon">👨</span>
              <span class="g-title">Man ♂️</span>
              <span class="g-sub">Chat with Women ♀️</span>
            </button>
            <button class="gender-btn vrouw ${profile.gender === 'vrouw' ? 'active' : ''}" id="pick-vrouw">
              <span class="g-icon">👩</span>
              <span class="g-title">Woman ♀️</span>
              <span class="g-sub">Chat with Men ♂️</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="section-label">
            <span>2. Nickname & Country</span>
          </div>
          <div class="field-row">
            <input class="text-input" id="input-nick" value="${esc(profile.nickname)}" maxlength="18" placeholder="Nickname" style="flex:1.2;" />
            <select class="select-input" id="select-country" style="flex:1;">
              ${COUNTRIES.map(
                (c) => `<option value="${c.code}" ${c.code === profile.countryCode ? 'selected' : ''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="card">
          <div class="section-label">
            <span>3. Languages & Matching</span>
          </div>
          <button class="lang-summary-btn" id="btn-toggle-langs" type="button" aria-expanded="${langsExpanded}">
            <span>🌐 Languages (${profile.languages.length}): ${formatLangSummary(profile.languages)}</span>
            <span>${langsExpanded ? '▴' : '▾'}</span>
          </button>
          ${
            langsExpanded
              ? `
            <div class="lang-expand-panel" id="lang-expand-panel">
              <div class="lang-expand-header">
                <span>Select your preferred languages</span>
                <button class="icon-btn" id="btn-all-langs" style="padding:4px 9px;font-size:0.72rem;" type="button">
                  ${profile.languages.length === LANGUAGES.length ? 'Reset (EN, NL)' : 'Select All'}
                </button>
              </div>
              <div class="lang-grid">
                ${LANGUAGES.map(
                  (l) => `
                  <button class="lang-chip ${profile.languages.includes(l.code) ? 'active' : ''}" data-lang="${l.code}" type="button">
                    ${l.flag} ${l.name}
                  </button>
                `
                ).join('')}
              </div>
            </div>
          `
              : ''
          }
          <div class="toggle-row">
            <div>
              <strong>🌍 Global Language Fallback</strong>
              <div style="font-size:0.72rem;color:#94a3b8;">Expand to all languages after 4s if quiet.</div>
            </div>
            <button class="icon-btn" id="btn-global-toggle" type="button" style="min-width:60px;${
              profile.allowGlobalFallback ? 'border-color:#22c55e;color:#4ade80;' : ''
            }">
              ${profile.allowGlobalFallback ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <button class="primary-cta" id="btn-find-match" type="button">🔍 Find Match</button>
      </div>
    </div>
  `;

  document.getElementById('btn-mute')!.onclick = () => {
    chatSound.toggleMute();
    render();
  };
  document.getElementById('btn-history')!.onclick = () => openHistoryModal();
  document.getElementById('btn-settings')!.onclick = () => openSettingsModal();

  document.getElementById('pick-man')!.onclick = () => {
    profile.gender = 'man';
    saveProfile(profile);
    session.updateProfile(profile);
    render();
  };
  document.getElementById('pick-vrouw')!.onclick = () => {
    profile.gender = 'vrouw';
    saveProfile(profile);
    session.updateProfile(profile);
    render();
  };

  const nickInput = document.getElementById('input-nick') as HTMLInputElement;
  nickInput.oninput = () => {
    profile.nickname = nickInput.value.slice(0, 18);
    saveProfile(profile);
    session.updateProfile(profile);
  };
  nickInput.onblur = () => {
    const cleaned = nickInput.value.trim().slice(0, 18) || 'Globetrotter';
    nickInput.value = cleaned;
    profile.nickname = cleaned;
    saveProfile(profile);
    session.updateProfile(profile);
  };

  const countrySel = document.getElementById('select-country') as HTMLSelectElement;
  countrySel.onchange = () => {
    profile.countryCode = countrySel.value;
    saveProfile(profile);
    session.updateProfile(profile);
  };

  document.getElementById('btn-toggle-langs')!.onclick = () => {
    langsExpanded = !langsExpanded;
    renderSetup();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    btn.onclick = () => {
      const code = btn.dataset.lang!;
      if (profile.languages.includes(code)) {
        if (profile.languages.length > 1) {
          profile.languages = profile.languages.filter((x) => x !== code);
        }
      } else {
        profile.languages.push(code);
      }
      saveProfile(profile);
      session.updateProfile(profile);
      renderSetup();
    };
  });

  const allLangsBtn = document.getElementById('btn-all-langs');
  if (allLangsBtn) {
    allLangsBtn.onclick = () => {
      if (profile.languages.length === LANGUAGES.length) {
        profile.languages = ['en', 'nl'];
      } else {
        profile.languages = LANGUAGES.map((l) => l.code);
      }
      saveProfile(profile);
      session.updateProfile(profile);
      renderSetup();
    };
  }

  document.getElementById('btn-global-toggle')!.onclick = () => {
    profile.allowGlobalFallback = !profile.allowGlobalFallback;
    saveProfile(profile);
    session.updateProfile(profile);
    renderSetup();
  };

  document.getElementById('btn-find-match')!.onclick = () => {
    if (!profile.nickname.trim()) {
      profile.nickname = 'Globetrotter';
      saveProfile(profile);
      session.updateProfile(profile);
    }
    session.startSearch();
  };
}

function getWaitingCountText(): string {
  if (sessionState.waitingOnlineCount === null) return '';
  const targetWord = profile.gender === 'man' ? 'women' : 'men';
  return `Online ${targetWord} waiting: ${sessionState.waitingOnlineCount}`;
}

function renderSearching(): void {
  const targetIcon = profile.gender === 'man' ? '👩' : '👨';
  const waitingText = getWaitingCountText();

  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>🌍 WorldMatch Chat</h1>
          <span>Live 1-on-1 Matchmaking</span>
        </div>
        <button class="icon-btn" id="btn-cancel-search" type="button">Cancel</button>
      </div>

      <div class="main-scroll">
        <div class="search-box">
          <div class="radar-pulse">${targetIcon}</div>
          <h2 id="search-status-text" style="margin:0;font-size:1.15rem;max-width:320px;">${esc(
            sessionState.searchStatus
          )}</h2>
          <div id="waiting-count-text" style="font-size:0.84rem;color:#38bdf8;font-weight:700;${
            waitingText ? '' : 'display:none;'
          }">${esc(waitingText)}</div>
          <p style="margin:0;font-size:0.82rem;color:#94a3b8;max-width:300px;">
            Languages: ${profile.languages.slice(0, 6).map((l) => getLangLabel(l)).join(', ')}${
              profile.languages.length > 6 ? ` +${profile.languages.length - 6}` : ''
            }
          </p>
          <button class="icon-btn" id="btn-stop-search" type="button" style="padding:10px 18px;margin-top:4px;">← Back</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-search')!.onclick = () => session.leave(false);
  document.getElementById('btn-stop-search')!.onclick = () => session.leave(false);
}

function updateSearchingIncremental(): void {
  const statusEl = document.getElementById('search-status-text');
  if (statusEl && statusEl.textContent !== sessionState.searchStatus) {
    statusEl.textContent = sessionState.searchStatus;
  }
  const waitEl = document.getElementById('waiting-count-text');
  if (waitEl) {
    const waitingText = getWaitingCountText();
    if (waitingText) {
      waitEl.textContent = waitingText;
      waitEl.style.display = '';
    } else {
      waitEl.style.display = 'none';
    }
  }
}

function createMessageNode(m: ChatMessage): HTMLDivElement {
  const row = document.createElement('div');
  row.dataset.msgId = m.id;

  if (m.sender === 'system') {
    row.className = 'msg-row system';
    row.innerHTML = `<div class="msg-bubble">${esc(m.text)}</div>`;
    return row;
  }

  row.className = `msg-row ${m.sender}`;
  const translateHref = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(m.text)}`;
  row.innerHTML = `
    <div class="msg-bubble">${esc(m.text)}</div>
    <div class="msg-meta">
      <span>${fmtClock(m.createdAt)}</span>
      ${
        m.sender === 'partner'
          ? `<a class="translate-link" href="${translateHref}" target="_blank" rel="noopener">🌐 Translate</a>`
          : ''
      }
    </div>
  `;
  return row;
}

function renderChatShell(): void {
  const p = sessionState.partner!;
  const gIcon = p.gender === 'vrouw' ? '♀️' : '♂️';
  const langBadges = p.languages.map((l) => getLangLabel(l)).join(' • ');

  app.innerHTML = `
    <div class="app-shell">
      <div class="partner-bar">
        <button class="icon-btn" id="btn-leave-chat" type="button" style="padding:6px 10px;">← Stop</button>
        <div class="partner-meta">
          <div class="partner-name">${p.countryFlag} ${esc(p.nickname)} <span style="color:${
            p.gender === 'vrouw' ? '#f472b6' : '#38bdf8'
          };">${gIcon}</span></div>
          <div class="partner-sub">${esc(p.countryName)} • ${langBadges}</div>
        </div>
        <button class="icon-btn" id="btn-block-partner" type="button" title="Block" style="padding:6px 9px;">🚫</button>
        <button class="icon-btn" id="btn-next-match" type="button" style="padding:6px 11px;border-color:#a855f7;color:#e9d5ff;">⏭️ Next</button>
      </div>

      <div class="chat-wrap">
        <div class="messages-scroll" id="messages-list"></div>

        <div class="icebreakers" id="icebreakers-bar">
          <button class="ice-chip" type="button" data-ice="Hey! How are you? 👋">👋 Hey!</button>
          <button class="ice-chip" type="button" data-ice="How's the weather in ${esc(p.countryName)}? ☀️">☀️ Weather?</button>
          <button class="ice-chip" type="button" data-ice="What are your hobbies? 😄">🎧 Hobbies?</button>
          <button class="ice-chip" type="button" data-ice="Nice to meet you! Where in ${esc(p.countryName)} are you from? 💬">💬 Where from?</button>
        </div>

        <form class="composer" id="chat-form">
          <input class="text-input" id="chat-input" placeholder="Type a message..." autocomplete="off" />
          <button class="send-btn" id="send-btn" type="submit">Send</button>
        </form>
      </div>
    </div>
  `;

  const chatInput = document.getElementById('chat-input') as HTMLInputElement;

  document.getElementById('btn-leave-chat')!.onclick = () => session.leave(false);
  document.getElementById('btn-next-match')!.onclick = () => session.startSearch();
  document.getElementById('btn-block-partner')!.onclick = () => {
    blockPartnerId(p.id, { nickname: p.nickname, countryFlag: p.countryFlag });
    session.startSearch();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-ice]').forEach((btn) => {
    btn.onclick = () => {
      session.sendMessage(btn.dataset.ice || '');
    };
  });

  document.getElementById('chat-form')!.onsubmit = (e) => {
    e.preventDefault();
    const txt = chatInput.value;
    if (!txt.trim()) return;
    chatInput.value = '';
    session.sendMessage(txt);
    chatInput.focus();
  };
}

function syncChatIncremental(forceScrollBottom: boolean): void {
  const listEl = document.getElementById('messages-list');
  if (!listEl) return;

  const wasNearBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 90;
  let appendedAny = false;
  let appendedMine = false;

  for (const m of sessionState.messages) {
    if (renderedMsgIds.has(m.id)) continue;
    renderedMsgIds.add(m.id);
    listEl.appendChild(createMessageNode(m));
    appendedAny = true;
    if (m.sender === 'me') {
      appendedMine = true;
    }
  }

  const chatInput = document.getElementById('chat-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;
  if (sessionState.partnerDisconnected) {
    if (chatInput && !chatInput.disabled) {
      chatInput.disabled = true;
      chatInput.placeholder = 'Partner left — tap Next for a new match';
    }
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.disabled = true;
    }
    document.querySelectorAll<HTMLButtonElement>('.ice-chip').forEach((btn) => {
      btn.disabled = true;
    });
  }

  if (appendedAny && (forceScrollBottom || wasNearBottom || appendedMine)) {
    listEl.scrollTop = listEl.scrollHeight;
  }
}

function openHistoryModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  const drawHistory = () => {
    const history = loadMatchHistory();
    modal.innerHTML = `
      <div class="modal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;">🕘 Recent Matches</h3>
          <div style="display:flex;gap:6px;">
            ${
              history.length > 0
                ? `<button class="icon-btn danger-btn" id="clear-hist" type="button" style="padding:5px 10px;font-size:0.76rem;">Clear</button>`
                : ''
            }
            <button class="icon-btn" id="close-hist" type="button">✕</button>
          </div>
        </div>
        ${
          history.length === 0
            ? `<p style="color:#94a3b8;font-size:0.86rem;margin:6px 0;">No recent chats yet.</p>`
            : history
                .map(
                  (h) => `
              <div class="history-item">
                <div>
                  <strong>${h.countryFlag} ${esc(h.partnerName)}</strong> (${
                    h.partnerGender === 'vrouw' ? '♀️' : '♂️'
                  })
                  <div style="font-size:0.75rem;color:#94a3b8;">${esc(h.lastMessage.slice(0, 42))}</div>
                </div>
                <span style="font-size:0.72rem;color:#64748b;">${fmtClock(h.timestamp)}</span>
              </div>
            `
                )
                .join('')
        }
      </div>
    `;

    modal.querySelector<HTMLButtonElement>('#close-hist')!.onclick = () => modal.remove();
    const clearBtn = modal.querySelector<HTMLButtonElement>('#clear-hist');
    if (clearBtn) {
      clearBtn.onclick = () => {
        clearMatchHistory();
        drawHistory();
      };
    }
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  drawHistory();
  document.body.appendChild(modal);
}

function openSettingsModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  let secretTapCount = 0;
  let secretUnlocked = false;
  let statusNotice = '';

  const drawSettings = () => {
    const historyCount = loadMatchHistory().length;
    const blockedUsers = loadBlockedUsers();

    modal.innerHTML = `
      <div class="modal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 id="settings-title" style="margin:0;user-select:none;-webkit-user-select:none;">⚙️ Settings</h3>
          <button class="icon-btn" id="close-set" type="button">✕</button>
        </div>

        ${
          statusNotice
            ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:10px;background:rgba(34,197,94,0.16);border:1px solid rgba(34,197,94,0.35);color:#86efac;font-size:0.8rem;">${esc(
                statusNotice
              )}</div>`
            : ''
        }

        <div class="settings-section">
          <div class="settings-subtitle">Profile</div>
          <div class="field-row">
            <input class="text-input" id="set-nick" value="${esc(profile.nickname)}" maxlength="18" placeholder="Nickname" style="flex:1.2;" />
            <select class="select-input" id="set-country" style="flex:1;">
              ${COUNTRIES.map(
                (c) => `<option value="${c.code}" ${c.code === profile.countryCode ? 'selected' : ''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-subtitle">Preferences</div>
          <div class="settings-row">
            <span>🔊 Sound Effects</span>
            <button class="icon-btn" id="set-mute-toggle" type="button" style="min-width:60px;${
              !chatSound.isMuted() ? 'border-color:#22c55e;color:#4ade80;' : ''
            }">
              ${chatSound.isMuted() ? 'OFF' : 'ON'}
            </button>
          </div>
          <div class="settings-row">
            <span>🌍 Global Language Fallback</span>
            <button class="icon-btn" id="set-global-toggle" type="button" style="min-width:60px;${
              profile.allowGlobalFallback ? 'border-color:#22c55e;color:#4ade80;' : ''
            }">
              ${profile.allowGlobalFallback ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-subtitle">History</div>
          <div class="settings-row">
            <span style="color:#cbd5e1;">${historyCount} recent ${historyCount === 1 ? 'chat' : 'chats'} saved</span>
            <button class="icon-btn danger-btn" id="set-clear-history" type="button" ${
              historyCount === 0 ? 'disabled style="opacity:0.45;cursor:not-allowed;"' : ''
            }>Clear History</button>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-subtitle" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Blocked Users (${blockedUsers.length})</span>
            ${
              blockedUsers.length > 0
                ? `<button class="icon-btn danger-btn" id="set-clear-blocked" type="button" style="padding:3px 8px;font-size:0.72rem;">Unblock All</button>`
                : ''
            }
          </div>
          ${
            blockedUsers.length === 0
              ? `<div style="font-size:0.82rem;color:#94a3b8;">No blocked users.</div>`
              : blockedUsers
                  .map(
                    (b) => `
                  <div class="history-item" style="margin-bottom:6px;">
                    <span>${b.countryFlag} ${esc(b.nickname)}</span>
                    <button class="icon-btn" data-unblock="${esc(b.id)}" type="button" style="padding:4px 9px;font-size:0.74rem;">Unblock</button>
                  </div>
                `
                  )
                  .join('')
          }
        </div>

        ${
          secretUnlocked
            ? `
          <div class="settings-section" id="secret-server-panel">
            <div class="settings-subtitle">Custom Match Server</div>
            <input class="text-input" id="api-url-inp" value="${esc(
              getApiUrl()
            )}" placeholder="https://..." style="margin-bottom:10px;" />
            <div class="field-row">
              <button class="primary-cta" id="save-api-url" type="button" style="padding:10px;font-size:0.9rem;flex:1;">Save Server URL</button>
              <button class="icon-btn" id="reset-api-url" type="button" style="padding:10px 12px;">Reset</button>
            </div>
          </div>
        `
            : ''
        }

        <div class="settings-footer" id="settings-secret-version">WorldMatch Chat • v1.0.0</div>
      </div>
    `;

    modal.querySelector<HTMLButtonElement>('#close-set')!.onclick = () => {
      modal.remove();
      if (sessionState.phase === 'idle') renderSetup();
    };

    const setNick = modal.querySelector('#set-nick') as HTMLInputElement;
    setNick.oninput = () => {
      profile.nickname = setNick.value.slice(0, 18);
      saveProfile(profile);
      session.updateProfile(profile);
    };
    setNick.onblur = () => {
      const cleaned = setNick.value.trim().slice(0, 18) || 'Globetrotter';
      setNick.value = cleaned;
      profile.nickname = cleaned;
      saveProfile(profile);
      session.updateProfile(profile);
    };

    const setCountry = modal.querySelector('#set-country') as HTMLSelectElement;
    setCountry.onchange = () => {
      profile.countryCode = setCountry.value;
      saveProfile(profile);
      session.updateProfile(profile);
    };

    modal.querySelector<HTMLButtonElement>('#set-mute-toggle')!.onclick = () => {
      chatSound.toggleMute();
      drawSettings();
      if (sessionState.phase === 'idle') renderSetup();
    };

    modal.querySelector<HTMLButtonElement>('#set-global-toggle')!.onclick = () => {
      profile.allowGlobalFallback = !profile.allowGlobalFallback;
      saveProfile(profile);
      session.updateProfile(profile);
      drawSettings();
      if (sessionState.phase === 'idle') renderSetup();
    };

    modal.querySelector<HTMLButtonElement>('#set-clear-history')!.onclick = () => {
      clearMatchHistory();
      statusNotice = 'Match history cleared.';
      drawSettings();
    };

    const clearBlockedBtn = modal.querySelector<HTMLButtonElement>('#set-clear-blocked');
    if (clearBlockedBtn) {
      clearBlockedBtn.onclick = () => {
        clearBlockedIds();
        statusNotice = 'Blocked list cleared.';
        drawSettings();
      };
    }

    modal.querySelectorAll<HTMLButtonElement>('[data-unblock]').forEach((btn) => {
      btn.onclick = () => {
        unblockPartnerId(btn.dataset.unblock!);
        statusNotice = 'User unblocked.';
        drawSettings();
      };
    });

    const handleSecretTap = () => {
      if (secretUnlocked) return;
      secretTapCount += 1;
      if (secretTapCount >= 5) {
        secretUnlocked = true;
        statusNotice = 'Custom server option unlocked.';
        drawSettings();
      }
    };
    modal.querySelector('#settings-secret-version')!.addEventListener('click', handleSecretTap);
    modal.querySelector('#settings-title')!.addEventListener('click', handleSecretTap);

    const saveApiBtn = modal.querySelector<HTMLButtonElement>('#save-api-url');
    if (saveApiBtn) {
      saveApiBtn.onclick = () => {
        const val = (modal.querySelector('#api-url-inp') as HTMLInputElement).value;
        setApiUrl(val);
        modal.remove();
        if (sessionState.phase === 'searching') {
          session.startSearch();
        } else if (sessionState.phase === 'idle') {
          renderSetup();
        }
      };
    }

    const resetApiBtn = modal.querySelector<HTMLButtonElement>('#reset-api-url');
    if (resetApiBtn) {
      resetApiBtn.onclick = () => {
        setApiUrl('');
        statusNotice = 'Custom server URL cleared.';
        drawSettings();
      };
    }
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
      if (sessionState.phase === 'idle') renderSetup();
    }
  };

  drawSettings();
  document.body.appendChild(modal);
}

render();

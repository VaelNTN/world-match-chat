import './style.css';
import {
  blockPartnerId,
  getApiUrl,
  loadMatchHistory,
  loadProfile,
  saveProfile,
  SessionState,
  setApiUrl,
  WorldChatSession,
} from './api/matchmaking';
import { COUNTRIES, getLangLabel, LANGUAGES } from './chat/chatCatalog';
import { UserProfile } from './chat/chatTypes';
import { chatSound } from './chat/sound';

const app = document.getElementById('app')!;

let profile: UserProfile = loadProfile();
let sessionState: SessionState = {
  phase: 'idle',
  searchStatus: '',
  serverConfigured: Boolean(getApiUrl()),
  waitingOnlineCount: null,
  partner: null,
  messages: [],
};

const session = new WorldChatSession(profile, (st) => {
  sessionState = st;
  render();
});

let lastPhaseRendered: string | null = null;

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

function render(): void {
  if (sessionState.phase === 'idle') {
    lastPhaseRendered = 'idle';
    renderSetup();
  } else if (sessionState.phase === 'searching') {
    lastPhaseRendered = 'searching';
    renderSearching();
  } else {
    const existingInput = document.getElementById('chat-input') as HTMLInputElement | null;
    const draft = existingInput ? existingInput.value : '';
    const hadFocus = existingInput !== null && document.activeElement === existingInput;
    const wasSamePhase = lastPhaseRendered === 'connected';
    lastPhaseRendered = 'connected';
    renderChat(draft, hadFocus && wasSamePhase);
  }
}

function renderSetup(): void {
  const targetText =
    profile.gender === 'man'
      ? 'Je wordt gekoppeld met een echte Vrouw ♀️ wereldwijd'
      : 'Je wordt gekoppeld met een echte Man ♂️ wereldwijd';
  const hasServer = Boolean(getApiUrl());

  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>🌍 WorldMatch Chat</h1>
          <span>18+ Wereldwijde 1-op-1 Chat • ${hasServer ? '🟢 Server verbonden' : '🟠 Server nog niet ingesteld'}</span>
        </div>
        <div class="top-actions">
          <button class="icon-btn" id="btn-mute">${chatSound.isMuted() ? '🔇' : '🔊'}</button>
          <button class="icon-btn" id="btn-history">🕘</button>
          <button class="icon-btn" id="btn-settings">⚙️</button>
        </div>
      </div>

      <div class="main-scroll">
        ${
          !hasServer
            ? `<div class="card" style="border-color:rgba(245,158,11,0.55);background:rgba(120,53,15,0.28);">
                <div style="font-size:0.82rem;line-height:1.38;">
                  ⚠️ <strong>Live server nog niet gekoppeld:</strong> Er worden nooit nep-bots gekoppeld. Zodra je Stap 2 uit <code>RELEASE_STEP_BY_STEP.txt</code> hebt afgerond en je Worker URL invult bij ⚙️ Instellingen, chat je wereldwijd met echte gebruikers!
                </div>
              </div>`
            : ''
        }

        <div class="card">
          <div class="section-label">
            <span>1. Wie ben jij?</span>
            <span style="color:#f472b6;font-size:0.72rem;text-transform:none;">${targetText}</span>
          </div>
          <div class="gender-row">
            <button class="gender-btn man ${profile.gender === 'man' ? 'active' : ''}" id="pick-man">
              <span class="g-icon">👨</span>
              <span class="g-title">Man ♂️</span>
              <span class="g-sub">Chat met Vrouw ♀️</span>
            </button>
            <button class="gender-btn vrouw ${profile.gender === 'vrouw' ? 'active' : ''}" id="pick-vrouw">
              <span class="g-icon">👩</span>
              <span class="g-title">Vrouw ♀️</span>
              <span class="g-sub">Chat met Man ♂️</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="section-label">
            <span>2. Jouw Naam & Land</span>
          </div>
          <div class="field-row">
            <input class="text-input" id="input-nick" value="${esc(profile.nickname)}" maxlength="18" placeholder="Bijnaam" style="flex:1.2;" />
            <select class="select-input" id="select-country" style="flex:1;">
              ${COUNTRIES.map(
                (c) => `<option value="${c.code}" ${c.code === profile.countryCode ? 'selected' : ''}>${c.flag} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="card">
          <div class="section-label">
            <span>3. Talen selecteren (${profile.languages.length} gekozen)</span>
            <button class="icon-btn" id="btn-all-langs" style="padding:4px 9px;font-size:0.72rem;">Alle talen aan</button>
          </div>
          <div class="lang-grid">
            ${LANGUAGES.map(
              (l) => `
              <button class="lang-chip ${profile.languages.includes(l.code) ? 'active' : ''}" data-lang="${l.code}">
                ${l.flag} ${l.name}
              </button>
            `
            ).join('')}
          </div>
          <div class="toggle-row">
            <div>
              <strong>🌍 Wereldwijde match-uitbreiding</strong>
              <div style="font-size:0.73rem;color:#94a3b8;">Als jouw taal rustig is, verruim je na 4s naar alle andere talen wereldwijd.</div>
            </div>
            <button class="icon-btn" id="btn-global-toggle" style="min-width:64px;${
              profile.allowGlobalFallback ? 'border-color:#22c55e;color:#4ade80;' : ''
            }">
              ${profile.allowGlobalFallback ? 'AAN' : 'UIT'}
            </button>
          </div>
        </div>

        <button class="primary-cta" id="btn-find-match">🔍 ZOEK ECHTE WERELDWIJDE MATCH</button>
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
    profile.nickname = nickInput.value.trim().slice(0, 18) || 'Globetrotter';
    saveProfile(profile);
    session.updateProfile(profile);
  };

  const countrySel = document.getElementById('select-country') as HTMLSelectElement;
  countrySel.onchange = () => {
    profile.countryCode = countrySel.value;
    saveProfile(profile);
    session.updateProfile(profile);
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
      render();
    };
  });

  document.getElementById('btn-all-langs')!.onclick = () => {
    profile.languages = LANGUAGES.map((l) => l.code);
    saveProfile(profile);
    session.updateProfile(profile);
    render();
  };

  document.getElementById('btn-global-toggle')!.onclick = () => {
    profile.allowGlobalFallback = !profile.allowGlobalFallback;
    saveProfile(profile);
    session.updateProfile(profile);
    render();
  };

  document.getElementById('btn-find-match')!.onclick = () => {
    session.startSearch();
  };
}

function renderSearching(): void {
  const targetIcon = profile.gender === 'man' ? '👩' : '👨';
  const targetWord = profile.gender === 'man' ? 'vrouwen' : 'mannen';
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>🌍 WorldMatch Chat</h1>
          <span>Live Matchmaker (geen bots)</span>
        </div>
        <button class="icon-btn" id="btn-cancel-search">Annuleren</button>
      </div>

      <div class="main-scroll">
        <div class="search-box">
          <div class="radar-pulse">${targetIcon}</div>
          <h2 style="margin:0;font-size:1.18rem;max-width:340px;">${esc(sessionState.searchStatus)}</h2>
          ${
            sessionState.waitingOnlineCount !== null
              ? `<div style="font-size:0.84rem;color:#38bdf8;font-weight:700;">Online ${targetWord} in wachtrij: ${sessionState.waitingOnlineCount}</div>`
              : ''
          }
          <p style="margin:0;font-size:0.82rem;color:#94a3b8;max-width:300px;">
            Gekozen talen: ${profile.languages.slice(0, 6).map((l) => getLangLabel(l)).join(', ')}${
              profile.languages.length > 6 ? ` +${profile.languages.length - 6}` : ''
            }
          </p>
          ${
            !sessionState.serverConfigured
              ? `<button class="icon-btn" id="btn-open-cfg-from-search" style="border-color:#38bdf8;color:#bae6fd;padding:10px 16px;">⚙️ Server URL instellen</button>`
              : ''
          }
          <button class="icon-btn" id="btn-stop-search" style="padding:10px 18px;margin-top:4px;">← Terug naar keuzes</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-search')!.onclick = () => session.leave(false);
  document.getElementById('btn-stop-search')!.onclick = () => session.leave(false);
  const cfgBtn = document.getElementById('btn-open-cfg-from-search');
  if (cfgBtn) cfgBtn.onclick = () => openSettingsModal();
}

function renderChat(draftText: string, restoreFocus: boolean): void {
  const p = sessionState.partner!;
  const gIcon = p.gender === 'vrouw' ? '♀️' : '♂️';
  const langBadges = p.languages.map((l) => getLangLabel(l)).join(' • ');

  app.innerHTML = `
    <div class="app-shell">
      <div class="partner-bar">
        <button class="icon-btn" id="btn-leave-chat" style="padding:6px 10px;">← Stop</button>
        <div class="partner-meta">
          <div class="partner-name">${p.countryFlag} ${esc(p.nickname)} <span style="color:${
            p.gender === 'vrouw' ? '#f472b6' : '#38bdf8'
          };">${gIcon}</span></div>
          <div class="partner-sub">${esc(p.countryName)} • ${langBadges}</div>
        </div>
        <button class="icon-btn" id="btn-block-partner" title="Blokkeer" style="padding:6px 9px;">🚫</button>
        <button class="icon-btn" id="btn-next-match" style="padding:6px 11px;border-color:#a855f7;color:#e9d5ff;">⏭️ Volgende</button>
      </div>

      <div class="chat-wrap">
        <div class="messages-scroll" id="messages-scroll">
          ${sessionState.messages
            .map((m) => {
              if (m.sender === 'system') {
                return `
                  <div class="msg-row system">
                    <div class="msg-bubble">${esc(m.text)}</div>
                  </div>
                `;
              }
              const translateHref = `https://translate.google.com/?sl=auto&tl=nl&text=${encodeURIComponent(m.text)}`;
              return `
                <div class="msg-row ${m.sender}">
                  <div class="msg-bubble">${esc(m.text)}</div>
                  <div class="msg-meta">
                    <span>${fmtClock(m.createdAt)}</span>
                    ${
                      m.sender === 'partner'
                        ? `<a class="translate-link" href="${translateHref}" target="_blank" rel="noopener">🌐 Vertaal</a>`
                        : ''
                    }
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div class="icebreakers">
          <button class="ice-chip" data-ice="Hoi! Hoe gaat het met je? 👋">👋 Hoi!</button>
          <button class="ice-chip" data-ice="Hoe is het weer bij jou in ${esc(p.countryName)}? ☀️">🌍 Weer?</button>
          <button class="ice-chip" data-ice="Wat zijn je hobby's? 😄">🎧 Hobby's?</button>
          <button class="ice-chip" data-ice="Do you speak English too? 💬">🇬🇧 English?</button>
        </div>

        <form class="composer" id="chat-form">
          <input class="text-input" id="chat-input" placeholder="Typ een bericht..." autocomplete="off" value="${esc(
            draftText
          )}" />
          <button class="send-btn" type="submit">Stuur</button>
        </form>
      </div>
    </div>
  `;

  const msgBox = document.getElementById('messages-scroll')!;
  msgBox.scrollTop = msgBox.scrollHeight;

  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  if (restoreFocus) {
    chatInput.focus();
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
  }

  document.getElementById('btn-leave-chat')!.onclick = () => session.leave(false);
  document.getElementById('btn-next-match')!.onclick = () => session.startSearch();
  document.getElementById('btn-block-partner')!.onclick = () => {
    blockPartnerId(p.id);
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
    chatInput.value = '';
    session.sendMessage(txt);
    chatInput.focus();
  };
}

function openHistoryModal(): void {
  const history = loadMatchHistory();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;">🕘 Recente Matches</h3>
        <button class="icon-btn" id="close-hist">✕</button>
      </div>
      ${
        history.length === 0
          ? `<p style="color:#94a3b8;font-size:0.86rem;">Nog geen echte chats gevoerd.</p>`
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
  document.body.appendChild(modal);
  modal.querySelector<HTMLButtonElement>('#close-hist')!.onclick = () => modal.remove();
}

function openSettingsModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;">⚙️ Server & Instellingen</h3>
        <button class="icon-btn" id="close-set">✕</button>
      </div>
      <p style="font-size:0.8rem;color:#94a3b8;margin-top:0;">
        Vul jouw live Cloudflare Worker URL in (zie <code>RELEASE_STEP_BY_STEP.txt</code>) om gebruikers wereldwijd live aan elkaar te koppelen.
      </p>
      <input class="text-input" id="api-url-inp" value="${esc(getApiUrl())}" placeholder="https://arcade-highscores-worker...workers.dev" style="margin-bottom:12px;" />
      <button class="primary-cta" id="save-set" style="padding:11px;">Opslaan</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector<HTMLButtonElement>('#close-set')!.onclick = () => modal.remove();
  modal.querySelector<HTMLButtonElement>('#save-set')!.onclick = () => {
    const val = (modal.querySelector('#api-url-inp') as HTMLInputElement).value;
    setApiUrl(val);
    modal.remove();
    if (sessionState.phase === 'searching') {
      session.startSearch();
    } else {
      render();
    }
  };
}

render();

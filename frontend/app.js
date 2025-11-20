// LernCasino Frontend Logic
//
// Dieses Skript steuert alle interaktiven Funktionen der LernCasino‑App:
// Login/Registrierung, Level‑Map, Quiz, Flashcards, Leaderboard, Shop und
// Einstellungen. Es verwendet einen einfachen lokalen State, der bei Bedarf
// in localStorage gespeichert wird. Für eine spätere Anbindung an ein
// Backend können die API‑Helper am Ende des Skripts aktiviert werden.

// -----------------------------------------------------------------------------
// State Definition
// -----------------------------------------------------------------------------
const API_BASE = "https://DEINE-RENDER-URL.onrender.com";

async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
const state = {
  user: {
    name: 'Gast',
    xp: 0,
    level: 1,
    coins: 0,
    hearts: 3,
    streak: 0,
    bestStreak: 0,
  },
  currentView: 'Home',
  currentLevel: null,
  currentQuestionIndex: 0,
  doubleXP: false,
  currentQuestions: null,
};

// Beispiel‑Fragen pro Level. Diese kannst du durch deine Bilanzierungs‑Fragen
// ersetzen oder aus einem Backend laden. Jeder Eintrag besteht aus id,
// Frage (q), Antwortmöglichkeiten (answers[]) und dem Index der richtigen
// Antwort (correctIndex).
const questionsByLevel = {
  1: [
    {
      id: 1,
      q: "Was ist 'Bilanzierung' im engeren Sinne?",
      answers: [
        'Die Betrachtung von Bilanz, GuV und Anhang',
        'Nur die Betrachtung der Bilanzpositionen',
        'Nur die Betrachtung der GuV',
        'Nur der Anhang',
      ],
      correctIndex: 1,
    },
    {
      id: 2,
      q: 'Welche Bestandteile hat der Jahresabschluss einer typischen Kapitalgesellschaft?',
      answers: [
        'Nur Bilanz',
        'Bilanz und Anhang',
        'Bilanz, GuV und ggf. Anhang',
        'Nur GuV',
      ],
      correctIndex: 2,
    },
  ],
  2: [
    {
      id: 3,
      q: "Was bedeutet 'Bilanzierung dem Grunde nach'?",
      answers: [
        'Bewertungshöhe eines Vermögensgegenstandes',
        'Ob etwas überhaupt in die Bilanz gehört',
        'Nur die zeitliche Erfassung von Aufwendungen',
        'Die Methode der Abschreibung',
      ],
      correctIndex: 1,
    },
  ],
  // Weitere Levels können hier ergänzt werden...
};

// -----------------------------------------------------------------------------
// DOM Elements
// -----------------------------------------------------------------------------
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');

const btnQuickStart = document.getElementById('btnQuickStart');
const btnShowLogin = document.getElementById('btnShowLogin');
const loginModal = document.getElementById('loginModal');
const btnLoginClose = document.getElementById('btnLoginClose');
const btnLoginSubmit = document.getElementById('btnLoginSubmit');
const loginName = document.getElementById('loginName');
const loginPass = document.getElementById('loginPass');

const levelValueEl = document.getElementById('levelValue');
const xpValueEl = document.getElementById('xpValue');
const xpBarFillEl = document.getElementById('xpBarFill');
const heartsValueEl = document.getElementById('heartsValue');
const coinsValueEl = document.getElementById('coinsValue');
const streakValueEl = document.getElementById('streakValue');

const profileLevelEl = document.getElementById('profileLevel');
const profileXPEl = document.getElementById('profileXP');
const profileBestStreakEl = document.getElementById('profileBestStreak');
const profileNameInput = document.getElementById('profileName');
const profilePassInput = document.getElementById('profilePass');

const views = {
  Home: document.getElementById('viewHome'),
  Quiz: document.getElementById('viewQuiz'),
  Flashcards: document.getElementById('viewFlashcards'),
  Leaderboard: document.getElementById('viewLeaderboard'),
  Shop: document.getElementById('viewShop'),
};

const bottomNavButtons = document.querySelectorAll('.bottom-nav-btn');

const quizSubtitleEl = document.getElementById('quizSubtitle');
const quizCardEl = document.getElementById('quizCard');
const quizQuestionEl = document.getElementById('quizQuestion');
const quizAnswersEl = document.getElementById('quizAnswers');
const quizLevelLabelEl = document.getElementById('quizLevelLabel');
const quizProgressLabelEl = document.getElementById('quizProgressLabel');

const flashcardEl = document.getElementById('flashcard');
const flashcardFrontEl = document.getElementById('flashcardFront');
const flashcardBackEl = document.getElementById('flashcardBack');
const btnFlipCard = document.getElementById('btnFlipCard');
const btnCardIKnow = document.getElementById('btnCardIKnow');

const leaderboardListEl = document.getElementById('leaderboardList');

const settingsOverlay = document.getElementById('settingsOverlay');
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const toggleSound = document.getElementById('toggleSound');
const toggleMusic = document.getElementById('toggleMusic');
const btnOpenProfile = document.getElementById('btnOpenProfile');

const profileOverlay = document.getElementById('profileOverlay');
const btnSaveProfile = document.getElementById('btnSaveProfile');
const btnCloseProfile = document.getElementById('btnCloseProfile');

const levelUpOverlay = document.getElementById('levelUpOverlay');
const levelUpValueEl = document.getElementById('levelUpValue');
const btnCloseLevelUp = document.getElementById('btnCloseLevelUp');

const mapNodes = document.querySelectorAll('.level-node');

// -----------------------------------------------------------------------------
// Helper Functions for Local Persistence
// -----------------------------------------------------------------------------
function loadUser() {
  const raw = localStorage.getItem('lerncasino_user');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state.user, data);
  } catch (err) {
    console.error(err);
  }
}
function saveUser() {
  localStorage.setItem('lerncasino_user', JSON.stringify(state.user));
}

// -----------------------------------------------------------------------------
// UI Update Functions
// -----------------------------------------------------------------------------
function updateHeaderUI() {
  const lvl = state.user.level;
  const xp = state.user.xp;
  const coins = state.user.coins;
  const hearts = state.user.hearts;
  const streak = state.user.streak;
  levelValueEl.textContent = lvl;
  xpValueEl.textContent = xp;
  heartsValueEl.textContent = hearts;
  coinsValueEl.textContent = coins;
  streakValueEl.textContent = streak;
  const xpForLevel = 100;
  const progress = Math.min(1, (xp % xpForLevel) / xpForLevel);
  xpBarFillEl.style.width = `${progress * 100}%`;
}

function updateProfileUI() {
  profileNameInput.value = state.user.name;
  profileLevelEl.textContent = state.user.level;
  profileXPEl.textContent = state.user.xp;
  profileBestStreakEl.textContent = state.user.bestStreak;
}

function switchView(viewName) {
  state.currentView = viewName;
  Object.entries(views).forEach(([name, el]) => {
    if (name === viewName) el.classList.add('view--active');
    else el.classList.remove('view--active');
  });
  bottomNavButtons.forEach((btn) => {
    const v = btn.getAttribute('data-view');
    btn.classList.toggle('bottom-nav-btn--active', v === viewName);
  });
}

function buildLeaderboard() {
  // Fülle Leaderboard mit Beispielspielern und dem aktuellen Nutzer
  const fakePlayers = [
    { name: 'Alice', xp: 420, streak: 4 },
    { name: 'Bob', xp: 260, streak: 2 },
    { name: 'Cara', xp: 180, streak: 3 },
  ];
  const me = {
    name: state.user.name || 'Du',
    xp: state.user.xp,
    streak: state.user.streak,
    isMe: true,
  };
  const all = [...fakePlayers, me].sort((a, b) => b.xp - a.xp);
  leaderboardListEl.innerHTML = '';
  all.forEach((p, idx) => {
    const div = document.createElement('div');
    div.className = 'leaderboard-item';
    div.innerHTML = `
      <div class="leaderboard-main">
        <div class="leaderboard-rank">${idx + 1}</div>
        <div>
          <div class="leaderboard-name">${p.isMe ? 'Du (' + p.name + ')' : p.name}</div>
          <div class="leaderboard-meta">${p.xp} XP · Streak ${p.streak}</div>
        </div>
      </div>
    `;
    leaderboardListEl.appendChild(div);
  });
}

// -----------------------------------------------------------------------------
// Quiz Logic
// -----------------------------------------------------------------------------
function startLevel(level) {
  state.currentLevel = level;
  state.currentQuestionIndex = 0;
  state.currentQuestions = questionsByLevel[level] || [];
  if (!state.currentQuestions || state.currentQuestions.length === 0) {
    quizQuestionEl.textContent = 'Für dieses Level sind noch keine Fragen hinterlegt.';
    quizAnswersEl.innerHTML = '';
    return;
  }
  quizSubtitleEl.textContent = `Level ${level} – ${state.currentQuestions.length} Fragen`;
  quizLevelLabelEl.textContent = `Level ${level}`;
  renderCurrentQuestion();
  switchView('Quiz');
}

function renderCurrentQuestion() {
  const idx = state.currentQuestionIndex;
  const arr = state.currentQuestions || [];
  if (idx >= arr.length) {
    quizQuestionEl.textContent = 'Level beendet! Du kannst ein neues Level wählen.';
    quizAnswersEl.innerHTML = '';
    state.user.coins += 5;
    updateHeaderUI();
    saveUser();
    return;
  }
  const q = arr[idx];
  quizQuestionEl.textContent = q.q;
  quizProgressLabelEl.textContent = `Frage ${idx + 1} / ${arr.length}`;
  quizAnswersEl.innerHTML = '';
  q.answers.forEach((ansText, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-answer-btn';
    btn.textContent = ansText;
    btn.addEventListener('click', () => handleAnswerClick(i));
    quizAnswersEl.appendChild(btn);
  });
}

function handleAnswerClick(answerIndex) {
  const idx = state.currentQuestionIndex;
  const arr = state.currentQuestions;
  const q = arr[idx];
  const btns = Array.from(document.querySelectorAll('.quiz-answer-btn'));
  btns.forEach((btn, i) => {
    if (i === q.correctIndex) btn.classList.add('quiz-answer-btn--correct');
    else if (i === answerIndex) btn.classList.add('quiz-answer-btn--wrong');
    btn.disabled = true;
  });
  const isCorrect = answerIndex === q.correctIndex;
  if (isCorrect) {
    const gain = state.doubleXP ? 20 : 10;
    state.user.xp += gain;
    state.user.streak += 1;
    state.user.bestStreak = Math.max(state.user.bestStreak, state.user.streak);
    const newLevel = Math.floor(state.user.xp / 100) + 1;
    if (newLevel > state.user.level) {
      state.user.level = newLevel;
      showLevelUp();
    }
  } else {
    state.user.hearts = Math.max(0, state.user.hearts - 1);
    state.user.streak = 0;
  }
  updateHeaderUI();
  saveUser();
  setTimeout(() => {
    state.currentQuestionIndex += 1;
    renderCurrentQuestion();
  }, 700);
}

function showLevelUp() {
  levelUpValueEl.textContent = state.user.level;
  levelUpOverlay.classList.add('overlay--visible');
}

// -----------------------------------------------------------------------------
// Flashcards
// -----------------------------------------------------------------------------
function initFlashcards() {
  const arr = questionsByLevel[1] || [];
  if (arr.length === 0) {
    flashcardFrontEl.textContent = 'Noch keine Karten angelegt.';
    flashcardBackEl.textContent = '';
    return;
  }
  const idx = state.currentQuestionIndex % arr.length;
  const q = arr[idx];
  flashcardFrontEl.textContent = q.q;
  flashcardBackEl.textContent = q.answers[q.correctIndex];
}

btnFlipCard.addEventListener('click', () => {
  flashcardEl.classList.toggle('flashcard--flipped');
});
btnCardIKnow.addEventListener('click', () => {
  state.user.xp += 5;
  updateHeaderUI();
  saveUser();
  state.currentQuestionIndex += 1;
  flashcardEl.classList.remove('flashcard--flipped');
  initFlashcards();
});

// -----------------------------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------------------------
btnQuickStart.addEventListener('click', () => {
  authScreen.style.display = 'none';
  mainScreen.classList.add('screen--visible');
  updateHeaderUI();
  buildLeaderboard();
  initFlashcards();
});
btnShowLogin.addEventListener('click', () => {
  loginModal.style.display = 'flex';
});
btnLoginClose.addEventListener('click', () => {
  loginModal.style.display = 'none';
});
btnLoginSubmit.addEventListener('click', () => {
  const name = loginName.value.trim() || 'Player';
  const pass = loginPass.value.trim();
  state.user.name = name;
  // Passwort wird hier nur lokal verwendet (keine echte Sicherheit)
  saveUser();
  loginModal.style.display = 'none';
  authScreen.style.display = 'none';
  mainScreen.classList.add('screen--visible');
  updateHeaderUI();
  buildLeaderboard();
  initFlashcards();
});

// Map Level click
mapNodes.forEach((btn) => {
  btn.addEventListener('click', () => {
    const level = parseInt(btn.getAttribute('data-level'), 10);
    startLevel(level);
  });
});

// Bottom nav clicks
bottomNavButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.getAttribute('data-view');
    switchView(view);
    if (view === 'Leaderboard') buildLeaderboard();
    if (view === 'Flashcards') initFlashcards();
  });
});

// Settings & Profile
btnSettings.addEventListener('click', () => {
  settingsOverlay.classList.add('overlay--visible');
});
btnCloseSettings.addEventListener('click', () => {
  settingsOverlay.classList.remove('overlay--visible');
});
btnOpenProfile.addEventListener('click', () => {
  settingsOverlay.classList.remove('overlay--visible');
  updateProfileUI();
  profileOverlay.classList.add('overlay--visible');
});
btnCloseProfile.addEventListener('click', () => {
  profileOverlay.classList.remove('overlay--visible');
});
btnSaveProfile.addEventListener('click', () => {
  const newName = profileNameInput.value.trim();
  if (newName) state.user.name = newName;
  // Passwort speichern nur lokal (kein Sicherheitskonzept)
  saveUser();
  profileOverlay.classList.remove('overlay--visible');
  updateHeaderUI();
});

// Level up overlay
btnCloseLevelUp.addEventListener('click', () => {
  levelUpOverlay.classList.remove('overlay--visible');
});

// Music / Sound toggles (nur Flags – die Einbindung von Audio erfolgt separat)
toggleSound.addEventListener('change', () => {
  console.log('Sound turned', toggleSound.checked ? 'ON' : 'OFF');
});
toggleMusic.addEventListener('change', () => {
  console.log('Music turned', toggleMusic.checked ? 'ON' : 'OFF');
});

// -----------------------------------------------------------------------------
// Initialisation
// -----------------------------------------------------------------------------
loadUser();
updateHeaderUI();
buildLeaderboard();
initFlashcards();

import './style.css';
import { GameEngine } from './game.js';
import { sound } from './sound.js';

// DOM elements
const landingScreen = document.getElementById('landingScreen');
const hudScreen = document.getElementById('hudScreen');
const pauseModal = document.getElementById('pauseModal');
const matchEndModal = document.getElementById('matchEndModal');
const onboardingModal = document.getElementById('onboardingModal');

const startBtn = document.getElementById('startBtn');
const tutorialBtn = document.getElementById('tutorialBtn');
const closeTutorialBtn = document.getElementById('closeTutorialBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const quitBtn = document.getElementById('quitBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const menuFromEndBtn = document.getElementById('menuFromEndBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const pauseAudioToggle = document.getElementById('pauseAudioToggle');

const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const rallyCountEl = document.getElementById('rallyCount');
const personalBestEl = document.getElementById('personalBest');
const bannerOverlay = document.getElementById('bannerOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const instructionToast = document.getElementById('instructionToast');
const powerBarFill = document.getElementById('powerBarFill');
const powerLabel = document.getElementById('powerLabel');
const celebrationBadge = document.getElementById('celebrationBadge');

// End match elements
const endResultTitle = document.getElementById('endResultTitle');
const endScoreText = document.getElementById('endScoreText');
const endBestRally = document.getElementById('endBestRally');
const endLongestRally = document.getElementById('endLongestRally');

// Difficulty selector buttons
const diffBtns = document.querySelectorAll('.diff-btn');
let selectedDifficulty = 'club';

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sound.init();
    sound.playUIClick();
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.diff;
    if (game) game.setDifficulty(selectedDifficulty);
  });
});

// UI callbacks object passed to GameEngine
const uiCallbacks = {
  updateScores: (p, c) => {
    playerScoreEl.textContent = p;
    cpuScoreEl.textContent = c;
    playerScoreEl.classList.add('pop');
    cpuScoreEl.classList.add('pop');
    setTimeout(() => {
      playerScoreEl.classList.remove('pop');
      cpuScoreEl.classList.remove('pop');
    }, 200);
  },
  updateRally: (cur, pb) => {
    rallyCountEl.textContent = cur;
    personalBestEl.textContent = pb;
  },
  celebrateNewBest: () => {
    celebrationBadge.classList.add('show');
    setTimeout(() => celebrationBadge.classList.remove('show'), 2000);
  },
  onCountdown: (text) => {
    if (text === null) {
      countdownOverlay.classList.remove('show');
    } else {
      countdownOverlay.textContent = text;
      countdownOverlay.classList.add('show');
    }
  },
  showInstruction: (text) => {
    if (!text) {
      instructionToast.classList.remove('show');
    } else {
      instructionToast.textContent = text;
      instructionToast.classList.add('show');
    }
  },
  showPointBanner: (text, type) => {
    bannerOverlay.textContent = text;
    bannerOverlay.className = `banner-overlay show ${type}`;
    setTimeout(() => {
      bannerOverlay.classList.remove('show');
    }, 1300);
  },
  updatePowerMeter: (ratio) => {
    powerBarFill.style.width = `${Math.round(ratio * 100)}%`;
  },
  showPowerReady: (ready) => {
    if (ready) {
      powerLabel.classList.add('ready');
      powerLabel.textContent = 'POWER READY! [SPACE / TAP]';
    } else {
      powerLabel.classList.remove('ready');
      powerLabel.textContent = 'POWER CHARGE';
    }
  },
  onPause: (isPaused) => {
    if (isPaused) {
      pauseModal.classList.add('show');
    } else {
      pauseModal.classList.remove('show');
    }
  },
  onMatchComplete: (stats) => {
    hudScreen.classList.remove('active');
    matchEndModal.classList.add('show');

    if (stats.winner === 'player') {
      endResultTitle.textContent = 'YOU WIN!';
      endResultTitle.style.color = '#10b981';
    } else {
      endResultTitle.textContent = 'CPU WINS';
      endResultTitle.style.color = '#f43f5e';
    }

    endScoreText.textContent = `${stats.playerScore} — ${stats.computerScore}`;
    endBestRally.textContent = stats.bestRally;
    endLongestRally.textContent = stats.longestRally;
  },
  onQuit: () => {
    pauseModal.classList.remove('show');
    matchEndModal.classList.remove('show');
    hudScreen.classList.remove('active');
    landingScreen.classList.add('active');
  }
};

// Initialize Game Engine
const gameCanvasContainer = document.getElementById('canvas-container');
const game = new GameEngine(gameCanvasContainer, uiCallbacks);

// Start game flow
startBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  landingScreen.classList.remove('active');
  hudScreen.classList.add('active');
  game.setDifficulty(selectedDifficulty);
  game.startMatch();
});

// Tutorial modal
tutorialBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  onboardingModal.classList.add('show');
});

closeTutorialBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  onboardingModal.classList.remove('show');
});

// Pause / Resume
pauseBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  game.togglePause();
});

resumeBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  game.resume();
});

restartBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  pauseModal.classList.remove('show');
  game.restartMatch();
});

quitBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  game.quitToMenu();
});

// Match End Actions
playAgainBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  matchEndModal.classList.remove('show');
  hudScreen.classList.add('active');
  game.restartMatch();
});

menuFromEndBtn.addEventListener('click', () => {
  sound.init();
  sound.playUIClick();
  matchEndModal.classList.remove('show');
  landingScreen.classList.add('active');
  game.quitToMenu();
});

// Audio toggles
function updateMuteIcons(isMuted) {
  const label = isMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
  audioToggleBtn.textContent = label;
  pauseAudioToggle.textContent = label;
}

audioToggleBtn.addEventListener('click', () => {
  sound.init();
  const muted = sound.toggleMute();
  updateMuteIcons(muted);
});

pauseAudioToggle.addEventListener('click', () => {
  sound.init();
  const muted = sound.toggleMute();
  updateMuteIcons(muted);
});

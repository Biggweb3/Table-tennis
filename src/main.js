import * as THREE from 'three';
import { SoundSystem } from './audio.js';
import { ProgressionManager } from './progression.js';
import { WeatherService } from './weather.js';
import { createPlayerHandPaddle, createCpuPaddle } from './paddle.js';
import { createEnvironmentAndTable } from './environment.js';
import { createBallSystem } from './ball.js';
import { GameEngine } from './engine.js';
import confetti from 'canvas-confetti';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas');
  const sound = new SoundSystem();
  const progression = new ProgressionManager();

  // Scoreboard Elements
  const hudLevelNum = document.getElementById('hudLevelNum');
  const dot1 = document.getElementById('dot1');
  const dot2 = document.getElementById('dot2');
  const dot3 = document.getElementById('dot3');
  const playerScoreEl = document.getElementById('playerScore');
  const cpuScoreEl = document.getElementById('cpuScore');
  const rallyCountEl = document.getElementById('rallyCount');
  const pbCountEl = document.getElementById('pbCount');
  const weatherIcon = document.getElementById('weatherIcon');
  const weatherName = document.getElementById('weatherName');
  const weatherToast = document.getElementById('weatherToast');
  const weatherToastText = document.getElementById('weatherToastText');

  // Controls & Modals
  const landingScreen = document.getElementById('landingScreen');
  const landingCurrentLevel = document.getElementById('landingCurrentLevel');
  const landingNextCp = document.getElementById('landingNextCp');
  const onboardingScreen = document.getElementById('onboardingScreen');
  const onboardingProgressFill = document.getElementById('onboardingProgressFill');
  const pauseScreen = document.getElementById('pauseScreen');
  const resetConfirmModal = document.getElementById('resetConfirmModal');
  const matchEndScreen = document.getElementById('matchEndScreen');

  const btnStartGame = document.getElementById('btnStartGame');
  const btnShowHowTo = document.getElementById('btnShowHowTo');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const iconSoundOn = document.getElementById('iconSoundOn');
  const iconSoundOff = document.getElementById('iconSoundOff');
  const btnPause = document.getElementById('btnPause');
  const btnResume = document.getElementById('btnResume');
  const btnRestart = document.getElementById('btnRestart');
  const btnShowHelpFromPause = document.getElementById('btnShowHelpFromPause');
  const btnQuitToMenu = document.getElementById('btnQuitToMenu');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnReturnToMenu = document.getElementById('btnReturnToMenu');

  // Onboarding Nav Buttons
  const btnOnboardingBack = document.getElementById('btnOnboardingBack');
  const btnOnboardingSkip = document.getElementById('btnOnboardingSkip');
  const btnOnboardingNext = document.getElementById('btnOnboardingNext');
  const onboardingPages = document.querySelectorAll('.onboarding-page');
  let currentOnboardingPage = 1;

  // Prompts & FX
  const servePrompt = document.getElementById('servePrompt');
  const servePromptText = document.getElementById('servePromptText');
  const powerBarFill = document.getElementById('powerBarFill');
  const powerReadyBadge = document.getElementById('powerReadyBadge');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNum = document.getElementById('countdownNum');
  const pointBanner = document.getElementById('pointBanner');
  const pointBannerText = document.getElementById('pointBannerText');
  const celebrationBanner = document.getElementById('celebrationBanner');
  const celebrationBannerText = document.getElementById('celebrationBannerText');

  // End match elements
  const matchOutcomeBadge = document.getElementById('matchOutcomeBadge');
  const matchOutcomeTitle = document.getElementById('matchOutcomeTitle');
  const finalPlayerScore = document.getElementById('finalPlayerScore');
  const finalCpuScore = document.getElementById('finalCpuScore');
  const levelBannerStatus = document.getElementById('levelBannerStatus');
  const endDot1 = document.getElementById('endDot1');
  const endDot2 = document.getElementById('endDot2');
  const endDot3 = document.getElementById('endDot3');
  const statLongestRally = document.getElementById('statLongestRally');
  const statPersonalBest = document.getElementById('statPersonalBest');

  // Stats tab elements
  const statCurrentLvl = document.getElementById('statCurrentLvl');
  const statHighestLvl = document.getElementById('statHighestLvl');
  const statCheckpoint = document.getElementById('statCheckpoint');
  const statLvlWins = document.getElementById('statLvlWins');
  const statTotalWins = document.getElementById('statTotalWins');
  const statTotalLosses = document.getElementById('statTotalLosses');
  const statBestRally = document.getElementById('statBestRally');
  const statMatchesPlayed = document.getElementById('statMatchesPlayed');

  // Settings
  const qualityButtons = document.querySelectorAll('.quality-btn');
  const btnToggleSoundSetting = document.getElementById('btnToggleSoundSetting');
  const btnPromptReset = document.getElementById('btnPromptReset');
  const btnCancelReset = document.getElementById('btnCancelReset');
  const btnConfirmReset = document.getElementById('btnConfirmReset');

  // UI Callback hooks
  const uiCallbacks = {
    updateScores: (p, c) => {
      playerScoreEl.textContent = p;
      cpuScoreEl.textContent = c;
    },
    updateRally: (current, pb) => {
      rallyCountEl.textContent = current;
      pbCountEl.textContent = pb;
    },
    showServePrompt: (show, text) => {
      if (show) {
        servePromptText.textContent = text || 'YOUR SERVE — TAP / SPACE';
        servePrompt.classList.remove('hidden');
      } else {
        servePrompt.classList.add('hidden');
      }
    },
    updatePowerMeter: (pct, ready) => {
      powerBarFill.style.width = `${Math.round(pct * 100)}%`;
      if (ready) {
        powerReadyBadge.classList.remove('hidden');
      } else {
        powerReadyBadge.classList.add('hidden');
      }
    },
    showPowerReady: (ready) => {
      if (ready) {
        powerReadyBadge.classList.remove('hidden');
      } else {
        powerReadyBadge.classList.add('hidden');
      }
    },
    showCountdown: (val) => {
      countdownOverlay.classList.remove('hidden');
      countdownNum.textContent = val;
    },
    hideCountdown: () => {
      countdownOverlay.classList.add('hidden');
    },
    showPointBanner: (text, type) => {
      pointBannerText.textContent = text;
      pointBanner.className = `point-banner ${type}`;
      pointBanner.classList.remove('hidden');
    },
    hidePointBanner: () => {
      pointBanner.classList.add('hidden');
    },
    showCelebrationBanner: (text) => {
      celebrationBannerText.textContent = text;
      celebrationBanner.classList.remove('hidden');
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.25 } });
      } catch (e) {}
      setTimeout(() => celebrationBanner.classList.add('hidden'), 2000);
    },
    showPause: () => {
      pauseScreen.classList.remove('hidden');
      updateStatsPanel();
    },
    hidePause: () => {
      pauseScreen.classList.add('hidden');
    },
    updateProgressionUI: (prog) => {
      hudLevelNum.textContent = prog.currentLevel;
      landingCurrentLevel.textContent = `${prog.currentLevel} / 100`;
      landingNextCp.textContent = `LEVEL ${prog.getNextCheckpoint()}`;

      dot1.classList.toggle('filled', prog.levelWins >= 1);
      dot2.classList.toggle('filled', prog.levelWins >= 2);
      dot3.classList.toggle('filled', prog.levelWins >= 3);
      pbCountEl.textContent = prog.bestRally;
    },
    showMatchEnd: (data) => {
      const isWin = data.winner === 'PLAYER';
      matchOutcomeBadge.textContent = isWin ? 'MATCH VICTORY' : 'DEFEAT';
      matchOutcomeBadge.className = `outcome-badge ${isWin ? 'win' : 'loss'}`;
      matchOutcomeTitle.textContent = isWin ? 'YOU WON THE MATCH!' : 'CPU WON MATCH';
      finalPlayerScore.textContent = data.playerScore;
      finalCpuScore.textContent = data.cpuScore;
      statLongestRally.textContent = data.longestRally;
      statPersonalBest.textContent = data.bestRally;

      const prog = data.progression;
      const res = data.progressionResult;

      if (res.levelUp) {
        levelBannerStatus.textContent = `🎉 LEVEL ${res.newLevel} UNLOCKED!`;
      } else if (res.fallenBack) {
        levelBannerStatus.textContent = `FALLBACK: LEVEL ${res.oldLevel} → ${res.newLevel}`;
      } else {
        levelBannerStatus.textContent = `LEVEL ${prog.currentLevel} • ${prog.levelWins}/3 WINS COMPLETED`;
      }

      endDot1.classList.toggle('filled', prog.levelWins >= 1);
      endDot2.classList.toggle('filled', prog.levelWins >= 2);
      endDot3.classList.toggle('filled', prog.levelWins >= 3);

      if (isWin) {
        try {
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
        } catch (e) {}
      }

      matchEndScreen.classList.remove('hidden');
      uiCallbacks.updateProgressionUI(prog);
    }
  };

  // Initialize Engine
  const engine = new GameEngine(canvas, uiCallbacks, sound, progression);

  // Initialize 3D Assets
  const playerPaddle = createPlayerHandPaddle();
  const cpuPaddle = createCpuPaddle();
  const env = createEnvironmentAndTable(engine.scene);
  const ball = createBallSystem(engine.scene);

  engine.setComponents({ player: playerPaddle, cpu: cpuPaddle }, ball, env);
  engine.onResize();

  // Weather icons lookup
  const weatherIcons = {
    SUNNY: '☀',
    WINDY: '💨',
    RAINY: '🌧',
    SNOWY: '❄',
  };

  // Initialize Weather Service
  const weatherService = new WeatherService(
    (newWeather) => {
      env.setWeather(newWeather);
      sound.setWeather(newWeather);
      weatherIcon.textContent = weatherIcons[newWeather] || '☀';
      weatherName.textContent = newWeather;
    },
    (statusHint) => {
      weatherToastText.textContent = statusHint;
      weatherToast.classList.remove('hidden');
      setTimeout(() => weatherToast.classList.add('hidden'), 3500);
    }
  );

  // Sync initial server progression
  await progression.syncWithServer();
  uiCallbacks.updateProgressionUI(progression);

  // Check Onboarding requirement
  if (!progression.onboardingCompleted) {
    onboardingScreen.classList.remove('hidden');
    landingScreen.classList.add('hidden');
    engine.state = 'ONBOARDING';
    showOnboardingPage(1);
  }

  // Sound Toggle Helper
  function updateSoundUI(muted) {
    if (muted) {
      iconSoundOn.classList.add('hidden');
      iconSoundOff.classList.remove('hidden');
      btnToggleSoundSetting.textContent = 'SOUND: MUTED';
    } else {
      iconSoundOn.classList.remove('hidden');
      iconSoundOff.classList.add('hidden');
      btnToggleSoundSetting.textContent = 'SOUND: ON';
    }
  }

  btnSoundToggle.addEventListener('click', () => {
    sound.init();
    const muted = sound.toggleMute();
    updateSoundUI(muted);
    sound.playClick();
  });

  btnToggleSoundSetting.addEventListener('click', () => {
    sound.init();
    const muted = sound.toggleMute();
    updateSoundUI(muted);
    sound.playClick();
  });

  // Onboarding Flow
  function showOnboardingPage(pageNum) {
    currentOnboardingPage = pageNum;
    onboardingPages.forEach(p => {
      p.classList.toggle('hidden', parseInt(p.dataset.page, 10) !== pageNum);
    });
    btnOnboardingBack.disabled = (pageNum === 1);
    btnOnboardingNext.textContent = (pageNum === 7) ? 'START PLAYING' : 'NEXT';
    onboardingProgressFill.style.width = `${Math.round((pageNum / 7) * 100)}%`;
  }

  btnOnboardingNext.addEventListener('click', () => {
    sound.playClick();
    if (currentOnboardingPage < 7) {
      showOnboardingPage(currentOnboardingPage + 1);
    } else {
      progression.onboardingCompleted = true;
      progression.saveToServer();
      onboardingScreen.classList.add('hidden');
      engine.startMatch();
    }
  });

  btnOnboardingBack.addEventListener('click', () => {
    sound.playClick();
    if (currentOnboardingPage > 1) {
      showOnboardingPage(currentOnboardingPage - 1);
    }
  });

  btnOnboardingSkip.addEventListener('click', () => {
    sound.playClick();
    progression.onboardingCompleted = true;
    progression.saveToServer();
    onboardingScreen.classList.add('hidden');
    engine.startMatch();
  });

  // Buttons Event Listeners
  btnStartGame.addEventListener('click', () => {
    landingScreen.classList.add('hidden');
    engine.startMatch();
  });

  btnShowHowTo.addEventListener('click', () => {
    sound.playClick();
    showOnboardingPage(1);
    onboardingScreen.classList.remove('hidden');
  });

  btnShowHelpFromPause.addEventListener('click', () => {
    sound.playClick();
    pauseScreen.classList.add('hidden');
    showOnboardingPage(1);
    onboardingScreen.classList.remove('hidden');
  });

  btnPause.addEventListener('click', () => engine.togglePause());
  btnResume.addEventListener('click', () => engine.togglePause());

  btnRestart.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    engine.restartMatch();
  });

  btnQuitToMenu.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');
    engine.state = 'LANDING';
    engine.resetBallPosition();
    uiCallbacks.updateProgressionUI(progression);
  });

  btnPlayAgain.addEventListener('click', () => {
    matchEndScreen.classList.add('hidden');
    engine.startMatch();
  });

  btnReturnToMenu.addEventListener('click', () => {
    matchEndScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');
    engine.state = 'LANDING';
    uiCallbacks.updateProgressionUI(progression);
  });

  // Pause Menu Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = {
    menu: document.getElementById('tabContentMenu'),
    stats: document.getElementById('tabContentStats'),
    settings: document.getElementById('tabContentSettings'),
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      Object.keys(tabContents).forEach(k => {
        tabContents[k].classList.toggle('hidden', k !== tab);
      });
      if (tab === 'stats') updateStatsPanel();
    });
  });

  function updateStatsPanel() {
    statCurrentLvl.textContent = progression.currentLevel;
    statHighestLvl.textContent = progression.highestLevel;
    statCheckpoint.textContent = `Level ${progression.checkpointLevel}`;
    statLvlWins.textContent = `${progression.levelWins} / 3`;
    statTotalWins.textContent = progression.totalWins;
    statTotalLosses.textContent = progression.totalLosses;
    statBestRally.textContent = progression.bestRally;
    statMatchesPlayed.textContent = progression.matchesPlayed;
  }

  // Graphics Quality Preset Buttons
  qualityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      qualityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const quality = btn.dataset.quality;
      env.setQuality(quality);
      progression.graphicsQuality = quality;
      progression.saveToServer();
    });
  });

  // Reset Progress Flow
  btnPromptReset.addEventListener('click', () => {
    sound.playClick();
    resetConfirmModal.classList.remove('hidden');
  });

  btnCancelReset.addEventListener('click', () => {
    sound.playClick();
    resetConfirmModal.classList.add('hidden');
  });

  btnConfirmReset.addEventListener('click', async () => {
    sound.playClick();
    await progression.resetAllProgress();
    resetConfirmModal.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    landingScreen.classList.remove('hidden');
    engine.state = 'LANDING';
    uiCallbacks.updateProgressionUI(progression);
  });

  // Register Service Worker for Offline PWA / Android APK execution
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('Rally Service Worker registered', reg.scope);
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }

  // Animation Loop with robust dt clamp for background pauses & app resumes
  let lastTime = performance.now();
  function loop(currentTime) {
    requestAnimationFrame(loop);
    // Hard cap dt to 0.05 (20fps min) to prevent huge physics jumps on app resume
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    engine.update(dt);
  }
  requestAnimationFrame(loop);
});

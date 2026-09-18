/**
 * ProgressionManager handles:
 * - Anonymous player UUID generation (stored in localStorage)
 * - 100-Level difficulty scaling system
 * - 3-wins per level progression
 * - Checkpoint & fallback system:
 *     Checkpoints: 20, 40, 60, 80, 100
 *     Failing at Level 20 falls back to 15
 *     Failing at Level 40 falls back to 35
 *     Failing at Level 60 falls back to 55
 *     Failing at Level 80 falls back to 75
 *     Failing at Level 100 falls back to 80
 *     Other levels retain their level on a loss
 * - Synchronization with backend API (/api/player/:id)
 * - Safe offline caching and recovery
 */
export class ProgressionManager {
  constructor() {
    this.playerId = this.getOrCreatePlayerId();
    this.currentLevel = 1;
    this.highestLevel = 1;
    this.checkpointLevel = 1;
    this.levelWins = 0; // 0, 1, 2, or 3
    this.totalWins = 0;
    this.totalLosses = 0;
    this.bestRally = 0;
    this.matchesPlayed = 0;
    this.onboardingCompleted = false;
    this.soundEnabled = true;
    this.graphicsQuality = 'HIGH';

    this.checkpoints = [20, 40, 60, 80, 100];
    this.listeners = [];

    this.loadFromLocalCache();
  }

  getOrCreatePlayerId() {
    let id = localStorage.getItem('rally_player_uuid');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('rally_player_uuid', id);
    }
    return id;
  }

  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(`rally_data_${this.playerId}`);
      if (cached) {
        const d = JSON.parse(cached);
        this.currentLevel = d.currentLevel || 1;
        this.highestLevel = d.highestLevel || 1;
        this.checkpointLevel = d.checkpointLevel || 1;
        this.levelWins = d.levelWins || 0;
        this.totalWins = d.totalWins || 0;
        this.totalLosses = d.totalLosses || 0;
        this.bestRally = d.bestRally || 0;
        this.matchesPlayed = d.matchesPlayed || 0;
        this.onboardingCompleted = !!d.onboardingCompleted;
        this.soundEnabled = d.soundEnabled !== false;
        this.graphicsQuality = d.graphicsQuality || 'HIGH';
      }
    } catch (e) {
      console.warn('Failed loading local progression cache', e);
    }
  }

  saveToLocalCache() {
    try {
      const d = {
        currentLevel: this.currentLevel,
        highestLevel: this.highestLevel,
        checkpointLevel: this.checkpointLevel,
        levelWins: this.levelWins,
        totalWins: this.totalWins,
        totalLosses: this.totalLosses,
        bestRally: this.bestRally,
        matchesPlayed: this.matchesPlayed,
        onboardingCompleted: this.onboardingCompleted,
        soundEnabled: this.soundEnabled,
        graphicsQuality: this.graphicsQuality,
      };
      localStorage.setItem(`rally_data_${this.playerId}`, JSON.stringify(d));
    } catch (e) {
      console.warn('Failed writing local progression cache', e);
    }
  }

  async syncWithServer() {
    try {
      const res = await fetch(`/api/player/${this.playerId}`);
      if (res.ok) {
        const remote = await res.json();
        // Server authoritative reconciliation
        if (remote.highestLevel >= this.highestLevel) {
          this.currentLevel = remote.currentLevel;
          this.highestLevel = remote.highestLevel;
          this.checkpointLevel = remote.checkpointLevel;
          this.levelWins = remote.levelWins;
          this.totalWins = remote.totalWins;
          this.totalLosses = remote.totalLosses;
          this.bestRally = Math.max(this.bestRally, remote.bestRally);
          this.matchesPlayed = remote.matchesPlayed;
          this.onboardingCompleted = remote.onboardingCompleted;
          this.saveToLocalCache();
        } else {
          // Push newer local progression to server
          await this.saveToServer();
        }
      }
    } catch (e) {
      console.warn('Server offline, using cached progression', e);
    }
    this.notify();
  }

  async saveToServer() {
    this.saveToLocalCache();
    try {
      await fetch(`/api/player/${this.playerId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLevel: this.currentLevel,
          highestLevel: this.highestLevel,
          checkpointLevel: this.checkpointLevel,
          levelWins: this.levelWins,
          totalWins: this.totalWins,
          totalLosses: this.totalLosses,
          bestRally: this.bestRally,
          matchesPlayed: this.matchesPlayed,
          onboardingCompleted: this.onboardingCompleted,
          soundEnabled: this.soundEnabled,
          graphicsQuality: this.graphicsQuality,
        })
      });
    } catch (e) {
      console.warn('Failed to sync progress with backend', e);
    }
  }

  // Handle Match Win (1/3, 2/3, 3/3 -> Next Level)
  recordMatchWin(matchRally) {
    this.matchesPlayed++;
    this.totalWins++;
    if (matchRally > this.bestRally) {
      this.bestRally = matchRally;
    }
    this.levelWins++;

    let levelUp = false;
    if (this.levelWins >= 3) {
      // 3 wins completed! Advance level
      this.levelWins = 0;
      if (this.currentLevel < 100) {
        this.currentLevel++;
        levelUp = true;
        if (this.currentLevel > this.highestLevel) {
          this.highestLevel = this.currentLevel;
        }

        // Checkpoint update
        if (this.checkpoints.includes(this.currentLevel)) {
          this.checkpointLevel = this.currentLevel;
        }
      }
    }

    this.saveToServer();
    this.notify();
    return { levelUp, newLevel: this.currentLevel, wins: this.levelWins };
  }

  // Handle Match Loss with strict Checkpoint Fallback rules:
  // - Reaching Level 20 and losing falls back to Level 15
  // - Reaching Level 40 and losing falls back to Level 35
  // - Reaching Level 60 and losing falls back to Level 55
  // - Reaching Level 80 and losing falls back to Level 75
  // - Other levels simply retain their current level
  recordMatchLoss() {
    this.matchesPlayed++;
    this.totalLosses++;
    this.levelWins = Math.max(0, this.levelWins - 1); // setback on match wins for this level

    let fallenBack = false;
    let oldLevel = this.currentLevel;

    if (this.currentLevel === 20) {
      this.currentLevel = 15;
      this.levelWins = 0;
      fallenBack = true;
    } else if (this.currentLevel === 40) {
      this.currentLevel = 35;
      this.levelWins = 0;
      fallenBack = true;
    } else if (this.currentLevel === 60) {
      this.currentLevel = 55;
      this.levelWins = 0;
      fallenBack = true;
    } else if (this.currentLevel === 80) {
      this.currentLevel = 75;
      this.levelWins = 0;
      fallenBack = true;
    } else if (this.currentLevel === 100) {
      this.currentLevel = 80;
      this.levelWins = 0;
      fallenBack = true;
    }

    this.saveToServer();
    this.notify();
    return { fallenBack, oldLevel, newLevel: this.currentLevel };
  }

  recordRally(rally) {
    if (rally > this.bestRally) {
      this.bestRally = rally;
      this.saveToServer();
      this.notify();
    }
  }

  async resetAllProgress() {
    this.currentLevel = 1;
    this.highestLevel = 1;
    this.checkpointLevel = 1;
    this.levelWins = 0;
    this.totalWins = 0;
    this.totalLosses = 0;
    this.bestRally = 0;
    this.matchesPlayed = 0;
    this.onboardingCompleted = true;

    this.saveToLocalCache();
    try {
      await fetch(`/api/player/${this.playerId}/reset`, { method: 'POST' });
    } catch (e) {
      console.warn('Reset backend sync failed', e);
    }
    this.notify();
  }

  /**
   * Continuous mathematical difficulty curve scaled from Level 1 to 100.
   * normalized = (level - 1) / 99
   */
  getDifficultyConfig() {
    const norm = Math.max(0, Math.min(1, (this.currentLevel - 1) / 99));

    // Non-linear power curves: early levels gentle, higher levels competitive
    const aiSpeed = 3.6 + Math.pow(norm, 1.2) * 4.6;           // 3.6 (Lvl 1) -> 8.2 (Lvl 100)
    const aiReaction = 0.26 - Math.pow(norm, 0.9) * 0.20;     // 0.26s (Lvl 1) -> 0.06s (Lvl 100)
    const aiError = 0.18 - Math.pow(norm, 0.8) * 0.16;        // 0.18 (Lvl 1) -> 0.02 (Lvl 100)
    const ballSpeedScale = 0.85 + Math.pow(norm, 1.1) * 0.40; // 0.85 (Lvl 1) -> 1.25 (Lvl 100)
    const playerForgiveness = 0.60 - norm * 0.18;             // 0.60 (Lvl 1) -> 0.42 (Lvl 100)
    const smashFrequency = 0.05 + norm * 0.45;                // 5% (Lvl 1) -> 50% (Lvl 100)

    return {
      level: this.currentLevel,
      aiSpeed,
      aiReaction,
      aiError,
      ballSpeedScale,
      playerForgiveness,
      smashFrequency,
    };
  }

  getNextCheckpoint() {
    for (const cp of this.checkpoints) {
      if (this.currentLevel < cp) return cp;
    }
    return 100;
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      try { fn(this); } catch (e) {}
    }
  }
}

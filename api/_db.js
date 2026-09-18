// 10-minute global weather cycle: SUNNY -> WINDY -> RAINY -> SNOWY
const WEATHER_CYCLE = ['SUNNY', 'WINDY', 'RAINY', 'SNOWY'];
const CYCLE_DURATION_MS = 10 * 60 * 1000; // 10 minutes exactly

export function getGlobalWeather() {
  const now = Date.now();
  const cycleIndex = Math.floor(now / CYCLE_DURATION_MS);
  const weatherType = WEATHER_CYCLE[cycleIndex % WEATHER_CYCLE.length];
  const timeIntoCycle = now % CYCLE_DURATION_MS;
  const timeRemainingMs = CYCLE_DURATION_MS - timeIntoCycle;

  return {
    weather: weatherType,
    timeRemainingMs,
    cycleDurationMs: CYCLE_DURATION_MS,
    serverTime: now,
    cycleIndex,
  };
}

// In-memory player storage for serverless runtime
const players = {};

export function getPlayer(playerId) {
  let p = players[playerId];
  if (!p) {
    p = {
      id: playerId,
      currentLevel: 1,
      highestLevel: 1,
      checkpointLevel: 1,
      levelWins: 0,
      totalWins: 0,
      totalLosses: 0,
      bestRally: 0,
      matchesPlayed: 0,
      onboardingCompleted: false,
      soundEnabled: true,
      graphicsQuality: 'HIGH',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    players[playerId] = p;
  }
  return p;
}

export function updatePlayer(playerId, data) {
  const player = getPlayer(playerId);
  const {
    currentLevel,
    highestLevel,
    checkpointLevel,
    levelWins,
    totalWins,
    totalLosses,
    bestRally,
    matchesPlayed,
    onboardingCompleted,
    soundEnabled,
    graphicsQuality,
  } = data;

  if (typeof currentLevel === 'number') {
    const maxAllowedLevel = Math.min(100, (player.highestLevel || 1) + 1);
    player.currentLevel = Math.max(1, Math.min(maxAllowedLevel, Math.floor(currentLevel)));
  }
  if (typeof highestLevel === 'number') {
    player.highestLevel = Math.max(player.highestLevel || 1, Math.min(100, Math.floor(highestLevel)));
  }
  if (typeof checkpointLevel === 'number') {
    player.checkpointLevel = Math.max(1, Math.min(100, Math.floor(checkpointLevel)));
  }
  if (typeof levelWins === 'number') {
    player.levelWins = Math.max(0, Math.min(3, Math.floor(levelWins)));
  }
  if (typeof totalWins === 'number') {
    player.totalWins = Math.max(player.totalWins || 0, Math.floor(totalWins));
  }
  if (typeof totalLosses === 'number') {
    player.totalLosses = Math.max(player.totalLosses || 0, Math.floor(totalLosses));
  }
  if (typeof bestRally === 'number') {
    player.bestRally = Math.max(player.bestRally || 0, Math.floor(bestRally));
  }
  if (typeof matchesPlayed === 'number') {
    player.matchesPlayed = Math.max(player.matchesPlayed || 0, Math.floor(matchesPlayed));
  }
  if (typeof onboardingCompleted === 'boolean') {
    player.onboardingCompleted = onboardingCompleted;
  }
  if (typeof soundEnabled === 'boolean') {
    player.soundEnabled = soundEnabled;
  }
  if (typeof graphicsQuality === 'string' && ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].includes(graphicsQuality)) {
    player.graphicsQuality = graphicsQuality;
  }

  player.updatedAt = Date.now();
  return player;
}

export function resetPlayer(playerId) {
  const player = {
    id: playerId,
    currentLevel: 1,
    highestLevel: 1,
    checkpointLevel: 1,
    levelWins: 0,
    totalWins: 0,
    totalLosses: 0,
    bestRally: 0,
    matchesPlayed: 0,
    onboardingCompleted: true,
    soundEnabled: true,
    graphicsQuality: 'HIGH',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  players[playerId] = player;
  return player;
}

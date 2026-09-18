import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'players.json');

app.use(cors());
app.use(express.json());

// In-memory player store with file persistence
let players = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    players = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Error reading players.json', e);
  players = {};
}

function savePlayers() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write players.json', e);
  }
}

// 30-minute global weather cycle: SUNNY -> WINDY -> RAINY -> SNOWY
// Deterministic based on server timestamp
const WEATHER_CYCLE = ['SUNNY', 'WINDY', 'RAINY', 'SNOWY'];
const CYCLE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getGlobalWeather() {
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

// GET /api/weather - Server authoritative weather
app.get('/api/weather', (req, res) => {
  res.json(getGlobalWeather());
});

// GET /api/player/:id - Retrieve player progression
app.get('/api/player/:id', (req, res) => {
  const playerId = req.params.id;
  if (!playerId || typeof playerId !== 'string' || playerId.length > 100) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  let player = players[playerId];
  if (!player) {
    player = {
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
    players[playerId] = player;
    savePlayers();
  }

  res.json(player);
});

// POST /api/player/:id/progress - Update player progression (validated)
app.post('/api/player/:id/progress', (req, res) => {
  const playerId = req.params.id;
  let player = players[playerId];
  if (!player) {
    player = {
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
    players[playerId] = player;
  }

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
  } = req.body;

  // Validation rules
  if (typeof currentLevel === 'number') {
    // Prevent cheating to jump arbitrarily high
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
  savePlayers();

  res.json({ success: true, player });
});

// POST /api/player/:id/reset - Reset progress
app.post('/api/player/:id/reset', (req, res) => {
  const playerId = req.params.id;
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
    onboardingCompleted: true, // preserve onboarding so user isn't forced through tutorial again unless requested
    soundEnabled: true,
    graphicsQuality: 'HIGH',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  players[playerId] = player;
  savePlayers();
  res.json({ success: true, player });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Table Tennis Backend running on http://0.0.0.0:${PORT}`);
});

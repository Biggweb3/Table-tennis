/**
 * WeatherService: Polls server-authoritative weather endpoint (/api/weather)
 * and synchronizes with local fallback timer (10-minute global cycle).
 */
export class WeatherService {
  constructor(onWeatherChange, onStatusNotification) {
    this.onWeatherChange = onWeatherChange;
    this.onStatusNotification = onStatusNotification;
    this.currentWeather = 'SUNNY';
    this.timeRemainingMs = 10 * 60 * 1000;
    this.pollInterval = null;

    // Atmospheric notifications only (NO gameplay/hazard warnings)
    this.hints = {
      SUNNY: 'The skies are clearing. Conditions are calm.',
      WINDY: 'A fresh breeze is moving through the meadow.',
      RAINY: 'Rain is falling. The lawn is getting wet.',
      SNOWY: 'Snow is settling across the field.',
    };

    this.init();
  }

  async init() {
    await this.fetchWeather();
    // Poll server every 15 seconds to stay tightly synced with global server clock
    this.pollInterval = setInterval(() => this.fetchWeather(), 15000);
  }

  async fetchWeather() {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        const data = await res.json();
        this.setWeather(data.weather, data.timeRemainingMs);
        return;
      }
    } catch (e) {
      // Fallback: calculate from client time using same 10m modulo logic
      const now = Date.now();
      const CYCLE = 10 * 60 * 1000;
      const TYPES = ['SUNNY', 'WINDY', 'RAINY', 'SNOWY'];
      const idx = Math.floor(now / CYCLE) % TYPES.length;
      this.setWeather(TYPES[idx], CYCLE - (now % CYCLE));
    }
  }

  setWeather(newWeather, timeRemainingMs) {
    this.timeRemainingMs = timeRemainingMs;
    if (newWeather !== this.currentWeather) {
      const old = this.currentWeather;
      this.currentWeather = newWeather;
      if (this.onWeatherChange) {
        this.onWeatherChange(newWeather, old);
      }
      if (this.onStatusNotification) {
        this.onStatusNotification(this.hints[newWeather] || 'The skies are changing.');
      }
    }
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

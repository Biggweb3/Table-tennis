/**
 * WeatherService: Polls server-authoritative weather endpoint (/api/weather)
 * and synchronizes with local fallback timer (30-minute global cycle).
 */
export class WeatherService {
  constructor(onWeatherChange, onStatusNotification) {
    this.onWeatherChange = onWeatherChange;
    this.onStatusNotification = onStatusNotification;
    this.currentWeather = 'SUNNY';
    this.timeRemainingMs = 30 * 60 * 1000;
    this.pollInterval = null;

    this.hints = {
      SUNNY: 'Clear skies. Conditions are calm.',
      WINDY: 'Wind is picking up! The ball can drift.',
      RAINY: 'Rain is falling. The lawn is getting slick.',
      SNOWY: 'Snow is settling across the field.',
    };

    this.init();
  }

  async init() {
    await this.fetchWeather();
    // Poll server every 20 seconds to stay tightly synced with global server clock
    this.pollInterval = setInterval(() => this.fetchWeather(), 20000);
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
      // Fallback: calculate from client time using same 30m modulo logic
      const now = Date.now();
      const CYCLE = 30 * 60 * 1000;
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
        this.onStatusNotification(this.hints[newWeather] || 'Conditions changed.');
      }
    }
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

// Weather via Open-Meteo (no API key). Falls back to a plausible mock so the app never breaks.
const cache = new Map();
const COND = (code) => (code === 0 ? 'clear' : code <= 3 || (code >= 45 && code <= 48) ? 'cloudy' : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 ? 'rain' : code >= 71 && code <= 77 ? 'snow' : 'cloudy');

export function fallbackWeather(city = 'Unknown') {
  const m = new Date().getMonth();
  const tempC = [22, 25, 30, 34, 36, 31, 28, 28, 28, 27, 24, 22][m];
  return { tempC, condition: m >= 5 && m <= 8 ? 'rain' : 'clear', source: 'fallback', city };
}

export async function getWeather(city = 'Hyderabad') {
  const key = city.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.data;
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { signal: AbortSignal.timeout(4000) }).then((r) => r.json());
    const loc = g.results?.[0];
    if (!loc) throw new Error('city not found');
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`, { signal: AbortSignal.timeout(4000) }).then((r) => r.json());
    const data = { tempC: Math.round(w.current.temperature_2m), condition: COND(w.current.weather_code), source: 'open-meteo', city: loc.name };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return fallbackWeather(city);
  }
}

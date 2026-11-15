export type WeatherIconKey =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'cloud-fog'
  | 'cloud-drizzle'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-lightning';

export type WeatherTone = 'weatherSun' | 'weatherCloud' | 'weatherRain' | 'weatherStorm' | 'weatherSnow';

export type WeatherInfo = { label: string; icon: WeatherIconKey; tone: WeatherTone };

const UNKNOWN: WeatherInfo = { label: 'Tempo indefinido', icon: 'cloud', tone: 'weatherCloud' };

const rain = (label: string): WeatherInfo => ({ label, icon: 'cloud-rain', tone: 'weatherRain' });

// WMO weather interpretation codes (Open-Meteo), PT-BR labels per UI-SPEC S3.
const TABLE: Record<number, WeatherInfo> = {
  0: { label: 'Céu limpo', icon: 'sun', tone: 'weatherSun' },
  1: { label: 'Poucas nuvens', icon: 'cloud-sun', tone: 'weatherSun' },
  2: { label: 'Parcialmente nublado', icon: 'cloud-sun', tone: 'weatherSun' },
  3: { label: 'Nublado', icon: 'cloud', tone: 'weatherCloud' },
  45: { label: 'Neblina', icon: 'cloud-fog', tone: 'weatherCloud' },
  48: { label: 'Neblina', icon: 'cloud-fog', tone: 'weatherCloud' },
  51: { label: 'Garoa', icon: 'cloud-drizzle', tone: 'weatherRain' },
  53: { label: 'Garoa', icon: 'cloud-drizzle', tone: 'weatherRain' },
  55: { label: 'Garoa', icon: 'cloud-drizzle', tone: 'weatherRain' },
  56: { label: 'Garoa congelante', icon: 'cloud-drizzle', tone: 'weatherRain' },
  57: { label: 'Garoa congelante', icon: 'cloud-drizzle', tone: 'weatherRain' },
  61: rain('Chuva fraca'),
  63: rain('Chuva'),
  65: rain('Chuva forte'),
  66: rain('Chuva congelante'),
  67: rain('Chuva congelante'),
  71: { label: 'Neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  73: { label: 'Neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  75: { label: 'Neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  77: { label: 'Neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  80: rain('Pancadas de chuva'),
  81: rain('Pancadas de chuva'),
  82: rain('Pancadas fortes de chuva'),
  85: { label: 'Pancadas de neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  86: { label: 'Pancadas de neve', icon: 'cloud-snow', tone: 'weatherSnow' },
  95: { label: 'Trovoada', icon: 'cloud-lightning', tone: 'weatherStorm' },
  96: { label: 'Trovoada com granizo', icon: 'cloud-lightning', tone: 'weatherStorm' },
  99: { label: 'Trovoada com granizo', icon: 'cloud-lightning', tone: 'weatherStorm' },
};

export function wmoToWeather(code: number): WeatherInfo {
  if (!Number.isInteger(code)) return { ...UNKNOWN };
  const hit = Object.prototype.hasOwnProperty.call(TABLE, code) ? TABLE[code] : UNKNOWN;
  return { ...hit };
}

import { wmoToWeather } from './wmo';

const cases: [number[], string, string, string][] = [
  [[0], 'Céu limpo', 'sun', 'weatherSun'],
  [[1], 'Poucas nuvens', 'cloud-sun', 'weatherSun'],
  [[2], 'Parcialmente nublado', 'cloud-sun', 'weatherSun'],
  [[3], 'Nublado', 'cloud', 'weatherCloud'],
  [[45, 48], 'Neblina', 'cloud-fog', 'weatherCloud'],
  [[51, 53, 55], 'Garoa', 'cloud-drizzle', 'weatherRain'],
  [[56, 57], 'Garoa congelante', 'cloud-drizzle', 'weatherRain'],
  [[61], 'Chuva fraca', 'cloud-rain', 'weatherRain'],
  [[63], 'Chuva', 'cloud-rain', 'weatherRain'],
  [[65], 'Chuva forte', 'cloud-rain', 'weatherRain'],
  [[66, 67], 'Chuva congelante', 'cloud-rain', 'weatherRain'],
  [[71, 73, 75, 77], 'Neve', 'cloud-snow', 'weatherSnow'],
  [[80, 81], 'Pancadas de chuva', 'cloud-rain', 'weatherRain'],
  [[82], 'Pancadas fortes de chuva', 'cloud-rain', 'weatherRain'],
  [[85, 86], 'Pancadas de neve', 'cloud-snow', 'weatherSnow'],
  [[95], 'Trovoada', 'cloud-lightning', 'weatherStorm'],
  [[96, 99], 'Trovoada com granizo', 'cloud-lightning', 'weatherStorm'],
];

describe('wmoToWeather', () => {
  for (const [codes, label, icon, tone] of cases) {
    for (const code of codes) {
      it(`maps ${code} to ${label}`, () => {
        expect(wmoToWeather(code)).toEqual({ label, icon, tone });
      });
    }
  }

  it.each([97, 1234, -1, NaN, 2.5])('maps unknown %p to Tempo indefinido', (code) => {
    expect(wmoToWeather(code)).toEqual({ label: 'Tempo indefinido', icon: 'cloud', tone: 'weatherCloud' });
  });
});

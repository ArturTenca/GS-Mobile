// Single source of truth for design tokens. The ONLY file in src/ allowed to contain hex literals.

export const lightColors = {
  background: '#F5F7F4',
  backgroundOuter: '#E9EDE8',
  card: '#FFFFFF',
  text: '#14201A',
  textMuted: '#5A665F',
  border: '#D5DCD6',
  inputBorder: '#8A968F',
  primary: '#1F5A36',
  primaryPressed: '#174529',
  primaryText: '#1F5A36',
  primarySoft: '#E4EFE6',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(20,32,26,0.5)',

  success: '#2E8B3E',
  successText: '#1B6B2F',
  successSoft: '#E3F3E5',
  warning: '#F2B01E',
  warningText: '#7A5200',
  warningSoft: '#FDF3D6',
  alert: '#C2410C',
  alertText: '#9A3412',
  alertSoft: '#FDEBDD',
  error: '#B42318',
  errorFill: '#B42318',
  errorSoft: '#FBE8E6',

  series1: '#2A78D6',
  series2: '#EB6834',
  series3: '#1BAF7A',
  series4: '#EDA100',
  series5: '#E87BA4',
  series6: '#008300',
  series7: '#6250D6',
  series8: '#E34948',
  seriesOther: '#9CA3AF',
  weatherSun: '#B45309',
  weatherCloud: '#5A6B78',
  weatherRain: '#2563EB',
  weatherStorm: '#6250D6',
  weatherSnow: '#0E7490',
  mapBoundary: '#15803D',
  mapBoundaryFill: 'rgba(21,128,61,0.22)',
  mapHalo: 'rgba(10,15,12,0.6)',
  mapVertex: '#FFFFFF',
  mapSensor: '#0369A1',
  mapSensorFill: 'rgba(3,105,161,0.2)',
  mapSensorExisting: '#334155',
  mapInvalid: '#B91C1C',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: '#0D1310',
  backgroundOuter: '#090D0B',
  card: '#161E19',
  text: '#EDF2EE',
  textMuted: '#9FACA4',
  border: '#2B3830',
  inputBorder: '#5F6D65',
  primary: '#2E7D4F',
  primaryPressed: '#25693F',
  primaryText: '#7BD39A',
  primarySoft: '#1C3325',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',

  success: '#6CCB7F',
  successText: '#6CCB7F',
  successSoft: '#18301F',
  warning: '#F5C04A',
  warningText: '#F5C04A',
  warningSoft: '#33290F',
  alert: '#FB923C',
  alertText: '#FB923C',
  alertSoft: '#3A2214',
  error: '#F87171',
  errorFill: '#C0362C',
  errorSoft: '#3B1A1A',

  series1: '#3987E5',
  series2: '#D95926',
  series3: '#199E70',
  series4: '#C98500',
  series5: '#D55181',
  series6: '#008300',
  series7: '#9085E9',
  series8: '#E66767',
  seriesOther: '#6B7280',
  weatherSun: '#F5C04A',
  weatherCloud: '#A7B4BD',
  weatherRain: '#6EA8F5',
  weatherStorm: '#9085E9',
  weatherSnow: '#8FD0EA',
  mapBoundary: '#4ADE80',
  mapBoundaryFill: 'rgba(74,222,128,0.22)',
  mapHalo: 'rgba(10,15,12,0.6)',
  mapVertex: '#FFFFFF',
  mapSensor: '#38BDF8',
  mapSensorFill: 'rgba(56,189,248,0.2)',
  mapSensorExisting: '#E2E8F0',
  mapInvalid: '#F87171',
};

export type ThemeMode = 'light' | 'dark';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  button: 12,
  card: 12,
  cardLg: 16,
  pill: 999,
} as const;

export const touch = { min: 48 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
} as const;

export const typography = {
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  heading: { fontSize: 20, lineHeight: 28 },
  display: { fontSize: 28, lineHeight: 36 },
} as const;

export type TypographyVariant = keyof typeof typography;

// src/theme/palette.ts
export type AppColors = {
  // base
  background: string;
  card: string;
  surface: string;   // superficies suaves / chips / iconWrap
  text: string;
  subtext: string;
  border: string;

  // marca y estados
  primary: string;
  onPrimary: string; // color de texto/ícono sobre fondos primary
  success: string;
  danger: string;
  mutedBg: string;   // fondos grises muy claros
};

export const LIGHT_COLORS: AppColors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F5F7F8',
  text: '#111111',
  subtext: '#6B7075',
  border: '#E8EBEE',

  primary: '#00A9B9', // turquesa El Patrón
  onPrimary: '#FFFFFF',
  success: '#2ECC71',
  danger: '#B00020',
  mutedBg: '#EEF1F3',
};

export const DARK_COLORS: AppColors = {
  background: '#0E1113',
  card: '#111517',
  surface: '#1A1F22',
  text: '#E9ECEF',
  subtext: '#9AA0A6',
  border: '#2A2F33',

  primary: '#00C0D3',   // leve ajuste para contraste en dark
  onPrimary: '#0E1113',
  success: '#37D67A',
  danger: '#FF6B6B',
  mutedBg: '#161B1E',
};

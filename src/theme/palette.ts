// src/theme/palette.ts
export type AppColors = {
  primary: string;
  onPrimary: string;
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  mutedBg: string;
  success: string;
  danger: string;
};

export const LIGHT_COLORS: AppColors = {
  primary: '#00A9B9',
  onPrimary: '#ffffff',
  background: '#ffffff',
  card: '#ffffff',
  text: '#111111',
  subtext: '#6b7075',
  border: '#E8EBEE',
  mutedBg: '#F5F7F8',
  success: '#2ecc71',
  danger: '#b00020',
};

export const DARK_COLORS: AppColors = {
  primary: '#00C4D8',
  onPrimary: '#0f1418',
  background: '#0f1418',
  card: '#11161b',
  text: '#e6e8ea',
  subtext: '#9aa0a6',
  border: '#232a30',
  mutedBg: '#151b21',
  success: '#2ecc71',
  danger: '#ff5a67',
};

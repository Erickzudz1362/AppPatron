// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { AppColors, DARK_COLORS, LIGHT_COLORS } from './palette';

type ThemeContextType = {
  isDark: boolean;
  colors: AppColors;
  toggleTheme: () => void;
  navTheme: NavTheme;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  navTheme: DefaultTheme, // 👈 así ya trae fonts, spacing, etc.
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  const colors = useMemo<AppColors>(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);

  // Extiende los temas base para cumplir el tipo Theme (incluye 'fonts')
  const navTheme = useMemo<NavTheme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const value = useMemo(
    () => ({ isDark, colors, toggleTheme, navTheme }),
    [isDark, colors, navTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);

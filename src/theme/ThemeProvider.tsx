// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const THEME_STORAGE_KEY = 'el_patron_theme_mode';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((value) => {
      if (!mounted) return;
      if (value === 'dark') setIsDark(true);
      if (value === 'light') setIsDark(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  const toggleTheme = () =>
    setIsDark((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });

  const value = useMemo(
    () => ({ isDark, colors, toggleTheme, navTheme }),
    [isDark, colors, navTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);

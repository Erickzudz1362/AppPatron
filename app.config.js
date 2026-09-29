const appJson = require('./app.json');

module.exports = () => {
  const expo = appJson.expo || {};

  return {
    ...expo,
    owner: 'erickzu',
    icon: './assets/app-patron-icon.png',
    splash: {
      ...(expo.splash || {}),
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#06141D',
    },
    android: {
      ...(expo.android || {}),
      adaptiveIcon: {
        foregroundImage: './assets/app-patron-icon.png',
        backgroundColor: '#06141D',
      },
    },
    extra: {
      ...(expo.extra || {}),
      eas: {
        ...(expo.extra?.eas || {}),
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || expo.extra?.supabaseUrl || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || expo.extra?.supabaseAnonKey || '',
    },
  };
};

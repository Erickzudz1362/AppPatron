const appJson = require('./app.json');

module.exports = () => {
  const expo = appJson.expo || {};

  return {
    ...expo,
    owner: 'erickzu',
    icon: './assets/Elpatron-Logo.png',
    splash: {
      ...(expo.splash || {}),
      image: './assets/Elpatron-Logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    android: {
      ...(expo.android || {}),
      adaptiveIcon: {
        foregroundImage: './assets/Elpatron-Logo.png',
        backgroundColor: '#ffffff',
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

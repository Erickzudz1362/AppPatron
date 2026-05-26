# Build iOS - El Patron

Esta copia queda preparada para compilar iOS con Expo EAS desde una Mac.

## Primer uso en Mac

```bash
git clone https://github.com/Erickzudz1362/AppatronIos.git
cd AppatronIos
npm install
eas login
```

Crea un archivo `.env` usando `.env.example` como guia y pega las claves reales de Supabase.

## Build para prueba

```bash
npm run build:ios:internal
```

Este build es para pruebas internas. iOS requiere cuenta Apple Developer y configurar credenciales/dispositivos cuando EAS lo pida.

## Build para App Store / TestFlight

```bash
npm run build:ios:store
```

El archivo final de iOS no es APK. Para iPhone se genera un build iOS/IPA y normalmente se prueba o distribuye por TestFlight/App Store Connect.

## Importante

Antes de compilar confirma que:

- `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` existen en `.env`.
- Las funciones de Supabase usadas por la app ya estan desplegadas.
- Las politicas de Storage permiten leer galeria, promos, carousel y avatars.
- El bundle identifier es `com.erickzu.barberiaelpatron`.

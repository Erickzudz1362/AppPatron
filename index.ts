import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Tras limpiar sesión local por refresh inválido, GoTrue aún puede loguear el error una vez.
if (__DEV__) {
  LogBox.ignoreLogs(['Invalid Refresh Token']);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

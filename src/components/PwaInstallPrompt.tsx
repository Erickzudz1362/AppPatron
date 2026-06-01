import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import {
  canPromptPwaInstall,
  initPwaInstallPromptListener,
  isIosWeb,
  isStandalonePwa,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from '../pwa/webPwa';

const DISMISSED_KEY = 'el_patron_install_prompt_dismissed';

export function PwaInstallPrompt() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || isStandalonePwa()) return;

    const dismissed = window.localStorage.getItem(DISMISSED_KEY) === 'true';
    const showIfReady = () => {
      if (dismissed || isStandalonePwa()) return;
      const canPrompt = canPromptPwaInstall();
      setInstallAvailable(canPrompt);
      setIosGuide(!canPrompt && isIosWeb());
      if (canPrompt || isIosWeb()) setVisible(true);
    };

    const cleanupInit = initPwaInstallPromptListener();
    const unsubscribe = subscribePwaInstallPrompt(showIfReady);
    const timer = window.setTimeout(showIfReady, 900);

    return () => {
      cleanupInit();
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const install = async () => {
    if (installAvailable) {
      await promptPwaInstall();
      setVisible(false);
      return;
    }
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="smartphone" size={22} color={colors.primary} />
          </View>
          <Text style={styles.title}>Instala El Patrón</Text>
          <Text style={styles.message}>
            {iosGuide
              ? 'En iPhone toca Compartir y luego "Agregar a pantalla de inicio" para usarla como app.'
              : 'Puedes instalarla como app para abrirla mas rapido y recibir una experiencia sin navegador.'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={dismiss}>
              <Text style={styles.secondaryText}>Despues</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={install}>
              <Text style={styles.primaryText}>{installAvailable ? 'Instalar' : 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: { primary: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      padding: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 10,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.primary}18`,
    },
    title: { color: colors.text, fontSize: 20, fontWeight: '900' },
    message: { color: colors.subtext, fontSize: 15, lineHeight: 21 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    secondaryBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryText: { color: colors.text, fontWeight: '800' },
    primaryBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '900' },
  });
}

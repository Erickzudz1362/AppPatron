import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructive?: boolean;
};

export default function AppDialog({
  visible,
  title,
  message,
  onClose,
  actionLabel = 'Entendido',
  secondaryLabel,
  onSecondary,
  destructive = false,
}: Props) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text>
          <View style={styles.actions}>
            {secondaryLabel ? (
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={onSecondary ?? onClose}>
                <Text style={[styles.secondaryTxt, { color: colors.subtext }]}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.btn, { backgroundColor: destructive ? '#d64545' : colors.primary }]} onPress={onClose}>
              <Text style={styles.btnTxt}>{actionLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  message: { fontSize: 15, lineHeight: 21 },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryTxt: { fontWeight: '700' },
  btnTxt: { color: '#fff', fontWeight: '700' },
});


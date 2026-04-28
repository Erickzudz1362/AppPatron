import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { TabScreenHeader } from '../../components/TabScreenHeader';
import { NoticesListSkeleton } from '../../components/skeleton/NoticesListSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchNotices } from '../../api/supabaseData';
import type { NoticeItem } from '../../api/fallbackData';
import { useAppTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../config/supabase';
import { showLocalNoticeNotification } from '../../notifications/push';
import { useAuth } from '../../context/AuthContext';

const FILTERS = ['Todos', 'Promos', 'Avisos', 'Sistema'] as const;
type FilterKey = typeof FILTERS[number];

const ICONS: Record<NoticeItem['type'], keyof typeof Feather.glyphMap> = {
  promo: 'tag',
  aviso: 'volume-2',
  sistema: 'bell',
};

const LABELS: Record<NoticeItem['type'], 'Promo' | 'Aviso' | 'Sistema'> = {
  promo: 'Promo',
  aviso: 'Aviso',
  sistema: 'Sistema',
};

export default function NotificationsScreen() {
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  const { colors } = useAppTheme();
  const { session } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();

  const { data: remoteNotices, error, refresh, showSkeleton, isRefreshing } = useAsyncResource(fetchNotices);
  const [data, setData] = useState<NoticeItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('Todos');

  useEffect(() => {
    if (remoteNotices) setData(remoteNotices);
  }, [remoteNotices]);

  // Refresca al volver a la pestaña Avisos.
  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Auto refresh en la misma vista (fallback estable aunque Realtime falle).
  useEffect(() => {
    const id = setInterval(() => {
      // Refresco silencioso: actualiza datos sin activar el spinner de RefreshControl.
      void fetchNotices()
        .then((rows) => {
          setData(rows);
        })
        .catch(() => {
          // Sin ruido visual ni alertas en auto-refresh periódico.
        });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Realtime: si el admin crea/edita/elimina avisos en Supabase, recarga automáticamente.
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Record<string, unknown>;
          const targetUserId = typeof row.target_user_id === 'string' ? row.target_user_id : null;
          const title = typeof row.title === 'string' ? row.title : 'Nuevo aviso';
          const body =
            typeof row.message === 'string'
              ? row.message
              : typeof row.body === 'string'
              ? row.body
              : 'Revisa la sección Avisos.';
          if (!targetUserId || targetUserId === session?.user?.id) {
            void showLocalNoticeNotification(title, body);
          }
        }
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, session?.user?.id]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Promos':
        return data.filter(d => d.type === 'promo');
      case 'Avisos':
        return data.filter(d => d.type === 'aviso');
      case 'Sistema':
        return data.filter(d => d.type === 'sistema');
      default:
        return data;
    }
  }, [data, filter]);

  const markAsRead = async (id: string) => {
    const prev = data;
    const target = prev.find((n) => n.id === id);
    if (!target) return;

    // Regla de producto: cliente solo puede pasar a "leído", nunca volver a "no leído".
    if (target.read) return;
    setData((curr) => curr.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('No hay sesión activa');

      const { error } = await supabase
        .from('notification_reads')
        .upsert({ user_id: uid, notification_id: id }, { onConflict: 'user_id,notification_id' });
      if (error) throw error;
    } catch (e) {
      // Revertir en caso de fallo para no mostrar estado incorrecto.
      setData(prev);
    }
  };

  const renderItem = ({ item }: { item: NoticeItem }) => (
    <View style={[styles.card, !item.read && styles.unreadShadow]}>
      {/* Icono + etiqueta */}
      <View style={styles.rowBetween}>
        <View style={styles.rowLeft}>
          <View style={styles.iconWrap}>
            <Feather name={ICONS[item.type]} size={16} color={colors.primary} />
          </View>
          <View style={styles.typeChip}>
            <Text style={styles.typeTxt}>{LABELS[item.type]}</Text>
          </View>
        </View>

        <Text style={styles.date}>{item.date}</Text>
      </View>

      {/* Título */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Mensaje */}
      <Text style={styles.msg}>{item.message}</Text>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => markAsRead(item.id)}
          style={styles.linkBtn}
          disabled={item.read}
          activeOpacity={item.read ? 1 : 0.75}
        >
          <Feather name={item.read ? 'check-circle' : 'mail'} size={14} color={item.read ? colors.subtext : colors.primary} />
          <Text style={[styles.linkTxt, { color: item.read ? colors.subtext : colors.primary }]}>
            {item.read ? 'Leído' : 'Marcar como leído'}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  if (showSkeleton) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <View style={{ paddingHorizontal: gutter, paddingTop: 4 }}>
          <NoticesListSkeleton mutedColor={colors.mutedBg} cardColor={colors.card} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !remoteNotices) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background, justifyContent: 'center' }]}
        edges={['top', 'left', 'right']}
      >
        <EmptyState
          icon="wifi-off"
          title="No pudimos cargar los avisos"
          subtitle={error}
          onRetry={refresh}
          color={colors}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <FlatList
        data={filtered}
        keyExtractor={n => n.id}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: tabBarHeight + 20,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <TabScreenHeader title="Avisos" titleColor={colors.primary} />
            {/* Filtros */}
            <FlatList
              data={FILTERS as unknown as string[]}
              keyExtractor={(i) => i}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => {
                const active = filter === (item as FilterKey);
                return (
                  <TouchableOpacity
                    onPress={() => setFilter(item as FilterKey)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        }
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off"
            title="No hay avisos"
            subtitle="Cuando haya promociones o novedades, aparecerán aquí."
            color={colors}
          />
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: {
  primary: string;
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  mutedBg: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1 },

    chip: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTxt: { color: colors.text, fontWeight: '500' },
    chipTxtActive: { color: '#fff' },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
        android: { elevation: 2 },
      }),
    },
    unreadShadow: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      ...Platform.select({
        ios: { shadowOpacity: 0.12 },
        android: { elevation: 3 },
      }),
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mutedBg, alignItems: 'center', justifyContent: 'center' },

    typeChip: { backgroundColor: '#E6FAFC10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    typeTxt: { color: colors.primary, fontWeight: '700', fontSize: 11 },

    date: { color: colors.subtext, fontSize: 12 },

    title: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.text },
    msg: { marginTop: 4, color: colors.text, opacity: 0.9, lineHeight: 20 },

    actions: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    linkTxt: { fontWeight: '700' },

    ctaBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  });
}

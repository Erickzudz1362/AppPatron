import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { TabScreenHeader } from '../../components/TabScreenHeader';
import { HistoryListSkeleton } from '../../components/skeleton/HistoryListSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { fetchHistoryRows } from '../../api/supabaseData';
import type { HistoryRow } from '../../api/fallbackData';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

function parsePriceBs(price: string): number {
  const n = parseInt(price.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

const STATUS_ORDER = ['pending', 'confirmed', 'completed'] as const;
type NormalizedStatus = (typeof STATUS_ORDER)[number] | 'no_show';

function normalizeStatus(raw: string | undefined): NormalizedStatus {
  const s = (raw ?? '').toLowerCase();
  if (s === 'no_show') return 'no_show';
  if (s === 'reserved' || s === 'booked') return 'pending';
  if (s === 'on_process' || s === 'in_process') return 'confirmed';
  if (s === 'finished') return 'completed';
  if (STATUS_ORDER.includes(s as (typeof STATUS_ORDER)[number])) {
    return s as (typeof STATUS_ORDER)[number];
  }
  return 'pending';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Reservado';
    case 'confirmed': return 'Confirmado';
    case 'completed': return 'Finalizado';
    default: return 'Reservado';
  }
}

function resolveReviewBarberName(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized || normalized === '-' || normalized === '—') return 'Barbero';
  return normalized;
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { session, profile } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const gutter = width < 360 ? 12 : width < 400 ? 16 : width < 768 ? 20 : 24;

  const { data: rows, error, refresh, showSkeleton, isRefreshing } = useAsyncResource(fetchHistoryRows);
  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh])
  );
  React.useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const ch = supabase
      .channel(`appointments-client-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `client_id=eq.${uid}` }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh, session?.user?.id]);

  const historyData = rows ?? [];

  const [reviewedIds, setReviewedIds] = React.useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = React.useState<HistoryRow | null>(null);
  const [reviewStars, setReviewStars] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewSaving, setReviewSaving] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    void (async () => {
      const { data, error } = await supabase.from('barber_reviews').select('appointment_id').eq('client_id', uid);
      if (error) {
        console.warn('[History] barber_reviews:', error.message);
        return;
      }
      const set = new Set((data as { appointment_id: string }[]).map((r) => r.appointment_id));
      setReviewedIds(set);
    })();
  }, [session?.user?.id, historyData.length]);

  const stats = useMemo(() => {
    const count = typeof profile?.visit_count === 'number' ? profile.visit_count : historyData.filter((h) => normalizeStatus(h.status) === 'completed').length;
    const total = historyData.reduce((acc, item) => acc + parsePriceBs(item.price), 0);
    return { count, total };
  }, [historyData, profile?.visit_count]);

  const submitReview = async () => {
    const uid = session?.user?.id;
    if (!uid || !reviewTarget?.barberId) return;
    setReviewSaving(true);
    setReviewError(null);
    try {
      const { error } = await supabase.from('barber_reviews').insert({
        appointment_id: reviewTarget.id,
        client_id: uid,
        barber_id: reviewTarget.barberId,
        rating: reviewStars,
        comment: reviewComment.trim() || null,
      });
      if (error) {
        setReviewError(
          /barber_reviews/i.test(error.message ?? '')
            ? 'Las resenas aun no estan habilitadas en la base de datos.'
            : error.message
        );
        return;
      }
      setReviewedIds((prev) => new Set(prev).add(reviewTarget.id));
      setReviewTarget(null);
      setReviewComment('');
      setReviewStars(5);
    } finally {
      setReviewSaving(false);
    }
  };

  const listPaddingBottom = tabBarHeight + 20;

  if (showSkeleton) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <View style={{ paddingHorizontal: gutter, paddingTop: 4 }}>
          <HistoryListSkeleton mutedColor={colors.mutedBg} cardColor={colors.card} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !rows) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center' }]}
        edges={['top', 'left', 'right']}
      >
        <EmptyState
          icon="wifi-off"
          title="No pudimos cargar el historial"
          subtitle={error}
          onRetry={refresh}
          color={colors}
        />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: HistoryRow }) => {
    const norm = normalizeStatus(item.status);
    const isNoShow = norm === 'no_show';
    const canReview =
      norm === 'completed' && item.barberId && !reviewedIds.has(item.id);

    return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.service, { color: colors.text }]}>{item.service}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{item.price}</Text>
        </View>
        {isNoShow ? (
          <Text style={[styles.noShowTxt, { color: colors.subtext }]}>No asistencia registrada</Text>
        ) : (
          <View style={styles.statusRow}>
            {STATUS_ORDER.map((s) => {
              const rawIdx = STATUS_ORDER.indexOf(norm as (typeof STATUS_ORDER)[number]);
              const current = rawIdx < 0 ? 0 : rawIdx;
              const idx = STATUS_ORDER.indexOf(s);
              const active = idx <= current;
              return (
                <View key={`${item.id}-${s}`} style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: active ? colors.primary : colors.border }]} />
                  <Text style={[styles.statusText, { color: active ? colors.text : colors.subtext }]}>{statusLabel(s)}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.metaRow}>
          <Feather name="user" size={14} color={colors.subtext} />
          <Text style={[styles.detail, { color: colors.subtext }]}>{item.barber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={colors.subtext} />
          <Text style={[styles.detail, { color: colors.subtext }]}>
            {formatDateShort(item.date)}{item.time ? ` · ${item.time}` : ''}
          </Text>
        </View>
        {item.notes ? (
          <View style={styles.metaRow}>
            <Feather name="file-text" size={14} color={colors.subtext} />
            <Text style={[styles.detail, { color: colors.subtext }]}>{item.notes}</Text>
          </View>
        ) : null}
        {canReview ? (
          <TouchableOpacity style={[styles.reviewBtn, { borderColor: colors.primary }]} onPress={() => setReviewTarget(item)}>
            <Text style={[styles.reviewBtnTxt, { color: colors.primary }]}>Valorar al barbero</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <TabScreenHeader title="Historial de servicios" titleColor={colors.primary} />

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="calendar" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.count}</Text>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>Visitas (cuenta)</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="dollar-sign" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.total} Bs</Text>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>Total aprox.</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Últimas visitas</Text>
          </>
        }
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="Aún no hay visitas"
            subtitle="Cuando tengas citas completadas, las verás aquí con orden y detalle."
            color={colors}
          />
        }
      />

      <Modal visible={!!reviewTarget} transparent animationType="fade" onRequestClose={() => setReviewTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tu reseña</Text>
            <Text style={[styles.modalSub, { color: colors.subtext }]}>Barbero: {resolveReviewBarberName(reviewTarget?.barber)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewStars(n)}>
                  <Feather name="star" size={28} color={n <= reviewStars ? '#f5a623' : colors.border} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.reviewInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Comentario (opcional)"
              placeholderTextColor={colors.subtext}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            {reviewError ? <Text style={{ color: '#c0392b', marginBottom: 8 }}>{reviewError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReviewTarget(null)} style={styles.modalGhost}>
                <Text style={{ color: colors.subtext, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void submitReview()}
                disabled={reviewSaving}
                style={[styles.modalPrimary, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{reviewSaving ? 'Enviando…' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 18,
    },
    statCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 4,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        },
        android: { elevation: 1 },
      }),
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    card: {
      flexDirection: 'row',
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        },
        android: { elevation: 2 },
      }),
    },
    accent: {
      width: 4,
    },
    cardBody: {
      flex: 1,
      padding: 14,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    service: { fontSize: 16, fontWeight: '700', flex: 1 },
    price: { fontSize: 16, fontWeight: '800' },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    detail: { fontSize: 13 },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      marginTop: 2,
    },
    statusItem: { alignItems: 'center', flex: 1 },
    statusDot: { width: 10, height: 10, borderRadius: 10, marginBottom: 3 },
    statusText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
    noShowTxt: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    reviewBtn: {
      marginTop: 10,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    reviewBtnTxt: { fontWeight: '700', fontSize: 14 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    modalSub: { fontSize: 14, marginBottom: 12 },
    starsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    reviewInput: {
      minHeight: 80,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
    modalGhost: { paddingVertical: 8 },
    modalPrimary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  });
}

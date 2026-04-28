import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

type Props = { mutedColor: string; cardColor: string };

export function HistoryListSkeleton({ mutedColor, cardColor }: Props) {
  return (
    <View>
      <Skeleton width="85%" height={22} borderRadius={6} color={mutedColor} />
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Skeleton width="100%" height={88} borderRadius={14} color={cardColor} />
        </View>
        <View style={styles.statBox}>
          <Skeleton width="100%" height={88} borderRadius={14} color={cardColor} />
        </View>
      </View>
      <Skeleton width={120} height={14} borderRadius={4} color={mutedColor} style={{ marginBottom: 10 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { backgroundColor: cardColor, borderColor: mutedColor }]}>
          <Skeleton width={4} height={72} borderRadius={2} color={mutedColor} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="75%" height={16} borderRadius={4} color={mutedColor} />
            <Skeleton width="55%" height={13} borderRadius={4} color={mutedColor} style={{ marginTop: 8 }} />
            <Skeleton width="40%" height={13} borderRadius={4} color={mutedColor} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 18,
    gap: 12,
  },
  statBox: { flex: 1 },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'stretch',
  },
});

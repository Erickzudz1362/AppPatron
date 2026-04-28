import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

type Props = { mutedColor: string; cardColor: string };

/** Layout aproximado del Home mientras cargan barberos y servicios. */
export function HomeSkeleton({ mutedColor, cardColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Skeleton width="75%" height={20} borderRadius={6} color={mutedColor} />
          <Skeleton width="55%" height={14} borderRadius={4} color={mutedColor} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={28} height={28} borderRadius={14} color={mutedColor} />
      </View>

      <Skeleton width="100%" height={44} borderRadius={12} color={cardColor} style={{ marginTop: 12 }} />

      <Skeleton width="100%" height={160} borderRadius={16} color={cardColor} style={{ marginTop: 16 }} />

      <View style={styles.sectionRow}>
        <Skeleton width={140} height={18} borderRadius={6} color={mutedColor} />
        <Skeleton width={64} height={14} borderRadius={4} color={mutedColor} />
      </View>

      <View style={styles.hBarbers}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.barberSk}>
            <Skeleton width={64} height={64} borderRadius={32} color={cardColor} />
            <Skeleton width={72} height={12} borderRadius={4} color={mutedColor} style={{ marginTop: 8 }} />
            <Skeleton width={56} height={18} borderRadius={8} color={mutedColor} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      <View style={styles.quickRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.quickCell}>
            <Skeleton width="100%" height={72} borderRadius={12} color={cardColor} />
          </View>
        ))}
      </View>

      <Skeleton width="100%" height={88} borderRadius={16} color={cardColor} style={{ marginTop: 12 }} />

      <Skeleton width={160} height={18} borderRadius={6} color={mutedColor} style={{ marginTop: 16 }} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.gridCell}>
            <Skeleton width="100%" height={120} borderRadius={14} color={cardColor} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  hBarbers: { flexDirection: 'row', marginBottom: 12 },
  barberSk: { marginRight: 12, alignItems: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, gap: 8 },
  quickCell: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridCell: { width: '48%', marginBottom: 12 },
});

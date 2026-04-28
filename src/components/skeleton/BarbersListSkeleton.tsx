import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

type Props = { mutedColor: string; cardColor: string };

export function BarbersListSkeleton({ mutedColor, cardColor }: Props) {
  return (
    <View>
      <Skeleton width="40%" height={22} borderRadius={6} color={mutedColor} />
      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <Skeleton width="100%" height={44} borderRadius={12} color={cardColor} />
        </View>
        <Skeleton width={120} height={36} borderRadius={12} color={mutedColor} />
      </View>
      <View style={styles.chips}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={72} height={34} borderRadius={16} color={mutedColor} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { borderColor: mutedColor, backgroundColor: cardColor }]}>
          <Skeleton width={64} height={64} borderRadius={32} color={mutedColor} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="70%" height={18} borderRadius={4} color={mutedColor} />
            <Skeleton width="50%" height={14} borderRadius={4} color={mutedColor} style={{ marginTop: 8 }} />
            <Skeleton width="90%" height={36} borderRadius={10} color={mutedColor} style={{ marginTop: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 10 },
  searchFlex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
});

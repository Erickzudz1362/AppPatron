import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

type Props = { mutedColor: string; cardColor: string };

export function NoticesListSkeleton({ mutedColor, cardColor }: Props) {
  return (
    <View>
      <Skeleton width="36%" height={22} borderRadius={6} color={mutedColor} />
      <View style={styles.chips}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={76} height={34} borderRadius={16} color={mutedColor} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: cardColor, borderColor: mutedColor }]}
        >
          <Skeleton width="50%" height={14} borderRadius={4} color={mutedColor} />
          <Skeleton width="90%" height={18} borderRadius={4} color={mutedColor} style={{ marginTop: 10 }} />
          <Skeleton width="100%" height={44} borderRadius={4} color={mutedColor} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
});

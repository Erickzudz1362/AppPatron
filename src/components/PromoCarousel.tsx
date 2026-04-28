import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Image, StyleSheet, ImageSourcePropType, useWindowDimensions } from 'react-native';
import { supabase } from '../config/supabase';
import { useAppTheme } from '../theme/ThemeProvider';

const FALLBACK_BANNERS: ImageSourcePropType[] = [
  require('../../assets/banners/banner1.jpg'),
  require('../../assets/banners/banner1.jpg'),
  require('../../assets/banners/banner1.jpg'),
];

const HOME_CAROUSEL_BUCKET =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_HOME_CAROUSEL_BUCKET?.trim()) ||
  'home-carousel';

const HOME_CAROUSEL_SLOTS = ['slide-1', 'slide-2', 'slide-3'];

export default function PromoCarousel() {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Math.max(windowWidth - 32, 280));
  const [banners, setBanners] = useState<ImageSourcePropType[]>(FALLBACK_BANNERS);
  const [failed, setFailed] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: files, error } = await supabase.storage.from(HOME_CAROUSEL_BUCKET).list('carousel', {
        limit: 20,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error || !mounted) return;

      const resolved = HOME_CAROUSEL_SLOTS.map((slot, slotIndex) => {
        const file = (files ?? []).find((item) => item.name.toLowerCase().startsWith(`${slot}.`));
        if (!file) return FALLBACK_BANNERS[slotIndex];
        const { data } = supabase.storage.from(HOME_CAROUSEL_BUCKET).getPublicUrl(`carousel/${file.name}`);
        return { uri: `${data.publicUrl}?v=${Date.now()}` };
      });

      setFailed([false, false, false]);
      setBanners(resolved);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % banners.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * containerWidth, animated: true });
    }, 3500);
    return () => clearInterval(id);
  }, [banners.length, containerWidth, index]);

  return (
    <View
      style={[styles.wrapper, { backgroundColor: colors.card, borderColor: colors.border }]}
      onLayout={(event) => {
        const nextWidth = Math.max(Math.round(event.nativeEvent.layout.width), 280);
        if (nextWidth !== containerWidth) setContainerWidth(nextWidth);
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
          setIndex(i);
        }}
      >
        {banners.map((img, i) => (
          <View key={i} style={[styles.slideFrame, { width: containerWidth, backgroundColor: colors.card }]}>
            <Image
              source={failed[i] ? FALLBACK_BANNERS[i] : img}
              onError={() => {
                setFailed((prev) => {
                  if (prev[i]) return prev;
                  const copy = [...prev];
                  copy[i] = true;
                  return copy;
                });
              }}
              style={styles.slideImg}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {banners.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 174,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
  },
  slideFrame: {
    height: 174,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  slideImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
  dotActive: { backgroundColor: 'white' },
});

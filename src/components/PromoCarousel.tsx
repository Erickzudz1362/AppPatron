import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const banners = [
  require('../../assets/banners/banner1.jpg'),
  require('../../assets/banners/banner1.jpg'),
  require('../../assets/banners/banner1.jpg'),
];

export default function PromoCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % banners.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, 3500);
    return () => clearInterval(id);
  }, [index]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
      >
        {banners.map((img, i) => (
          <Image key={i} source={img} style={styles.slide} resizeMode="cover" />
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
  wrapper: { height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  slide: { width, height: 160 },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
  dotActive: { backgroundColor: 'white' },
});

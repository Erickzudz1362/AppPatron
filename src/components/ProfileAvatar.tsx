import React from 'react';
import { Image, View, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { getAvatarImageSource, getAvatarIndexFromPhotoUrl } from '../profile/avatarAssets';

type Props = {
  photoUrl: string | null | undefined;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function ProfileAvatar({ photoUrl, size = 64, style }: Props) {
  const idx = getAvatarIndexFromPhotoUrl(photoUrl);
  const isRemote = typeof photoUrl === 'string' && /^https?:\/\//i.test(photoUrl.trim());

  if (isRemote) {
    return (
      <Image
        source={{ uri: photoUrl!.trim() }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={getAvatarImageSource(idx)}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#e8ebee' },
});

import React from 'react';
import { Image, View, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import {
  getAvatarFallbackImageSource,
  getAvatarIndexFromPhotoUrl,
  getAvatarPublicUrl,
  isBuiltinAvatarPhotoUrl,
} from '../profile/avatarAssets';

type Props = {
  photoUrl: string | null | undefined;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function ProfileAvatar({ photoUrl, size = 64, style }: Props) {
  const idx = getAvatarIndexFromPhotoUrl(photoUrl);
  const isRemote = typeof photoUrl === 'string' && /^https?:\/\//i.test(photoUrl.trim());
  const isBuiltin = isBuiltinAvatarPhotoUrl(photoUrl);
  const [builtinFailed, setBuiltinFailed] = React.useState(false);

  React.useEffect(() => {
    setBuiltinFailed(false);
  }, [photoUrl]);

  if (isRemote) {
    return (
      <Image
        source={{ uri: photoUrl!.trim() }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  if (isBuiltin && !builtinFailed) {
    return (
      <Image
        source={{ uri: getAvatarPublicUrl(idx) }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onError={() => setBuiltinFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={getAvatarFallbackImageSource(idx)}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#e8ebee' },
});

import React from 'react';
import { type ImageProps, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { optimizeSupabaseImageUrl, originalSupabaseImageUrl } from '../utils/imageUrls';

type Props = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  fallbackSource?: ImageSourcePropType;
  optimize?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: 'cover' | 'contain' | 'fill';
  };
};

export function RemoteImage({ uri, fallbackSource, optimize, onError, resizeMode, ...props }: Props) {
  const originalUri = typeof uri === 'string' && uri.trim() ? originalSupabaseImageUrl(uri.trim()) : '';
  const optimizedUri = originalUri ? optimizeSupabaseImageUrl(originalUri, optimize) : '';
  const [source, setSource] = React.useState<ImageSourcePropType | null>(
    optimizedUri ? { uri: optimizedUri } : fallbackSource ?? null
  );

  React.useEffect(() => {
    setSource(optimizedUri ? { uri: optimizedUri } : fallbackSource ?? null);
  }, [fallbackSource, optimizedUri]);

  if (!source) return null;

  const contentFit = resizeMode === 'stretch'
    ? 'fill'
    : resizeMode === 'center'
      ? 'contain'
      : resizeMode === 'repeat'
        ? 'cover'
        : resizeMode ?? 'cover';

  return (
    <Image
      {...(props as Omit<React.ComponentProps<typeof Image>, 'source'>)}
      source={source as React.ComponentProps<typeof Image>['source']}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={120}
      recyclingKey={originalUri || undefined}
      onError={(event) => {
        const currentUri = typeof source === 'object' && 'uri' in source ? source.uri : '';
        if (originalUri && currentUri !== originalUri) {
          setSource({ uri: originalUri });
          return;
        }
        if (fallbackSource && !originalUri) {
          setSource(fallbackSource);
          return;
        }
        onError?.(event as never);
      }}
    />
  );
}

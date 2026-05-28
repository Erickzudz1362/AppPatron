import React from 'react';
import { Image, type ImageProps, type ImageSourcePropType } from 'react-native';
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

export function RemoteImage({ uri, fallbackSource, optimize, onError, ...props }: Props) {
  const originalUri = typeof uri === 'string' && uri.trim() ? originalSupabaseImageUrl(uri.trim()) : '';
  const optimizedUri = originalUri ? optimizeSupabaseImageUrl(originalUri, optimize) : '';
  const [source, setSource] = React.useState<ImageSourcePropType | null>(
    optimizedUri ? { uri: optimizedUri } : fallbackSource ?? null
  );

  React.useEffect(() => {
    setSource(optimizedUri ? { uri: optimizedUri } : fallbackSource ?? null);
  }, [fallbackSource, optimizedUri]);

  if (!source) return null;

  return (
    <Image
      {...props}
      source={source}
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
        onError?.(event);
      }}
    />
  );
}

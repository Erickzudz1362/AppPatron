import { Image } from 'react-native';

const PUBLIC_OBJECT_SEGMENT = '/storage/v1/object/public/';
const PUBLIC_RENDER_SEGMENT = '/storage/v1/render/image/public/';

type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

export function optimizeSupabaseImageUrl(url: string | null | undefined, options: OptimizeOptions = {}) {
  if (!url || typeof url !== 'string') return url ?? '';
  const trimmed = url.trim();
  if (!trimmed.includes(PUBLIC_OBJECT_SEGMENT)) return trimmed;

  const [base, existingQuery = ''] = trimmed.split('?');
  const params = new URLSearchParams(existingQuery);
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  params.set('quality', String(options.quality ?? 72));
  params.set('resize', options.resize ?? 'cover');

  return `${base.replace(PUBLIC_OBJECT_SEGMENT, PUBLIC_RENDER_SEGMENT)}?${params.toString()}`;
}

export function originalSupabaseImageUrl(url: string | null | undefined) {
  if (!url || typeof url !== 'string') return url ?? '';
  const original = url.trim().replace(PUBLIC_RENDER_SEGMENT, PUBLIC_OBJECT_SEGMENT);
  const [base, existingQuery = ''] = original.split('?');
  if (!existingQuery) return base;

  const params = new URLSearchParams(existingQuery);
  params.delete('width');
  params.delete('height');
  params.delete('quality');
  params.delete('resize');

  const nextQuery = params.toString();
  return nextQuery ? `${base}?${nextQuery}` : base;
}

export function prefetchImageUrls(urls: Array<string | null | undefined>) {
  urls
    .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
    .forEach((url) => {
      Image.prefetch(url).catch(() => undefined);
    });
}

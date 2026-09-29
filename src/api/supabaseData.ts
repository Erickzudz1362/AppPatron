import type { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { HOME_GALLERY_FOLDER, PROMO_CAROUSEL_BUCKET } from '../utils/storageUpload';
import {
  DEFAULT_BARBER_AVATAR,
  type BarberListItem,
  type HistoryRow,
  type HomeBarber,
  type HomeService,
  type NoticeItem,
} from './fallbackData';
import { isSupabaseConfigured } from '../utils/supabaseReady';
import { optimizeSupabaseImageUrl } from '../utils/imageUrls';

const warned = new Set<string>();
const BARBERS_FULL_MEMORY_TTL_MS = 15_000;
let barbersFullMemoryCache: BarberListItem[] | null = null;
let barbersFullMemoryAt = 0;
const HOME_BUNDLE_CACHE_KEY = 'el_patron_home_bundle_v2';
const HOME_BUNDLE_MEMORY_TTL_MS = 30_000;
const HOME_BUNDLE_DISK_TTL_MS = 2 * 60_000;
let homeBundleMemoryCache: HomeBundle | null = null;
let homeBundleMemoryAt = 0;

function withTimeoutFallback<T>(promise: PromiseLike<T>, fallback: T, ms = 6000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });

  return Promise.race([Promise.resolve(promise).catch(() => fallback), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function emptyPostgrest<T>(data: T): any {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[supabaseData] ${message}`);
}

type ServiceRow = {
  id: string;
  name?: string | null;
  price?: number | null;
};

function mapServiceRow(r: ServiceRow, index: number): HomeService {
  const price = typeof r.price === 'number' ? `${r.price} Bs` : '-';
  const icons: HomeService['icon'][] = ['scissors', 'user', 'layers', 'droplet'];
  return {
    id: String(r.id ?? index),
    name: r.name?.trim() || 'Servicio',
    priceLabel: price,
    icon: icons[index % icons.length],
  };
}

export async function fetchHomeBarbers(): Promise<HomeBarber[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await withTimeoutFallback(
    supabase.rpc('get_public_barber_directory'),
    emptyPostgrest([] as Array<{ id: string; name: string | null; photo_url: string | null; active: boolean }>),
    4500
  );
  if (error) {
    warnOnce('barbers', error.message);
    return [];
  }
  if (!data?.length) return [];
  return (data as Array<{ id: string; name: string | null; photo_url: string | null; active: boolean }>).map((row) => ({
    id: row.id,
    name: row.name?.trim() || 'Barbero',
    available: row.active !== false,
    avatarUrl: row.photo_url?.trim()
      ? optimizeSupabaseImageUrl(row.photo_url.trim(), { width: 180, height: 180, quality: 78 })
      : null,
  }));
}

export async function fetchHomeServices(): Promise<HomeService[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await withTimeoutFallback(
    supabase.from('services').select('id, name, price').eq('active', true).limit(24),
    emptyPostgrest([] as ServiceRow[]),
    1200
  );
  if (error) {
    warnOnce('services', error.message);
    return [];
  }
  if (!data?.length) return [];

  return (data as ServiceRow[]).map(mapServiceRow);
}

export type HomeBundle = {
  barbers: HomeBarber[];
  services: HomeService[];
  galleryUrls?: string[];
  story?: string;
  testimonial?: string;
  showMainCarousel?: boolean;
  showSecondCarousel?: boolean;
  galleryVisibleCount?: number;
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  mapsUrl?: string;
};

async function fetchHomeBundleFromNetwork(): Promise<HomeBundle> {
  try {
    const [barbers, services, settingsRes, galleryRes] = await Promise.all([
      withTimeoutFallback(fetchHomeBarbers(), [], 5000),
      withTimeoutFallback(fetchHomeServices(), [], 5000),
      withTimeoutFallback(
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['home_story', 'home_testimonial', 'show_second_carousel', 'home_gallery_visible_count', 'whatsapp_contact', 'instagram_url', 'facebook_url', 'maps_url']),
        emptyPostgrest([] as Array<{ key: string; value: string }>),
        5000
      ),
      withTimeoutFallback(
        supabase.storage.from(PROMO_CAROUSEL_BUCKET).list(HOME_GALLERY_FOLDER, {
          limit: 12,
          sortBy: { column: 'name', order: 'asc' },
        }),
        { data: [], error: null },
        5000
      ),
    ]);

    const rows = (settingsRes.data ?? []) as Array<{ key: string; value: string }>;
    const pick = (key: string) => rows.find((row) => row.key === key)?.value?.trim() ?? '';
    const parsedGalleryVisibleCount = Number.parseInt(pick('home_gallery_visible_count') || '4', 10);
    const galleryUrls =
      galleryRes.error == null
        ? (galleryRes.data ?? [])
            .filter((file) => !!file.name && !file.name.endsWith('/'))
            .map((file) => {
              const url = supabase.storage.from(PROMO_CAROUSEL_BUCKET).getPublicUrl(`${HOME_GALLERY_FOLDER}/${file.name}`).data.publicUrl;
              const version = encodeURIComponent(String(file.updated_at ?? file.created_at ?? file.name));
              return optimizeSupabaseImageUrl(`${url}?v=${version}`, { width: 760, quality: 74, resize: 'cover' });
            })
        : [];
    return {
      barbers,
      services,
      galleryUrls,
      story: pick('home_story') || undefined,
      testimonial: pick('home_testimonial') || undefined,
      showMainCarousel: true,
      showSecondCarousel: pick('show_second_carousel') === 'true',
      galleryVisibleCount:
        parsedGalleryVisibleCount >= 2 && parsedGalleryVisibleCount <= 4 ? parsedGalleryVisibleCount : 4,
      whatsappUrl: pick('whatsapp_contact') || undefined,
      instagramUrl: pick('instagram_url') || undefined,
      facebookUrl: pick('facebook_url') || undefined,
      mapsUrl: pick('maps_url') || undefined,
    };
  } catch (error) {
    warnOnce('bundle', String(error));
    return {
      barbers: [],
      services: [],
      galleryUrls: [],
      story: undefined,
      testimonial: undefined,
      showMainCarousel: false,
      showSecondCarousel: false,
      galleryVisibleCount: 4,
    };
  }
}

export async function fetchHomeBundle(): Promise<HomeBundle> {
  const now = Date.now();
  if (homeBundleMemoryCache && now - homeBundleMemoryAt < HOME_BUNDLE_MEMORY_TTL_MS) {
    return homeBundleMemoryCache;
  }

  try {
    const cached = await AsyncStorage.getItem(HOME_BUNDLE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { at: number; value: HomeBundle };
      if (parsed?.value && now - Number(parsed.at) < HOME_BUNDLE_DISK_TTL_MS) {
        homeBundleMemoryCache = parsed.value;
        homeBundleMemoryAt = Number(parsed.at);
        return parsed.value;
      }
    }
  } catch {
    // El caché es una optimización; Supabase sigue siendo la fuente de verdad.
  }

  const value = await fetchHomeBundleFromNetwork();
  homeBundleMemoryCache = value;
  homeBundleMemoryAt = Date.now();
  void AsyncStorage.setItem(HOME_BUNDLE_CACHE_KEY, JSON.stringify({ at: homeBundleMemoryAt, value })).catch(() => undefined);
  return value;
}

export function invalidateHomeBundleCache(): void {
  homeBundleMemoryCache = null;
  homeBundleMemoryAt = 0;
  void AsyncStorage.removeItem(HOME_BUNDLE_CACHE_KEY).catch(() => undefined);
}

function mapBarberFullRow(
  r: Record<string, unknown>,
  profileName: string,
  profilePhotoUrl: string | null,
  rating: number,
  ratingCount: number
): BarberListItem {
  const avatar: ImageSourcePropType =
    typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim().length > 0
      ? { uri: profilePhotoUrl.trim() }
      : DEFAULT_BARBER_AVATAR;

  let specialties: string[] = ['Corte'];
  if (Array.isArray(r.specialties)) specialties = (r.specialties as unknown[]).map(String);
  else if (typeof r.specialties === 'string' && r.specialties.trim()) specialties = r.specialties.split(',').map((item) => item.trim());
  specialties = specialties.filter((item) => item && item.toLowerCase() !== 'combo');

  return {
    id: String(r.id),
    name: profileName || 'Barbero',
    avatar,
    phone: '',
    rating,
    ratingCount,
    isAvailable: r.active !== false && r.is_active !== false,
    specialties,
  };
}

export async function fetchBarbersFull(): Promise<BarberListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const now = Date.now();
  if (barbersFullMemoryCache && now - barbersFullMemoryAt < BARBERS_FULL_MEMORY_TTL_MS) {
    return barbersFullMemoryCache;
  }

  const { data, error } = await withTimeoutFallback(
    supabase.rpc('get_public_barber_directory'),
    emptyPostgrest([] as Record<string, unknown>[]),
    4500
  );
  if (error) {
    warnOnce('barbers_full', error.message);
    return [];
  }
  if (!data?.length) return [];

  const rows = data as Record<string, unknown>[];
  const mapped = rows.map((row) => mapBarberFullRow(
    row,
    typeof row.name === 'string' ? row.name : 'Barbero',
    typeof row.photo_url === 'string' ? row.photo_url : null,
    Number(row.rating ?? 0),
    Number(row.rating_count ?? 0)
  ));
  barbersFullMemoryCache = mapped;
  barbersFullMemoryAt = Date.now();
  return mapped;
}

export async function fetchHistoryRows(): Promise<HistoryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const sessionResult = await withTimeoutFallback(
    supabase.auth.getSession(),
    { data: { session: null }, error: null },
    800
  );
  const {
    data: { session },
  } = sessionResult;
  const uid = session?.user?.id;
  if (!uid) return [];

  let { data, error } = await withTimeoutFallback(
    supabase.rpc('get_client_history_v2', { p_limit: 50 }),
    emptyPostgrest([] as Record<string, unknown>[]),
    6000
  );

  if (error && /get_client_history_v2|schema cache|could not find/i.test(error.message)) {
    const legacy = await withTimeoutFallback(
      supabase.rpc('get_client_history', { p_limit: 50 }),
      emptyPostgrest([] as Record<string, unknown>[]),
      6000
    );
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    warnOnce('appointments', error.message);
    throw new Error('No pudimos cargar tus reservas. Intenta nuevamente.');
  }
  if (!data?.length) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    service: String(row.service ?? 'Servicio'),
    barber: String(row.barber ?? 'Barbero'),
    barberId: String(row.barber_id ?? ''),
    date: String(row.date ?? '').slice(0, 10),
    time: String(row.time ?? '').slice(0, 5),
    status: String(row.status ?? 'pending'),
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    price: `${Number(row.total ?? 0)} Bs`,
    serviceIds: Array.isArray(row.service_ids) ? row.service_ids.map(String) : undefined,
    durationMinutes: Number.isFinite(Number(row.duration_minutes)) ? Number(row.duration_minutes) : undefined,
    modifyMinHours: Number.isFinite(Number(row.modify_min_hours)) ? Number(row.modify_min_hours) : 3,
    canModify: row.can_modify === true,
    modifyDeadline: typeof row.modify_deadline === 'string' ? row.modify_deadline : undefined,
  }));
}

function mapNoticeRow(r: Record<string, unknown>, readOverride?: boolean): NoticeItem {
  const rawType = String(r.type ?? 'aviso').toLowerCase();
  const type: NoticeItem['type'] =
    rawType === 'promo' || rawType === 'promocion' ? 'promo' : rawType === 'sistema' ? 'sistema' : 'aviso';
  const rawDate = r.date ?? r.created_at;
  const date = typeof rawDate === 'string' ? rawDate.slice(0, 10) : '';

  return {
    id: String(r.id),
    type,
    title: String(r.title ?? 'Aviso'),
    message: String(r.message ?? r.body ?? ''),
    date,
    read: typeof readOverride === 'boolean' ? readOverride : Boolean(r.read),
    link: typeof r.link === 'string' ? r.link : undefined,
  };
}

export async function fetchNotices(): Promise<NoticeItem[]> {
  if (!isSupabaseConfigured()) return [];

  const sessionResult = await withTimeoutFallback(
    supabase.auth.getSession(),
    { data: { session: null }, error: null },
    800
  );
  const {
    data: { session },
  } = sessionResult;
  const uid = session?.user?.id;
  const userCreatedAt = session?.user?.created_at ? new Date(session.user.created_at).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const visibleFrom = new Date(Math.max(thirtyDaysAgo, userCreatedAt || thirtyDaysAgo)).toISOString();

  const { data, error } = await withTimeoutFallback(
    supabase
      .from('notifications')
      .select('id, type, title, message, body, date, created_at, read, link, target_user_id')
      .eq('is_active', true)
      .or(uid ? `target_user_id.is.null,target_user_id.eq.${uid}` : 'target_user_id.is.null')
      .gte('created_at', visibleFrom)
      .order('created_at', { ascending: false })
      .limit(50),
    emptyPostgrest([] as Record<string, unknown>[]),
    1400
  );

  if (error) {
    warnOnce('notifications', error.message);
    return [];
  }

  const scopedRows = ((data as Record<string, unknown>[] | null) ?? []).filter((row) => {
    const type = String(row.type ?? '').toLowerCase();
    const targetUserId = typeof row.target_user_id === 'string' ? row.target_user_id : null;
    if (type === 'sistema') return !!targetUserId && targetUserId === uid;
    return !targetUserId || targetUserId === uid;
  });
  if (!scopedRows.length) return [];

  if (!uid) {
    return scopedRows.map((row) => mapNoticeRow(row, false));
  }

  const ids = scopedRows.map((row) => String(row.id));
  const { data: reads, error: readsError } = await withTimeoutFallback(
    supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', uid)
      .in('notification_id', ids),
    emptyPostgrest([] as Array<{ notification_id: string }>),
    1200
  );

  if (readsError) {
    return scopedRows.map((row) => mapNoticeRow(row, false));
  }

  const readSet = new Set(
    ((reads ?? []) as Array<{ notification_id: string }>).map((row) => String(row.notification_id))
  );
  return scopedRows.map((row) => mapNoticeRow(row, readSet.has(String(row.id))));
}

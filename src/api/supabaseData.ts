import type { ImageSourcePropType } from 'react-native';
import { supabase } from '../config/supabase';
import { HOME_GALLERY_FOLDER, PROMO_CAROUSEL_BUCKET } from '../utils/storageUpload';
import {
  DEFAULT_BARBER_AVATAR,
  FALLBACK_BARBERS_FULL,
  FALLBACK_HISTORY,
  FALLBACK_HOME_BARBERS,
  FALLBACK_HOME_SERVICES,
  type BarberListItem,
  type HistoryRow,
  type HomeBarber,
  type HomeService,
  type NoticeItem,
} from './fallbackData';
import { isSupabaseConfigured } from '../utils/supabaseReady';

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[supabaseData] ${message}`);
}

type BarberRow = {
  id: string;
  user_id?: string;
  active?: boolean | null;
  specialties?: string[] | null;
};

type ServiceRow = {
  id: string;
  name?: string | null;
  price?: number | null;
};

function mapBarberRow(r: BarberRow, profileName?: string | null, profilePhotoUrl?: string | null): HomeBarber {
  const baseName = profileName?.trim() || 'Barbero';
  return {
    id: String(r.id),
    name: baseName,
    available: r.active !== false,
    avatarUrl: typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim() ? profilePhotoUrl.trim() : null,
  };
}

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
  if (!isSupabaseConfigured()) return FALLBACK_HOME_BARBERS;

  const { data, error } = await supabase.from('barbers').select('id, user_id, active, specialties').limit(24);
  if (error) {
    warnOnce('barbers', error.message);
    return FALLBACK_HOME_BARBERS;
  }
  if (!data?.length) return FALLBACK_HOME_BARBERS;

  const rows = data as BarberRow[];
  const uids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
  const nameByUser: Record<string, string> = {};
  const photoByUser: Record<string, string | null> = {};

  if (uids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, name, photo_url').in('id', uids);
    ((profs ?? []) as { id: string; name: string | null; photo_url: string | null }[]).forEach((profile) => {
      nameByUser[profile.id] = profile.name?.trim() || 'Barbero';
      photoByUser[profile.id] = profile.photo_url?.trim() || null;
    });
  }

  return rows.map((row) => mapBarberRow(row, row.user_id ? nameByUser[row.user_id] : null, row.user_id ? photoByUser[row.user_id] : null));
}

export async function fetchHomeServices(): Promise<HomeService[]> {
  if (!isSupabaseConfigured()) return FALLBACK_HOME_SERVICES;

  const { data, error } = await supabase.from('services').select('id, name, price').limit(24);
  if (error) {
    warnOnce('services', error.message);
    return FALLBACK_HOME_SERVICES;
  }
  if (!data?.length) return FALLBACK_HOME_SERVICES;

  return (data as ServiceRow[]).map(mapServiceRow);
}

export type HomeBundle = {
  barbers: HomeBarber[];
  services: HomeService[];
  galleryUrls?: string[];
  story?: string;
  testimonial?: string;
  showSecondCarousel?: boolean;
  galleryVisibleCount?: number;
};

export async function fetchHomeBundle(): Promise<HomeBundle> {
  try {
    const [barbers, services, settingsRes, galleryRes] = await Promise.all([
      fetchHomeBarbers(),
      fetchHomeServices(),
      supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['home_story', 'home_testimonial', 'show_second_carousel', 'home_gallery_visible_count']),
      supabase.storage.from(PROMO_CAROUSEL_BUCKET).list(HOME_GALLERY_FOLDER, {
        limit: 12,
        sortBy: { column: 'name', order: 'asc' },
      }),
    ]);

    const rows = (settingsRes.data ?? []) as Array<{ key: string; value: string }>;
    const pick = (key: string) => rows.find((row) => row.key === key)?.value?.trim() ?? '';
    const parsedGalleryVisibleCount = Number.parseInt(pick('home_gallery_visible_count') || '4', 10);
    const galleryUrls =
      galleryRes.error == null
        ? (galleryRes.data ?? [])
            .filter((file) => !!file.name && !file.name.endsWith('/'))
            .map((file) => supabase.storage.from(PROMO_CAROUSEL_BUCKET).getPublicUrl(`${HOME_GALLERY_FOLDER}/${file.name}`).data.publicUrl)
        : [];

    return {
      barbers,
      services,
      galleryUrls,
      story: pick('home_story') || undefined,
      testimonial: pick('home_testimonial') || undefined,
      showSecondCarousel: pick('show_second_carousel') === '' ? true : pick('show_second_carousel') === 'true',
      galleryVisibleCount:
        parsedGalleryVisibleCount >= 2 && parsedGalleryVisibleCount <= 4 ? parsedGalleryVisibleCount : 4,
    };
  } catch (error) {
    warnOnce('bundle', String(error));
    return {
      barbers: FALLBACK_HOME_BARBERS,
      services: FALLBACK_HOME_SERVICES,
      galleryUrls: [],
      story: undefined,
      testimonial: undefined,
      showSecondCarousel: true,
      galleryVisibleCount: 4,
    };
  }
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
  if (!isSupabaseConfigured()) return FALLBACK_BARBERS_FULL;

  const { data, error } = await supabase.from('barbers').select('id, user_id, active, specialties').limit(40);
  if (error) {
    warnOnce('barbers_full', error.message);
    return FALLBACK_BARBERS_FULL;
  }
  if (!data?.length) return FALLBACK_BARBERS_FULL;

  const rows = data as Record<string, unknown>[];
  const uids = Array.from(new Set(rows.map((row) => String(row.user_id ?? '')).filter(Boolean)));
  const { data: profs } = uids.length
    ? await supabase.from('profiles').select('id, name, photo_url').in('id', uids)
    : { data: [] };

  const profileByUser: Record<string, { name: string; photoUrl: string | null }> = {};
  ((profs ?? []) as { id: string; name: string | null; photo_url: string | null }[]).forEach((profile) => {
    profileByUser[profile.id] = {
      name: profile.name?.trim() || 'Barbero',
      photoUrl: profile.photo_url?.trim() || null,
    };
  });

  const barberIds = rows.map((row) => String(row.id));
  const avgByBarber: Record<string, number> = {};
  const countByBarber: Record<string, number> = {};
  const { data: reviews, error: reviewsError } = await supabase.from('barber_reviews').select('barber_id, rating').in('barber_id', barberIds);
  if (!reviewsError && reviews?.length) {
    const sums: Record<string, { sum: number; count: number }> = {};
    (reviews as { barber_id: string; rating: number }[]).forEach((review) => {
      if (!sums[review.barber_id]) sums[review.barber_id] = { sum: 0, count: 0 };
      sums[review.barber_id].sum += Number(review.rating) || 0;
      sums[review.barber_id].count += 1;
    });
    Object.keys(sums).forEach((id) => {
      const { sum, count } = sums[id];
      avgByBarber[id] = count ? Math.round((sum / count) * 10) / 10 : 0;
      countByBarber[id] = count;
    });
  }

  return rows.map((row) => {
    const userId = String(row.user_id ?? '');
    const profile = profileByUser[userId];
    const rating = avgByBarber[String(row.id)] ?? 0;
    const ratingCount = countByBarber[String(row.id)] ?? 0;
    return mapBarberFullRow(row, profile?.name ?? 'Barbero', profile?.photoUrl ?? null, rating, ratingCount);
  });
}

function mapAppointmentRow(r: Record<string, unknown>, barberName: string, serviceName: string): HistoryRow {
  const rawDate = r.date ?? r.appointment_date ?? r.created_at;
  const date = typeof rawDate === 'string' ? rawDate.slice(0, 10) : '';
  const rawTime = typeof r.time === 'string' ? r.time : '';
  const time = rawTime ? rawTime.slice(0, 5) : '';
  const snapshot = r.total_price_snapshot;
  const price = typeof snapshot === 'number' && Number.isFinite(snapshot) ? `${snapshot} Bs` : '-';

  return {
    id: String(r.id),
    service: serviceName,
    barber: barberName || 'Barbero',
    barberId: String(r.barber_id ?? ''),
    date,
    time,
    status: typeof r.status === 'string' ? r.status : 'booked',
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    price,
  };
}

export async function fetchHistoryRows(): Promise<HistoryRow[]> {
  if (!isSupabaseConfigured()) return FALLBACK_HISTORY;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('appointments')
    .select('id, barber_id, service_id, date, time, status, notes, total_price_snapshot')
    .eq('client_id', uid)
    .order('date', { ascending: false })
    .limit(50);

  if (error) {
    warnOnce('appointments', error.message);
    return FALLBACK_HISTORY;
  }
  if (!data?.length) return [];

  const rows = data as Record<string, unknown>[];
  const barberIds = Array.from(new Set(rows.map((row) => String(row.barber_id ?? '')).filter(Boolean)));
  const serviceIds = Array.from(new Set(rows.map((row) => String(row.service_id ?? '')).filter(Boolean)));

  const [barbersRes, servicesRes] = await Promise.all([
    barberIds.length
      ? supabase.from('barbers').select('id, user_id').in('id', barberIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
    serviceIds.length
      ? supabase.from('services').select('id, name').in('id', serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  const barberRows = (barbersRes as { data: { id: string; user_id: string }[] | null }).data ?? [];
  const userIds = Array.from(new Set(barberRows.map((row) => row.user_id)));
  const { data: profiles } = userIds.length ? await supabase.from('profiles').select('id, name').in('id', userIds) : { data: [] };

  const profileNames: Record<string, string> = {};
  ((profiles ?? []) as { id: string; name: string | null }[]).forEach((profile) => {
    profileNames[profile.id] = profile.name?.trim() || 'Barbero';
  });

  const barberNameById: Record<string, string> = {};
  barberRows.forEach((barber) => {
    barberNameById[barber.id] = profileNames[barber.user_id] ?? 'Barbero';
  });

  const serviceNames: Record<string, string> = {};
  ((servicesRes as { data: { id: string; name: string | null }[] | null }).data ?? []).forEach((service) => {
    serviceNames[service.id] = service.name?.trim() || 'Servicio';
  });

  return rows.map((row) =>
    mapAppointmentRow(row, barberNameById[String(row.barber_id ?? '')] ?? 'Barbero', serviceNames[String(row.service_id ?? '')] ?? 'Servicio')
  );
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, body, date, created_at, read, link, target_user_id')
    .eq('is_active', true)
    .or(uid ? `target_user_id.is.null,target_user_id.eq.${uid}` : 'target_user_id.is.null')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

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
  const { data: reads, error: readsError } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', uid)
    .in('notification_id', ids);

  if (readsError) {
    warnOnce('notification_reads', readsError.message);
    return scopedRows.map((row) => mapNoticeRow(row, false));
  }

  const readSet = new Set((reads ?? []).map((row) => String((row as { notification_id: string }).notification_id)));
  return scopedRows.map((row) => mapNoticeRow(row, readSet.has(String(row.id))));
}

import type { ImageSourcePropType } from 'react-native';

const localBarberImg = require('../../assets/barbers/icon.png');

export type HomeBarber = {
  id: string;
  name: string;
  available: boolean;
  /** null = usar imagen local por defecto */
  avatarUrl: string | null;
};

export type HomeService = {
  id: string;
  name: string;
  priceLabel: string;
  icon: 'scissors' | 'user' | 'layers' | 'droplet';
};

export const FALLBACK_HOME_BARBERS: HomeBarber[] = [
  { id: 'b1', name: 'Carlos', available: true, avatarUrl: null },
  { id: 'b2', name: 'Miguel', available: false, avatarUrl: null },
  { id: 'b3', name: 'Andrés', available: true, avatarUrl: null },
];

export const FALLBACK_HOME_SERVICES: HomeService[] = [
  { id: '1', name: 'Corte', priceLabel: '30 Bs', icon: 'scissors' },
  { id: '2', name: 'Barba', priceLabel: '20 Bs', icon: 'user' },
  { id: '3', name: 'Corte + Barba', priceLabel: '45 Bs', icon: 'layers' },
  { id: '4', name: 'Tintura', priceLabel: '50 Bs', icon: 'droplet' },
];

/** Avatar por defecto para listas (mismo asset que antes). */
export const DEFAULT_BARBER_AVATAR: ImageSourcePropType = localBarberImg;

export type BarberListItem = {
  id: string;
  name: string;
  avatar: ImageSourcePropType;
  phone: string;
  rating: number;
  ratingCount?: number;
  isAvailable: boolean;
  specialties: string[];
};

export const FALLBACK_BARBERS_FULL: BarberListItem[] = [
  {
    id: 'b1',
    name: 'Carlos R.',
    avatar: localBarberImg,
    phone: '59170000001',
    rating: 4.8,
    ratingCount: 32,
    isAvailable: true,
    specialties: ['Corte', 'Barba', 'Afeitado'],
  },
  {
    id: 'b2',
    name: 'Miguel A.',
    avatar: localBarberImg,
    phone: '59170000002',
    rating: 4.5,
    ratingCount: 21,
    isAvailable: false,
    specialties: ['Corte'],
  },
  {
    id: 'b3',
    name: 'Andrés V.',
    avatar: localBarberImg,
    phone: '59170000003',
    rating: 4.9,
    ratingCount: 45,
    isAvailable: true,
    specialties: ['Barba', 'Color'],
  },
];

export type HistoryRow = {
  id: string;
  service: string;
  barber: string;
  /** Para reseñas tras servicio finalizado */
  barberId?: string;
  date: string;
  time?: string;
  status?: string;
  notes?: string;
  price: string;
};

export const FALLBACK_HISTORY: HistoryRow[] = [
  { id: '1', service: 'Corte de cabello', barber: 'Carlos', date: '2025-08-10', time: '10:30:00', status: 'booked', price: '30 Bs' },
  { id: '2', service: 'Corte + barba', barber: 'Miguel', barberId: 'b2', date: '2025-07-28', time: '16:00:00', status: 'confirmed', price: '45 Bs' },
  { id: '3', service: 'Arreglo de barba', barber: 'Andrés', date: '2025-06-15', time: '12:30:00', status: 'completed', price: '20 Bs' },
];

export type NoticeItem = {
  id: string;
  type: 'promo' | 'aviso' | 'sistema';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
};

export const FALLBACK_NOTICES: NoticeItem[] = [
  {
    id: 'n1',
    type: 'promo',
    title: 'Promo fin de semana',
    message: '10% de descuento pagando el 100% por QR. Solo este sábado y domingo.',
    date: '2025-08-20',
    read: false,
    link: 'https://wa.me/59170000000',
  },
  {
    id: 'n2',
    type: 'aviso',
    title: 'Feriado 6 de agosto',
    message: 'La barbería cerrará por feriado cívico. Reprograma tu cita desde la app.',
    date: '2025-08-05',
    read: true,
  },
  {
    id: 'n3',
    type: 'sistema',
    title: 'Tu cita fue confirmada',
    message: 'Carlos confirmó tu cita del 28/07 a las 16:00.',
    date: '2025-07-28',
    read: false,
  },
  {
    id: 'n4',
    type: 'aviso',
    title: 'Nuevo barbero',
    message: '¡Andrés se une al equipo! Especialista en barba y color.',
    date: '2025-07-15',
    read: true,
  },
];

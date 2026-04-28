export type UserRole = 'client' | 'barber' | 'admin';

export type Profile = {
  id: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  status: string | null;
  push_tokens: string[] | null;
  /** Visitas completadas (requiere columna en BD). */
  visit_count?: number | null;
  /** Último cambio de nombre desde la app (regla máx. cada 30 días). Requiere columna en BD. */
  name_changed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function parseRole(value: string | null | undefined): UserRole {
  if (value === 'barber' || value === 'admin') return value;
  return 'client';
}

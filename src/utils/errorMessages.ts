export function normalizeErrorMessage(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return 'Ocurrio un error inesperado.';
  }

  const value = raw.trim().toLowerCase();

  if (value.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (value.includes('email not confirmed')) {
    return 'Tu correo aún no fue verificado.';
  }
  if (value.includes('user already registered')) {
    return 'Ese correo ya está registrado.';
  }
  if (value.includes('email rate limit exceeded')) {
    return 'Espera un momento antes de volver a intentarlo.';
  }
  if (value.includes('invalid email')) {
    return 'El correo ingresado no es válido.';
  }
  if (value.includes('password should be at least')) {
    return 'La contraseña es demasiado corta.';
  }
  if (value.includes('password') && value.includes('uppercase')) {
    return 'La contraseña debe incluir al menos una letra mayúscula.';
  }
  if (value.includes('network request failed')) {
    return 'No se pudo conectar a internet.';
  }
  if (value.includes('jwt expired') || value.includes('session expired')) {
    return 'Tu sesión venció. Inicia sesión nuevamente.';
  }

  return raw.trim();
}

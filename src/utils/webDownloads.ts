import { originalSupabaseImageUrl } from './imageUrls';

export async function downloadImageFileOnWeb(url: string, filename: string): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('La descarga web no esta disponible en este dispositivo.');
  }

  const cleanUrl = originalSupabaseImageUrl(url);
  const response = await fetch(cleanUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('No se pudo preparar el archivo para descargar.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.target = '_self';
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
}

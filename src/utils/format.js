// Cambia la moneda aquí si no usas soles.
const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export const money = (value) => formatter.format(Number(value || 0));
export const fromCents = (cents) => cents / 100;
export const toCents = (value) => Math.round(Number(value) * 100);
export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '';

export const PAYMENTS = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

function flatten(value) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === 'object') return Object.values(value).flatMap(flatten);
  return [String(value)];
}

// Convierte cualquier error de Axios/DRF en un texto legible.
export function apiError(err) {
  if (!err?.response) return 'No hay conexión con el servidor. Revisa que el backend esté en marcha.';
  const data = err.response.data;
  if (typeof data === 'string') return 'El servidor respondió con un error inesperado.';
  const messages = flatten(data);
  return messages.length ? messages.join(' ') : 'No se pudo completar la operación.';
}

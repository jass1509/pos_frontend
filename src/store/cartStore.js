import { create } from 'zustand';
import { toCents } from '../utils/format';

/**
 * Venta activa en memoria.
 * lines: [{ product: {id, code, name, selling_price, stock}, quantity }]
 * El total mostrado es solo una vista previa: el servidor recalcula con precios de la BD.
 */
export const useCartStore = create((set, get) => ({
  lines: [],
  paymentMethod: 'CASH',

  // Devuelve false si no hay stock suficiente para agregar otra unidad.
  add: (product) => {
    const existing = get().lines.find((l) => l.product.id === product.id);
    const current = existing ? existing.quantity : 0;
    if (current >= product.stock) return false;

    set((state) => ({
      lines: existing
        ? state.lines.map((l) =>
            l.product.id === product.id ? { ...l, product, quantity: l.quantity + 1 } : l
          )
        : [...state.lines, { product, quantity: 1 }],
    }));
    return true;
  },

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.min(Math.floor(quantity), l.product.stock) }
            : l
        )
        .filter((l) => l.quantity > 0),
    })),

  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),

  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  clear: () => set({ lines: [], paymentMethod: 'CASH' }),
}));

export const selectTotalCents = (state) =>
  state.lines.reduce((sum, l) => sum + toCents(l.product.selling_price) * l.quantity, 0);

export const selectItemCount = (state) =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

import { create } from 'zustand';
import api from '../api/client';

export const useShiftStore = create((set, get) => ({
  shift: null,
  summary: null,
  loaded: false,

  fetch: async () => {
    try {
      const { data } = await api.get('/shifts/current/');
      const { summary, ...shift } = data;
      set({ shift, summary, loaded: true });
    } catch (e) {
      if (e.response?.status === 404) {
        set({ shift: null, summary: null, loaded: true });
      } else {
        set({ loaded: true });
        throw e;
      }
    }
  },

  open: async (initialCash) => {
    await api.post('/shifts/open/', { initial_cash: initialCash });
    await get().fetch();
  },

  clear: () => set({ shift: null, summary: null, loaded: true }),
}));

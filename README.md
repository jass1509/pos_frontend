# POS Frontend (React + Vite)

Requiere el backend Django corriendo en http://localhost:8000.

```bash
npm install
npm run dev        # http://localhost:5173  (Vite reenvía /api al backend)
npm run build      # genera dist/ para producción
```

En producción, si el API está en otro dominio, define `VITE_API_URL`
(ver `.env.example`) y agrega el origen del frontend a `CORS_ALLOWED_ORIGINS` en Django.

## Estructura
- `src/store/cartStore.js`  venta activa en memoria (Zustand)
- `src/store/authStore.js`  tokens JWT y usuario (persistidos en localStorage)
- `src/store/shiftStore.js` turno abierto y resumen
- `src/api/client.js`       Axios con JWT y renovación automática del token
- `src/pages/`              Login, POS (venta + apertura de turno), Historial, Productos (admin)
- `src/components/CloseShiftModal.jsx` cierre de caja con totales por método de pago

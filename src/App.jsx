import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import api from './api/client';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import Products from './pages/Products.jsx';

export default function App() {
  const access = useAuthStore((s) => s.access);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  // Si hay sesión guardada pero aún no tenemos el usuario, lo recuperamos.
  useEffect(() => {
    if (access && !user) {
      api.get('/auth/me/').then((r) => setUser(r.data)).catch(() => logout());
    }
  }, [access, user, setUser, logout]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<POS />} />
          <Route path="sales" element={<SalesHistory />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="products" element={<Products />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

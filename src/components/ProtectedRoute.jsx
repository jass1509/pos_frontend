import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ adminOnly = false }) {
  const access = useAuthStore((s) => s.access);
  const user = useAuthStore((s) => s.user);

  if (!access) return <Navigate to="/login" replace />;
  if (!user) return <p className="boot">Cargando sesión…</p>;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

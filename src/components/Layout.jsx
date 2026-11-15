import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useShiftStore } from '../store/shiftStore';
import { dateTime } from '../utils/format';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const shift = useShiftStore((s) => s.shift);
  const clearShift = useShiftStore((s) => s.clear);
  const clearCart = useCartStore((s) => s.clear);
  const navigate = useNavigate();

  function handleLogout() {
    clearCart();
    useShiftStore.setState({ shift: null, summary: null, loaded: false });
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Caja</strong>
        <nav aria-label="Principal">
          <NavLink to="/" end>Venta</NavLink>
          <NavLink to="/sales">Historial</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/products">Productos</NavLink>}
        </nav>
        <div className="topbar-right">
          {shift ? (
            <span className="pill pill-ok">Turno abierto desde {dateTime(shift.opened_at)}</span>
          ) : (
            <span className="pill">Sin turno abierto</span>
          )}
          <span className="who">
            {user?.username} <small>({user?.role === 'ADMIN' ? 'administrador' : 'cajero'})</small>
          </span>
          <button className="ghost" onClick={handleLogout}>Salir</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

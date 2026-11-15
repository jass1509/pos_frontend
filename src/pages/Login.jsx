import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { apiError } from '../utils/format';

export default function Login() {
  const { access, user, setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (access && user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/token/', { username, password });
      setTokens(data.access, data.refresh);
      const me = await api.get('/auth/me/');
      setUser(me.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.status === 401 ? 'Usuario o contraseña incorrectos.' : apiError(err)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Caja</h1>
        <p className="muted">Inicia sesión para abrir tu turno.</p>
        <label className="field">
          <span>Usuario</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required autoComplete="username" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="primary" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

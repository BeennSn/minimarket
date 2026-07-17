import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';

const AuthContext = createContext(null);

// Cada cuántos ms se revisa que la sesión siga activa (cuenta desactivada,
// contraseña cambiada, cierre forzado por SuperAdmin, o login desde otra
// pestaña/dispositivo). El interceptor de axios reacciona al 401 resultante.
const INTERVALO_HEARTBEAT = 12000;

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsuario = localStorage.getItem('usuario');
    if (savedToken && savedUsuario) {
      setToken(savedToken);
      try {
        setUsuario(JSON.parse(savedUsuario));
      } catch {
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    const intervalo = setInterval(() => {
      api.get('/auth/me').catch(() => {});
    }, INTERVALO_HEARTBEAT);
    return () => clearInterval(intervalo);
  }, [token]);

  const login = (data) => {
    if (data.token) localStorage.setItem('token', data.token);
    if (data.usuario) localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token ?? null);
    setUsuario(data.usuario ?? null);
  };

  const logout = async () => {
    // Se espera la respuesta antes de limpiar el estado local: si no, al
    // navegar de inmediato la petición podía quedar en el aire y el servidor
    // nunca marcaba sesion_activa=false ni registraba el LogAcceso de
    // "Logout" — quedaba pendiente hasta el siguiente login, que lo detectaba
    // como sesión vieja sin cerrar y lo registraba tarde y con el motivo
    // equivocado ("nuevo inicio de sesión en otro dispositivo").
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort: si el servidor no responde, la sesión igual se cierra
      // localmente para no dejar al usuario atrapado.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

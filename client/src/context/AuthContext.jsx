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

  const logout = () => {
    // Best-effort: avisa al servidor para liberar el cupo de "sesión activa" de
    // esta cuenta (ver login() en auth.controller.js). No se espera la
    // respuesta para no demorar el cierre de sesión local.
    api.post('/auth/logout').catch(() => {});
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

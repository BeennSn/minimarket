import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROL_HOME = {
  Administrador: '/dashboard',
  Gerente: '/dashboard',
  Vendedor: '/ventas',
  Almacenero: '/inventario',
};

export default function PrivateRoute({ roles, children }) {
  const { usuario, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(usuario?.rol)) {
    const destino = ROL_HOME[usuario?.rol] || '/dashboard';
    return <Navigate to={destino} replace />;
  }

  return children || <Outlet />;
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rolSatisface } from '../utils/roles';

const ROL_HOME = {
  SuperAdmin: '/dashboard',
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

  if (roles && !rolSatisface(usuario?.rol, roles)) {
    const destino = ROL_HOME[usuario?.rol] || '/dashboard';
    return <Navigate to={destino} replace />;
  }

  return children || <Outlet />;
}

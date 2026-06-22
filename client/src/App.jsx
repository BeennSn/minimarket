import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/MainLayout';
import LoginPage from './modules/auth/LoginPage';
import ResetPasswordPage from './modules/auth/ResetPasswordPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import UsuariosPage from './modules/usuarios/UsuariosPage';
import CategoriasPage from './modules/categorias/CategoriasPage';
import ProductosPage from './modules/productos/ProductosPage';
import ProveedoresPage from './modules/proveedores/ProveedoresPage';
import VentasPage from './modules/ventas/VentasPage';
import InventarioPage from './modules/inventario/InventarioPage';
import SolicitudesPage from './modules/solicitudes/SolicitudesPage';
import ReportesPage from './modules/reportes/ReportesPage';

function HomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route
              path="dashboard"
              element={
                <PrivateRoute roles={['Gerente', 'Administrador']}>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <PrivateRoute roles={['Administrador']}>
                  <UsuariosPage />
                </PrivateRoute>
              }
            />
            <Route
              path="categorias"
              element={
                <PrivateRoute roles={['Administrador', 'Almacenero']}>
                  <CategoriasPage />
                </PrivateRoute>
              }
            />
            <Route
              path="productos"
              element={
                <PrivateRoute roles={['Administrador', 'Almacenero']}>
                  <ProductosPage />
                </PrivateRoute>
              }
            />
            <Route
              path="proveedores"
              element={
                <PrivateRoute roles={['Administrador', 'Almacenero']}>
                  <ProveedoresPage />
                </PrivateRoute>
              }
            />
            <Route
              path="ventas"
              element={
                <PrivateRoute roles={['Vendedor', 'Administrador']}>
                  <VentasPage />
                </PrivateRoute>
              }
            />
            <Route
              path="inventario"
              element={
                <PrivateRoute roles={['Almacenero', 'Administrador']}>
                  <InventarioPage />
                </PrivateRoute>
              }
            />
            <Route
              path="solicitudes"
              element={
                <PrivateRoute roles={['Almacenero', 'Administrador', 'Gerente']}>
                  <SolicitudesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="reportes"
              element={
                <PrivateRoute roles={['Gerente', 'Administrador']}>
                  <ReportesPage />
                </PrivateRoute>
              }
            />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

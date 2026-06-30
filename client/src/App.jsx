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
import HistorialVentasPage from './modules/ventas/HistorialVentasPage';
import InventarioPage from './modules/inventario/InventarioPage';
import SolicitudesPage from './modules/solicitudes/SolicitudesPage';
import ReportesPage from './modules/reportes/ReportesPage';
import ConfiguracionPage from './modules/configuracion/ConfiguracionPage';
import CajaPage from './modules/caja/CajaPage';
import HistorialCajaPage from './modules/caja/HistorialCajaPage';
import ClientesPage from './modules/clientes/ClientesPage';

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
                <PrivateRoute roles={['Vendedor', 'Administrador', 'Gerente']}>
                  <VentasPage />
                </PrivateRoute>
              }
            />
            <Route
              path="ventas/historial"
              element={
                <PrivateRoute roles={['Administrador', 'Gerente', 'Vendedor']}>
                  <HistorialVentasPage />
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
            <Route
              path="configuracion"
              element={
                <PrivateRoute roles={['Administrador']}>
                  <ConfiguracionPage />
                </PrivateRoute>
              }
            />
            <Route
              path="caja"
              element={
                <PrivateRoute roles={['Vendedor', 'Administrador']}>
                  <CajaPage />
                </PrivateRoute>
              }
            />
            <Route
              path="caja/historial"
              element={
                <PrivateRoute roles={['Administrador', 'Gerente']}>
                  <HistorialCajaPage />
                </PrivateRoute>
              }
            />
            <Route
              path="clientes"
              element={
                <PrivateRoute roles={['Administrador', 'Gerente']}>
                  <ClientesPage />
                </PrivateRoute>
              }
            />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

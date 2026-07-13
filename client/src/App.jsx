import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StockSyncProvider } from './context/StockSyncContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/MainLayout';
import LoginPage from './modules/auth/LoginPage';
import ResetPasswordPage from './modules/auth/ResetPasswordPage';

// Cada página se descarga sola la primera vez que se visita (en vez de que
// las 15 páginas del sistema vayan todas en el mismo bundle inicial) — ver
// Suspense/fallback en MainLayout.jsx, que es quien muestra el spinner
// mientras carga cada una.
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));
const UsuariosPage = lazy(() => import('./modules/usuarios/UsuariosPage'));
const LogsAccesoPage = lazy(() => import('./modules/logs/LogsAccesoPage'));
const CategoriasPage = lazy(() => import('./modules/categorias/CategoriasPage'));
const ProductosPage = lazy(() => import('./modules/productos/ProductosPage'));
const ProveedoresPage = lazy(() => import('./modules/proveedores/ProveedoresPage'));
const VentasPage = lazy(() => import('./modules/ventas/VentasPage'));
const HistorialVentasPage = lazy(() => import('./modules/ventas/HistorialVentasPage'));
const InventarioPage = lazy(() => import('./modules/inventario/InventarioPage'));
const SolicitudesPage = lazy(() => import('./modules/solicitudes/SolicitudesPage'));
const ReportesPage = lazy(() => import('./modules/reportes/ReportesPage'));
const ConfiguracionPage = lazy(() => import('./modules/configuracion/ConfiguracionPage'));
const CajaPage = lazy(() => import('./modules/caja/CajaPage'));
const HistorialCajaPage = lazy(() => import('./modules/caja/HistorialCajaPage'));
const ClientesPage = lazy(() => import('./modules/clientes/ClientesPage'));

function HomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <StockSyncProvider>
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
              path="logs-acceso"
              element={
                <PrivateRoute roles={['Administrador']}>
                  <LogsAccesoPage />
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
      </StockSyncProvider>
    </AuthProvider>
  );
}

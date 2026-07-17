import { useState, useEffect, useRef, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Spinner from './Spinner';
import ConfirmDialog from './ConfirmDialog';
import api from '../utils/axios';
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  Truck,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  BarChart2,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  History,
  UserCheck,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rolSatisface } from '../utils/roles';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Gerente', 'Administrador'] },
  { to: '/usuarios', icon: Users, label: 'Usuarios', roles: ['Administrador'] },
  { to: '/logs-acceso', icon: Fingerprint, label: 'Logs de Acceso', roles: ['Administrador'] },
  { to: '/productos', icon: Package, label: 'Productos', roles: ['Administrador', 'Almacenero'] },
  { to: '/categorias', icon: Tag, label: 'Categorías', roles: ['Administrador', 'Almacenero'] },
  { to: '/proveedores', icon: Truck, label: 'Proveedores', roles: ['Administrador', 'Almacenero'] },
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas', roles: ['Vendedor', 'Administrador', 'Gerente'] },
  { to: '/ventas/historial', icon: Clock, label: 'Historial Ventas', roles: ['Vendedor', 'Administrador', 'Gerente'] },
  { to: '/caja',           icon: Wallet,  label: 'Mi Caja',         roles: ['Vendedor', 'Administrador'] },
  { to: '/caja/historial', icon: History, label: 'Historial Caja',  roles: ['Administrador', 'Gerente'] },
  { to: '/inventario', icon: Warehouse, label: 'Inventario', roles: ['Almacenero', 'Administrador'] },
  { to: '/solicitudes', icon: ClipboardList, label: 'Solicitudes', roles: ['Almacenero', 'Administrador', 'Gerente'] },
  { to: '/clientes', icon: UserCheck, label: 'Clientes', roles: ['Administrador', 'Gerente'] },
  { to: '/reportes', icon: BarChart2, label: 'Reportes', roles: ['Gerente', 'Administrador'] },
  { to: '/configuracion', icon: Settings, label: 'Configuración', roles: ['Administrador'] },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/logs-acceso': 'Logs de Acceso',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/proveedores': 'Proveedores',
  '/ventas': 'Ventas',
  '/ventas/historial': 'Historial de Ventas',
  '/caja':           'Mi Caja',
  '/caja/historial': 'Historial de Caja',
  '/inventario': 'Inventario',
  '/solicitudes': 'Solicitudes',
  '/clientes': 'Clientes',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
};

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [avisoTurnoAbierto, setAvisoTurnoAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  // Ref, no state: un state recién se refleja en el próximo render, así que
  // dos clics disparados en el mismo tick (doble clic real, o Enter
  // repetido) todavía podían colarse los dos antes de que el botón se
  // deshabilitara visualmente — cada uno con su propio POST /auth/logout.
  // El ref se lee/escribe de forma síncrona, así que el segundo clic se
  // corta acá mismo, sin siquiera llegar a hacer la petición de red.
  const saliendoRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const cerrarSesionYSalir = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogout = async () => {
    if (saliendoRef.current) return;
    saliendoRef.current = true;
    setSaliendo(true);
    try {
      // Solo estos roles pueden tener un turno de caja abierto ("Mi Caja" en
      // NAV_ITEMS) — para el resto no tiene sentido ni consultar. Es solo un
      // recordatorio (no bloquea el cierre de sesión): si el cajero se
      // olvidó de cerrar su turno, es mejor avisarle acá que dejarlo abierto
      // sin que nadie se dé cuenta hasta el siguiente arqueo.
      if (['Vendedor', 'Administrador'].includes(usuario?.rol)) {
        try {
          const { data: turno } = await api.get('/caja/activo');
          if (turno) {
            setAvisoTurnoAbierto(true);
            return;
          }
        } catch {
          // Si la consulta falla, no bloquea el cierre de sesión normal.
        }
      }
      await cerrarSesionYSalir();
    } finally {
      saliendoRef.current = false;
      setSaliendo(false);
    }
  };

  const filteredNav = NAV_ITEMS.filter((item) => rolSatisface(usuario?.rol, item.roles));
  const pageTitle = PAGE_TITLES[location.pathname] || '';

  return (
    <div className="flex h-screen">
      <aside
        className={`flex flex-col bg-[#111827] text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-0' : 'gap-2 px-6'}`}>
          <ShoppingCart className="h-6 w-6 text-indigo-400" />
          {!collapsed && <span className="text-lg font-bold">Minimarket</span>}
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#9ca3af] hover:bg-[#1f2937] hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-700 ${collapsed ? 'px-2 py-4' : 'px-6 py-4'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mb-3 flex w-full items-center justify-center rounded-lg px-3 py-2 text-[#9ca3af] transition-colors hover:bg-[#1f2937] hover:text-white"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          {!collapsed && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white">{usuario?.nombre}</p>
              <p className="text-xs text-[#9ca3af]">{usuario?.rol}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={saliendo}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f2937] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-800">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{usuario?.nombre}</span>
            <span className="rounded-full bg-[#6366f1] px-2.5 py-0.5 text-xs font-medium text-white">
              {usuario?.rol}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-6">
          <Suspense fallback={<Spinner texto="Cargando..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ConfirmDialog
        abierto={avisoTurnoAbierto}
        titulo="Tienes un turno de caja abierto"
        mensaje="Todavía no cerraste tu turno en Mi Caja. ¿Seguro que quieres cerrar sesión sin cerrarlo?"
        colorConfirmar="#6366f1"
        onCancelar={() => setAvisoTurnoAbierto(false)}
        onConfirmar={() => {
          if (saliendoRef.current) return;
          saliendoRef.current = true;
          setAvisoTurnoAbierto(false);
          cerrarSesionYSalir();
        }}
      />
    </div>
  );
}

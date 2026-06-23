import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Gerente', 'Administrador'] },
  { to: '/usuarios', icon: Users, label: 'Usuarios', roles: ['Administrador'] },
  { to: '/productos', icon: Package, label: 'Productos', roles: ['Administrador', 'Almacenero'] },
  { to: '/categorias', icon: Tag, label: 'Categorías', roles: ['Administrador', 'Almacenero'] },
  { to: '/proveedores', icon: Truck, label: 'Proveedores', roles: ['Administrador', 'Almacenero'] },
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas', roles: ['Vendedor', 'Administrador', 'Gerente'] },
  { to: '/inventario', icon: Warehouse, label: 'Inventario', roles: ['Almacenero', 'Administrador'] },
  { to: '/solicitudes', icon: ClipboardList, label: 'Solicitudes', roles: ['Almacenero', 'Administrador', 'Gerente'] },
  { to: '/reportes', icon: BarChart2, label: 'Reportes', roles: ['Gerente', 'Administrador'] },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/proveedores': 'Proveedores',
  '/ventas': 'Ventas',
  '/inventario': 'Inventario',
  '/solicitudes': 'Solicitudes',
  '/reportes': 'Reportes',
};

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(usuario?.rol));
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

        <nav className="flex-1 space-y-1 px-3 py-4">
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
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f2937] hover:text-white"
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}

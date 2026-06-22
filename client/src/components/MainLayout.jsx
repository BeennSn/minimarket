import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Gerente', 'Administrador'] },
  { to: '/usuarios', icon: Users, label: 'Usuarios', roles: ['Administrador'] },
  { to: '/productos', icon: Package, label: 'Productos', roles: ['Administrador', 'Almacenero'] },
  { to: '/categorias', icon: Tag, label: 'Categorías', roles: ['Administrador', 'Almacenero'] },
  { to: '/proveedores', icon: Truck, label: 'Proveedores', roles: ['Administrador', 'Almacenero'] },
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas', roles: ['Vendedor', 'Administrador'] },
  { to: '/inventario', icon: Warehouse, label: 'Inventario', roles: ['Almacenero', 'Administrador'] },
  { to: '/solicitudes', icon: ClipboardList, label: 'Solicitudes', roles: ['Almacenero', 'Administrador', 'Gerente'] },
  { to: '/reportes', icon: BarChart2, label: 'Reportes', roles: ['Gerente', 'Administrador'] },
];

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(usuario?.rol));

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col bg-[#111827] text-white">
        <div className="flex items-center gap-2 px-6 py-5">
          <ShoppingCart className="h-6 w-6 text-indigo-400" />
          <span className="text-lg font-bold">Minimarket</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#9ca3af] hover:bg-[#1f2937] hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 px-6 py-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{usuario?.nombre}</p>
            <p className="text-xs text-[#9ca3af]">{usuario?.rol}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#9ca3af] transition-colors hover:bg-[#1f2937] hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-6">
        <Outlet />
      </main>
    </div>
  );
}

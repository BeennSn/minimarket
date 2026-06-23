import { useState, useEffect } from 'react';
import { Pencil, UserX, UserCheck, Plus, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const ROL_BADGE = {
  Administrador: 'bg-purple-100 text-purple-700',
  Vendedor: 'bg-green-100 text-green-800',
  Almacenero: 'bg-blue-100 text-blue-800',
  Gerente: 'bg-amber-100 text-amber-800',
};

function ModalUsuario({ abierto, onCerrar, onGuardar, usuarioEditando }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('Vendedor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const esCreacion = !usuarioEditando;

  useEffect(() => {
    if (abierto) {
      if (usuarioEditando) {
        setNombre(usuarioEditando.nombre || '');
        setEmail(usuarioEditando.email || '');
        setRol(usuarioEditando.rol || 'Vendedor');
        setPassword('');
      } else {
        setNombre('');
        setEmail('');
        setPassword('');
        setRol('Vendedor');
      }
      setError('');
    }
  }, [abierto, usuarioEditando]);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { nombre, email, rol };
      if (esCreacion) payload.password = password;

      if (esCreacion) {
        await api.post('/usuarios', payload);
      } else {
        await api.put(`/usuarios/${usuarioEditando.id}`, payload);
      }
      onGuardar();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {esCreacion ? 'Nuevo Usuario' : 'Editar Usuario'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {esCreacion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Vendedor">Vendedor</option>
              <option value="Administrador">Administrador</option>
              <option value="Almacenero">Almacenero</option>
              <option value="Gerente">Gerente</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { usuario: currentUser } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [confirmarEstado, setConfirmarEstado] = useState(null);

  const cargarUsuarios = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const abrirCrear = () => {
    setUsuarioEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (u) => {
    setUsuarioEditando(u);
    setModalAbierto(true);
  };

  const handleGuardar = () => {
    setModalAbierto(false);
    setUsuarioEditando(null);
    cargarUsuarios();
  };

  const esActivo = (u) => u.activo === true || u.activo == null;

  const toggleEstado = async () => {
    if (!confirmarEstado) return;
    const u = confirmarEstado;
    const activo = esActivo(u);
    const accion = activo ? 'desactivar' : 'reactivar';
    setConfirmarEstado(null);
    try {
      await api.patch(`/usuarios/${u.id}/${accion}`);
      mostrarExito(`Usuario ${accion}do correctamente`);
      cargarUsuarios();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || `Error al ${accion} usuario`);
    }
  };

  const filtrados = usuarios.filter((u) => {
    if (filtroRol !== 'Todos' && u.rol !== filtroRol) return false;
    if (filtroEstado !== 'Todos') {
      if (filtroEstado === 'Activo' && !esActivo(u)) return false;
      if (filtroEstado === 'Inactivo' && esActivo(u)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Usuarios' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Todos los roles</option>
          <option value="Administrador">Administrador</option>
          <option value="Vendedor">Vendedor</option>
          <option value="Almacenero">Almacenero</option>
          <option value="Gerente">Gerente</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>

      {loading ? (
        <Spinner texto="Cargando usuarios..." />
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay usuarios registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ROL_BADGE[u.rol] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        esActivo(u)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {esActivo(u) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="rounded-lg p-1.5 text-[#6366f1] transition-colors hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {currentUser?.id !== u.id && (
                        <button
                          onClick={() => setConfirmarEstado(u)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            esActivo(u)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={esActivo(u) ? 'Desactivar' : 'Reactivar'}
                        >
                          {esActivo(u) ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalUsuario
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setUsuarioEditando(null); }}
        onGuardar={handleGuardar}
        usuarioEditando={usuarioEditando}
      />

      <ConfirmDialog
        abierto={!!confirmarEstado}
        titulo={confirmarEstado ? `${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} usuario` : ''}
        mensaje={confirmarEstado ? `¿Deseas ${esActivo(confirmarEstado) ? 'desactivar' : 'reactivar'} a ${confirmarEstado.nombre}?` : ''}
        onConfirmar={toggleEstado}
        onCancelar={() => setConfirmarEstado(null)}
        colorConfirmar={confirmarEstado && esActivo(confirmarEstado) ? '#ef4444' : '#10b981'}
      />
    </div>
  );
}

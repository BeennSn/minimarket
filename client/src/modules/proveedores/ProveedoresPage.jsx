import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, UserX, UserCheck, X } from 'lucide-react';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import useToast from '../../hooks/useToast';

function ModalProveedor({ abierto, onCerrar, onGuardar, proveedorEditando }) {
  const [nombre, setNombre] = useState('');
  const [ruc, setRuc] = useState('');
  const [contacto, setContacto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorRuc, setErrorRuc] = useState('');
  const esCreacion = !proveedorEditando;

  useEffect(() => {
    if (abierto) {
      if (proveedorEditando) {
        setNombre(proveedorEditando.nombre || '');
        setRuc(proveedorEditando.ruc || '');
        setContacto(proveedorEditando.contacto || '');
      } else {
        setNombre('');
        setRuc('');
        setContacto('');
      }
      setError('');
      setErrorRuc('');
    }
  }, [abierto, proveedorEditando]);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorRuc('');

    if (ruc.length !== 11) {
      setErrorRuc('Debe tener exactamente 11 dígitos');
      return;
    }

    setLoading(true);

    try {
      const payload = { nombre, ruc, contacto };
      if (esCreacion) {
        await api.post('/proveedores', payload);
      } else {
        await api.put(`/proveedores/${proveedorEditando.id}`, payload);
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
            {esCreacion ? 'Nuevo Proveedor' : 'Editar Proveedor'}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">RUC</label>
            <input
              type="text"
              maxLength={11}
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="00000000000"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {errorRuc && (
              <p className="mt-1 text-xs text-red-500">{errorRuc}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contacto</label>
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Teléfono o email de contacto"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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

export default function ProveedoresPage() {
  const { usuario } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [confirmarEstado, setConfirmarEstado] = useState(null);

  const cargarProveedores = async () => {
    try {
      const { data } = await api.get('/proveedores');
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarProveedores(); }, []);

  const abrirCrear = () => { setProveedorEditando(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setProveedorEditando(p); setModalAbierto(true); };

  const handleGuardar = () => {
    setModalAbierto(false);
    setProveedorEditando(null);
    cargarProveedores();
  };

  const esActivo = (p) => p.activo === true || p.activo == null;

  const toggleEstado = async () => {
    if (!confirmarEstado) return;
    const p = confirmarEstado;
    const activo = esActivo(p);
    const accion = activo ? 'desactivar' : 'reactivar';
    setConfirmarEstado(null);
    try {
      await api.patch(`/proveedores/${p.id}/${accion}`);
      mostrarExito(`Proveedor ${accion}do correctamente`);
      cargarProveedores();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || `Error al ${accion} proveedor`);
    }
  };

  const filtrados = proveedores.filter((p) => {
    const coincideTexto =
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.ruc?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado =
      filtroEstado === 'Todos' ||
      (filtroEstado === 'Activo' && esActivo(p)) ||
      (filtroEstado === 'Inactivo' && !esActivo(p));
    return coincideTexto && coincideEstado;
  });

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Proveedores' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RUC..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

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
        <Spinner texto="Cargando proveedores..." />
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay proveedores registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">RUC</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.ruc}</td>
                  <td className="px-4 py-3">
                    {p.contacto ? (
                      <span className="text-gray-500">{p.contacto}</span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        esActivo(p)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {esActivo(p) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="rounded-lg p-1.5 text-[#6366f1] transition-colors hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {usuario?.rol === 'Administrador' && (
                        <button
                          onClick={() => setConfirmarEstado(p)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            esActivo(p)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={esActivo(p) ? 'Desactivar' : 'Reactivar'}
                        >
                          {esActivo(p) ? (
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

      <ModalProveedor
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setProveedorEditando(null); }}
        onGuardar={handleGuardar}
        proveedorEditando={proveedorEditando}
      />

      <ConfirmDialog
        abierto={!!confirmarEstado}
        titulo={confirmarEstado ? `${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} proveedor` : ''}
        mensaje={confirmarEstado ? `¿Deseas ${esActivo(confirmarEstado) ? 'desactivar' : 'reactivar'} a ${confirmarEstado.nombre}?` : ''}
        onConfirmar={toggleEstado}
        onCancelar={() => setConfirmarEstado(null)}
        colorConfirmar={confirmarEstado && esActivo(confirmarEstado) ? '#ef4444' : '#10b981'}
      />
    </div>
  );
}

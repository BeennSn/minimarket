import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

function ModalCategoria({ abierto, onCerrar, onGuardar, categoriaEditando }) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const esCreacion = !categoriaEditando;

  useEffect(() => {
    if (abierto) {
      setNombre(categoriaEditando?.nombre || '');
      setError('');
    }
  }, [abierto, categoriaEditando]);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (esCreacion) {
        await api.post('/categorias', { nombre });
      } else {
        await api.put(`/categorias/${categoriaEditando.id}`, { nombre });
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
            {esCreacion ? 'Nueva Categoría' : 'Editar Categoría'}
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

export default function CategoriasPage() {
  const { usuario } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/categorias');
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarCategorias(); }, []);

  const abrirCrear = () => { setCategoriaEditando(null); setModalAbierto(true); };
  const abrirEditar = (c) => { setCategoriaEditando(c); setModalAbierto(true); };

  const handleGuardar = () => {
    setModalAbierto(false);
    setCategoriaEditando(null);
    cargarCategorias();
  };

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const c = confirmarEliminar;
    setConfirmarEliminar(null);
    try {
      await api.delete(`/categorias/${c.id}`);
      mostrarExito('Categoría eliminada correctamente');
      cargarCategorias();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al eliminar');
    }
  };

  const filtradas = categorias.filter((c) =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Categorías' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Categorías</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar categoría..."
          className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {loading ? (
        <Spinner texto="Cargando categorías..." />
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtradas.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay categorías registradas
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-500">{c.id}</td>
                  <td className="px-4 py-3 text-gray-800">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="rounded-lg p-1.5 text-[#6366f1] transition-colors hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {usuario?.rol === 'Administrador' && (
                        <button
                          onClick={() => setConfirmarEliminar(c)}
                          className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <ModalCategoria
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setCategoriaEditando(null); }}
        onGuardar={handleGuardar}
        categoriaEditando={categoriaEditando}
      />

      <ConfirmDialog
        abierto={!!confirmarEliminar}
        titulo="Eliminar categoría"
        mensaje={confirmarEliminar ? `¿Eliminar categoría "${confirmarEliminar.nombre}"?` : ''}
        onConfirmar={handleEliminar}
        onCancelar={() => setConfirmarEliminar(null)}
      />
    </div>
  );
}

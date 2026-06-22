import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, EyeOff, Eye, Loader2, X } from 'lucide-react';
import api from '../../utils/axios';

function ModalProducto({ abierto, onCerrar, onGuardar, productoEditando, categorias }) {
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const esCreacion = !productoEditando;

  useEffect(() => {
    if (abierto) {
      if (productoEditando) {
        setNombre(productoEditando.nombre || '');
        setMarca(productoEditando.marca || '');
        setCategoriaId(productoEditando.categoria?.id ?? productoEditando.categoria_id ?? productoEditando.categoriaId ?? '');
        setPrecio(productoEditando.precio ?? '');
        setStock(productoEditando.stock ?? '');
      } else {
        setNombre('');
        setMarca('');
        setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
        setPrecio('');
        setStock('');
      }
      setError('');
    }
  }, [abierto, productoEditando, categorias]);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { nombre, marca, categoria_id: categoriaId, precio: parseFloat(precio) };
      if (esCreacion) payload.stock = parseInt(stock, 10) || 0;

      if (esCreacion) {
        await api.post('/productos', payload);
      } else {
        await api.put(`/productos/${productoEditando.id}`, payload);
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
            {esCreacion ? 'Nuevo Producto' : 'Editar Producto'}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S./</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {esCreacion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

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
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [resProductos, resCategorias] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
      ]);
      setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
      setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const abrirCrear = () => { setProductoEditando(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setProductoEditando(p); setModalAbierto(true); };

  const handleGuardar = () => {
    setModalAbierto(false);
    setProductoEditando(null);
    cargarDatos();
  };

  const esActivo = (p) => p.activo === true || p.activo == null;

  const toggleEstado = async (p) => {
    const activo = esActivo(p);
    const accion = activo ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿${activo ? 'Desactivar' : 'Reactivar'} producto "${p.nombre}"?`)) return;

    try {
      await api.patch(`/productos/${p.id}/${accion}`);
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.mensaje || `Error al ${accion} producto`);
    }
  };

  const filtrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase());
    const prodCategoriaId = p.categoria?.id ?? p.categoria_id;
    const coincideCategoria =
      filtroCategoria === 'Todas' || String(prodCategoriaId) === String(filtroCategoria);
    const coincideEstado =
      filtroEstado === 'Todos' ||
      (filtroEstado === 'Activo' && esActivo(p)) ||
      (filtroEstado === 'Inactivo' && !esActivo(p));
    return coincideTexto && coincideCategoria && coincideEstado;
  });

  const stockColor = (stock) => {
    if (stock === 0) return 'bg-red-100';
    if (stock <= 5) return 'bg-amber-100';
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay productos registrados
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`${stockColor(p.stock)} ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.categoria?.nombre || categorias.find((c) => String(c.id) === String(p.categoria?.id))?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">S./ {Number(p.precio).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.stock} und(s)</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          esActivo(p)
                            ? 'bg-green-100 text-green-700'
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
                        <button
                          onClick={() => toggleEstado(p)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            esActivo(p)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={esActivo(p) ? 'Desactivar' : 'Reactivar'}
                        >
                          {esActivo(p) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-200" />
              Sin stock
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 border border-amber-200" />
              Stock crítico (≤5)
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-white border border-gray-300" />
              Stock normal
            </div>
          </div>
        </>
      )}

      <ModalProducto
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setProductoEditando(null); }}
        onGuardar={handleGuardar}
        productoEditando={productoEditando}
        categorias={categorias}
      />
    </div>
  );
}

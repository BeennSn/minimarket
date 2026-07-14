import { useState, useEffect } from 'react';
import { Search, Mail, Edit2, X, Check, Users } from 'lucide-react';
import api from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';
import { rolSatisface } from '../../utils/roles';

export default function ClientesPage() {
  const { usuario } = useAuth();
  // El backend (PUT /clientes/:id) solo permite editar a Administrador —
  // antes el botón aparecía para cualquiera que llegara a esta página
  // (ej. Gerente) y el guardado fallaba con 403 recién al intentar guardar.
  const puedeEditar = rolSatisface(usuario?.rol, ['Administrador']);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [emailEdit, setEmailEdit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = () => {
    setCargando(true);
    api.get('/clientes')
      .then(({ data }) => setClientes(data))
      .catch(() => setError('Error al cargar clientes'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.dni && c.dni.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const abrirEdicion = (cliente) => {
    setEditando(cliente.id);
    setEmailEdit(cliente.email || '');
    setError('');
    setExito('');
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEmailEdit('');
  };

  const guardarEmail = async (id) => {
    if (emailEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEdit)) {
      setError('Formato de email inválido');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const { data } = await api.put(`/clientes/${id}`, { email: emailEdit });
      setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, email: data.email } : c)));
      setEditando(null);
      setExito('Email actualizado');
      setTimeout(() => setExito(''), 3000);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al actualizar email');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          <span className="text-sm text-gray-500">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados
          </span>
        </div>
        {exito && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            {exito}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                DNI
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Compras
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                  {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados aún'}
                </td>
              </tr>
            ) : (
              filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.dni ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs">
                        {c.dni}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {editando === c.id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Mail className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={emailEdit}
                            onChange={(e) => setEmailEdit(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarEmail(c.id);
                              if (e.key === 'Escape') cancelarEdicion();
                            }}
                            autoFocus
                            placeholder="correo@ejemplo.com"
                            className="rounded border border-indigo-300 py-1 pl-7 pr-2 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => guardarEmail(c.id)}
                          disabled={guardando}
                          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                          title="Guardar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={c.email ? 'text-gray-600' : 'text-gray-300'}>
                        {c.email || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                      {c.total_compras}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editando !== c.id && puedeEditar && (
                      <button
                        onClick={() => abrirEdicion(c)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                        title="Editar email"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Los clientes se registran automáticamente al procesar boletas con DNI. El email es opcional
        y se puede editar desde aquí.
      </p>
    </div>
  );
}

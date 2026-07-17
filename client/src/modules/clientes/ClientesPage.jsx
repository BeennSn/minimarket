import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import api from '../../utils/axios';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

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
    return c.nombre.toLowerCase().includes(q) || (c.dni && c.dni.includes(q));
  });

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-indigo-500" />
        <span className="text-sm text-gray-500">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados
        </span>
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
          placeholder="Buscar por nombre o DNI…"
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
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Compras
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-gray-400">
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
                  <td className="px-4 py-3 text-center text-sm">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                      {c.total_compras}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Los clientes se registran automáticamente al procesar boletas con DNI.
      </p>
    </div>
  );
}

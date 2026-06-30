import { useState, useEffect } from 'react';
import { Settings, Search, Loader2 } from 'lucide-react';
import api from '../../utils/axios';

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    nombre_empresa: '',
    ruc: '',
    direccion: '',
    telefono: '',
    igv: '',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/configuracion')
      .then(({ data }) => {
        setForm({
          nombre_empresa: data.nombre_empresa,
          ruc: data.ruc,
          direccion: data.direccion,
          telefono: data.telefono,
          igv: String(data.igv),
        });
      })
      .catch(() => setError('Error al cargar la configuración'))
      .finally(() => setCargando(false));
  }, []);

  const cambiar = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setExito('');
    setError('');
  };

  const buscarRuc = async () => {
    if (!/^\d{11}$/.test(form.ruc)) return;
    setBuscandoRuc(true);
    setError('');
    setExito('');
    try {
      const { data } = await api.get(`/consulta/ruc/${form.ruc}`);
      setForm((f) => ({
        ...f,
        nombre_empresa: data.razon_social || f.nombre_empresa,
        direccion: data.direccion || f.direccion,
      }));
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se encontró información para ese RUC');
    } finally {
      setBuscandoRuc(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!/^\d{11}$/.test(form.ruc)) {
      return setError('El RUC debe tener exactamente 11 dígitos');
    }

    const igvNum = Number(form.igv);
    if (!Number.isFinite(igvNum) || igvNum < 0 || igvNum > 100) {
      return setError('El IGV debe ser un número entre 0 y 100');
    }

    setGuardando(true);
    try {
      await api.put('/configuracion', { ...form, igv: igvNum });
      setExito('Configuración guardada correctamente');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-6 w-6 text-indigo-500" />
        <h1 className="text-xl font-bold text-gray-800">Datos del Negocio</h1>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-sm text-gray-500">
          Estos datos aparecen en las boletas y facturas generadas por el sistema.
          Actualízalos con la información real del negocio antes de salir a producción.
        </p>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre de la empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre_empresa"
              value={form.nombre_empresa}
              onChange={cambiar}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              RUC <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="ruc"
                value={form.ruc}
                onChange={(e) =>
                  cambiar({ target: { name: 'ruc', value: e.target.value.replace(/\D/g, '').slice(0, 11) } })
                }
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarRuc())}
                maxLength={11}
                required
                placeholder="20123456789"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={buscarRuc}
                disabled={form.ruc.length !== 11 || buscandoRuc}
                title="Consultar SUNAT"
                className="rounded-lg bg-indigo-500 px-3 py-2 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              >
                {buscandoRuc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {form.ruc.length > 0 && form.ruc.length < 11 && (
              <p className="mt-1 text-xs text-red-500">El RUC debe tener 11 dígitos</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={cambiar}
              required
              placeholder="Av. Ejemplo 123, Trujillo"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={form.telefono}
              onChange={cambiar}
              placeholder="044-123456"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              IGV (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="igv"
              value={form.igv}
              onChange={cambiar}
              min={0}
              max={100}
              step={1}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="mt-1 text-xs text-gray-400">Actualmente en Perú: 18%</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          {exito && (
            <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">{exito}</div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-[#6366f1] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

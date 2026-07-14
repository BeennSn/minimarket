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
    serie_boleta: '',
    serie_factura: '',
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
          serie_boleta: data.serie_boleta || 'B001',
          serie_factura: data.serie_factura || 'F001',
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
    if (!/^20\d{9}$/.test(form.ruc)) return;
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

    if (!/^20\d{9}$/.test(form.ruc)) {
      return setError('El RUC debe tener 11 dígitos y empezar con 20 (persona jurídica)');
    }

    const igvNum = Number(form.igv);
    if (!Number.isFinite(igvNum) || igvNum < 0 || igvNum > 100) {
      return setError('El IGV debe ser un número entre 0 y 100');
    }

    const serieRegex = /^[A-Z]\d{3}$/;
    if (!serieRegex.test(form.serie_boleta.toUpperCase())) {
      return setError('La serie de boleta debe tener el formato: 1 letra + 3 dígitos (ej. B001)');
    }
    if (!serieRegex.test(form.serie_factura.toUpperCase())) {
      return setError('La serie de factura debe tener el formato: 1 letra + 3 dígitos (ej. F001)');
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
                disabled={!/^20\d{9}$/.test(form.ruc) || buscandoRuc}
                title="Consultar SUNAT"
                className="rounded-lg bg-indigo-500 px-3 py-2 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              >
                {buscandoRuc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {form.ruc.length > 0 && form.ruc.length < 11 && (
              <p className="mt-1 text-xs text-red-500">El RUC debe tener 11 dígitos</p>
            )}
            {form.ruc.length === 11 && !form.ruc.startsWith('20') && (
              <p className="mt-1 text-xs text-red-500">El RUC debe empezar con 20 (persona jurídica): estos son datos de una empresa, no de una persona natural</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Serie de boleta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serie_boleta"
                value={form.serie_boleta}
                onChange={(e) =>
                  cambiar({ target: { name: 'serie_boleta', value: e.target.value.toUpperCase().slice(0, 4) } })
                }
                maxLength={4}
                required
                placeholder="B001"
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Serie de factura <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serie_factura"
                value={form.serie_factura}
                onChange={(e) =>
                  cambiar({ target: { name: 'serie_factura', value: e.target.value.toUpperCase().slice(0, 4) } })
                }
                maxLength={4}
                required
                placeholder="F001"
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <p className="-mt-3 text-xs text-gray-400">Formato SUNAT: 1 letra + 3 dígitos. Se usan para numerar boletas y facturas (ej. B001-00000023).</p>

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

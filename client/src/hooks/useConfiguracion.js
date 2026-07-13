import { useState, useEffect } from 'react';
import api from '../utils/axios';

const DEFAULT_EMPRESA = {
  nombre: 'EMPRESA DE PRUEBA',
  ruc: '99999999999',
  direccion: 'Av. Prueba 000, Ciudad',
  telefono: '000-000000',
  serieBoleta: 'B001',
  serieFactura: 'F001',
};

export function useConfiguracion() {
  const [empresa, setEmpresa] = useState(DEFAULT_EMPRESA);
  const [igv, setIgv] = useState(0.18);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/configuracion')
      .then(({ data }) => {
        setEmpresa({
          nombre: data.nombre_empresa,
          ruc: data.ruc,
          direccion: data.direccion,
          telefono: data.telefono,
          serieBoleta: data.serie_boleta || DEFAULT_EMPRESA.serieBoleta,
          serieFactura: data.serie_factura || DEFAULT_EMPRESA.serieFactura,
        });
        setIgv(data.igv / 100);
      })
      .catch(() => {
        // mantiene valores por defecto si el endpoint falla
      })
      .finally(() => setCargando(false));
  }, []);

  return { empresa, igv, cargando };
}

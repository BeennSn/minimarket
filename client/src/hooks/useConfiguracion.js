import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';

const DEFAULT_EMPRESA = {
  nombre: 'EMPRESA DE PRUEBA',
  ruc: '99999999999',
  direccion: 'Av. Prueba 000, Ciudad',
  telefono: '000-000000',
  serieBoleta: 'B001',
  serieFactura: 'F001',
};

// Evento disparado por ConfiguracionPage.jsx al guardar cambios exitosamente,
// para que cualquier otra pantalla con useConfiguracion ya montada (ej. una
// pestaña de Ventas abierta desde antes) se actualice sola — mismo patrón
// liviano (evento del navegador, sin websockets ni servicios externos) que ya
// usa StockSyncContext para sincronizar el stock entre pantallas.
const EVENTO_CONFIGURACION_ACTUALIZADA = 'minimarket-configuracion-actualizada';

export function notificarConfiguracionActualizada() {
  window.dispatchEvent(new Event(EVENTO_CONFIGURACION_ACTUALIZADA));
}

export function useConfiguracion() {
  const [empresa, setEmpresa] = useState(DEFAULT_EMPRESA);
  const [igv, setIgv] = useState(0.18);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
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
        // mantiene los valores previos si el endpoint falla
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_CONFIGURACION_ACTUALIZADA, cargar);
    return () => window.removeEventListener(EVENTO_CONFIGURACION_ACTUALIZADA, cargar);
  }, [cargar]);

  return { empresa, igv, cargando };
}

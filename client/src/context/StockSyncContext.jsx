import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const StockSyncContext = createContext(null);

const CANAL_STOCK = 'minimarket-stock-sync';
// Respaldo entre pestañas/dispositivos que no comparten BroadcastChannel
// (navegadores distintos, celular del vendedor, etc). No es instantáneo,
// pero garantiza que ningún escenario se quede desactualizado por mucho tiempo.
const INTERVALO_SONDEO = 15000;

/**
 * Sincroniza cambios de stock entre pantallas sin backend adicional (sin
 * websockets ni servicios externos, ver decisión con el usuario):
 * - BroadcastChannel: instantáneo entre pestañas del mismo navegador.
 * - Sondeo periódico: respaldo entre dispositivos/navegadores distintos.
 * - Refetch al volver a la pestaña (focus/visibilitychange): instantáneo al
 *   volver a mirar la pantalla tras una venta/movimiento hecho en otro lado.
 */
export function StockSyncProvider({ children }) {
  const [stockVersion, setStockVersion] = useState(0);
  const canalRef = useRef(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const canal = new BroadcastChannel(CANAL_STOCK);
    canalRef.current = canal;
    canal.onmessage = () => setStockVersion((v) => v + 1);
    return () => canal.close();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => setStockVersion((v) => v + 1), INTERVALO_SONDEO);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const alVolverAlFrente = () => {
      if (document.visibilityState === 'visible') setStockVersion((v) => v + 1);
    };
    document.addEventListener('visibilitychange', alVolverAlFrente);
    window.addEventListener('focus', alVolverAlFrente);
    return () => {
      document.removeEventListener('visibilitychange', alVolverAlFrente);
      window.removeEventListener('focus', alVolverAlFrente);
    };
  }, []);

  const notificarCambioStock = useCallback(() => {
    setStockVersion((v) => v + 1);
    canalRef.current?.postMessage('stock-actualizado');
  }, []);

  return (
    <StockSyncContext.Provider value={{ stockVersion, notificarCambioStock }}>
      {children}
    </StockSyncContext.Provider>
  );
}

export function useStockSync() {
  const context = useContext(StockSyncContext);
  if (!context) {
    throw new Error('useStockSync debe usarse dentro de StockSyncProvider');
  }
  return context;
}

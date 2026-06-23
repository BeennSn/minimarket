import { useState, useCallback } from 'react';

export default function useToast() {
  const [toast, setToast] = useState({ mensaje: '', tipo: 'info', visible: false });

  const mostrarExito = useCallback((mensaje) => {
    setToast({ mensaje, tipo: 'exito', visible: true });
  }, []);

  const mostrarError = useCallback((mensaje) => {
    setToast({ mensaje, tipo: 'error', visible: true });
  }, []);

  const mostrarInfo = useCallback((mensaje) => {
    setToast({ mensaje, tipo: 'info', visible: true });
  }, []);

  const cerrar = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, mostrarExito, mostrarError, mostrarInfo, cerrar };
}

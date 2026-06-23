import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const TIPO_CONFIG = {
  exito: {
    icono: CheckCircle,
    bg: 'bg-[#d1fae5]',
    border: 'border-[#10b981]',
    text: 'text-[#065f46]',
  },
  error: {
    icono: XCircle,
    bg: 'bg-[#fee2e2]',
    border: 'border-[#ef4444]',
    text: 'text-[#991b1b]',
  },
  info: {
    icono: Info,
    bg: 'bg-[#dbeafe]',
    border: 'border-[#3b82f6]',
    text: 'text-[#1e40af]',
  },
};

export default function Toast({ mensaje, tipo = 'info', visible, onCerrar }) {
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.info;
  const Icono = config.icono;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => onCerrar(), 3000);
    return () => clearTimeout(timer);
  }, [visible, onCerrar]);

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      } ${config.bg} ${config.border}`}
    >
      <Icono className={`h-5 w-5 ${config.text}`} />
      <span className={`text-sm font-medium ${config.text}`}>{mensaje}</span>
      <button onClick={onCerrar} className={`ml-2 ${config.text} hover:opacity-70`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

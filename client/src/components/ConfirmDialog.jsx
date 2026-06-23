import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ abierto, titulo, mensaje, onConfirmar, onCancelar, colorConfirmar }) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancelar}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
        </div>
        <h3 className="mb-2 text-center font-semibold text-gray-800">{titulo}</h3>
        <p className="mb-6 text-center text-sm text-gray-500">{mensaje}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancelar}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="rounded-lg px-4 py-2 text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: colorConfirmar || '#ef4444' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

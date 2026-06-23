import { Loader2 } from 'lucide-react';

export default function Spinner({ texto, fullscreen }) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366f1] border-t-transparent" />
          {texto && <span className="text-sm text-gray-500">{texto}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366f1] border-t-transparent" />
        {texto && <span className="text-sm text-gray-400">{texto}</span>}
      </div>
    </div>
  );
}

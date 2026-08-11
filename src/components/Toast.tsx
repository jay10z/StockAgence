import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastState {
  message: string;
  type: ToastType;
}

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-start gap-3 max-w-md w-full px-4 py-4 rounded-2xl shadow-xl text-white ${
          isSuccess ? 'bg-emerald-600' : 'bg-red-600'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-7 h-7 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-7 h-7 shrink-0 mt-0.5" />
        )}
        <p className="flex-1 text-base font-semibold leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/20 shrink-0"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

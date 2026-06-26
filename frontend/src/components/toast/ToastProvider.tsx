import { useEffect, useState } from 'react';
import { CheckCircleFilled } from '@ant-design/icons';
import { registerToastDispatcher, type SuccessToastInput } from '../../utils/toast';

interface ToastItem {
  id: string;
  title: string;
  text: string;
  phase: 'entering' | 'visible' | 'exiting';
}

const VISIBLE_MS = 2500;
const ANIMATION_MS = 300;

interface ToastProviderProps {
  children: React.ReactNode;
}

/** Global provider for sliding success toast notifications. */
export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    registerToastDispatcher((input: SuccessToastInput) => {
      const options = typeof input === 'string' ? { text: input } : input;
      const id = crypto.randomUUID();
      const item: ToastItem = {
        id,
        title: options.title ?? 'Sucesso!',
        text: options.text,
        phase: 'entering',
      };

      setToasts((prev) => [...prev, item]);

      requestAnimationFrame(() => {
        setToasts((prev) =>
          prev.map((toast) => (toast.id === id ? { ...toast, phase: 'visible' } : toast))
        );
      });

      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) => (toast.id === id ? { ...toast, phase: 'exiting' } : toast))
        );

        window.setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, ANIMATION_MS);
      }, VISIBLE_MS);
    });

    return () => registerToastDispatcher(null);
  }, []);

  return (
    <>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-green-200/80 bg-white p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out ${
              toast.phase === 'visible'
                ? 'translate-x-0 opacity-100'
                : 'translate-x-[120%] opacity-0'
            }`}
          >
            <CheckCircleFilled className="mt-0.5 shrink-0 text-xl text-green-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              <p className="text-sm text-gray-600">{toast.text}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

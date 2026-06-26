export interface SuccessToastOptions {
  title?: string;
  text: string;
}

export type SuccessToastInput = string | SuccessToastOptions;

type ToastDispatcher = ((input: SuccessToastInput) => void) | null;

let dispatchSuccessToast: ToastDispatcher = null;

/** Registers the toast renderer (called by ToastProvider on mount). */
export function registerToastDispatcher(fn: ToastDispatcher): void {
  dispatchSuccessToast = fn;
}

/** Shows a sliding success toast card (no SweetAlert). */
export function showSuccessToast(input: SuccessToastInput): void {
  dispatchSuccessToast?.(input);
}

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

/** Primary action button that fills its container. */
export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-11 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled text input with optional hint and error message. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, id, className = '', ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`h-11 rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground ${
            error ? 'border-red-500' : 'border-black/15 dark:border-white/20'
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-black/50 dark:text-white/50">{hint}</p>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  },
);

/** Inline error banner for form-level failures. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {children}
    </div>
  );
}

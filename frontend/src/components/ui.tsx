import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

type ButtonVariant = 'primary' | 'secondary';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-foreground text-background hover:opacity-90',
  secondary:
    'border border-black/15 hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = true,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

const fieldClass = (error?: string) =>
  `rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground ${
    error ? 'border-red-500' : 'border-black/15 dark:border-white/20'
  }`;

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-black/50 dark:text-white/50">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
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
      <FieldShell label={label} htmlFor={inputId} error={error} hint={hint}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`h-11 ${fieldClass(error)} ${className}`}
          {...props}
        />
      </FieldShell>
    );
  },
);

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled multi-line input. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, hint, id, className = '', ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <FieldShell label={label} htmlFor={inputId} error={error} hint={hint}>
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`min-h-24 py-2 ${fieldClass(error)} ${className}`}
          {...props}
        />
      </FieldShell>
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

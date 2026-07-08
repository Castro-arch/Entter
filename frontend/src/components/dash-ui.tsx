'use client';

import Link from 'next/link';
import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type DragEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ApiError } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────
// Design-system primitives for the organizer dashboard, derived from the
// "Entter Dashboard v2" reference design: #131215 canvas, #1C1B1F panels,
// #26231F chips, #F5F2EE text, #8E8A84 muted, #F0561D accent, Hanken
// Grotesk, 10–18px radii. The public/auth pages keep `components/ui.tsx`;
// everything under /dashboard should build on these instead.
// ─────────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'light';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[#F0561D] text-[#131215] hover:bg-[#FF6A31]',
  secondary:
    'border border-white/10 bg-[#1C1B1F] text-[#F5F2EE] hover:bg-[#26231F]',
  light: 'bg-[#F5F2EE] text-[#131215] hover:bg-white',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? 'w-full' : ''
      } ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

const fieldClass = (error?: string) =>
  `rounded-[10px] border bg-[#1C1B1F] px-3.5 text-sm text-[#F5F2EE] outline-none transition-colors placeholder:text-[#8E8A84] focus:border-[#F0561D] ${
    error ? 'border-[#E8604A]' : 'border-white/10'
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
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#F5F2EE]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[#8E8A84]">{hint}</p>}
      {error && <p className="text-xs text-[#E8604A]">{error}</p>}
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

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled native select, styled to match the text inputs. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, hint, id, className = '', children, ...props }, ref) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <FieldShell label={label} htmlFor={selectId} error={error} hint={hint}>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={`h-11 appearance-none ${fieldClass(error)} ${className}`}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);

/** Inline error banner for form-level failures. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-[#E8604A]/40 bg-[#E8604A]/10 px-3.5 py-2.5 text-sm text-[#F0A9A0]"
    >
      {children}
    </div>
  );
}

/** Outlined card on the page canvas — the dashboard's stat-card treatment. */
export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[14px] border border-white/10 ${className}`}>
      {children}
    </div>
  );
}

/** Raised surface (#1C1B1F) — the dashboard's side-panel treatment. */
export function Panel({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[18px] border border-white/[.06] bg-[#1C1B1F] ${className}`}
    >
      {children}
    </div>
  );
}

/** Small uppercase tracked section label, e.g. "TOTAL DE INSCRITOS". */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#F5F2EE]">
      {children}
    </div>
  );
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'accent';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'text-[#8E8A84]',
  success: 'text-[#9BC98E]',
  warning: 'text-[#E8B44A]',
  accent: 'text-[#F0561D]',
};

const badgeDots: Record<BadgeTone, string> = {
  neutral: 'bg-[#8E8A84]',
  success: 'bg-[#7CB668]',
  warning: 'bg-[#E8B44A]',
  accent: 'bg-[#F0561D]',
};

/** Status pill with a coloured dot, matching the "AO VIVO" chip. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#26231F] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] ${badgeTones[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${badgeDots[tone]}`} />
      {children}
    </span>
  );
}

/** Dashed placeholder block for empty lists and not-yet-built features. */
export function EmptyState({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-white/15 px-6 py-12 text-center">
      {title && <p className="text-sm font-bold text-[#F5F2EE]">{title}</p>}
      <div className={`mx-auto max-w-md text-sm leading-relaxed text-[#8E8A84] ${title ? 'mt-2' : ''}`}>
        {children}
      </div>
    </div>
  );
}

/** Muted "← Voltar" link used at the top of sub-pages. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] text-[#8E8A84] transition-colors hover:text-[#F5F2EE]"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-[10px] bg-[#26231F] ${className}`} />
  );
}

/** Thin progress bar — same treatment as the dashboard's revenue goal bar. */
export function ProgressBar({
  value,
  className = '',
}: {
  /** 0–100; values outside the range are clamped. */
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-[#26231F] ${className}`}>
      <div
        className="h-full rounded-full bg-[#F0561D] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Copies `value` to the clipboard and flashes a "Copiado ✓" confirmation. */
export function CopyButton({
  value,
  label = 'Copiar link',
  className = '',
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-white/10 bg-[#26231F] px-3 text-xs font-bold transition-colors ${
        copied ? 'text-[#9BC98E]' : 'text-[#F5F2EE] hover:bg-[#2E2A25]'
      } ${className}`}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 7" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 012-2h10" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export interface FileDropzoneProps {
  label: string;
  /** MIME types accepted by the file picker, e.g. "image/png,image/jpeg". */
  accept: string;
  /** Human-readable version of `accept`, shown in the empty-state hint. */
  acceptHint: string;
  maxSizeBytes: number;
  /** URL already on file (from a previous upload), if any. */
  currentUrl?: string | null;
  /** Renders the current file as a thumbnail rather than a generic file row. */
  previewAsImage?: boolean;
  onUpload: (file: File) => Promise<{ url: string }>;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
}

/** Drag-and-drop / click-to-browse upload target. Replaces the old
 * paste-a-URL pattern for credential artwork and certificate templates —
 * the backend still stores (and validates) a URL, it's just one the
 * organizer no longer has to host themselves. */
export function FileDropzone({
  label,
  accept,
  acceptHint,
  maxSizeBytes,
  currentUrl,
  previewAsImage = false,
  onUpload,
  onUploaded,
  onRemove,
}: FileDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > maxSizeBytes) {
      setError(`Arquivo muito grande. Máximo de ${formatBytes(maxSizeBytes)}.`);
      return;
    }
    setUploading(true);
    try {
      const { url } = await onUpload(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  const input = (
    <input
      id={inputId}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(event) => {
        void handleFiles(event.target.files);
        event.target.value = '';
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#F5F2EE]">{label}</span>
      {input}

      {currentUrl ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-[#1C1B1F] p-3">
          {previewAsImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded/external URL, not a static asset
            <img src={currentUrl} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] bg-[#26231F]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8A84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold text-[#F5F2EE]">
              {uploading ? 'Enviando novo arquivo…' : 'Arquivo enviado'}
            </span>
            <span className="truncate text-[12px] text-[#8E8A84]">{currentUrl}</span>
          </div>
          <label
            htmlFor={inputId}
            className="shrink-0 cursor-pointer rounded-[8px] border border-white/10 bg-[#26231F] px-3 py-1.5 text-xs font-bold text-[#F5F2EE] transition-colors hover:bg-[#2E2A25]"
          >
            Trocar
          </label>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded-[8px] px-2 py-1.5 text-xs font-bold text-[#8E8A84] transition-colors hover:text-[#E8604A]"
            >
              Remover
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? 'border-[#F0561D] bg-[#F0561D]/5' : 'border-white/15 hover:border-white/25 hover:bg-[#1C1B1F]'
          }`}
        >
          {uploading ? (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#F0561D]" />
              <span className="text-[13px] font-semibold text-[#F5F2EE]">Enviando…</span>
            </>
          ) : (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#26231F]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                  <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                </svg>
              </span>
              <span className="text-[13px] font-semibold text-[#F5F2EE]">
                Arraste um arquivo aqui ou <span className="text-[#F0561D]">clique para enviar</span>
              </span>
              <span className="text-xs text-[#8E8A84]">
                {acceptHint} · até {formatBytes(maxSizeBytes)}
              </span>
            </>
          )}
        </label>
      )}

      {error && <p className="text-xs text-[#E8604A]">{error}</p>}
    </div>
  );
}

/** Small on/off switch, e.g. for per-area permission toggles. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-[#F0561D]' : 'bg-[#26231F]'
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-[#F5F2EE] transition-transform ${
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional count rendered as a muted suffix, e.g. "Pendentes 12". */
  count?: number;
}

/** Pill-style segmented control for filters and mode switches. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
              active
                ? 'bg-[#F5F2EE] text-[#131215]'
                : 'border border-white/10 bg-[#1C1B1F] text-[#8E8A84] hover:text-[#F5F2EE]'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`ml-1.5 ${active ? 'text-[#131215]/60' : 'text-[#8E8A84]/70'}`}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact metric card: uppercase label, big number, optional footnote. */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-white/10 px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
        {label}
      </div>
      <div className="text-2xl font-extrabold tabular-nums tracking-[-0.5px] text-[#F5F2EE]">
        {value}
      </div>
      {sub && <div className="text-[12px] text-[#8E8A84]">{sub}</div>}
    </div>
  );
}

/** Page title row: optional back link + title/subtitle on the left, actions on the right. */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {backHref && <BackLink href={backHref}>{backLabel ?? 'Voltar'}</BackLink>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[26px] font-extrabold tracking-[-0.4px] text-[#F5F2EE]">
            {title}
          </h1>
          {subtitle && <p className="text-[13px] text-[#8E8A84]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

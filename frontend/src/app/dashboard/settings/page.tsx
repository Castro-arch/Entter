'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  FileDropzone,
  Panel,
  PageHeader,
  SectionLabel,
  Skeleton,
  TextField,
  Toggle,
} from '@/components/dash-ui';
import { useAuth } from '@/lib/auth/auth-context';
import {
  ApiError,
  teamApi,
  tenantApi,
  uploadsApi,
  type Permissions,
  type TeamMember,
  type TenantProfile,
} from '@/lib/api';

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 7 11 7a20.29 20.29 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);

const PERMISSION_ROWS: { key: keyof Permissions; label: string }[] = [
  { key: 'canCheckIn', label: 'Check-in' },
  { key: 'canCertificates', label: 'Certificados' },
  { key: 'canFinanceiro', label: 'Financeiro' },
  { key: 'canEventos', label: 'Eventos' },
];

function PermissionsMenu({
  member,
  onChange,
}: {
  member: TeamMember;
  onChange: (updated: TeamMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<keyof Permissions | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function toggle(key: keyof Permissions, value: boolean) {
    setPending(key);
    try {
      onChange(await teamApi.updatePermissions(member.id, { [key]: value }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Permissões de ${member.name}`}
        className="rounded-[8px] p-1.5 text-[#8E8A84] transition-colors hover:bg-[#26231F] hover:text-[#F5F2EE]"
      >
        <GearIcon />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-10 flex w-56 flex-col gap-1 rounded-[14px] border border-white/10 bg-[#1C1B1F] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        >
          <p className="px-1 pb-1 text-xs font-bold uppercase tracking-[0.06em] text-[#8E8A84]">
            Acesso de {member.name}
          </p>
          {PERMISSION_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 rounded-[9px] px-1 py-1.5">
              <span className="text-sm text-[#F5F2EE]">{row.label}</span>
              <Toggle
                checked={member[row.key]}
                disabled={pending === row.key}
                onChange={(value) => toggle(row.key, value)}
                label={row.label}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    tenantApi
      .get()
      .then(setTenant)
      .catch((err) => {
        setTenantError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar os dados da organização.',
        );
      });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader title="Configurações" subtitle="Sua conta e preferências do organizador" />

      <section className="flex flex-col gap-3">
        <SectionLabel>Conta</SectionLabel>
        <Panel className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              Nome
            </span>
            <span className="font-semibold text-[#F5F2EE]">{user?.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              E-mail
            </span>
            <span className="truncate font-semibold text-[#F5F2EE]">{user?.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              Papel
            </span>
            <span className="font-semibold text-[#F5F2EE]">{user?.role}</span>
          </div>
        </Panel>
      </section>

      <TeamSection isOwner={isOwner} />
      <AsaasSection isOwner={isOwner} tenant={tenant} tenantError={tenantError} onUpdate={setTenant} />
      <BrandSection isOwner={isOwner} tenant={tenant} tenantError={tenantError} onUpdate={setTenant} />
    </div>
  );
}

function TeamSection({ isOwner }: { isOwner: boolean }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    teamApi
      .list()
      .then(setMembers)
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : 'Não foi possível carregar a equipe.');
      });
  }, []);

  async function handleInvite() {
    setInviteError(null);
    setInviting(true);
    try {
      const { user: invited, temporaryPassword } = await teamApi.invite({
        name: name.trim(),
        email: email.trim(),
      });
      setMembers((current) => (current ? [...current, invited] : [invited]));
      setTempPassword({ email: invited.email, password: temporaryPassword });
      setPasswordVisible(false);
      setName('');
      setEmail('');
      setShowInvite(false);
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'Não foi possível convidar.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!window.confirm(`Remover ${member.name} da equipe?`)) return;
    try {
      await teamApi.remove(member.id);
      setMembers((current) => current?.filter((m) => m.id !== member.id) ?? null);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Não foi possível remover.');
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Equipe</SectionLabel>
        {isOwner && (
          <Button variant="secondary" onClick={() => setShowInvite((v) => !v)}>
            {showInvite ? 'Cancelar' : 'Convidar'}
          </Button>
        )}
      </div>

      {tempPassword && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-[#F0561D]/40 bg-[#F0561D]/10 px-4 py-3.5 text-sm text-[#F5F2EE]">
          <span>
            Senha temporária para <strong>{tempPassword.email}</strong> — mostrada apenas
            agora, repasse manualmente para a pessoa convidada:
          </span>
          <div className="flex items-center gap-2">
            <code className="rounded-[8px] bg-black/20 px-2.5 py-1.5 text-sm tracking-wide">
              {passwordVisible ? tempPassword.password : '•'.repeat(tempPassword.password.length)}
            </code>
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? 'Esconder senha' : 'Mostrar senha'}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-[#26231F] text-[#F5F2EE] transition-colors hover:bg-[#2E2A25]"
            >
              <EyeIcon open={passwordVisible} />
            </button>
            <CopyButton value={tempPassword.password} label="Copiar senha" />
          </div>
        </div>
      )}

      {isOwner && showInvite && (
        <Panel className="flex flex-col gap-3 p-5">
          {inviteError && <Alert>{inviteError}</Alert>}
          <TextField
            label="Nome"
            placeholder="Nome do convidado"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={inviting || !name.trim() || !email.trim()}>
            {inviting ? 'Convidando…' : 'Convidar'}
          </Button>
        </Panel>
      )}

      <Panel className="flex flex-col divide-y divide-white/[.06] p-2">
        {listError && (
          <div className="p-3">
            <Alert>{listError}</Alert>
          </div>
        )}
        {members === null && !listError && (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {members?.length === 0 && (
          <p className="p-4 text-sm text-[#8E8A84]">Só você por enquanto.</p>
        )}
        {members?.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-[#F5F2EE]">
                {member.name}
              </span>
              <span className="truncate text-xs text-[#8E8A84]">{member.email}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={member.role === 'OWNER' ? 'accent' : 'neutral'}>
                {member.role === 'OWNER' ? 'Dono' : 'Staff'}
              </Badge>
              {isOwner && member.role === 'STAFF' && (
                <PermissionsMenu
                  member={member}
                  onChange={(updated) =>
                    setMembers((current) =>
                      current?.map((m) => (m.id === updated.id ? updated : m)) ?? null,
                    )
                  }
                />
              )}
              {isOwner && member.role === 'STAFF' && (
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  className="rounded-[8px] px-2 py-1 text-xs font-bold text-[#8E8A84] transition-colors hover:text-[#E8604A]"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </Panel>
    </section>
  );
}

interface TenantSectionProps {
  isOwner: boolean;
  tenant: TenantProfile | null;
  tenantError: string | null;
  onUpdate: (tenant: TenantProfile) => void;
}

function AsaasSection({ isOwner, tenant, tenantError, onUpdate }: TenantSectionProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConnect() {
    setError(null);
    setSubmitting(true);
    try {
      onUpdate(await tenantApi.connectAsaas(apiKey.trim()));
      setApiKey('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conectar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setSubmitting(true);
    try {
      onUpdate(await tenantApi.disconnectAsaas());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Conexão Asaas</SectionLabel>
      <Panel className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-[#8E8A84]">
          Conecte sua própria conta Asaas para que a receita dos ingressos caia direto nela,
          em vez de acumular na conta única da plataforma.
        </p>
        {tenantError && <Alert>{tenantError}</Alert>}
        {!tenantError && tenant?.asaasConnected && (
          <div className="flex items-center justify-between">
            <Badge tone="success">Conectado</Badge>
            {isOwner && (
              <Button variant="secondary" onClick={handleDisconnect} disabled={submitting}>
                {submitting ? 'Desconectando…' : 'Desconectar'}
              </Button>
            )}
          </div>
        )}
        {!tenantError && tenant && !tenant.asaasConnected && isOwner && (
          <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}
            <TextField
              label="Chave de API da Asaas"
              type="password"
              placeholder="Cole sua chave de API"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button onClick={handleConnect} disabled={submitting || apiKey.trim().length < 10}>
              {submitting ? 'Conectando…' : 'Conectar'}
            </Button>
          </div>
        )}
        {!tenantError && tenant && !tenant.asaasConnected && !isOwner && (
          <Badge tone="neutral">Não conectado</Badge>
        )}
        {!tenantError && !tenant && (
          <Skeleton className="h-11" />
        )}
      </Panel>
    </section>
  );
}

function BrandSection({ isOwner, tenant, tenantError, onUpdate }: TenantSectionProps) {
  const [subdomain, setSubdomain] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setSubdomain(tenant.subdomain);
    setLogoUrl(tenant.logoUrl);
  }, [tenant]);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      onUpdate(
        await tenantApi.update({
          subdomain: subdomain.trim() !== tenant?.subdomain ? subdomain.trim() : undefined,
          logoUrl: logoUrl !== tenant?.logoUrl ? (logoUrl ?? undefined) : undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOwner) {
    return (
      <section className="flex flex-col gap-3">
        <SectionLabel>Subdomínio & marca</SectionLabel>
        <Panel className="flex flex-col gap-1 p-5 text-sm">
          {tenantError && <Alert>{tenantError}</Alert>}
          {!tenantError && (
            <span className="text-[#8E8A84]">
              Subdomínio:{' '}
              <strong className="text-[#F5F2EE]">{tenant?.subdomain ?? '—'}</strong>
            </span>
          )}
        </Panel>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Subdomínio & marca</SectionLabel>
      <Panel className="flex flex-col gap-4 p-5">
        {tenantError && <Alert>{tenantError}</Alert>}
        {error && <Alert>{error}</Alert>}
        {!tenant && !tenantError ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <TextField
              label="Subdomínio"
              placeholder="minha-empresa"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              hint="Usado na página pública do seu evento."
            />
            <FileDropzone
              label="Logo"
              accept="image/png,image/jpeg,image/webp"
              acceptHint="PNG, JPG ou WEBP"
              maxSizeBytes={4 * 1024 * 1024}
              currentUrl={logoUrl}
              previewAsImage
              onUpload={(file) => uploadsApi.tenantLogo(file)}
              onUploaded={setLogoUrl}
              onRemove={() => setLogoUrl(null)}
            />
            <Button onClick={handleSave} disabled={submitting || !subdomain.trim()}>
              {submitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        )}
      </Panel>
    </section>
  );
}

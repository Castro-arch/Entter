'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  PageHeader,
  Panel,
  SectionLabel,
  Skeleton,
  StatCard,
  TextArea,
  TextField,
} from '@/components/dash-ui';
import {
  ApiError,
  attendanceApi,
  eventsApi,
  participantsApi,
  type DaySummary,
  type EventEntity,
  type EventStatus,
  type Participant,
} from '@/lib/api';

const statusBadges: Record<EventStatus, { label: string; tone: 'neutral' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Rascunho', tone: 'warning' },
  PUBLISHED: { label: 'Publicado', tone: 'success' },
  FINISHED: { label: 'Encerrado', tone: 'neutral' },
};

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const PARTICIPANTS_PAGE = 30;

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [summary, setSummary] = useState<DaySummary[] | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [statusError, setStatusError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setName(data.name);
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o evento'),
      );
    // Stats and the guest list are progressive enhancements — the page still
    // works if either call fails, so errors are silently ignored here.
    participantsApi.list(eventId).then(setParticipants).catch(() => setParticipants([]));
    attendanceApi.summary(eventId).then(setSummary).catch(() => setSummary([]));
  }, [eventId]);

  // The two-step "Encerrar" confirmation resets itself if the organizer
  // doesn't confirm within a few seconds.
  useEffect(() => {
    if (!confirmingEnd) return;
    const handle = setTimeout(() => setConfirmingEnd(false), 4000);
    return () => clearTimeout(handle);
  }, [confirmingEnd]);

  async function handleSave(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await eventsApi.update(eventId, {
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      });
      setEvent(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: EventStatus) {
    setStatusError(null);
    setChangingStatus(true);
    setConfirmingEnd(false);
    try {
      setEvent(await eventsApi.update(eventId, { status }));
    } catch (err) {
      setStatusError(
        err instanceof ApiError ? err.message : 'Não foi possível alterar o status do evento',
      );
    } finally {
      setChangingStatus(false);
    }
  }

  const totalPresent = useMemo(
    () => summary?.reduce((sum, day) => sum + day.present, 0) ?? null,
    [summary],
  );

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[92px]" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const badge = statusBadges[event.status];
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/events/${event.id}` : '';
  const ticketsAvailable = event.ticketTypes.reduce(
    (sum, ticket) => sum + ticket.quantityAvailable,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
        title={event.name}
        subtitle={<Badge tone={badge.tone}>{badge.label}</Badge>}
        backHref="/dashboard/events"
        backLabel="Voltar para eventos"
        actions={
          <>
            {event.status === 'DRAFT' && (
              <Button onClick={() => changeStatus('PUBLISHED')} disabled={changingStatus}>
                {changingStatus ? 'Publicando…' : 'Publicar evento'}
              </Button>
            )}
            {event.status === 'PUBLISHED' &&
              (confirmingEnd ? (
                <Button
                  variant="light"
                  onClick={() => changeStatus('FINISHED')}
                  disabled={changingStatus}
                >
                  {changingStatus ? 'Encerrando…' : 'Confirmar encerramento?'}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setConfirmingEnd(true)}>
                  Encerrar evento
                </Button>
              ))}
            {event.status === 'FINISHED' && (
              <Button
                variant="secondary"
                onClick={() => changeStatus('PUBLISHED')}
                disabled={changingStatus}
              >
                {changingStatus ? 'Reabrindo…' : 'Reabrir evento'}
              </Button>
            )}
          </>
        }
      />

      {statusError && <Alert>{statusError}</Alert>}

      {/* ── Stats (Luma-style overview) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Inscritos"
          value={participants === null ? '…' : participants.length}
          sub={
            participants?.some((p) => p.willNotAttend)
              ? `${participants.filter((p) => p.willNotAttend).length} não comparecerão`
              : undefined
          }
        />
        <StatCard label="Check-ins" value={totalPresent === null ? '…' : totalPresent} />
        <StatCard
          label="Dias"
          value={event.eventDays.length}
          sub={event.eventDays.length >= 2 ? 'QR habilitado' : 'chamada manual'}
        />
        <StatCard
          label="Ingressos"
          value={ticketsAvailable}
          sub={`${event.ticketTypes.length} tipo${event.ticketTypes.length === 1 ? '' : 's'} à venda`}
        />
      </div>

      {/* ── Share link (only meaningful once published) ── */}
      {event.status === 'PUBLISHED' && publicUrl && (
        <Panel className="flex flex-wrap items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#26231F]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
            </svg>
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-bold text-[#F5F2EE]">Página de inscrição</span>
            <span className="truncate text-[12.5px] text-[#8E8A84]">{publicUrl}</span>
          </div>
          <CopyButton value={publicUrl} />
          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/10 bg-[#26231F] px-3 text-xs font-bold text-[#F5F2EE] transition-colors hover:bg-[#2E2A25]"
          >
            Abrir
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </Link>
        </Panel>
      )}

      {/* ── Quick navigation to the event tools ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ToolCard
          href={`/dashboard/events/${event.id}/check-in`}
          title="Check-in"
          description="Escaneie QR codes ou marque presença manualmente"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
              <path d="M15 15h3v3h-3zM21 15v.01M15 21h.01M18 18h.01M21 21h.01" />
            </svg>
          }
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/credential`}
          title="Credenciais"
          description="Posicione o nome do participante na arte"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 3v3h6V3M9 12h6M9 16h4" />
            </svg>
          }
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/certificate`}
          title="Certificados"
          description="Configure o template e o envio pós-evento"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="6" />
              <path d="M8.5 15L7 22l5-3 5 3-1.5-7" />
            </svg>
          }
        />
      </div>

      {/* ── Editable details ── */}
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <SectionLabel>Detalhes</SectionLabel>
        {saveError && <Alert>{saveError}</Alert>}
        <TextField
          label="Nome do evento"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextArea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Local"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
          {saved && <span className="text-sm text-[#9BC98E]">Salvo ✓</span>}
        </div>
      </form>

      {/* ── Schedule & tickets ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Programação &amp; ingressos</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex flex-col gap-2 p-4 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              Dias
            </span>
            <ul className="flex flex-col gap-1.5">
              {event.eventDays.map((day) => (
                <li key={day.id} className="flex items-center gap-2 text-[#F5F2EE]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0561D]" />
                  {dateFormat.format(new Date(day.date))}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-2 p-4 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              Tipos de ingresso
            </span>
            {event.ticketTypes.length === 0 ? (
              <span className="text-[#8E8A84]">Nenhum</span>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {event.ticketTypes.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[#F5F2EE]">{ticket.name}</span>
                    <span className="shrink-0 text-[12.5px] text-[#8E8A84]">
                      {ticket.price} · {ticket.quantityAvailable} restantes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <ParticipantsSection
        eventId={eventId}
        eventDayCount={event.eventDays.length}
        participants={participants}
        onChange={setParticipants}
      />
    </div>
  );
}

function ToolCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2.5 rounded-[14px] border border-white/10 p-4 transition-colors hover:border-white/25 hover:bg-[#1C1B1F]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#26231F]">{icon}</span>
        <svg
          className="text-[#8E8A84] transition-colors group-hover:text-[#F5F2EE]"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-[#F5F2EE]">{title}</span>
        <span className="text-[12.5px] leading-snug text-[#8E8A84]">{description}</span>
      </div>
    </Link>
  );
}

/** Luma-style guest list: search, per-day presence, and the "will not
 * attend" flag that the API already supported but the UI never exposed. */
function ParticipantsSection({
  eventId,
  eventDayCount,
  participants,
  onChange,
}: {
  eventId: string;
  eventDayCount: number;
  participants: Participant[] | null;
  onChange: (participants: Participant[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PARTICIPANTS_PAGE);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!participants) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.order.buyerEmail.toLowerCase().includes(needle),
    );
  }, [participants, query]);

  async function toggleWillNotAttend(participant: Participant) {
    setTogglingId(participant.id);
    setError(null);
    try {
      await attendanceApi.setWillNotAttend(eventId, participant.id, !participant.willNotAttend);
      onChange(
        (participants ?? []).map((p) =>
          p.id === participant.id ? { ...p, willNotAttend: !p.willNotAttend } : p,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível atualizar o participante',
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>
          Participantes{participants !== null && ` · ${participants.length}`}
        </SectionLabel>
        {participants !== null && participants.length > 0 && (
          <div className="flex h-9 w-full max-w-[240px] items-center gap-2 rounded-full border border-white/10 bg-[#1C1B1F] px-3.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8E8A84" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PARTICIPANTS_PAGE);
              }}
              className="w-full bg-transparent text-[13px] text-[#F5F2EE] outline-none placeholder:text-[#8E8A84]"
            />
          </div>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {participants === null && <Skeleton className="h-32 w-full" />}

      {participants?.length === 0 && (
        <EmptyStateInline>
          Nenhum inscrito ainda. Compartilhe a página de inscrição para começar a vender.
        </EmptyStateInline>
      )}

      {filtered.length === 0 && participants !== null && participants.length > 0 && (
        <EmptyStateInline>Nenhum participante corresponde à busca.</EmptyStateInline>
      )}

      {filtered.length > 0 && (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, visible).map((p) => {
            const presentDays = p.attendance.filter((a) => a.status === 'PRESENT').length;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-4 rounded-[12px] border border-white/10 bg-[#1C1B1F] px-4 py-3 ${
                  p.willNotAttend ? 'opacity-60' : ''
                }`}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-[#F5F2EE]">{p.name}</span>
                  <span className="truncate text-[12.5px] text-[#8E8A84]">
                    {p.order.buyerEmail}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {p.willNotAttend ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#E8B44A]">
                      Não comparecerá
                    </span>
                  ) : (
                    <span
                      className={`text-[12.5px] font-semibold ${
                        presentDays > 0 ? 'text-[#9BC98E]' : 'text-[#8E8A84]'
                      }`}
                    >
                      {presentDays}/{eventDayCount} {eventDayCount === 1 ? 'dia' : 'dias'}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={togglingId === p.id}
                    onClick={() => toggleWillNotAttend(p)}
                    className="rounded-[8px] border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-[#8E8A84] transition-colors hover:bg-[#26231F] hover:text-[#F5F2EE] disabled:opacity-50"
                  >
                    {p.willNotAttend ? 'Reativar' : 'Não vai?'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > visible && (
        <Button
          variant="secondary"
          className="self-center"
          onClick={() => setVisible((v) => v + PARTICIPANTS_PAGE)}
        >
          Mostrar mais ({filtered.length - visible} restantes)
        </Button>
      )}
    </section>
  );
}

function EmptyStateInline({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-white/15 px-6 py-8 text-center text-sm text-[#8E8A84]">
      {children}
    </div>
  );
}

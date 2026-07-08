'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  FileDropzone,
  PageHeader,
  ProgressBar,
  SectionLabel,
  SegmentedControl,
  SelectField,
  Skeleton,
  TextField,
} from '@/components/dash-ui';
import {
  ApiError,
  certificatesApi,
  eventsApi,
  participantsApi,
  uploadsApi,
  type CertificateDispatchMode,
  type EventEntity,
  type Participant,
} from '@/lib/api';

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [templateUrl, setTemplateUrl] = useState('');
  const [dispatchMode, setDispatchMode] = useState<CertificateDispatchMode>('MANUAL');
  const [autoDelayHours, setAutoDelayHours] = useState('24');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SENT'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setTemplateUrl(data.certificateTemplateUrl ?? '');
        setDispatchMode(data.certificateDispatchMode);
        setAutoDelayHours(String(data.certificateAutoDelayHours ?? 24));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o evento'),
      );
  }, [eventId]);

  const loadParticipants = useCallback(() => {
    participantsApi
      .list(eventId)
      .then(setParticipants)
      .catch((err) =>
        setParticipantsError(
          err instanceof ApiError ? err.message : 'Não foi possível carregar os participantes',
        ),
      );
  }, [eventId]);

  useEffect(loadParticipants, [loadParticipants]);

  async function handleSave(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await eventsApi.updateCertificate(eventId, {
        templateUrl: templateUrl.trim() || undefined,
        dispatchMode,
        autoDelayHours: Number(autoDelayHours) || 0,
      });
      setEvent(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações',
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendOne(participantId: string) {
    setSendingId(participantId);
    setNotice(null);
    try {
      await certificatesApi.sendOne(eventId, participantId);
      setNotice('Certificado na fila de envio.');
      // Optimistic: the queue delivers async, but for the organizer the job
      // is done — reflect it immediately in the progress and filters.
      setParticipants((prev) =>
        prev?.map((p) =>
          p.id === participantId ? { ...p, certificateSentAt: new Date().toISOString() } : p,
        ) ?? prev,
      );
    } catch (err) {
      setParticipantsError(
        err instanceof ApiError ? err.message : 'Não foi possível enfileirar o certificado',
      );
    } finally {
      setSendingId(null);
    }
  }

  async function sendAll() {
    setSendingAll(true);
    setNotice(null);
    try {
      const { queued } = await certificatesApi.sendAll(eventId);
      setNotice(`${queued} certificado${queued === 1 ? '' : 's'} na fila de envio.`);
      loadParticipants();
    } catch (err) {
      setParticipantsError(
        err instanceof ApiError ? err.message : 'Não foi possível enfileirar os certificados',
      );
    } finally {
      setSendingAll(false);
    }
  }

  const sentCount = useMemo(
    () => participants?.filter((p) => p.certificateSentAt).length ?? 0,
    [participants],
  );

  const filtered = useMemo(() => {
    if (!participants) return [];
    const needle = query.trim().toLowerCase();
    return participants.filter((p) => {
      if (filter === 'PENDING' && p.certificateSentAt) return false;
      if (filter === 'SENT' && !p.certificateSentAt) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.order.buyerEmail.toLowerCase().includes(needle)
      );
    });
  }, [participants, filter, query]);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
        title="Certificados"
        subtitle={event.name}
        backHref={`/dashboard/events/${event.id}`}
        backLabel="Voltar para o evento"
      />

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <SectionLabel>Template</SectionLabel>
          <p className="text-sm text-[#8E8A84]">
            PDF que os participantes recebem após o evento. O nome é impresso
            centralizado na página.
          </p>
        </div>
        {saveError && <Alert>{saveError}</Alert>}
        <FileDropzone
          label="Template (PDF)"
          accept="application/pdf"
          acceptHint="PDF"
          maxSizeBytes={15 * 1024 * 1024}
          currentUrl={templateUrl || null}
          onUpload={(file) => uploadsApi.certificateTemplate(file)}
          onUploaded={(url) => {
            setSaved(false);
            setTemplateUrl(url);
          }}
          onRemove={() => {
            setSaved(false);
            setTemplateUrl('');
          }}
        />
        <SelectField
          label="Envio"
          value={dispatchMode}
          onChange={(e) => setDispatchMode(e.target.value as CertificateDispatchMode)}
        >
          <option value="MANUAL">Manual — envie pela lista abaixo</option>
          <option value="AUTO">Automático — após o fim do evento</option>
        </SelectField>
        {dispatchMode === 'AUTO' && (
          <TextField
            label="Atraso após o último dia (horas)"
            type="number"
            min={0}
            value={autoDelayHours}
            onChange={(e) => setAutoDelayHours(e.target.value)}
          />
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </Button>
          {saved && <span className="text-sm text-[#9BC98E]">Salvo ✓</span>}
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>Participantes</SectionLabel>
          <Button variant="light" disabled={sendingAll} onClick={sendAll}>
            {sendingAll ? 'Enfileirando…' : 'Enviar todos os certificados'}
          </Button>
        </div>

        {participants && participants.length > 0 && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-white/10 p-4">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-[#8E8A84]">
                <span className="font-bold text-[#F5F2EE]">{sentCount}</span> de{' '}
                <span className="font-bold text-[#F5F2EE]">{participants.length}</span>{' '}
                certificados enviados
              </span>
              <span className="font-bold tabular-nums text-[#F5F2EE]">
                {Math.round((sentCount / participants.length) * 100)}%
              </span>
            </div>
            <ProgressBar value={(sentCount / participants.length) * 100} />
          </div>
        )}

        {participantsError && <Alert>{participantsError}</Alert>}
        {notice && <p className="text-sm text-[#9BC98E]">{notice}</p>}

        {!participants && <Skeleton className="h-40 w-full" />}

        {participants?.length === 0 && (
          <EmptyState>Nenhum participante ainda.</EmptyState>
        )}

        {participants && participants.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<'ALL' | 'PENDING' | 'SENT'>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'Todos', count: participants.length },
                { value: 'PENDING', label: 'Pendentes', count: participants.length - sentCount },
                { value: 'SENT', label: 'Enviados', count: sentCount },
              ]}
            />
            <div className="flex h-9 w-full max-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-[#1C1B1F] px-3.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8E8A84" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-[13px] text-[#F5F2EE] outline-none placeholder:text-[#8E8A84]"
              />
            </div>
          </div>
        )}

        {participants && participants.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-[#8E8A84]">
            Nenhum participante corresponde à busca ou ao filtro.
          </p>
        )}

        {filtered.length > 0 && (
          <ul className="flex flex-col gap-2">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-[12px] border border-white/10 bg-[#1C1B1F] px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-[#F5F2EE]">{p.name}</span>
                  <span className="truncate text-[12.5px] text-[#8E8A84]">
                    {p.order.buyerEmail}
                    {p.willNotAttend && ' · não vai comparecer'}
                  </span>
                </div>
                {p.certificateSentAt ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#9BC98E]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l5 5L20 7" />
                    </svg>
                    Enviado
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-8 shrink-0 px-3 text-xs"
                    disabled={sendingId === p.id || p.willNotAttend}
                    onClick={() => sendOne(p.id)}
                  >
                    {sendingId === p.id ? 'Enfileirando…' : 'Enviar certificado'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

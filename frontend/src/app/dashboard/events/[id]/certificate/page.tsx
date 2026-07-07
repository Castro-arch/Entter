'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '@/components/ui';
import {
  ApiError,
  certificatesApi,
  eventsApi,
  participantsApi,
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
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load event'),
      );
  }, [eventId]);

  const loadParticipants = useCallback(() => {
    participantsApi
      .list(eventId)
      .then(setParticipants)
      .catch((err) =>
        setParticipantsError(
          err instanceof ApiError ? err.message : 'Failed to load participants',
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
        err instanceof ApiError ? err.message : 'Failed to save certificate settings',
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
      setNotice('Certificate queued.');
    } catch (err) {
      setParticipantsError(
        err instanceof ApiError ? err.message : 'Failed to queue certificate',
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
      setNotice(`${queued} certificate${queued === 1 ? '' : 's'} queued.`);
    } catch (err) {
      setParticipantsError(
        err instanceof ApiError ? err.message : 'Failed to queue certificates',
      );
    } finally {
      setSendingAll(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Certificates — {event.name}</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Template</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            PDF template attendees receive after the event. The name is printed
            centered on the page.
          </p>
        </div>
        {saveError && <Alert>{saveError}</Alert>}
        <TextField
          label="Template URL (PDF)"
          placeholder="https://…"
          value={templateUrl}
          onChange={(e) => setTemplateUrl(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Dispatch</span>
          <select
            className="h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none focus:border-foreground dark:border-white/20"
            value={dispatchMode}
            onChange={(e) => setDispatchMode(e.target.value as CertificateDispatchMode)}
          >
            <option value="MANUAL">Manual — send from the list below</option>
            <option value="AUTO">Automatic — after the event ends</option>
          </select>
        </label>
        {dispatchMode === 'AUTO' && (
          <TextField
            label="Delay after the last day (hours)"
            type="number"
            min={0}
            value={autoDelayHours}
            onChange={(e) => setAutoDelayHours(e.target.value)}
          />
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" fullWidth={false} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
          )}
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Participants</h2>
          <Button fullWidth={false} disabled={sendingAll} onClick={sendAll}>
            {sendingAll ? 'Queuing…' : 'Send all certificates'}
          </Button>
        </div>

        {participantsError && <Alert>{participantsError}</Alert>}
        {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

        {!participants && (
          <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
        )}

        {participants?.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 px-6 py-8 text-center dark:border-white/15">
            <p className="text-sm text-black/60 dark:text-white/60">No participants yet.</p>
          </div>
        )}

        {participants && participants.length > 0 && (
          <ul className="flex flex-col gap-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-black/50 dark:text-white/50">
                    {p.order.buyerEmail}
                    {p.willNotAttend && ' · will not attend'}
                  </span>
                </div>
                {p.certificateSentAt ? (
                  <span className="text-sm text-green-600 dark:text-green-400">✓ Sent</span>
                ) : (
                  <Button
                    fullWidth={false}
                    disabled={sendingId === p.id || p.willNotAttend}
                    onClick={() => sendOne(p.id)}
                  >
                    {sendingId === p.id ? 'Queuing…' : 'Send certificate'}
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

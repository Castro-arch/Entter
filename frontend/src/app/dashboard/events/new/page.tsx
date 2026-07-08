'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, PageHeader, TextArea, TextField } from '@/components/dash-ui';
import { ApiError, eventsApi, type CreateEventInput } from '@/lib/api';

const STEPS = ['Detalhes', 'Datas', 'Ingressos', 'Revisão'] as const;

interface TicketDraft {
  name: string;
  price: string;
  quantityAvailable: string;
  saleEndsAt: string;
}

const emptyTicket: TicketDraft = {
  name: '',
  price: '',
  quantityAvailable: '',
  saleEndsAt: '',
};

/** Mirrors the backend's `@IsUrl()` check closely enough to catch typos
 * before the final submit, instead of a confusing error on step 4. */
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [days, setDays] = useState<string[]>(['']);
  const [tickets, setTickets] = useState<TicketDraft[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filledDays = days.filter((day) => day.trim() !== '');

  /** Returns an error message for the current step, or null when it's valid. */
  function validateStep(): string | null {
    if (step === 0 && name.trim().length < 2) {
      return 'Dê um nome ao evento (pelo menos 2 caracteres).';
    }
    if (step === 0 && coverImageUrl.trim() && !isValidHttpUrl(coverImageUrl.trim())) {
      return 'A URL da imagem de capa precisa ser um link http(s) válido (ex.: https://exemplo.com/imagem.jpg), ou ficar em branco.';
    }
    if (step === 1 && filledDays.length === 0) {
      return 'Adicione pelo menos uma data para o evento.';
    }
    if (step === 2) {
      for (const ticket of tickets) {
        if (ticket.name.trim() === '') return 'Todo tipo de ingresso precisa de um nome.';
        if (Number(ticket.price) < 0 || ticket.price === '') {
          return 'Todo tipo de ingresso precisa de um preço (0 ou mais).';
        }
        if (Number(ticket.quantityAvailable) < 0 || ticket.quantityAvailable === '') {
          return 'Todo tipo de ingresso precisa de uma quantidade disponível.';
        }
      }
    }
    return null;
  }

  function goNext() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    const payload: CreateEventInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      days: filledDays.map((date) => ({ date })),
      ticketTypes: tickets.length
        ? tickets.map((ticket) => ({
            name: ticket.name.trim(),
            price: Number(ticket.price),
            quantityAvailable: Number(ticket.quantityAvailable),
            saleEndsAt: ticket.saleEndsAt || undefined,
          }))
        : undefined,
    };
    try {
      const created = await eventsApi.create(payload);
      router.replace(`/dashboard/events/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Algo deu errado ao criar o evento.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        title="Novo evento"
        backHref="/dashboard/events"
        backLabel="Voltar para eventos"
      />

      <Stepper current={step} />

      {error && <Alert>{error}</Alert>}

      {step === 0 && (
        <section className="flex flex-col gap-4">
          <TextField
            label="Nome do evento"
            placeholder="Ex: Conferência de Tecnologia 2026"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextArea
            label="Descrição"
            placeholder="Conte aos participantes sobre o evento…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            label="Local"
            placeholder="Ex: Centro de Convenções, São Paulo"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <TextField
            label="URL da imagem de capa"
            type="url"
            placeholder="https://…"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
            hint="Opcional. Uma URL pública de imagem para o evento."
          />
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-[#8E8A84]">
            Um dia libera a chamada manual; dois ou mais liberam o check-in por QR.
          </p>
          {days.map((day, index) => (
            <div key={index} className="flex items-end gap-2">
              <TextField
                label={`Dia ${index + 1}`}
                type="date"
                value={day}
                className="flex-1 [color-scheme:dark]"
                onChange={(event) =>
                  setDays(days.map((d, i) => (i === index ? event.target.value : d)))
                }
              />
              {days.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11"
                  onClick={() => setDays(days.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setDays([...days, ''])}
          >
            + Adicionar dia
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-[#8E8A84]">
            Tipos de ingresso são opcionais — você pode adicioná-los depois.
          </p>
          {tickets.map((ticket, index) => (
            <Card key={index} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#F5F2EE]">
                  Ingresso {index + 1}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => setTickets(tickets.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              </div>
              <TextField
                label="Nome"
                placeholder="Ex: Ingresso VIP"
                value={ticket.name}
                onChange={(event) =>
                  setTickets(
                    tickets.map((t, i) =>
                      i === index ? { ...t, name: event.target.value } : t,
                    ),
                  )
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Preço"
                  type="number"
                  placeholder="0,00"
                  min={0}
                  step="0.01"
                  value={ticket.price}
                  onChange={(event) =>
                    setTickets(
                      tickets.map((t, i) =>
                        i === index ? { ...t, price: event.target.value } : t,
                      ),
                    )
                  }
                />
                <TextField
                  label="Quantidade"
                  type="number"
                  placeholder="100"
                  min={0}
                  value={ticket.quantityAvailable}
                  onChange={(event) =>
                    setTickets(
                      tickets.map((t, i) =>
                        i === index
                          ? { ...t, quantityAvailable: event.target.value }
                          : t,
                      ),
                    )
                  }
                />
              </div>
              <TextField
                label="Fim das vendas"
                type="datetime-local"
                value={ticket.saleEndsAt}
                className="[color-scheme:dark]"
                onChange={(event) =>
                  setTickets(
                    tickets.map((t, i) =>
                      i === index ? { ...t, saleEndsAt: event.target.value } : t,
                    ),
                  )
                }
                hint="Opcional."
              />
            </Card>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setTickets([...tickets, { ...emptyTicket }])}
          >
            + Adicionar tipo de ingresso
          </Button>
        </section>
      )}

      {step === 3 && (
        <Card className="flex flex-col gap-3 p-5 text-sm">
          <Review label="Nome" value={name} />
          {location.trim() && <Review label="Local" value={location} />}
          {coverImageUrl.trim() && <Review label="Imagem de capa" value={coverImageUrl} />}
          <Review
            label="Datas"
            value={`${filledDays.length} dia${filledDays.length === 1 ? '' : 's'}`}
          />
          <Review
            label="Tipos de ingresso"
            value={
              tickets.length
                ? tickets.map((t) => t.name.trim() || 'Sem título').join(', ')
                : 'Nenhum'
            }
          />
          <p className="text-[#8E8A84]">
            O evento é criado como rascunho — você pode publicá-lo depois.
          </p>
        </Card>
      )}

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={goBack}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Próximo
          </Button>
        ) : (
          <Button type="button" onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar evento'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
              index <= current
                ? 'bg-[#F0561D] text-[#131215]'
                : 'bg-[#26231F] text-[#8E8A84]'
            }`}
          >
            {index + 1}
          </span>
          <span className={index === current ? 'font-bold text-[#F5F2EE]' : 'text-[#8E8A84]'}>
            {label}
          </span>
          {index < STEPS.length - 1 && <span className="text-white/15">—</span>}
        </li>
      ))}
    </ol>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#8E8A84]">{label}</span>
      <span className="text-right font-semibold text-[#F5F2EE]">{value}</span>
    </div>
  );
}

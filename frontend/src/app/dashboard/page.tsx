'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import CheckinTimeChart from '@/components/dashboard/checkin-time-chart';

// ─────────────────────────────────────────────────────────────────────────
// "Entter Dashboard v2" — reproduced pixel-for-pixel from the approved
// reference design (Entter Dashboard.html). Layout, spacing, colours and SVG
// artwork are copied verbatim as inline styles so the rendered output matches
// the mockup exactly; only the greeting name is wired to the signed-in user.
// The handful of interactive hover states the design expresses via `style-hover`
// live in the scoped <style> block below — `!important` is required because
// the base colours are inline styles, which otherwise outrank any selector.
// ─────────────────────────────────────────────────────────────────────────

// Presence gauge — same maths as the design's Component.renderVals().
const PRESENCE = 81;
const GAUGE_CIRC = 2 * Math.PI * 40;
const GAUGE_DASH = `${((GAUGE_CIRC * PRESENCE) / 100).toFixed(1)} ${GAUGE_CIRC.toFixed(1)}`;

const HOVER_CSS = `
.v2-create:hover{background:#FF6A31 !important}
.v2-seeall:hover{color:#F5F2EE !important}
.v2-manage:hover{background:#FFFFFF !important}
`;

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const userName = user?.name.split(' ')[0] ?? 'Marcos';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px 26px', flex: 1, minWidth: 0 }}>
      <style>{HOVER_CSS}</style>

      {/* ══ Top bar ══ */}
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 20,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 14, alignItems: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              gridColumn: '1 / 3',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Welcome, {userName}.
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                maxWidth: 260,
                background: '#1C1B1F',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: '9px 16px',
                color: '#8E8A84',
                fontSize: 13,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8A84" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              Search
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#1C1B1F',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            12 mai
          </div>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#1C1B1F',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </div>
          <Link
            href="/dashboard/events/new"
            className="v2-create"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#F0561D',
              color: '#131215',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Criar Evento
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, minHeight: 0 }}>
        {/* ══ Left column ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 14 }}>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>TOTAL DE INSCRITOS</div>
                <span
                  style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: '#26231F' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#8E8A84', lineHeight: 1.6 }}>
                Hoje: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>25</span>
                <br />
                Este mês: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>450</span>
              </div>
            </div>

            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>CHEGADAS</div>
                <span
                  style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: '#26231F' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 7" />
                  </svg>
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#8E8A84', lineHeight: 1.6 }}>
                Agora no local: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>315</span>
                <br />
                Última hora: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>96</span>
              </div>
            </div>

            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>FALTAM CHEGAR</div>
                <a href="#" className="v2-seeall" style={{ fontSize: 11, color: '#8E8A84' }}>
                  Ver todos
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F0561D' }} />
                    Ana Ribeiro
                  </span>
                  <span style={{ color: '#8E8A84' }}>Nº93783</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8B44A' }} />
                    Pedro Lima
                  </span>
                  <span style={{ color: '#8E8A84' }}>Nº78469</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <CheckinTimeChart />

          {/* Bottom cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>PRESENÇA</div>
                <div style={{ fontSize: 12.5, color: '#8E8A84', lineHeight: 1.8 }}>
                  <span style={{ color: '#F5F2EE', fontWeight: 700 }}>{PRESENCE}%</span> Taxa de presença
                  <br />
                  <span style={{ color: '#F5F2EE', fontWeight: 700 }}>{100 - PRESENCE}%</span> Ausentes
                </div>
              </div>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                <svg viewBox="0 0 96 96" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#26231F" strokeWidth="9" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#F0561D" strokeWidth="9" strokeLinecap="round" strokeDasharray={GAUGE_DASH} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800 }}>
                  {PRESENCE}%
                </div>
              </div>
            </div>

            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>RECEITA DO MÊS</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>R$ 12,5k</div>
                  <div style={{ fontSize: 12, color: '#8E8A84', marginTop: 2 }}>
                    <span style={{ color: '#9BC98E', fontWeight: 700 }}>+8%</span> vs abril
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#8E8A84', textAlign: 'right' }}>
                  Meta <span style={{ color: '#F5F2EE', fontWeight: 700 }}>R$ 15k</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: '#26231F', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ height: '100%', width: '83%', borderRadius: 99, background: '#F0561D' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ══ Right panel: infos do evento ══ */}
        <aside
          style={{
            background: '#1C1B1F',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>Informações do Evento</div>

          <div
            style={{
              background: '#131215',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Tech Summit 2026</div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: '#26231F',
                  borderRadius: 999,
                  padding: '4px 9px',
                  color: '#9BC98E',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7CB668' }} />
                AO VIVO
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, color: '#8E8A84' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Centro de Convenções — São Paulo
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 9h18M8 2v4M16 2v4" />
                </svg>
                11–13 de maio · Dia 2 de 3
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F0561D" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 2M9 2h6" />
                </svg>
                Credenciamento até 19:00
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>STATUS DOS PORTÕES</div>
            <a href="#" className="v2-seeall" style={{ fontSize: 11, color: '#8E8A84' }}>
              Ver todos
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: -4 }}>
            {[
              { gate: 'A', fila: '85%', sinal: 'Forte' },
              { gate: 'B', fila: '32%', sinal: 'Moderado' },
              { gate: 'C', fila: '8%', sinal: 'Fraco' },
            ].map(({ gate, fila, sinal }) => (
              <div
                key={gate}
                style={{
                  background: '#131215',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#26231F', borderRadius: 6, padding: '3px 8px' }}>
                    PORTÃO: {gate}
                  </span>
                  <span style={{ color: '#8E8A84', fontSize: 14, lineHeight: 0.4 }}>…</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: '#8E8A84' }}>
                  <span>
                    Fila: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>{fila}</span>
                  </span>
                  <span>
                    Sinal: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>{sinal}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="v2-manage"
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: '#F5F2EE',
              color: '#131215',
              borderRadius: 12,
              padding: '13px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#131215" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M6.5 6.5L5 5M19 19l-1.5-1.5M17.5 6.5L19 5M5 19l1.5-1.5" />
              </svg>
              Gerenciar Evento
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#131215" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </aside>
      </div>
    </div>
  );
}

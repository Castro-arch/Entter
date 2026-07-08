'use client';

import { Panel, PageHeader, SectionLabel } from '@/components/dash-ui';
import { useAuth } from '@/lib/auth/auth-context';

const comingSoon = [
  {
    title: 'Equipe',
    description:
      'Convide staff para ajudar no check-in sem compartilhar o login do dono. O modelo de papéis (owner/staff) já existe — o fluxo de convite ainda não.',
  },
  {
    title: 'Conexão Asaas',
    description:
      'Conecte a subconta Asaas do próprio organizador, para que a receita dos ingressos seja repassada diretamente em vez de acumular em uma conta única da plataforma (veja Financeiro).',
  },
  {
    title: 'Subdomínio & marca',
    description:
      'Personalize o subdomínio e a aparência das páginas públicas.',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();

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

      <section className="flex flex-col gap-3">
        <SectionLabel>Em breve</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          {comingSoon.map((item) => (
            <li
              key={item.title}
              className="rounded-[14px] border border-dashed border-white/15 px-5 py-4"
            >
              <p className="text-sm font-bold text-[#F5F2EE]">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#8E8A84]">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

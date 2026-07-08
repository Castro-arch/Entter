import { EmptyState, PageHeader } from '@/components/dash-ui';

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Notificações"
        subtitle="Avisos sobre seus eventos, vendas e check-in"
      />

      <EmptyState title="Em breve">
        Aqui você verá alertas em tempo real — picos de chegada, vendas
        confirmadas, certificados enviados e avisos operacionais dos portões.
      </EmptyState>
    </div>
  );
}

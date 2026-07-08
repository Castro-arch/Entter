import { EmptyState, PageHeader } from '@/components/dash-ui';

export default function FinanceiroPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Financeiro"
        subtitle="Receita, repasses e histórico de pedidos"
      />

      <EmptyState title="Em breve">
        Cada organizador terá sua própria subconta Asaas, para que a receita
        dos ingressos seja repassada diretamente, em vez de ficar acumulada em
        uma conta única da plataforma. Quando isso estiver conectado, esta
        página mostrará o histórico de pedidos, o status dos repasses e a
        receita por evento e por tipo de ingresso.
      </EmptyState>
    </div>
  );
}

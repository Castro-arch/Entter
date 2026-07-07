# Entter — Arquitetura da Plataforma de Credenciamento e Check-in de Eventos

> Documento de referência para implementação via Claude Code. Contém escopo, modelo de dados, módulos, endpoints e requisitos técnicos definidos. Use este documento como contexto de projeto (equivalente a um CLAUDE.md inicial) antes de gerar código.

## 1. Visão geral do produto

**Entter** é uma plataforma de ticketing + credenciamento de eventos, com foco principal em:
- Venda de ingressos (participante paga diretamente no checkout).
- Geração automática de credencial personalizada (nome inserido sobre arte enviada pelo organizador).
- Controle de acesso físico no dia do evento (check-in via QR code e/ou manual), com leitura **extremamente rápida** mesmo sob rede instável.
- Emissão e disparo de certificados pós-evento.

**Modelo de negócio:** cada participante paga o ingresso individualmente no checkout (não é assinatura do organizador). O pagamento aprovado é o gatilho que transforma um "lead" em "participante" oficial do evento.

## 2. Stack técnica

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend:** NestJS + TypeScript
- **Banco:** PostgreSQL
- **Cache / filas / locks:** Redis + BullMQ
- **Pagamento:** Asaas (checkout + webhook de confirmação)
- **Editor de posicionamento:** React + react-konva
- **Composição de credencial (renderiza o nome sobre a arte enviada pelo organizador):** sharp
- **Geração de PDF (certificado):** pdf-lib
- **Leitura de QR (client):** BarcodeDetector API (nativa) com fallback zxing-wasm
- **Realtime:** WebSocket (NestJS Gateway) ou SSE para dashboard de presença
- **Fila offline no client:** IndexedDB (check-ins feitos sem rede, sincronizados depois)

## 3. Modelo de dados (schema core)

```sql
-- Organizadores
tenants (
  id, name, subdomain, asaas_account_id, created_at
)

-- Eventos
events (
  id, tenant_id, name, description, cover_image_url,
  location, status (draft | published | finished),
  days_count (calculado a partir de event_days),
  credential_artwork_url,
  credential_name_position JSONB, -- { x_pct, y_pct, font_size_pct, font_family, color, align }
  certificate_template_url,
  certificate_name_position JSONB,
  certificate_dispatch_mode (manual | auto),
  certificate_auto_delay_hours,
  created_at
)

-- Dias do evento (define se libera "Lista" ou "QR + fallback manual")
event_days (
  id, event_id, date, order_index
)

-- Tipos de ingresso
ticket_types (
  id, event_id, name, price, quantity_available, sale_ends_at
)

-- Pedido/pagamento
orders (
  id, event_id, ticket_type_id,
  buyer_name, buyer_email, buyer_phone,
  asaas_payment_id, status (pending | paid | refunded),
  created_at
)

-- Usuário com acesso ao painel do organizador (login/senha).
-- Não estava no schema original deste documento: o tenant representa a
-- organização, não uma pessoa autenticável, então o login precisa de uma
-- identidade própria. Um tenant pode ter múltiplos usuários (ex: dono + staff).
users (
  id, tenant_id, name, email UNIQUE, password_hash,
  role (owner | staff), created_at
)

-- Participante (criado após pagamento aprovado)
participants (
  id, order_id, event_id, name,
  qr_token, -- JWT/HMAC assinado: { participant_id, event_id }
  credential_generated_at, credential_sent_at,
  certificate_sent_at,
  will_not_attend BOOLEAN DEFAULT false
)

-- Presença por dia de evento (mesma tabela serve para "Lista" de 1 dia e "QR" de 2+ dias)
attendance (
  id, participant_id, event_day_id,
  status (pending | present | absent),
  checked_in_at, method (qr | manual),
  UNIQUE (participant_id, event_day_id)
)
```

**Regra de negócio central:** `attendance` é agnóstica ao método. A UI decide qual método mostrar (QR scanner vs. lista de nomes) com base em `event.days_count`, mas o dado e os cards agregados (total / chegaram / faltam) usam sempre a mesma query.

## 4. Módulos

### 4.1 Wizard de criação de evento (organizador)

Fluxo em etapas, com salvamento incremental (`status: draft` até publicar):

1. **Dados básicos**: nome, descrição, banner, local, datas (define `event_days`, e portanto se o evento libera "Lista" ou "QR + fallback").
2. **Ingressos**: um ou mais `ticket_types` (nome, preço, quantidade, prazo de venda).
3. **Credencial**: upload de arte + editor de posicionamento do nome (ver 4.4). Se `days_count >= 2`, gera automaticamente verso com QR code.
4. **Certificado** (opcional): upload de template + mesmo editor de posicionamento + define disparo manual/automático.
5. **Revisão e publicação**: preview da landing gerada automaticamente, botão "Publicar evento" gera URL pública (ex: `entter.com.br/e/nome-do-evento` ou subdomínio do organizador, ex: `organizador.entter.com.br`).

Regra: só permite publicar com etapas 1, 2 e 3 completas. Certificado é opcional.

### 4.2 Checkout e pagamento

1. Lead acessa landing pública do evento → escolhe `ticket_type` → checkout.
2. Integração com Asaas para processar pagamento.
3. Webhook de confirmação (`payment.confirmed`) dispara:
   - Criação do registro em `participants`.
   - Geração do `qr_token` assinado.
   - Job assíncrono (BullMQ) para renderizar a credencial personalizada.
   - Disparo da credencial por e-mail (e opcionalmente WhatsApp via Z-API, reaproveitando integração já usada no ERP).

### 4.3 Check-in (núcleo de performance do produto)

**Dois modos de UI, mesmo backend:**
- `days_count == 1` → seção "Lista": busca por nome, marcação manual, toggle "não vai comparecer".
- `days_count >= 2` → seção "QR Code": scanner de câmera + fallback de busca manual por nome, por dia de evento selecionado.

**Requisitos de velocidade (críticos):**

1. **Leitura no client**
   - Usar `BarcodeDetector` nativa quando disponível; fallback `zxing-wasm` (mais rápido que `jsQR` puro).
   - Restringir a leitura a uma região central (crop) do frame de vídeo, não o frame inteiro.
   - Throttle de decodificação a ~150–200ms por tentativa (não a cada frame).
   - **Implementado sem o fallback `zxing-wasm`**: navegadores sem `BarcodeDetector`
     (ex: Safari) caem para o modo de busca manual por nome, que já precisa
     existir de qualquer forma (é o modo principal em eventos de 1 dia). Evita
     o bundling de WASM no Next.js por uma cobertura que a busca manual já
     resolve na prática.

2. **Validação local antes do round-trip**
   - `qr_token` é um JWT/HMAC assinado contendo `participant_id + event_id`.
   - Client valida a assinatura localmente e já exibe o nome do participante na tela instantaneamente, sem esperar resposta do servidor.
   - Em paralelo, envia o check-in para o backend para registro oficial.
   - **Desvio de implementação**: a assinatura HMAC usa um secret simétrico
     (`QR_SECRET`) — enviá-lo ao browser permitiria que qualquer pessoa lendo o
     bundle JS forjasse tokens válidos. O client decodifica só o corpo *não
     assinado* do token (`participant_id`) para exibir feedback otimista
     ("checking in…"); a verificação de assinatura real acontece exclusivamente
     no servidor, em `AttendanceService.checkIn`.

3. **Concorrência e duplicidade**
   - Constraint `UNIQUE (participant_id, event_day_id)` na tabela `attendance`.
   - Check-in é um `UPDATE ... WHERE status = 'pending'` atômico, nunca um insert simples.
   - Redis como lock de curta duração antes de tocar o Postgres: `SET participant:{id}:day:{id} NX EX 5` para rejeitar scans duplicados na janela de milissegundos.

4. **Offline-first (rede instável no local do evento)**
   - Fila local em IndexedDB no client: cada scan gera um evento de check-in enfileirado.
   - UI mostra sucesso otimista com base na validação de assinatura local.
   - Worker em background sincroniza com o servidor via retry exponencial.
   - Endpoint de sincronização em lote: `POST /attendance/batch-sync`, idempotente (protegido pela constraint única).

5. **Dashboard em tempo real**
   - Contadores (total / chegaram / faltam, por `event_day`) vivem em Redis (`INCR` a cada check-in confirmado).
   - Atualização via WebSocket/SSE, sem polling.
   - Redis sincroniza com Postgres em background como fonte de verdade.

### 4.4 Editor de posicionamento (compartilhado: credencial + certificado)

- Componente único `<NamePositionEditor artworkUrl={...} onSave={...} />`, reutilizado nas etapas 3 e 4 do wizard.
- Implementado com `react-konva`: imagem de fundo + texto de exemplo arrastável (`draggable`, `onDragEnd` recalcula posição).
- Coordenadas salvas **sempre em porcentagem** (`x_pct`, `y_pct`, `font_size_pct`), nunca em pixel absoluto — garante consistência independente da resolução final da arte.
- Renderização final ocorre server-side, em worker BullMQ:
  - Credencial: `sharp` + SVG de texto sobreposto.
  - Certificado: `pdf-lib`, mesma lógica de `%` aplicada a `page.getWidth()/getHeight()`.

### 4.5 Certificados

- Disparo manual (por participante ou em lote) a qualquer momento.
- Disparo automático: job BullMQ agendado para `event.end_date + certificate_auto_delay_hours`.
- Envio por e-mail com anexo PDF (WhatsApp como canal adicional, se necessário).

**Desvio de implementação (disparo automático)**: em vez de um job BullMQ
*delayed* por evento (que precisaria ser reagendado ou cancelado sempre que o
organizador editasse as datas do evento depois de criado), o disparo `AUTO` é
feito por um job BullMQ *repetível* que varre a cada 15 minutos os eventos
`AUTO` cujo último dia + `certificate_auto_delay_hours` já passou e ainda não
foram disparados (`Event.certificates_dispatched_at`, campo não presente no
schema original deste documento). Mais simples de manter correto e nada
precisa ser cancelado/reagendado manualmente.

**Envio de e-mail**: sem `SMTP_HOST` configurado, o envio roda em modo dev
(loga o e-mail em vez de enviar de fato) — mesmo padrão usado para o Asaas em
`checkout`, permitindo exercitar o fluxo completo (render do PDF + fila +
"envio") sem credenciais reais de SMTP.

## 5. Endpoints principais (referência inicial)

```
POST   /events                          -- cria evento (wizard etapa 1)
PATCH  /events/:id                      -- atualiza etapas do wizard
POST   /events/:id/publish              -- publica evento

POST   /events/:id/ticket-types
GET    /events/:id/public               -- dados da landing pública

POST   /checkout/:eventId               -- inicia checkout
POST   /webhooks/asaas                  -- confirmação de pagamento

GET    /events/:id/participants
POST   /participants/:id/resend-credential

POST   /events/:id/attendance/check-in     -- check-in único (QR ou manual)
POST   /events/:id/attendance/batch-sync   -- sincronização em lote (offline-first)
GET    /events/:id/attendance/summary      -- cards: total/chegaram/faltam por dia
GET    /events/:id/attendance/search       -- busca por nome (Lista + fallback do QR)

POST   /events/:id/participants/:participantId/certificate  -- dispara 1 certificado
POST   /events/:id/certificates/send-all                     -- dispara em lote
```

Todas as rotas de `attendance` foram aninhadas sob `/events/:id/` (em vez do
`/attendance/*` plano do rascunho acima) para reaproveitar a mesma checagem de
posse por tenant usada em todo o resto da API — necessário porque este doc é
anterior ao modelo multi-tenant (`tenants`/`users`) implementado.

## 6. Segurança

- `qr_token`: JWT/HMAC assinado com secret por evento, nunca ID cru.
- Validação de assinatura tanto no client (leitura otimista) quanto no servidor (registro oficial).
- LGPD: dados de participante (nome, e-mail, telefone) tratados com mesmo padrão de criptografia/compliance já usado no ERP.
- **Sessão do organizador:** JWT assinado (`sub`, `tenantId`, `role`) transportado em cookie `httpOnly` + `sameSite=lax`, não em `localStorage`. Evita exposição do token a XSS no painel do organizador; o fallback `Authorization: Bearer` continua disponível para clientes não-browser (scripts, testes). Senha com `bcrypt` (10 rounds).

## 7. Fases sugeridas de implementação

1. ✅ Schema completo + auth de tenant/organizador (`backend/prisma/schema.prisma`, `backend/src/auth`).
2. Wizard de criação de evento (etapas 1–5) + editor de posicionamento.
3. Checkout + webhook Asaas + geração automática de participante/credencial.
4. Módulo de check-in (QR + manual) com offline-first e dashboard em tempo real.
5. Módulo de certificados (disparo manual + automático).
6. Landing page pública gerada a partir dos dados do evento.

# CLAUDE.md — Diretrizes do projeto Entter

> Este arquivo é lido automaticamente pelo Claude Code antes de qualquer tarefa neste repositório. As diretrizes abaixo são permanentes e devem ser seguidas em toda sessão de trabalho, commit e versionamento — não apenas quando explicitamente lembradas.

## Padrão de qualidade do repositório

Este é um repositório **público**, usado como peça de portfólio técnico. O padrão de qualidade deve ser digno de impressionar recrutadores técnicos de empresas como Google, Meta, Amazon, e avaliadores de programas como Yale e Babson College. Isso significa, concretamente:

- **Nunca** commitar código quebrado, comentado sem necessidade, com `console.log` de debug esquecido, ou com nomes de variável genéricos (`data`, `temp`, `foo`).
- **Nunca** deixar o `README.md` desatualizado em relação ao estado real do código. Se um módulo do roadmap for implementado, o checkbox correspondente no `README.md` deve ser marcado no mesmo commit ou logo em seguida.
- Toda decisão de arquitetura não-óbvia (por que Redis e não só Postgres, por que offline-first, por que coordenadas em `%`, etc.) deve estar documentada — seja no `README.md`, seja em `docs/`, nunca apenas implícita no código.
- Preferir clareza a esperteza: código que um engenheiro sênior lendo pela primeira vez entende em poucos minutos, sem precisar de contexto adicional.

## Padrão de commits

- Seguir **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`).
- Mensagens de commit em inglês, no imperativo (`add QR signature validation`, não `added` ou `adding`).
- Um commit deve representar uma unidade lógica de mudança — evitar commits gigantes que misturam feature + refactor + fix.
- Nunca commitar `.env`, secrets, chaves de API, ou qualquer dado sensível. Verificar `.gitignore` antes de cada commit se houver dúvida.

Exemplo de commit bem formado:
```
feat: add offline-first check-in queue with IndexedDB

Implements local queue for check-in events when network is
unavailable, with exponential backoff sync via
POST /attendance/batch-sync.
```

## Padrão de Pull Requests (quando aplicável)

- Título claro, descrevendo o *quê* e o *porquê*, não só o *quê*.
- Descrição da PR deve conter: contexto do problema, decisão tomada, e trade-offs considerados (mesmo que brevemente).
- Nunca abrir PR com testes quebrados ou build falhando.

## Manutenção contínua da documentação

Sempre que uma fase do roadmap (`README.md`) for concluída:
1. Atualizar o checkbox correspondente.
2. Se a implementação divergiu do que está descrito em `docs/ARQUITETURA_credenciamento_eventos.md`, atualizar o documento de arquitetura para refletir a realidade — documentação desatualizada é pior do que ausência de documentação.

## Tom geral

Este projeto deve parecer **maduro e deliberado**, não uma sequência de commits experimentais. Cada mudança no repositório é uma oportunidade de demonstrar rigor de engenharia — trate cada commit como algo que um recrutador técnico vai realmente abrir e ler.

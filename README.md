# Studio Áurea — Agendamento Digital para Salão de Beleza

Site institucional + agendamento 100% digital para um salão de beleza (cabelo, unhas,
estética), com design "luxo editorial" e um assistente de IA que consulta a agenda real e
consegue criar o agendamento durante a própria conversa.

**Demo ao vivo:** _(link após deploy)_

## Destaques

- **Agendamento sem login**: cliente marca com nome + telefone, gerencia pelo link único
  ("capability link", padrão Calendly) — sem sistema de contas.
- **Anti-double-booking no banco**: constraint `EXCLUDE USING gist` do Postgres impede
  sobreposição de horário do mesmo profissional mesmo sob concorrência — não é só
  validação de aplicação.
- **Assistente de IA com tool calling real**: consulta disponibilidade e cria
  agendamentos de verdade durante a conversa, chamando as mesmas funções de banco que o
  wizard usa (nunca inventa horário ou preço). Roda no free tier do Groq.
- **RLS ponta a ponta no Supabase**: catálogo público, dados de cliente protegidos por
  Row Level Security + funções `security definer`, sem select direto em tabela sensível.
- **Motor de horários puro e testado**: `lib/agenda/gerar-horarios-disponiveis.ts` é uma
  função sem I/O, coberta por testes (Vitest), que decide quais horários cabem dado
  expediente, bloqueios, buffer e duração do serviço.
- **Notificação por email best-effort** (Resend): confirmação e lembrete D-1 via Vercel
  Cron — falha no envio nunca derruba o agendamento em si.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion no
front-end; Supabase (Postgres, Auth, RLS) no back-end; Groq (LLM gratuito) para o
assistente; Resend para email transacional. Deploy na Vercel.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencher com suas próprias chaves
npm run dev
```

Variáveis de ambiente esperadas — ver `.env.local.example`. O schema SQL fica em
`supabase/migrations/0001_schema_inicial.sql` (+ `supabase/seed.sql` para dados de
exemplo); rode contra seu próprio projeto Supabase antes de usar.

```bash
npm test    # testes do motor de agendamento (Vitest)
npm run build
```

## Estrutura

```
app/(site)/...        site público: home, serviços, profissionais, galeria, agendar...
app/(admin)/...        painel administrativo (Supabase Auth)
lib/agenda/            motor de geração de horários disponíveis (função pura)
lib/db/supabase/       repositórios (catálogo, agendamentos)
lib/ia/                assistente de IA (Groq) + ferramentas de consulta/criação
lib/notificacoes/      envio de email (Resend)
supabase/migrations/   schema SQL + RLS + RPCs
```

## Licença

MIT — ver [LICENSE](./LICENSE).

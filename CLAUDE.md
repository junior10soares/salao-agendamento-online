@AGENTS.md

# Salão de Beleza — Site + Agendamento Digital

## Contexto

Site institucional + agendamento 100% digital para um salão de beleza **único e real**
(cabelo, unhas, estética etc.), com apresentação visual de altíssimo nível — o objetivo
explícito é que o site pareça "de R$100 mil" e sirva como principal peça de divulgação
do salão. O visual/animações têm prioridade máxima sobre qualquer outra parte do projeto.
**Prioridade igualmente inegociável: tudo 100% gratuito** (stack free-tier, sem custo
por mensagem/API que possa virar cobrança).

Decisões fechadas:
- **Escopo**: salão único, não é um produto SaaS multi-tenant.
- **Stack**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase
  (Postgres/RLS/Auth) + Framer Motion — mesmo padrão usado em `Saas-Elétrica` e
  `portfolio-ia`.
- **Notificações**: só Email (Resend, free tier) — ver "WhatsApp descartado" abaixo.
- **Pagamento**: nenhum no MVP — cliente paga presencialmente no salão.
- **Cliente sem login**: agendamento com nome+telefone, gerenciado por link/token único
  (padrão "capability link", como o Calendly) — sem sistema de contas.
- **Banco Supabase compartilhado**: este projeto usa o **mesmo projeto/banco Supabase de
  outro projeto já existente do usuário** (não é um projeto Supabase dedicado). Por isso
  toda tabela e função SQL leva prefixo `salao_` — evita colisão de nome no schema
  `public`, que é compartilhado com o outro projeto. Nunca remover esse prefixo.

### WhatsApp descartado (decisão 2026-07-03)

A Meta cobra por mensagem business-initiated (confirmação/lembrete) além de um saldo
gratuito mensal pequeno — não é R$0 garantido para sempre. Como a exigência do usuário é
**tudo 100% gratuito**, a Fase 6 foi refeita para usar **só Email (Resend)**. Não há
código de WhatsApp no projeto (removido, não só desativado). Se um dia quiser reativar,
seria um novo canal em `lib/notificacoes/`, o desenho já é extensível (ver
`registrarEnvio` em `lib/notificacoes/index.ts`).

## Arquitetura de dados (Supabase)

Tabelas (todas com prefixo `salao_`): `salao_configuracoes` (singleton),
`salao_categorias_servico`, `salao_servicos`, `salao_profissionais`,
`salao_profissionais_servicos` (m2m), `salao_horarios_trabalho`,
`salao_bloqueios_agenda` (folga/feriado/bloqueio pontual — `profissional_id` nulo =
bloqueia o salão todo), `salao_clientes`, `salao_agendamentos` (com
`token_gerenciamento` uuid), `salao_notificacoes_enviadas` (log/idempotência),
`salao_perfis_admin` (dono/recepção).

**Regra de ouro do RLS** (nunca violar — já causou incidente em `Saas-Elétrica`,
migration `0004_fix_recursao_rls.sql`): nenhuma policy pode fazer subquery na própria
tabela que protege. Toda checagem administrativa passa por uma função
`security definer`:

```sql
create or replace function public.salao_is_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from salao_perfis_admin where user_id = auth.uid()) $$;
```

Catálogo (`salao_servicos`, `salao_profissionais`, `salao_categorias_servico`,
`salao_horarios_trabalho`, `salao_configuracoes`) → leitura pública, escrita só
`salao_is_admin()`. `salao_clientes` e `salao_agendamentos` → sem select público; acesso
do cliente só via funções RPC dedicadas (nunca select direto na tabela), acesso admin via
`salao_is_admin()`.

**Anti-double-booking via constraint do Postgres** (não verificação na aplicação):

```sql
create extension if not exists btree_gist;

alter table salao_agendamentos add constraint sem_sobreposicao_por_profissional
  exclude using gist (
    profissional_id with =,
    tsrange(inicio, fim) with &&
  ) where (status not in ('cancelado'));
```

Criação de agendamento sempre via RPC única `salao_criar_agendamento(...)` (valida
horário de funcionamento/antecedência, upsert de cliente por telefone, insere e devolve
`token_gerenciamento`; captura erro `23P01` para mensagem amigável de conflito de
horário). `anon` só recebe `execute` nas RPCs (`salao_criar_agendamento`,
`salao_obter_agendamento_por_token`, `salao_cancelar_agendamento_por_token`), nunca grant
direto nas tabelas.

## Motor de agendamento

`lib/agenda/gerar-horarios-disponiveis.ts` — função pura (sem I/O), recebe janelas de
trabalho do profissional, bloqueios, agendamentos já ocupados, duração do serviço e
buffer → devolve slots candidatos. 100% testável com Vitest (casos: serviço que não cabe
no fim do expediente, bloqueio no meio do dia, buffer entre atendimentos, folga total).
A rota/Server Action busca os dados reais e só então chama essa função.

## Notificações — Email (Resend)

Confirmação síncrona (best-effort) logo após `salao_criar_agendamento`; lembrete D-1 via
Vercel Cron (`app/api/cron/lembretes/route.ts`, protegido por `CRON_SECRET`), idempotente
via `salao_notificacoes_enviadas` (chave única `agendamento_id+tipo+canal`). Falha ao
enviar nunca derruba o agendamento em si — só fica logada.

## Painel administrativo

Supabase Auth (dono + recepção via `salao_perfis_admin`), `proxy.ts` protege
`app/(admin)/admin/(painel)/...` (Next 16 renomeou `middleware.ts` para `proxy.ts` — só
roda em `/admin/:path*`, `/admin/login` fica de fora de propósito). Páginas:
`/admin/agenda` (lista por dia, agendamento manual de walk-in, mudar status),
`/admin/servicos`, `/admin/profissionais` (+ horários/folgas), `/admin/configuracoes`.

## Design — prioridade máxima do projeto

O usuário foi explícito: **o visual é o que mais precisa ser valorizado**, é a principal
ferramenta de divulgação do salão. Por isso o design system foi definido cedo (Fase 2,
não deixado para o final) e toda página pública já nasce usando-o.

Paleta "luxo editorial" via skill `ui-ux-pro-max` (produto "luxury/premium brand") —
charcoal quente (`#1c1917`) + dourado (`#a16207` claro / `#d4af6a` escuro) sobre
off-white quente (`#faf9f7`); unissex, deliberadamente fugindo do clichê rosa-pastel de
spa para caber num salão geral. Tokens em `app/globals.css` (`:root`/`.dark`), incluindo
um token extra `--gold`/`--color-gold` (utilities `text-gold`/`bg-gold`) além dos
semânticos do shadcn. `--radius` reduzido para `0.375rem` (mais reto = mais editorial).

Tipografia: Playfair Display (heading) + Inter (body), via `next/font/google` em
`app/layout.tsx` (variáveis `--font-heading`/`--font-sans`) — `h1-h4` usam `font-heading`
por padrão (`@layer base` em globals.css).

Animação: tokens únicos em `lib/motion.ts` (`fadeInUp`, `fadeIn`, `staggerContainer`,
easing compartilhado) + componentes `<Reveal>`/`<StaggerGroup>` em
`components/reveal.tsx` para scroll-reveal. `prefers-reduced-motion` respeitado
globalmente via `<MotionConfig reducedMotion="user">` em `app/layout.tsx`. Dark mode
habilitado (`next-themes`, `components/theme-provider.tsx`) — falta só a UI de um botão
de toggle (ninguém pediu ainda, fácil de adicionar quando quiser).

`components/section-heading.tsx` é o padrão para títulos de seção (eyebrow dourado +
heading serif + descrição). Menu mobile em `components/mobile-nav.tsx` (drawer via
shadcn `sheet`). Skip-link de acessibilidade em `app/layout.tsx` (`#conteudo`).

**Atualização 2026-07-04 (3) — profissionais clicáveis**: os cards em `/profissionais`
agora são `<Link href="/agendar?profissional={id}">`. A página `/agendar`
(`app/(site)/agendar/page.tsx`) lê esse `searchParams.profissional`, busca o
profissional (`obterProfissional`) e filtra os serviços só nos dele
(`listarServicosPorProfissional`, novo em `lib/db/supabase/catalogo.ts`). O
`AgendamentoWizard` ganhou a prop opcional `profissionalFixo`: quando presente, a etapa
de "escolher profissional" é pulada inteiramente — ao clicar num serviço já vai direto
pro calendário com os horários livres desse profissional específico (usa a mesma
`buscarSlotsAction`/motor de horários de sempre, sem lógica nova de disponibilidade). O
botão "Voltar" nessa etapa volta pra escolha de serviço (não pra etapa de profissional,
que nem existe nesse fluxo).

## Roadmap de fases

- [x] **Fase 0 — Setup**
- [x] **Fase 1 — Schema + seed**
- [x] **Fase 2 — Design system**
- [x] **Fase 3 — Site institucional público**: Home, Serviços, Profissionais, Galeria,
      Sobre, Contato.
- [x] **Fase 4 — Motor de agendamento**: wizard em `/agendar`, gerenciamento em
      `/meus-agendamentos/[token]`.
- [x] **Fase 5 — Painel administrativo**.
- [x] **Fase 6 — Notificações**: só Email (Resend) — ver "WhatsApp descartado" acima.
- [x] **Fase 7 — Polimento final**: menu mobile, skip-link. Vídeo de hero **não**
      incluído (ver Pendências).
- [ ] **Fase 8 — Deploy final + domínio** (parcialmente desbloqueada, ver "Pendências"):
      migration + seed **já rodaram** no projeto Supabase compartilhado (2026-07-04).
      Falta: criar usuário admin + linha em `salao_perfis_admin`, conta Resend, deploy na
      Vercel (`vercel.json` já tem o cron configurado), domínio customizado, depois
      verificação ponta a ponta contra tudo isso de verdade. O projeto já builda limpo
      (`npm run build`) e os testes passam (`npm test`).

## Pendências para revisão conjunta

- **Supabase real já conectado** (2026-07-04): `.env.local` criado com URL
  (`https://yirolpsmnjiblsdivddq.supabase.co`) + anon key + service_role key reais do
  projeto compartilhado.
- **Migration + seed já rodaram no banco real** (2026-07-04, atualização 2): usuário
  pediu pra eu rodar direto (mudou de ideia sobre colar ele mesmo no SQL Editor) e passou
  a connection string do Postgres + senha do banco pelo chat. Rodei via `psql` direto
  (não pela API/service_role key — essa key é só REST/GoTrue, não executa DDL bruto).
  **Bug real encontrado e corrigido na migration**: a constraint
  `sem_sobreposicao_por_profissional` usava `tsrange(inicio, fim)`, mas as colunas
  `inicio`/`fim` são `timestamptz` — `tsrange` é pra `timestamp` sem timezone e dava erro
  "function tsrange(timestamp with time zone, timestamp with time zone) does not exist".
  Corrigido pra `tstzrange` em `0001_schema_inicial.sql`. Como parte da migration já tinha
  rodado antes do erro (tabelas até `salao_bloqueios_agenda`), limpei esse estado parcial
  (`drop table/function ... cascade`) e rodei a versão corrigida do zero. Confirmado:
  3 categorias, 5 serviços, 3 profissionais, 5 vínculos, 15 janelas de horário — tudo
  batendo com o seed. Testei visualmente (Playwright) o fluxo completo de
  `/servicos`, `/profissionais` e o wizard de `/agendar` (incluindo agendar "Limpeza de
  pele" com a Carla Mendes, escolher data no calendário e ver os horários livres
  aparecerem) — sem erros de console, tudo funcionando com dado real.
  **Nenhuma tabela do outro projeto foi tocada** (são tabelas tipo `properties`, `rooms`,
  `reservations` — sem colisão com o prefixo `salao_`).
- Ainda falta: `RESEND_API_KEY` (Resend). `GROQ_API_KEY` (assistente de chat) já
  configurada. Qual projeto exatamente compartilha esse banco Supabase não foi
  confirmado (não bloqueia mais nada — prefixo `salao_` resolve o isolamento de
  qualquer forma).
- Conteúdo real do salão: usuário quer **primeiro visualizar o site rodando** antes de
  passar nome, endereço, telefone, horário, fotos, texto "Sobre" — por enquanto continua
  com os dados de exemplo do seed.
- Domínio: **sem domínio customizado por enquanto** — decisão do usuário é postar na
  Vercel simples (domínio padrão `*.vercel.app`) e só comprar um domínio depois "se ficar
  algo interessante".
- Vídeo de hero definitivo — **não incluído** (não tinha um arquivo de vídeo
  real/licenciado para usar, e não fabricaria um placeholder falso). O hero atual é só
  texto + CTA, que já ficou bem resolvido sozinho no design system. Decidir: grava algo
  específico do salão, ou compra num banco de vídeos gratuito — depois é só soltar o
  arquivo em `public/videos/hero.mp4` e adicionar um `<video autoplay muted loop
  playsInline>` de fundo na seção hero de `app/(site)/page.tsx`.
- Migration + seed já rodaram (ver acima) — `/servicos`, `/profissionais` e `/agendar` já
  mostram dado real, não tem mais fallback "em breve". `/contato` ainda depende de
  `obterConfiguracoesSalao()`, que já deve funcionar também (não conferido ponto a ponto,
  mas usa a mesma tabela `salao_configuracoes` que o seed populou). Os tipos de retorno
  das RPCs em `lib/db/supabase/agendamentos.ts` e os embeds em
  `lib/db/supabase/catalogo.ts` continuam anotados manualmente
  (`.single<T>()`/`.overrideTypes<T>()`) por falta de `supabase gen types` — rodar esse
  comando contra o projeto real depois e considerar trocar pelos tipos gerados.
- Galeria ficou estática por decisão de escopo (sem tabela própria no schema, ver
  `app/(site)/galeria/page.tsx`) — se precisar de gestão pelo painel admin, avisar para
  virar tabela + CRUD. **Atualização 2026-07-04**: populada com 6 fotos fictícias
  (Unsplash) a pedido do usuário, antes do conteúdo real do salão — trocar pelos URLs
  reais quando tiver fotos do próprio salão.
- **Atualização 2026-07-04 — melhorias visuais pedidas pelo usuário**: (1) calendário
  visual (shadcn `Calendar`/`react-day-picker`, instalado via `npx shadcn add calendar`)
  substituiu o `<input type="date">` no wizard de `/agendar`
  (`components/agendamento-wizard.tsx`) — a seleção de profissional + os slots livres já
  existiam desde a Fase 4 (`buscarProfissionaisPorServico`/`buscarSlotsDisponiveis`), só a
  UI da data era um input simples sem calendário visual; (2) `supabase/seed.sql` ganhou
  `foto_url` para os profissionais e `imagem_url` para os serviços (fotos fictícias
  Unsplash, mesma lógica da galeria — ainda não rodou no banco real); (3) **bug real
  corrigido no seed**: a categoria "Estética" não tinha nenhum profissional vinculado —
  o wizard chegaria com a lista de profissionais vazia (beco sem saída) ao tentar agendar
  "Limpeza de pele". Adicionado profissional "Carla Mendes" vinculado a esse serviço;
  (4) cores: glow dourado sutil no hero (`app/(site)/page.tsx`, via `color-mix` com
  `--gold`), ícones lucide-react (Scissors/Sparkles/Gem) nos cards de destaque da home,
  faixa `bg-secondary/40` alternando com o fundo padrão, thumbnails de serviço em
  `/servicos`. A paleta "luxo editorial" em si não foi trocada (decisão de design
  deliberada, ver seção "Design" acima) — o ganho de cor veio das fotos reais + acentos
  dourados, não de novas cores na paleta em si.
- Painel admin: `/admin/login` já confirmado funcionando contra o Supabase real (redirect
  307 em vez de erro 500). `/admin/agenda`, `/admin/servicos`, `/admin/profissionais`,
  `/admin/configuracoes` ainda não foram exercitados contra dado de verdade — só depois
  que a migration rodar. Ainda não existe nenhum usuário admin: depois que a migration
  rodar, criar o primeiro usuário (Supabase Auth → Authentication → Add user) e inserir a
  linha correspondente em `salao_perfis_admin` manualmente (não há tela de "primeiro
  acesso" — decisão consciente, é único dono/recepção, não um cadastro público).
- Email (Fase 6): `lib/notificacoes/email.ts` lança erro se `RESEND_API_KEY` não estiver
  setada (esperado agora) — não quebra a criação de agendamento (best-effort). O
  remetente (`agendamentos@resend.dev`) é placeholder, trocar pelo domínio verificado no
  Resend. Não testado com envio real ainda.

**Atualização 2026-07-04 (4) — bug real em produção corrigido**: usuário tentou agendar
pela UI de verdade e recebeu "Não foi possível agendar." (mensagem genérica, escondendo o
erro real). Causa raiz: a função `salao_criar_agendamento` tem `returns table (id uuid,
token_gerenciamento uuid, inicio timestamptz, fim timestamptz)` — em PL/pgSQL isso
declara `id`/`inicio`/`fim` como variáveis de saída no escopo da função inteira, que
sombreiam colunas de mesmo nome em referências não qualificadas. A linha
`from salao_servicos where id = p_servico_id and ativo` ficou ambígua (erro Postgres
42702, "column reference is ambiguous"). Corrigido qualificando com
`salao_servicos.id`/`salao_servicos.ativo` em `0001_schema_inicial.sql` e reaplicado na
função já existente no banco real via `create or replace function` (não precisou mexer em
tabela/dado nenhum). De quebra, corrigida também a Server Action
(`app/(site)/agendar/actions.ts`): erros do supabase-js (`PostgrestError`) são objetos
simples com `.message`, não instâncias de `Error` — o `catch` só tratava
`error instanceof Error`, por isso a mensagem real do Postgres nunca aparecia pro usuário.
Testado ponta a ponta pela UI real (Playwright): agendamento completo até "Agendamento
confirmado!" sem erro. **Se aparecer outro erro genérico de agendamento no futuro, a
mensagem real agora deve aparecer** — mas vale checar os logs do Supabase/Vercel se ainda
vier algo genérico.

**Atualização 2026-07-04 (5)**: `cursor-pointer` adicionado direto em `buttonVariants`
(`components/ui/button.tsx`) — corrige todos os usos de `<Button>` do site inteiro
(público + admin) numa vez só, em vez de repetir a classe em cada botão individual. Os
`<button>` "crus" do wizard e do admin-sidebar já tinham isso aplicado manualmente. Itens
de menu (`dropdown-menu`, `select`) mantêm `cursor-default` de propósito — é escolha do
design system do shadcn pra imitar o comportamento nativo de menu, não um botão de ação.

**Atualização 2026-07-04 (6) — nome/marca genéricos**: usuário pediu nome, endereço e
logotipo genéricos (ainda não é conteúdo real — isso continua adiado até ele visualizar o
site e decidir). Trocado "Salão Exemplo" (soava a placeholder de rascunho) por **"Studio
Áurea"**, único lugar que define isso é `components/logo.tsx`
(`export const NOME_SALAO`) — todo o resto (`site-header`, `site-footer`, `mobile-nav`,
`app/layout.tsx` metadata, `lib/notificacoes/email.ts` remetente, `supabase/seed.sql`)
importa dali ou do `salao_configuracoes` no banco, sem string duplicada em lugar nenhum.
Endereço/telefone/instagram também trocados por versões mais plausíveis (endereço
genérico em bairro real de SP só pra soar natural, telefone `(11) 4002-8922` é o
número-placeholder mais reconhecido do Brasil, tipo o "555-0100" americano). Adicionado
logotipo de verdade: `components/logo.tsx` (monograma "SA" + wordmark) usado em
header/footer/menu mobile, e `app/icon.tsx` gera o favicon combinando (via
`next/og` `ImageResponse`, sem asset de imagem estático). Limpeza: removidos os SVGs
padrão do `create-next-app` em `public/` e o `favicon.ico` antigo (nenhum era
referenciado). Bônus: o botão "Agendar agora" do hero da home não tinha link nenhum
(bug pré-existente, notado ao mexer perto) — agora vai pra `/agendar`.

**Atualização 2026-07-04 (7) — bug sério de RLS achado e corrigido**: usuário pediu pra
horários ocupados aparecerem desabilitados/riscados no lugar de simplesmente sumirem da
lista. Ao implementar isso (motor de slots passou a devolver todos os candidatos do dia
com uma flag `disponivel`, não só os livres — `lib/agenda/gerar-horarios-disponiveis.ts`,
testes atualizados, `buscarSlotsAction` e o wizard renderizando botão desabilitado
riscado pros ocupados), descobri que **nenhum horário nunca tinha sido de fato filtrado
pra visitante anônimo**: `salao_agendamentos` e `salao_bloqueios_agenda` não têm policy
de select público (RLS só libera pra `salao_is_admin()`, de propósito — não pode vazar
nome/telefone de cliente pra qualquer um). Isso significa que a query da Fase 4
(`supabase.from("salao_agendamentos").select(...)` com o client anon) sempre voltava
vazia silenciosamente (RLS não dá erro, só filtra todas as linhas) — ou seja, **todo
horário sempre aparecia como livre pro cliente, mesmo já ocupado**. A única coisa que
realmente impedia overbooking era o `exclude constraint` do Postgres no momento do
insert (por isso o usuário viu "Esse horário acabou de ser reservado por outra pessoa" —
não era uma race condition rara, era o único freio que existia). Corrigido com duas
funções novas `security definer` que expõem só o intervalo de tempo (sem dado de
cliente): `salao_horarios_ocupados_dia` e `salao_bloqueios_dia`, chamadas via `.rpc()` em
`buscarSlotsDisponiveis` no lugar do `.from(...).select(...)` direto. Testado contra o
banco real criando um agendamento de propósito e confirmando visualmente que os horários
em volta (com buffer) aparecem riscados/desabilitados. **Nota**: durante a investigação
descobri que o usuário já tem um agendamento real confirmado — provavelmente um reenvio
do formulário depois que corrigi o bug de `tsrange`/coluna ambígua (atualização 3): Carla
Mendes, Limpeza de pele, 06/07/2026 09:15 (horário de Brasília). Não mexi nesse registro.

## Assistente de chat (IA) — free tier

Widget flutuante no site público (`components/chat-assistant.tsx`, injetado só em
`app/(site)/layout.tsx` — não aparece no admin) que responde dúvidas sobre serviços,
preços, profissionais e horário. Usa **Groq** (`lib/ia/groq.ts`, modelo
`llama-3.1-8b-instant`) via `fetch` direto na API compatível com OpenAI — sem SDK novo,
free tier real sem cartão de crédito. `lib/ia/assistente.ts` monta o prompt de sistema
buscando o catálogo/config **reais** do banco a cada pergunta (nunca cacheado, catálogo é
pequeno) para o modelo nunca inventar serviço/preço/profissional que não existe. Regra
explícita no prompt: só responde sobre o salão, incentiva "Agendar agora" mas não agenda
pelo chat. Server Action em `app/(site)/assistente/actions.ts` valida o histórico com Zod
(máx. 10 mensagens, 500 caracteres cada) e tem fallback gracioso — se `GROQ_API_KEY`
não estiver setada ou a chamada falhar (cota, chave inválida etc.), mostra uma mensagem
amigável apontando pra página de Contato, nunca quebra a página (mesmo princípio do
Resend em `lib/notificacoes/email.ts`). `GROQ_API_KEY` já configurada (2026-07-04, chave
real no `.env.local`).

**Consulta de disponibilidade real via tool calling** (2026-07-04): o assistente consegue
responder "esse horário tá livre?"/"quais horários tem no dia X?" consultando a agenda de
verdade, não de cabeça. `lib/ia/groq.ts` suporta `tools`/`tool_calls` (formato OpenAI,
Groq é compatível); `lib/ia/ferramentas.ts` define a ferramenta
`consultar_disponibilidade` (recebe serviço/profissional/data em linguagem natural já
resolvida pelo modelo, faz fuzzy-match contra o catálogo real e chama
`buscarSlotsDisponiveis` — a mesma função que o wizard usa) e `lib/ia/assistente.ts`
implementa o round-trip: 1ª chamada ao Groq → se pedir a ferramenta, executa e devolve o
resultado → 2ª chamada gera a resposta final em português. Só 1 round de ferramenta por
pergunta (não há loop de múltiplas chamadas encadeadas) — suficiente pro caso de uso e
evita custo/latência sem limite; limitação conhecida: se não achar nada livre no dia
pedido, o modelo às vezes sugere "tenta outro dia" de forma genérica (não consultou os
outros dias de verdade, só o pedido). Testado com a chave real do Groq: perguntas sobre
um horário já ocupado (agendamento real de teste) e sobre um horário livre responderam
corretamente, batendo com o banco.

**Agendamento de verdade pelo chat** (2026-07-04): além de consultar, o assistente
também **cria o agendamento de verdade** durante a conversa — ferramenta
`criar_agendamento` em `lib/ia/ferramentas.ts` (fuzzy-match de serviço/profissional,
valida com Zod, chama `criarAgendamento()` — a mesma função do wizard, então herda as
mesmas garantias: RPC `salao_criar_agendamento`, constraint anti-double-booking,
antecedência mínima/máxima, email best-effort). Erro de agendamento usa o helper
compartilhado `mensagemDeErroAgendamento` (também extraído do wizard, pra não duplicar a
lógica de "23P01 = horário já foi pego por outra pessoa"). O prompt de sistema exige:
coletar serviço/profissional/data/horário/nome/telefone na conversa antes de chamar a
ferramenta, e só chamar assim que tudo estiver reunido e o cliente tiver demonstrado
intenção de agendar (evita ficar perguntando "posso confirmar?" em loop — problema real
observado com `llama-3.1-8b-instant` antes de ajustar o prompt).

**Cuidado operacional**: o free tier do Groq pro modelo `llama-3.1-8b-instant` tem limite
de ~6000 tokens/minuto (TPM) — cada pergunta com tool-calling consome 2 chamadas ao Groq
(pedido da ferramenta + resposta final), então uma sequência rápida de perguntas pode
estourar o limite e cair no fallback ("Não consegui responder agora"). Não é bug, é o
limite real do free tier — se acontecer com frequência em uso real, o próximo passo
seria um modelo mais leve ou espaçar/filar as chamadas.

## Arquivos críticos

- `supabase/migrations/0001_schema_inicial.sql`
- `lib/agenda/gerar-horarios-disponiveis.ts`
- `lib/db/supabase/agendamentos.ts`
- `lib/notificacoes/index.ts`
- `app/api/cron/lembretes/route.ts`
- `proxy.ts`

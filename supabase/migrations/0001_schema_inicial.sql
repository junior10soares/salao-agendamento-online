-- Schema inicial: salão único (sem multi-tenancy) — catálogo de serviços/profissionais,
-- agenda com anti-double-booking via EXCLUDE constraint do Postgres, e agendamento sem
-- login (RPCs security definer + token de gerenciamento). Ver CLAUDE.md.
--
-- Todas as tabelas/funções levam o prefixo "salao_" de propósito: este banco Supabase é
-- compartilhado com outro projeto do mesmo usuário, e o prefixo evita colisão de nome no
-- schema "public" sem precisar de um schema Postgres dedicado.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ============================================================
-- configuração do salão (singleton) e admins
-- ============================================================

-- truque padrão de "tabela com uma linha só": chave primária boolean fixa em true.
create table salao_configuracoes (
  id boolean primary key default true check (id),
  nome_salao text not null default 'Salão',
  telefone text,
  endereco text,
  instagram text,
  horario_funcionamento jsonb not null default '{}',
  feriados jsonb not null default '[]',
  antecedencia_minima_minutos int not null default 60,
  antecedencia_maxima_dias int not null default 30,
  antecedencia_cancelamento_horas int not null default 4,
  buffer_padrao_minutos int not null default 10
);

insert into salao_configuracoes (id) values (true);

create table salao_perfis_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'recepcao' check (papel in ('dono', 'recepcao')),
  criado_em timestamptz not null default now()
);

-- ============================================================
-- catálogo
-- ============================================================

create table salao_categorias_servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0
);

create table salao_servicos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references salao_categorias_servico(id) on delete cascade,
  nome text not null,
  descricao text,
  duracao_minutos int not null check (duracao_minutos > 0),
  preco numeric,
  imagem_url text,
  ativo boolean not null default true,
  ordem int not null default 0
);

create table salao_profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  foto_url text,
  bio text,
  ativo boolean not null default true
);

create table salao_profissionais_servicos (
  profissional_id uuid not null references salao_profissionais(id) on delete cascade,
  servico_id uuid not null references salao_servicos(id) on delete cascade,
  primary key (profissional_id, servico_id)
);

create table salao_horarios_trabalho (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references salao_profissionais(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio)
);

-- profissional_id nulo = bloqueia o salão inteiro (ex.: feriado)
create table salao_bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid references salao_profissionais(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null check (fim > inicio),
  motivo text
);

-- ============================================================
-- clientes e agendamentos
-- ============================================================

create table salao_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  email text,
  criado_em timestamptz not null default now()
);

create table salao_agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references salao_clientes(id) on delete cascade,
  profissional_id uuid not null references salao_profissionais(id),
  servico_id uuid not null references salao_servicos(id),
  inicio timestamptz not null,
  fim timestamptz not null check (fim > inicio),
  status text not null default 'confirmado' check (status in ('confirmado', 'cancelado', 'concluido', 'no_show')),
  token_gerenciamento uuid not null default gen_random_uuid() unique,
  notas text,
  criado_em timestamptz not null default now(),
  -- anti-double-booking: o próprio banco recusa sobreposição de horário do mesmo
  -- profissional (exceto agendamentos já cancelados), mesmo sob concorrência.
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status <> 'cancelado')
);

create table salao_notificacoes_enviadas (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references salao_agendamentos(id) on delete cascade,
  tipo text not null check (tipo in ('confirmacao', 'lembrete')),
  canal text not null check (canal in ('email')),
  status text not null default 'enviado' check (status in ('enviado', 'falhou')),
  erro text,
  enviado_em timestamptz not null default now(),
  -- chave única também serve de idempotência: o cron de lembretes usa isso para nunca
  -- reenviar o mesmo tipo/canal para o mesmo agendamento.
  unique (agendamento_id, tipo, canal)
);

-- ============================================================
-- RLS
-- ============================================================

alter table salao_configuracoes enable row level security;
alter table salao_perfis_admin enable row level security;
alter table salao_categorias_servico enable row level security;
alter table salao_servicos enable row level security;
alter table salao_profissionais enable row level security;
alter table salao_profissionais_servicos enable row level security;
alter table salao_horarios_trabalho enable row level security;
alter table salao_bloqueios_agenda enable row level security;
alter table salao_clientes enable row level security;
alter table salao_agendamentos enable row level security;
alter table salao_notificacoes_enviadas enable row level security;

-- security definer: nunca fazer uma policy de "salao_perfis_admin" checar a própria
-- tabela via subquery direta (isso causa "infinite recursion detected in policy", erro
-- 42P17 — já aconteceu de verdade no projeto Saas-Elétrica com a tabela "membros"). Esta
-- função resolve isso: roda com privilégio de dono da tabela, não reaciona a RLS dela
-- mesma.
create or replace function public.salao_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from salao_perfis_admin where user_id = auth.uid())
$$;

-- catálogo: leitura pública (é o cardápio do site), escrita só admin
create policy "catalogo publico configuracoes" on salao_configuracoes for select using (true);
create policy "admin edita configuracoes" on salao_configuracoes for update using (public.salao_is_admin());

create policy "catalogo publico categorias" on salao_categorias_servico for select using (true);
create policy "admin gerencia categorias" on salao_categorias_servico for all using (public.salao_is_admin()) with check (public.salao_is_admin());

create policy "catalogo publico servicos" on salao_servicos for select using (true);
create policy "admin gerencia servicos" on salao_servicos for all using (public.salao_is_admin()) with check (public.salao_is_admin());

create policy "catalogo publico profissionais" on salao_profissionais for select using (true);
create policy "admin gerencia profissionais" on salao_profissionais for all using (public.salao_is_admin()) with check (public.salao_is_admin());

create policy "catalogo publico profissionais_servicos" on salao_profissionais_servicos for select using (true);
create policy "admin gerencia profissionais_servicos" on salao_profissionais_servicos for all using (public.salao_is_admin()) with check (public.salao_is_admin());

create policy "catalogo publico horarios_trabalho" on salao_horarios_trabalho for select using (true);
create policy "admin gerencia horarios_trabalho" on salao_horarios_trabalho for all using (public.salao_is_admin()) with check (public.salao_is_admin());

-- dados pessoais/agenda: sem select público — cliente anônimo só acessa via RPC
-- security definer (salao_criar_agendamento, salao_obter/cancelar_agendamento_por_token),
-- nunca via select direto na tabela.
create policy "admin gerencia clientes" on salao_clientes for all using (public.salao_is_admin()) with check (public.salao_is_admin());
create policy "admin gerencia agendamentos" on salao_agendamentos for all using (public.salao_is_admin()) with check (public.salao_is_admin());
create policy "admin gerencia bloqueios" on salao_bloqueios_agenda for all using (public.salao_is_admin()) with check (public.salao_is_admin());
create policy "admin ve notificacoes" on salao_notificacoes_enviadas for all using (public.salao_is_admin()) with check (public.salao_is_admin());
create policy "admin gerencia perfis_admin" on salao_perfis_admin for all using (public.salao_is_admin()) with check (public.salao_is_admin());

-- ============================================================
-- RPCs para o fluxo do cliente sem login (capability link por token)
-- ============================================================

create or replace function public.salao_criar_agendamento(
  p_nome text,
  p_telefone text,
  p_email text,
  p_servico_id uuid,
  p_profissional_id uuid,
  p_inicio timestamptz
)
returns table (id uuid, token_gerenciamento uuid, inicio timestamptz, fim timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duracao int;
  v_fim timestamptz;
  v_cliente_id uuid;
  v_antecedencia_minima int;
  v_antecedencia_maxima int;
  v_agendamento_id uuid;
  v_token uuid;
begin
  -- Qualificado com o nome da tabela de propósito: a cláusula `returns table (id, ...)`
  -- desta função declara `id`/`inicio`/`fim` como variáveis de saída, que sombreiam
  -- colunas de mesmo nome em referências não qualificadas (erro 42702, "column
  -- reference is ambiguous", já visto em produção).
  select duracao_minutos into v_duracao
    from salao_servicos
    where salao_servicos.id = p_servico_id and salao_servicos.ativo;
  if v_duracao is null then
    raise exception 'serviço inválido ou inativo';
  end if;

  select antecedencia_minima_minutos, antecedencia_maxima_dias
    into v_antecedencia_minima, v_antecedencia_maxima
    from salao_configuracoes;

  if p_inicio < now() + make_interval(mins => v_antecedencia_minima) then
    raise exception 'horário abaixo da antecedência mínima permitida';
  end if;
  if p_inicio > now() + make_interval(days => v_antecedencia_maxima) then
    raise exception 'horário além da antecedência máxima permitida';
  end if;

  v_fim := p_inicio + make_interval(mins => v_duracao);

  insert into salao_clientes (nome, telefone, email)
  values (p_nome, p_telefone, p_email)
  on conflict (telefone) do update
    set nome = excluded.nome,
        email = coalesce(excluded.email, salao_clientes.email)
  returning salao_clientes.id into v_cliente_id;

  insert into salao_agendamentos (cliente_id, profissional_id, servico_id, inicio, fim)
  values (v_cliente_id, p_profissional_id, p_servico_id, p_inicio, v_fim)
  returning salao_agendamentos.id, salao_agendamentos.token_gerenciamento into v_agendamento_id, v_token;

  return query select v_agendamento_id, v_token, p_inicio, v_fim;
end;
$$;

-- salao_agendamentos e salao_bloqueios_agenda não têm select público (RLS só libera pra
-- salao_is_admin()) — de propósito, pra não vazar nome/telefone de cliente. Mas o wizard
-- público de /agendar precisa saber quais horários já estão ocupados pra desenhar o
-- calendário corretamente. Essas duas funções expõem só o intervalo de tempo (sem nenhum
-- dado de cliente), security definer pra furar a RLS com segurança.
create or replace function public.salao_horarios_ocupados_dia(
  p_profissional_id uuid,
  p_inicio_dia timestamptz,
  p_fim_dia timestamptz
)
returns table (inicio timestamptz, fim timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select a.inicio, a.fim
  from salao_agendamentos a
  where a.profissional_id = p_profissional_id
    and a.status = 'confirmado'
    and a.inicio < p_fim_dia
    and a.fim > p_inicio_dia
$$;

create or replace function public.salao_bloqueios_dia(
  p_profissional_id uuid,
  p_inicio_dia timestamptz,
  p_fim_dia timestamptz
)
returns table (inicio timestamptz, fim timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select b.inicio, b.fim
  from salao_bloqueios_agenda b
  where (b.profissional_id = p_profissional_id or b.profissional_id is null)
    and b.inicio < p_fim_dia
    and b.fim > p_inicio_dia
$$;

create or replace function public.salao_obter_agendamento_por_token(p_token uuid)
returns table (
  id uuid,
  inicio timestamptz,
  fim timestamptz,
  status text,
  servico_nome text,
  profissional_nome text,
  cliente_nome text
)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.inicio, a.fim, a.status, s.nome, p.nome, c.nome
  from salao_agendamentos a
  join salao_servicos s on s.id = a.servico_id
  join salao_profissionais p on p.id = a.profissional_id
  join salao_clientes c on c.id = a.cliente_id
  where a.token_gerenciamento = p_token
$$;

create or replace function public.salao_cancelar_agendamento_por_token(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamptz;
  v_antecedencia_cancelamento int;
begin
  select inicio into v_inicio
    from salao_agendamentos
    where token_gerenciamento = p_token and status = 'confirmado';

  if v_inicio is null then
    raise exception 'agendamento não encontrado ou já cancelado';
  end if;

  select antecedencia_cancelamento_horas into v_antecedencia_cancelamento from salao_configuracoes;

  if v_inicio < now() + make_interval(hours => v_antecedencia_cancelamento) then
    raise exception 'prazo para cancelamento online expirado, entre em contato com o salão';
  end if;

  update salao_agendamentos set status = 'cancelado' where token_gerenciamento = p_token;
end;
$$;

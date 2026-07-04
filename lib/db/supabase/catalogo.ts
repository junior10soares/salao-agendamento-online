import { createClient } from "@/lib/db/supabase/server";

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_minutos: number;
  preco: number | null;
  imagem_url: string | null;
  ativo: boolean;
};

export type CategoriaComServicos = {
  id: string;
  nome: string;
  servicos: Servico[];
};

export type Profissional = {
  id: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
};

export type ConfiguracoesSalao = {
  nome_salao: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  horario_funcionamento: Record<string, { abre: string; fecha: string }>;
};

// Leitura do catálogo — por padrão só serviços ativos (uso público, RLS permite select
// sem autenticação). O painel admin passa apenasAtivos=false para poder reativar/editar.
export async function listarCategoriasComServicos(
  apenasAtivos = true,
): Promise<CategoriaComServicos[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_categorias_servico")
    .select(
      "id, nome, salao_servicos(id, nome, descricao, duracao_minutos, preco, imagem_url, ativo)",
    )
    .order("ordem")
    .order("ordem", { referencedTable: "salao_servicos" });

  if (error) throw error;

  return data.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    servicos: apenasAtivos
      ? categoria.salao_servicos.filter((s) => s.ativo)
      : categoria.salao_servicos,
  }));
}

export async function criarCategoria(nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_categorias_servico").insert({ nome });
  if (error) throw error;
}

export async function excluirCategoria(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_categorias_servico").delete().eq("id", id);
  if (error) throw error;
}

export type NovoServicoInput = {
  categoriaId: string;
  nome: string;
  descricao: string | null;
  duracaoMinutos: number;
  preco: number | null;
};

export async function criarServico(input: NovoServicoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_servicos").insert({
    categoria_id: input.categoriaId,
    nome: input.nome,
    descricao: input.descricao,
    duracao_minutos: input.duracaoMinutos,
    preco: input.preco,
  });
  if (error) throw error;
}

export async function atualizarServico(
  id: string,
  input: Partial<Omit<NovoServicoInput, "categoriaId">> & { ativo?: boolean },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salao_servicos")
    .update({
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.descricao !== undefined && { descricao: input.descricao }),
      ...(input.duracaoMinutos !== undefined && { duracao_minutos: input.duracaoMinutos }),
      ...(input.preco !== undefined && { preco: input.preco }),
      ...(input.ativo !== undefined && { ativo: input.ativo }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirServico(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_servicos").delete().eq("id", id);
  if (error) throw error;
}

export async function listarProfissionais(): Promise<Profissional[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_profissionais")
    .select("id, nome, foto_url, bio")
    .eq("ativo", true);

  if (error) throw error;
  return data;
}

export async function listarProfissionaisPorServico(servicoId: string): Promise<Profissional[]> {
  const supabase = await createClient();
  // Sem `supabase gen types` (nenhum projeto real ainda), o embed salao_profissionais(...)
  // não é inferido como relação 1:1 — tipamos manualmente (ver "Pendências" no CLAUDE.md).
  const { data, error } = await supabase
    .from("salao_profissionais_servicos")
    .select("salao_profissionais(id, nome, foto_url, bio, ativo)")
    .eq("servico_id", servicoId)
    .overrideTypes<{ salao_profissionais: Profissional & { ativo: boolean } }[]>();

  if (error) throw error;
  return data.map((r) => r.salao_profissionais).filter((p) => p.ativo);
}

export async function obterProfissional(id: string): Promise<Profissional | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_profissionais")
    .select("id, nome, foto_url, bio")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Inverso de listarProfissionaisPorServico — usado quando o cliente entra no wizard já
// com o profissional escolhido (ex.: clicou no card dele em /profissionais), pra filtrar
// a lista de serviços só nos que esse profissional atende.
export async function listarServicosPorProfissional(profissionalId: string): Promise<Servico[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_profissionais_servicos")
    .select("salao_servicos(id, nome, descricao, duracao_minutos, preco, imagem_url, ativo)")
    .eq("profissional_id", profissionalId)
    .overrideTypes<{ salao_servicos: Servico }[]>();

  if (error) throw error;
  return data.map((r) => r.salao_servicos).filter((s) => s.ativo);
}

export async function obterConfiguracoesSalao(): Promise<ConfiguracoesSalao> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_configuracoes")
    .select("nome_salao, telefone, endereco, instagram, horario_funcionamento")
    .single();

  if (error) throw error;
  return data;
}

import { createClient } from "@/lib/db/supabase/server";

export type ProfissionalAdmin = {
  id: string;
  nome: string;
  bio: string | null;
  ativo: boolean;
};

export type HorarioTrabalho = { diaSemana: number; horaInicio: string; horaFim: string };

export async function listarProfissionaisAdmin(): Promise<ProfissionalAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_profissionais")
    .select("id, nome, bio, ativo")
    .order("nome");
  if (error) throw error;
  return data;
}

export async function criarProfissional(nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_profissionais").insert({ nome });
  if (error) throw error;
}

export async function atualizarProfissional(
  id: string,
  input: { nome?: string; bio?: string | null; ativo?: boolean },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_profissionais").update(input).eq("id", id);
  if (error) throw error;
}

export async function excluirProfissional(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_profissionais").delete().eq("id", id);
  if (error) throw error;
}

export async function listarHorariosTrabalho(profissionalId: string): Promise<HorarioTrabalho[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_horarios_trabalho")
    .select("dia_semana, hora_inicio, hora_fim")
    .eq("profissional_id", profissionalId);
  if (error) throw error;
  return data.map((h) => ({
    diaSemana: h.dia_semana,
    horaInicio: h.hora_inicio.slice(0, 5),
    horaFim: h.hora_fim.slice(0, 5),
  }));
}

// Substitui a semana inteira do profissional de uma vez (apaga tudo e reinsere os dias
// preenchidos) — mais simples que fazer diff dia a dia, e o volume de linhas é pequeno.
export async function definirHorariosTrabalho(
  profissionalId: string,
  horarios: HorarioTrabalho[],
): Promise<void> {
  const supabase = await createClient();
  const { error: erroDelete } = await supabase
    .from("salao_horarios_trabalho")
    .delete()
    .eq("profissional_id", profissionalId);
  if (erroDelete) throw erroDelete;

  if (horarios.length === 0) return;

  const { error: erroInsert } = await supabase.from("salao_horarios_trabalho").insert(
    horarios.map((h) => ({
      profissional_id: profissionalId,
      dia_semana: h.diaSemana,
      hora_inicio: h.horaInicio,
      hora_fim: h.horaFim,
    })),
  );
  if (erroInsert) throw erroInsert;
}

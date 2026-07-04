import { createClient } from "@/lib/db/supabase/server";

export type ConfiguracoesSalaoAdmin = {
  nomeSalao: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  horarioFuncionamento: Record<string, { abre: string; fecha: string }>;
  feriados: string[];
  antecedenciaMinimaMinutos: number;
  antecedenciaMaximaDias: number;
  antecedenciaCancelamentoHoras: number;
  bufferPadraoMinutos: number;
};

export async function obterConfiguracoesSalaoAdmin(): Promise<ConfiguracoesSalaoAdmin> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("salao_configuracoes").select("*").single();
  if (error) throw error;

  return {
    nomeSalao: data.nome_salao,
    telefone: data.telefone,
    endereco: data.endereco,
    instagram: data.instagram,
    horarioFuncionamento: data.horario_funcionamento ?? {},
    feriados: data.feriados ?? [],
    antecedenciaMinimaMinutos: data.antecedencia_minima_minutos,
    antecedenciaMaximaDias: data.antecedencia_maxima_dias,
    antecedenciaCancelamentoHoras: data.antecedencia_cancelamento_horas,
    bufferPadraoMinutos: data.buffer_padrao_minutos,
  };
}

export async function atualizarConfiguracoesSalao(input: ConfiguracoesSalaoAdmin): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salao_configuracoes")
    .update({
      nome_salao: input.nomeSalao,
      telefone: input.telefone,
      endereco: input.endereco,
      instagram: input.instagram,
      horario_funcionamento: input.horarioFuncionamento,
      feriados: input.feriados,
      antecedencia_minima_minutos: input.antecedenciaMinimaMinutos,
      antecedencia_maxima_dias: input.antecedenciaMaximaDias,
      antecedencia_cancelamento_horas: input.antecedenciaCancelamentoHoras,
      buffer_padrao_minutos: input.bufferPadraoMinutos,
    })
    .eq("id", true);
  if (error) throw error;
}

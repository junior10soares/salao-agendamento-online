export type Intervalo = { inicio: Date; fim: Date };

export type GerarHorariosDisponiveisInput = {
  // Janelas de trabalho já resolvidas para o dia consultado (Dates absolutos, não HH:mm).
  janelasTrabalho: Intervalo[];
  // Folgas/feriados que se sobrepõem ao dia — bloqueio rígido, sem buffer.
  bloqueios: Intervalo[];
  // Agendamentos já confirmados do profissional no dia — o buffer do salão é aplicado
  // em volta de cada um (não precisa vir com o buffer já somado).
  agendamentosOcupados: Intervalo[];
  duracaoServicoMinutos: number;
  bufferMinutos: number;
  granularidadeMinutos?: number;
  agora?: Date;
};

export type SlotCandidato = { inicio: Date; disponivel: boolean };

function seSobrepoe(aInicio: Date, aFim: Date, bInicio: Date, bFim: Date): boolean {
  return aInicio < bFim && bInicio < aFim;
}

// Função pura (sem I/O) — recebe os dados já buscados do Supabase e devolve todos os
// horários de início candidatos dentro do expediente, cada um com `disponivel` marcando
// se cabe sem conflito. Slots no passado nem entram na lista (não tem por que mostrar
// desabilitado). Testável exaustivamente sem mockar banco.
export function gerarHorariosDisponiveis({
  janelasTrabalho,
  bloqueios,
  agendamentosOcupados,
  duracaoServicoMinutos,
  bufferMinutos,
  granularidadeMinutos = 15,
  agora = new Date(),
}: GerarHorariosDisponiveisInput): SlotCandidato[] {
  const duracaoMs = duracaoServicoMinutos * 60_000;
  const bufferMs = bufferMinutos * 60_000;
  const granularidadeMs = granularidadeMinutos * 60_000;

  const ocupadosComBuffer = agendamentosOcupados.map((o) => ({
    inicio: new Date(o.inicio.getTime() - bufferMs),
    fim: new Date(o.fim.getTime() + bufferMs),
  }));

  const candidatos: SlotCandidato[] = [];

  for (const janela of janelasTrabalho) {
    const fimJanelaMs = janela.fim.getTime();
    for (
      let candidatoMs = janela.inicio.getTime();
      candidatoMs + duracaoMs <= fimJanelaMs;
      candidatoMs += granularidadeMs
    ) {
      const inicioCandidato = new Date(candidatoMs);
      const fimCandidato = new Date(candidatoMs + duracaoMs);

      if (inicioCandidato < agora) continue;

      const conflita =
        bloqueios.some((b) => seSobrepoe(inicioCandidato, fimCandidato, b.inicio, b.fim)) ||
        ocupadosComBuffer.some((o) => seSobrepoe(inicioCandidato, fimCandidato, o.inicio, o.fim));

      candidatos.push({ inicio: inicioCandidato, disponivel: !conflita });
    }
  }

  return candidatos;
}

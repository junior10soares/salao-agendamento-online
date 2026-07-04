import { describe, expect, it } from "vitest";
import { gerarHorariosDisponiveis } from "@/lib/agenda/gerar-horarios-disponiveis";

const dia = (hora: string) => new Date(`2025-06-02T${hora}:00-03:00`); // segunda-feira

describe("gerarHorariosDisponiveis", () => {
  it("gera slots a cada 15min dentro do expediente, todos disponíveis", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [{ inicio: dia("09:00"), fim: dia("10:00") }],
      bloqueios: [],
      agendamentosOcupados: [],
      duracaoServicoMinutos: 30,
      bufferMinutos: 0,
      agora: dia("00:00"),
    });

    expect(slots).toEqual([
      { inicio: dia("09:00"), disponivel: true },
      { inicio: dia("09:15"), disponivel: true },
      { inicio: dia("09:30"), disponivel: true },
    ]);
  });

  it("não gera candidato que ultrapassa o fim do expediente", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [{ inicio: dia("09:00"), fim: dia("10:00") }],
      bloqueios: [],
      agendamentosOcupados: [],
      duracaoServicoMinutos: 90,
      bufferMinutos: 0,
      agora: dia("00:00"),
    });

    expect(slots).toEqual([]);
  });

  it("marca como indisponível o candidato que cai dentro de um bloqueio no meio do dia", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [{ inicio: dia("09:00"), fim: dia("11:00") }],
      bloqueios: [{ inicio: dia("09:30"), fim: dia("10:30") }],
      agendamentosOcupados: [],
      duracaoServicoMinutos: 30,
      bufferMinutos: 0,
      granularidadeMinutos: 30,
      agora: dia("00:00"),
    });

    expect(slots).toEqual([
      { inicio: dia("09:00"), disponivel: true },
      { inicio: dia("09:30"), disponivel: false },
      { inicio: dia("10:00"), disponivel: false },
      { inicio: dia("10:30"), disponivel: true },
    ]);
  });

  it("respeita o buffer entre atendimentos já confirmados", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [{ inicio: dia("09:00"), fim: dia("11:30") }],
      bloqueios: [],
      agendamentosOcupados: [{ inicio: dia("10:00"), fim: dia("10:30") }],
      duracaoServicoMinutos: 30,
      bufferMinutos: 15,
      granularidadeMinutos: 15,
      agora: dia("00:00"),
    });

    // ocupado com buffer: 09:45–10:45 — candidatos de 09:30 a 10:30 caem no buffer
    expect(slots).toEqual([
      { inicio: dia("09:00"), disponivel: true },
      { inicio: dia("09:15"), disponivel: true },
      { inicio: dia("09:30"), disponivel: false },
      { inicio: dia("09:45"), disponivel: false },
      { inicio: dia("10:00"), disponivel: false },
      { inicio: dia("10:15"), disponivel: false },
      { inicio: dia("10:30"), disponivel: false },
      { inicio: dia("10:45"), disponivel: true },
      { inicio: dia("11:00"), disponivel: true },
    ]);
  });

  it("não gera nenhum slot quando o profissional está de folga o dia inteiro", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [],
      bloqueios: [],
      agendamentosOcupados: [],
      duracaoServicoMinutos: 30,
      bufferMinutos: 0,
      agora: dia("00:00"),
    });

    expect(slots).toEqual([]);
  });

  it("não gera slot no passado (nem como indisponível)", () => {
    const slots = gerarHorariosDisponiveis({
      janelasTrabalho: [{ inicio: dia("09:00"), fim: dia("10:00") }],
      bloqueios: [],
      agendamentosOcupados: [],
      duracaoServicoMinutos: 30,
      bufferMinutos: 0,
      granularidadeMinutos: 30,
      agora: dia("09:30"),
    });

    expect(slots).toEqual([{ inicio: dia("09:30"), disponivel: true }]);
  });
});

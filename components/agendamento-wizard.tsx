"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeIn } from "@/lib/motion";
import type { CategoriaComServicos, Profissional } from "@/lib/db/supabase/catalogo";
import {
  buscarProfissionaisAction,
  buscarSlotsAction,
  criarAgendamentoAction,
} from "@/app/(site)/agendar/actions";

type Passo = "servico" | "profissional" | "horario" | "dados" | "sucesso";

type ServicoEscolhido = { id: string; nome: string; duracaoMinutos: number };

const hojeIso = () => new Date().toISOString().slice(0, 10);

// Evita o desvio de fuso horário de `toISOString()` ao converter Date <-> "YYYY-MM-DD"
// vindo do Calendar (que trabalha com Date em horário local).
function dataParaIso(d: Date) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function isoParaData(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

export function AgendamentoWizard({
  categorias,
  profissionalFixo = null,
}: {
  categorias: CategoriaComServicos[];
  profissionalFixo?: Profissional | null;
}) {
  const [passo, setPasso] = useState<Passo>("servico");
  const [servico, setServico] = useState<ServicoEscolhido | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissional, setProfissional] = useState<Profissional | null>(profissionalFixo);
  const [data, setData] = useState(hojeIso());
  const [slots, setSlots] = useState<{ inicio: string; disponivel: boolean }[]>([]);
  const [horario, setHorario] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function escolherServico(s: ServicoEscolhido) {
    setServico(s);
    setErro(null);
    // Profissional já veio escolhido (ex.: clicou no card dele em /profissionais) — pula
    // a etapa de escolher profissional e já busca os horários livres dele.
    if (profissionalFixo) {
      setPasso("horario");
      buscarHorarios(profissionalFixo.id, data, s.id);
      return;
    }
    startTransition(async () => {
      const lista = await buscarProfissionaisAction(s.id);
      setProfissionais(lista);
      setPasso("profissional");
    });
  }

  function escolherProfissional(p: Profissional) {
    setProfissional(p);
    setPasso("horario");
    buscarHorarios(p.id, data, servico!.id);
  }

  function buscarHorarios(profissionalId: string, dataIso: string, servicoId: string) {
    setHorario(null);
    setErro(null);
    startTransition(async () => {
      const disponiveis = await buscarSlotsAction(profissionalId, servicoId, `${dataIso}T00:00:00`);
      setSlots(disponiveis);
    });
  }

  function onMudarData(novaData: string) {
    setData(novaData);
    if (profissional && servico) buscarHorarios(profissional.id, novaData, servico.id);
  }

  async function confirmar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarAgendamentoAction({
        nome: String(formData.get("nome") ?? ""),
        telefone: String(formData.get("telefone") ?? ""),
        email: String(formData.get("email") ?? ""),
        servicoId: servico!.id,
        profissionalId: profissional!.id,
        inicioIso: horario!,
      });

      if (resultado.status === "erro") {
        setErro(resultado.mensagem);
        return;
      }
      if (resultado.status === "sucesso") {
        setToken(resultado.token);
        setPasso("sucesso");
      }
    });
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {passo === "servico" && (
          <motion.div key="servico" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-8">
            {categorias.map((categoria) => (
              <div key={categoria.id} className="space-y-3">
                <h3 className="font-heading text-lg">{categoria.nome}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoria.servicos.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        escolherServico({ id: s.id, nome: s.nome, duracaoMinutos: s.duracao_minutos })
                      }
                      className="border-border bg-card hover:border-gold cursor-pointer rounded-lg border p-4 text-left transition-colors"
                    >
                      <p className="font-medium">{s.nome}</p>
                      <p className="text-muted-foreground text-sm">{s.duracao_minutos} min</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {passo === "profissional" && (
          <motion.div key="profissional" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-4">
            <p className="text-muted-foreground text-sm">Serviço: {servico?.nome}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {profissionais.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => escolherProfissional(p)}
                  className="border-border bg-card hover:border-gold cursor-pointer rounded-lg border p-4 text-left transition-colors"
                >
                  <p className="font-medium">{p.nome}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setPasso("servico")}>
              Voltar
            </Button>
          </motion.div>
        )}

        {passo === "horario" && (
          <motion.div key="horario" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {servico?.nome} com {profissional?.nome}
            </p>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <Label>Data</Label>
              <Calendar
                mode="single"
                selected={isoParaData(data)}
                onSelect={(d) => d && onMudarData(dataParaIso(d))}
                disabled={{ before: hoje }}
                locale={ptBR}
                className="border-border bg-card rounded-lg border"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {pending && <p className="text-muted-foreground text-sm">Buscando horários…</p>}
              {!pending && slots.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Fora do expediente nesse dia. Escolha outra data.
                </p>
              )}
              {!pending && slots.length > 0 && slots.every((s) => !s.disponivel) && (
                <p className="text-muted-foreground text-sm">
                  Todos os horários desse dia já estão ocupados. Escolha outra data.
                </p>
              )}
              {slots.map((s) => (
                <button
                  key={s.inicio}
                  type="button"
                  disabled={!s.disponivel}
                  onClick={() => setHorario(s.inicio)}
                  data-selected={horario === s.inicio}
                  title={s.disponivel ? undefined : "Horário já ocupado"}
                  className="border-border data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground enabled:hover:border-gold cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:border-dashed disabled:bg-muted/50 disabled:text-muted-foreground/50 disabled:line-through"
                >
                  {new Date(s.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setPasso(profissionalFixo ? "servico" : "profissional")}
              >
                Voltar
              </Button>
              <Button disabled={!horario} onClick={() => setPasso("dados")}>
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {passo === "dados" && (
          <motion.form
            key="dados"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            action={confirmar}
            className="space-y-4"
          >
            <p className="text-muted-foreground text-sm">
              {servico?.nome} com {profissional?.nome} —{" "}
              {horario &&
                new Date(horario).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
              <Input id="telefone" name="telefone" type="tel" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input id="email" name="email" type="email" />
            </div>
            {erro && <p className="text-destructive text-sm">{erro}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setPasso("horario")}>
                Voltar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Confirmando…" : "Confirmar agendamento"}
              </Button>
            </div>
          </motion.form>
        )}

        {passo === "sucesso" && (
          <motion.div key="sucesso" variants={fadeIn} initial="hidden" animate="show" className="space-y-4 text-center">
            <h3 className="font-heading text-2xl">Agendamento confirmado!</h3>
            <p className="text-muted-foreground">
              Enviamos os detalhes para o seu telefone/email. Guarde o link abaixo para
              ver ou cancelar o seu horário.
            </p>
            <Button asChild>
              <a href={`/meus-agendamentos/${token}`}>Ver meu agendamento</a>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

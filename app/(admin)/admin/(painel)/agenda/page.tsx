import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listarAgendamentosAdmin } from "@/lib/db/supabase/agendamentos";
import { listarCategoriasComServicos, listarProfissionais } from "@/lib/db/supabase/catalogo";
import { mudarStatusAction, criarAgendamentoManualAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
  no_show: "Não compareceu",
};

export default async function AdminAgendaPage() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const daqui14dias = new Date(hoje);
  daqui14dias.setDate(daqui14dias.getDate() + 14);

  const [agendamentos, categorias, profissionais] = await Promise.all([
    listarAgendamentosAdmin(hoje, daqui14dias).catch(() => []),
    listarCategoriasComServicos().catch(() => []),
    listarProfissionais().catch(() => []),
  ]);

  const servicos = categorias.flatMap((c) => c.servicos.map((s) => ({ ...s, categoria: c.nome })));

  const porDia = new Map<string, typeof agendamentos>();
  for (const a of agendamentos) {
    const chave = a.inicio.toLocaleDateString("pt-BR");
    porDia.set(chave, [...(porDia.get(chave) ?? []), a]);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl">Agenda</h1>
        <p className="text-muted-foreground text-sm">Próximos 14 dias.</p>
      </div>

      <div className="space-y-8">
        {porDia.size === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum agendamento nesse período.</p>
        )}
        {[...porDia.entries()].map(([dia, itens]) => (
          <div key={dia} className="space-y-3">
            <h2 className="font-heading text-lg">{dia}</h2>
            <div className="border-border overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Hora</th>
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Serviço</th>
                    <th className="px-4 py-2 font-medium">Profissional</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((a) => (
                    <tr key={a.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        {a.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2">
                        {a.clienteNome}
                        <span className="text-muted-foreground block text-xs">
                          {a.clienteTelefone}
                        </span>
                      </td>
                      <td className="px-4 py-2">{a.servicoNome}</td>
                      <td className="px-4 py-2">{a.profissionalNome}</td>
                      <td className="px-4 py-2">{STATUS_LABEL[a.status] ?? a.status}</td>
                      <td className="px-4 py-2">
                        {a.status === "confirmado" && (
                          <div className="flex gap-1">
                            <form action={mudarStatusAction.bind(null, a.id, "concluido")}>
                              <Button type="submit" size="sm" variant="outline">
                                Concluir
                              </Button>
                            </form>
                            <form action={mudarStatusAction.bind(null, a.id, "no_show")}>
                              <Button type="submit" size="sm" variant="outline">
                                Não veio
                              </Button>
                            </form>
                            <form action={mudarStatusAction.bind(null, a.id, "cancelado")}>
                              <Button type="submit" size="sm" variant="destructive">
                                Cancelar
                              </Button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="border-border max-w-lg space-y-4 rounded-lg border p-6">
        <h2 className="font-heading text-lg">Novo agendamento manual</h2>
        <p className="text-muted-foreground text-sm">
          Para atendimento por telefone ou walk-in. Não valida antecedência mínima do
          cliente, mas ainda impede conflito de horário com outro agendamento.
        </p>
        <form action={criarAgendamentoManualAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nome">Nome do cliente</Label>
            <Input id="nome" name="nome" required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicio">Data e hora</Label>
            <Input id="inicio" name="inicio" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servicoId">Serviço</Label>
            <select
              id="servicoId"
              name="servicoId"
              required
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Selecione</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.categoria} — {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profissionalId">Profissional</Label>
            <select
              id="profissionalId"
              name="profissionalId"
              required
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Selecione</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Criar agendamento</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

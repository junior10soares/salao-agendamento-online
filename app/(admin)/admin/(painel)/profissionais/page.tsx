import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listarProfissionaisAdmin, listarHorariosTrabalho } from "@/lib/db/supabase/profissionais";
import { criarProfissionalAction, excluirProfissionalAction, atualizarProfissionalAction } from "./actions";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function AdminProfissionaisPage() {
  const profissionais = await listarProfissionaisAdmin().catch(() => []);
  const horariosPorProfissional = await Promise.all(
    profissionais.map((p) => listarHorariosTrabalho(p.id).catch(() => [])),
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl">Profissionais</h1>
        <p className="text-muted-foreground text-sm">
          Horário em branco = folga naquele dia da semana.
        </p>
      </div>

      {profissionais.map((profissional, i) => {
        const horarios = horariosPorProfissional[i];
        const porDia = new Map(horarios.map((h) => [h.diaSemana, h]));

        return (
          <form
            key={profissional.id}
            action={atualizarProfissionalAction.bind(null, profissional.id)}
            className="border-border bg-card space-y-4 rounded-lg border p-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input name="nome" defaultValue={profissional.nome} required />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="ativo" defaultChecked={profissional.ativo} />
                  Ativo
                </label>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Bio</Label>
                <Input name="bio" defaultValue={profissional.bio ?? ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horário de trabalho</Label>
              <div className="grid gap-2">
                {DIAS.map((nomeDia, dia) => {
                  const horario = porDia.get(dia);
                  return (
                    <div key={dia} className="grid grid-cols-3 items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{nomeDia}</span>
                      <Input
                        type="time"
                        name={`dia_${dia}_inicio`}
                        defaultValue={horario?.horaInicio ?? ""}
                      />
                      <Input type="time" name={`dia_${dia}_fim`} defaultValue={horario?.horaFim ?? ""} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Salvar
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                formAction={excluirProfissionalAction.bind(null, profissional.id)}
              >
                Excluir
              </Button>
            </div>
          </form>
        );
      })}

      <form action={criarProfissionalAction} className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="nomeProfissional">Novo profissional</Label>
          <Input id="nomeProfissional" name="nome" required />
        </div>
        <Button type="submit" variant="outline">
          Adicionar
        </Button>
      </form>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listarCategoriasComServicos } from "@/lib/db/supabase/catalogo";
import {
  criarCategoriaAction,
  excluirCategoriaAction,
  criarServicoAction,
  atualizarServicoAction,
  excluirServicoAction,
} from "./actions";

export default async function AdminServicosPage() {
  const categorias = await listarCategoriasComServicos(false).catch(() => []);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl">Serviços</h1>
        <p className="text-muted-foreground text-sm">
          Serviços desativados não aparecem no site nem no agendamento online.
        </p>
      </div>

      {categorias.map((categoria) => (
        <section key={categoria.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg">{categoria.nome}</h2>
            <form action={excluirCategoriaAction.bind(null, categoria.id)}>
              <Button type="submit" size="sm" variant="ghost">
                Excluir categoria
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            {categoria.servicos.map((servico) => (
              <form
                key={servico.id}
                action={atualizarServicoAction.bind(null, servico.id)}
                className="border-border bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-5"
              >
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input name="nome" defaultValue={servico.nome} required />
                </div>
                <div className="space-y-1">
                  <Label>Duração (min)</Label>
                  <Input name="duracaoMinutos" type="number" defaultValue={servico.duracao_minutos} required />
                </div>
                <div className="space-y-1">
                  <Label>Preço (R$)</Label>
                  <Input name="preco" type="number" step="0.01" defaultValue={servico.preco ?? ""} />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="ativo" defaultChecked={servico.ativo} />
                    Ativo
                  </label>
                </div>
                <div className="sm:col-span-5 flex gap-2">
                  <Button type="submit" size="sm">
                    Salvar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    formAction={excluirServicoAction.bind(null, servico.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </form>
            ))}
          </div>

          <form
            action={criarServicoAction}
            className="border-border grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-5"
          >
            <input type="hidden" name="categoriaId" value={categoria.id} />
            <div className="space-y-1 sm:col-span-2">
              <Label>Nome</Label>
              <Input name="nome" required />
            </div>
            <div className="space-y-1">
              <Label>Duração (min)</Label>
              <Input name="duracaoMinutos" type="number" required />
            </div>
            <div className="space-y-1">
              <Label>Preço (R$)</Label>
              <Input name="preco" type="number" step="0.01" />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm" variant="outline">
                Adicionar serviço
              </Button>
            </div>
          </form>
        </section>
      ))}

      <form action={criarCategoriaAction} className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="nomeCategoria">Nova categoria</Label>
          <Input id="nomeCategoria" name="nome" required placeholder="Ex.: Sobrancelhas" />
        </div>
        <Button type="submit" variant="outline">
          Adicionar categoria
        </Button>
      </form>
    </div>
  );
}

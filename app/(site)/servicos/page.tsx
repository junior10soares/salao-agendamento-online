import { SectionHeading } from "@/components/section-heading";
import { Reveal, StaggerGroup } from "@/components/reveal";
import { EmBreve } from "@/components/em-breve";
import { listarCategoriasComServicos } from "@/lib/db/supabase/catalogo";

export default async function ServicosPage() {
  const categorias = await listarCategoriasComServicos().catch(() => null);

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-6 py-24">
      <SectionHeading
        eyebrow="Nossos serviços"
        title="Cabelo, unhas e estética"
        description="Cada atendimento é feito sob medida, do primeiro corte à última pincelada."
      />

      {!categorias || categorias.length === 0 ? (
        <EmBreve mensagem="Catálogo de serviços em breve." />
      ) : (
        <div className="space-y-14">
          {categorias.map((categoria) => (
            <section key={categoria.id} className="space-y-6">
              <h3 className="font-heading text-2xl">{categoria.nome}</h3>
              <StaggerGroup className="grid gap-4 md:grid-cols-2">
                {categoria.servicos.map((servico) => (
                  <Reveal
                    key={servico.id}
                    className="border-border bg-card hover:border-gold flex items-center gap-4 rounded-lg border p-3 transition-colors"
                  >
                    {servico.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={servico.imagem_url}
                        alt=""
                        loading="lazy"
                        className="h-20 w-20 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="flex flex-1 items-baseline justify-between gap-4">
                      <div>
                        <p className="font-medium">{servico.nome}</p>
                        {servico.descricao && (
                          <p className="text-muted-foreground mt-1 text-sm">{servico.descricao}</p>
                        )}
                        <p className="text-muted-foreground mt-2 text-xs">
                          {servico.duracao_minutos} min
                        </p>
                      </div>
                      {servico.preco !== null && (
                        <p className="text-gold font-heading shrink-0 text-lg">
                          {servico.preco.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      )}
                    </div>
                  </Reveal>
                ))}
              </StaggerGroup>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

import { SectionHeading } from "@/components/section-heading";
import { Reveal, StaggerGroup } from "@/components/reveal";

// Galeria é estática (sem tabela própria no schema) — para adicionar fotos reais do
// salão, trocar os itens abaixo (ou colocar arquivos em public/galeria e apontar pra lá).
// Se crescer a ponto de precisar de gestão pelo painel admin, aí sim vira tabela (ver
// CLAUDE.md, "Pendências"). Fotos fictícias (Unsplash) só para não deixar a página vazia
// antes do conteúdo real do salão.
const FOTOS = [
  {
    url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&auto=format&fit=crop",
    alt: "Ambiente do salão com cadeiras de atendimento",
  },
  {
    url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80&auto=format&fit=crop",
    alt: "Finalização de escova em cliente",
  },
  {
    url: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=80&auto=format&fit=crop",
    alt: "Profissional secando o cabelo de uma cliente",
  },
  {
    url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop",
    alt: "Unhas decoradas em preto e dourado",
  },
  {
    url: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80&auto=format&fit=crop",
    alt: "Aplicação de esmalte rosa",
  },
  {
    url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop",
    alt: "Cliente recebendo tratamento de limpeza de pele",
  },
];

export default function GaleriaPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-16 px-6 py-24">
      <SectionHeading
        eyebrow="Resultados"
        title="Galeria"
        description="Antes e depois dos nossos atendimentos."
      />
      <StaggerGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {FOTOS.map((foto) => (
          <Reveal key={foto.url} className="group border-border overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.alt}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Reveal>
        ))}
      </StaggerGroup>
    </main>
  );
}

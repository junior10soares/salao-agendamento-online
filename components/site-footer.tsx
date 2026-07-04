import Link from "next/link";
import { Logo, NOME_SALAO } from "@/components/logo";
import { NAV_LINKS } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-1 text-sm">
            Cabelo, unhas e estética com atendimento premium.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-border/60 border-t px-6 py-4">
        <p className="text-muted-foreground mx-auto max-w-6xl text-xs">
          © {new Date().getFullYear()} {NOME_SALAO}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

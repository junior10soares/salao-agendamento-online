"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/profissionais", label: "Profissionais" },
  { href: "/admin/configuracoes", label: "Configurações" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-card flex w-56 shrink-0 flex-col border-r px-4 py-6">
      <p className="font-heading mb-6 px-2 text-lg">Painel</p>
      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-2 py-2 text-sm transition-colors",
              pathname.startsWith(link.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="text-muted-foreground hover:text-foreground w-full cursor-pointer rounded-md px-2 py-2 text-left text-sm transition-colors"
        >
          Sair
        </button>
      </form>
    </aside>
  );
}

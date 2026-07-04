import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client com sessão do usuário (respeita RLS). Usar em quase toda leitura/escrita de domínio.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ponytail: setAll chamado de um Server Component (sem permissão de escrita
            // de cookie); ok ignorar aqui pois o middleware já cuida do refresh de sessão.
          }
        },
      },
    },
  );
}

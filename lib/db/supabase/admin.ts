import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service-role: ignora RLS. Só para cron de lembretes e scripts internos —
// nunca chamar a partir de uma rota que recebe input de usuário sem validar antes.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

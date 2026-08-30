// Supabase Edge Function: due-reminders
//
// Calls rpc_run_due_reminders(), which finds every ISSUED book due in 1 or 2
// days and creates a notification for the student — skipping any issue that
// already has a reminder logged in due_reminder_log, so re-running this
// function (or a retry) never creates duplicates.
//
// Deploy:  supabase functions deploy due-reminders
// Schedule (Supabase Dashboard -> Edge Functions -> due-reminders -> Cron):
//   0 3 * * *   (03:00 UTC daily — adjust to your timezone)
// Or via supabase/config.toml, see the [functions.due-reminders] section.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const expected = `Bearer ${Deno.env.get('EDGE_FUNCTION_SECRET') ?? ''}`
    // Optional shared-secret check if you invoke this over HTTP yourself
    // instead of via the Supabase cron scheduler (which sets its own auth).
    if (Deno.env.get('EDGE_FUNCTION_SECRET') && authHeader !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabaseAdmin.rpc('rpc_run_due_reminders')
    if (error) throw error

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

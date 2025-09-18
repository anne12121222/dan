
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

serve(async (req) => {
  if (req.method === 'POST') {
    const { name, email, password, role, master_agent_id } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, master_agent_id },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  }

  return new Response("Method Not Allowed", { status: 405 })
})

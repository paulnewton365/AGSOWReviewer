// supabase/functions/admin-users/index.ts
//
// Handles all admin user operations that require the service role key:
//   - request-access:  PUBLIC — create a pending profile (active=false), no auth required
//   - create:          ADMIN — create an active auth user + profile
//   - update-password: ADMIN — change a user's password
//   - delete:          ADMIN — permanently delete a user from auth + profiles
//
// Deploy with:  supabase functions deploy admin-users
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    // ---- Service role client (bypasses RLS) ----
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ================================================================
    // PUBLIC ACTION — no authentication required
    // Creates a pending user (active=false) for admin review
    // ================================================================
    if (action === 'request-access') {
      const { email, name, password, role, requestNote, practice } = payload;
      if (!email || !name || !password) {
        return json({ error: 'email, name and password are required' }, 400);
      }

      // Check if email already exists
      const { data: existing } = await admin.from('profiles')
        .select('id, active')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        if (existing.active === false) {
          return json({ error: 'A request for this email is already pending admin review.' }, 400);
        }
        return json({ error: 'An account with this email already exists.' }, 400);
      }

      // Create auth user (confirmed so they can sign in once activated)
      const { data, error: createErr } = await admin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);

      // Insert profile as inactive/pending
      const { error: profileError } = await admin.from('profiles').insert({
        id: data.user.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role || 'growth',
        active: false,
        request_note: requestNote || null,
        practice: practice || null,
      });

      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 400);
      }

      return json({ success: true });
    }

    // ================================================================
    // ADMIN ACTIONS — require authenticated admin caller
    // ================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') return json({ error: 'Admin access required' }, 403);

    // ---- create (admin-initiated, always active) ----
    if (action === 'create') {
      const { email, password, name, role } = payload;
      if (!email || !password || !name || !role) {
        return json({ error: 'email, password, name and role are required' }, 400);
      }

      const { data, error } = await admin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);

      const { error: profileError } = await admin.from('profiles').insert({
        id: data.user.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        active: true,
      });

      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 400);
      }

      return json({ success: true, userId: data.user.id });
    }

    // ---- update-password ----
    if (action === 'update-password') {
      const { userId, password } = payload;
      if (!userId || !password) return json({ error: 'userId and password are required' }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ---- delete ----
    if (action === 'delete') {
      const { userId } = payload;
      if (!userId) return json({ error: 'userId is required' }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    return json({ error: err.message }, 500);
  }
});

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

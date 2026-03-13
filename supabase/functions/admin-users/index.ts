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
    const body = await req.json();
    const { action, ...payload } = body;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ================================================================
    // PUBLIC — no auth required, always returns 200
    // ================================================================
    if (action === 'request-access') {
      try {
        const { email, name, password, role } = payload;
        if (!email || !name || !password) {
          return ok({ error: 'Name, email and password are required.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Look up existing auth user by email
        const { data: listData } = await admin.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find(u => u.email === cleanEmail);

        let userId: string;

        if (existingAuthUser) {
          // Auth user exists — check if they already have a profile
          const { data: existingProfile } = await admin
            .from('profiles')
            .select('id, active')
            .eq('id', existingAuthUser.id)
            .maybeSingle();

          if (existingProfile) {
            return ok({
              error: existingProfile.active === false
                ? 'A request for this email is already pending admin review.'
                : 'An account with this email already exists. Try signing in.'
            });
          }

          // Auth user exists but no profile — reuse their ID
          userId = existingAuthUser.id;
          // Update their password to the one just submitted
          await admin.auth.admin.updateUserById(userId, { password });
        } else {
          // Create fresh auth user
          const { data: authData, error: createErr } = await admin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
          });
          if (createErr) return ok({ error: `Could not create account: ${createErr.message}` });
          userId = authData.user.id;
        }

        // Insert pending profile
        const { error: profileErr } = await admin.from('profiles').insert({
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: role || 'growth',
          active: false,
        });

        if (profileErr) {
          return ok({ error: `Profile error: ${profileErr.message}` });
        }

        return ok({ success: true });
      } catch (e) {
        return ok({ error: `Unexpected error: ${e.message}` });
      }
    }

    // ================================================================
    // ADMIN ACTIONS — require authenticated admin
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
      .from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') return json({ error: 'Admin access required' }, 403);

    if (action === 'create') {
      const { email, password, name, role } = payload;
      if (!email || !password || !name || !role) return json({ error: 'email, password, name and role are required' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: email.toLowerCase().trim(), password, email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      const { error: profileError } = await admin.from('profiles').insert({
        id: data.user.id, name: name.trim(), email: email.toLowerCase().trim(), role, active: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 400);
      }
      return json({ success: true, userId: data.user.id });
    }

    if (action === 'update-password') {
      const { userId, password } = payload;
      if (!userId || !password) return json({ error: 'userId and password are required' }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

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

function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

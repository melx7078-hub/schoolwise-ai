import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is school_admin or super_admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => 
      r.role === "super_admin" || r.role === "school_admin"
    );

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only administrators can invite teachers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, schoolId, classIds, permissions } = await req.json();

    if (!email || !schoolId) {
      return new Response(JSON.stringify({ error: "Email and school ID are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID() + crypto.randomUUID();

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("teacher_invitations")
      .insert({
        school_id: schoolId,
        email: email.toLowerCase(),
        token: invitationToken,
        role: "teacher",
        permissions: permissions || {
          can_manage_attendance: true,
          can_manage_grades: true,
          can_view_students: true,
        },
        class_ids: classIds || [],
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get school name for the invitation
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    const inviteUrl = `${req.headers.get("origin")}/invite/${invitationToken}`;

    console.log("Teacher invitation created:", { email, inviteUrl, schoolId });

    return new Response(JSON.stringify({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl,
        school_name: school?.name,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Invite teacher error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

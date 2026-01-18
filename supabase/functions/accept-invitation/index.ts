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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, userId } = await req.json();

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: "Token and user ID are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("teacher_invitations")
      .select("*, schools(name)")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("teacher_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ error: "Invitation has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with school_id
    await supabase
      .from("profiles")
      .update({ school_id: invitation.school_id })
      .eq("id", userId);

    // Create user role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: invitation.role,
        school_id: invitation.school_id,
      });

    if (roleError) {
      console.error("Error creating role:", roleError);
    }

    // Create teacher record
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .insert({
        profile_id: userId,
        school_id: invitation.school_id,
        hire_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (teacherError) {
      console.error("Error creating teacher:", teacherError);
      return new Response(JSON.stringify({ error: "Failed to create teacher record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create teacher permissions
    const permissions = invitation.permissions as Record<string, boolean> || {};
    await supabase
      .from("teacher_permissions")
      .insert({
        teacher_id: teacher.id,
        school_id: invitation.school_id,
        class_ids: invitation.class_ids || [],
        can_manage_attendance: permissions.can_manage_attendance ?? true,
        can_manage_grades: permissions.can_manage_grades ?? true,
        can_view_students: permissions.can_view_students ?? true,
        can_view_reports: permissions.can_view_reports ?? false,
        can_send_notifications: permissions.can_send_notifications ?? false,
      });

    // Mark invitation as accepted
    await supabase
      .from("teacher_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    console.log("Invitation accepted:", { userId, teacherId: teacher.id });

    return new Response(JSON.stringify({
      success: true,
      teacher: {
        id: teacher.id,
        school_id: invitation.school_id,
        school_name: invitation.schools?.name,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Accept invitation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

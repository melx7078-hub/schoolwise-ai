import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Super admin email - the system owner
const SUPER_ADMIN_EMAIL = "gbagoulemelchior@gmail.com";

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

    // Check if user is the super admin
    if (user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return new Response(JSON.stringify({ 
        error: "Only the system owner can access this endpoint",
        is_super_admin: false
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if super admin role already exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (existingRole) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Super admin role already configured",
        role: existingRole
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create super admin role
    const { data: newRole, error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "super_admin",
        school_id: null, // Super admin has access to all schools
      })
      .select()
      .single();

    if (roleError) {
      console.error("Error creating super admin role:", roleError);
      return new Response(JSON.stringify({ error: "Failed to create super admin role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Super admin role created for:", user.email);

    return new Response(JSON.stringify({
      success: true,
      message: "Super admin role configured successfully",
      role: newRole
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Setup super admin error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

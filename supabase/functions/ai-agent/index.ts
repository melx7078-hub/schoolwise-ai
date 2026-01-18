import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Tool {
  id: string;
  tool_name: string;
  description: string;
  api_endpoint: string;
  parameters: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId, schoolId } = await req.json();

    // Get user's roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = userRoles?.map(r => r.role) || [];

    // Fetch available tools based on user roles
    const { data: tools } = await supabase
      .from("system_tools")
      .select("*")
      .eq("is_active", true);

    // Filter tools based on user roles
    const availableTools = (tools || []).filter((tool: Tool) => {
      const requiredRoles = tool.parameters?.required_role as string[] || [];
      return requiredRoles.length === 0 || requiredRoles.some(r => roles.includes(r));
    });

    // Build system prompt with available tools
    const toolDescriptions = availableTools.map((t: Tool) => 
      `- ${t.tool_name}: ${t.description}`
    ).join("\n");

    const systemPrompt = `You are SchoolSync AI Assistant, an intelligent helper for school management.
You are designed to help administrators, teachers, and staff manage their school operations efficiently.

Available Tools:
${toolDescriptions}

Guidelines:
1. Always be helpful, professional, and concise
2. When asked about data, use the appropriate tools to fetch information
3. Never fabricate data - if you don't have access, say so
4. For any action that modifies data, always ask for confirmation
5. Protect student privacy - don't share sensitive information inappropriately
6. You can summarize trends, generate reports, and help with administrative tasks

Current user roles: ${roles.join(", ")}
School ID: ${schoolId || "Not specified"}

Remember: You require human approval before executing any data modifications.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare tool definitions for the AI
    const aiTools = availableTools.map((tool: Tool) => ({
      type: "function" as const,
      function: {
        name: tool.tool_name,
        description: tool.description,
        parameters: tool.parameters || { type: "object", properties: {} },
      },
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: aiTools.length > 0 ? aiTools : undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("AI Agent error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

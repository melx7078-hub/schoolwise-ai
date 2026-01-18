import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CSVRow {
  [key: string]: string;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/['"]/g, ""));
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

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

    // Check admin permission
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id);

    const adminRole = userRoles?.find(r => 
      r.role === "super_admin" || r.role === "school_admin"
    );

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { csvData, type, schoolId } = await req.json();
    const targetSchoolId = schoolId || adminRole.school_id;

    if (!csvData || !type) {
      return new Response(JSON.stringify({ error: "CSV data and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = parseCSV(csvData);
    const results = { imported: 0, errors: [] as string[] };

    if (type === "students") {
      // Expected columns: name, email, class_name, date_of_birth, gender, emergency_contact
      for (const row of rows) {
        try {
          // Find or create class
          let classId = null;
          if (row.class_name || row.class) {
            const className = row.class_name || row.class;
            const { data: existingClass } = await supabase
              .from("classes")
              .select("id")
              .eq("school_id", targetSchoolId)
              .eq("name", className)
              .single();

            if (existingClass) {
              classId = existingClass.id;
            } else {
              const { data: newClass } = await supabase
                .from("classes")
                .insert({ name: className, school_id: targetSchoolId })
                .select()
                .single();
              classId = newClass?.id;
            }
          }

          // Create student
          const { error: studentError } = await supabase
            .from("students")
            .insert({
              school_id: targetSchoolId,
              class_id: classId,
              date_of_birth: row.date_of_birth || row.dob || null,
              gender: row.gender || null,
              emergency_contact: row.emergency_contact || row.contact || null,
              matricule: row.matricule || row.id || null,
            });

          if (studentError) {
            results.errors.push(`Row ${results.imported + 1}: ${studentError.message}`);
          } else {
            results.imported++;
          }
        } catch (err) {
          results.errors.push(`Row ${results.imported + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    } else if (type === "classes") {
      // Expected columns: name, level, capacity
      for (const row of rows) {
        try {
          const { error: classError } = await supabase
            .from("classes")
            .insert({
              school_id: targetSchoolId,
              name: row.name || row.class_name,
              level: row.level || null,
              capacity: parseInt(row.capacity) || 50,
            });

          if (classError) {
            results.errors.push(`Class "${row.name}": ${classError.message}`);
          } else {
            results.imported++;
          }
        } catch (err) {
          results.errors.push(`Class "${row.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    } else if (type === "subjects") {
      // Expected columns: name, code, coefficient
      for (const row of rows) {
        try {
          const { error: subjectError } = await supabase
            .from("subjects")
            .insert({
              school_id: targetSchoolId,
              name: row.name || row.subject_name,
              code: row.code || null,
              coefficient: parseFloat(row.coefficient) || 1.0,
            });

          if (subjectError) {
            results.errors.push(`Subject "${row.name}": ${subjectError.message}`);
          } else {
            results.imported++;
          }
        } catch (err) {
          results.errors.push(`Subject "${row.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    }

    console.log("CSV import completed:", results);

    return new Response(JSON.stringify({
      success: true,
      imported: results.imported,
      total: rows.length,
      errors: results.errors.slice(0, 10), // Return first 10 errors only
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("CSV import error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

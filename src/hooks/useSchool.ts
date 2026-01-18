import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type School = Tables<"schools">;

interface UseSchoolReturn {
  school: School | null;
  schools: School[];
  isLoading: boolean;
  error: string | null;
  createSchool: (data: Partial<School>) => Promise<School | null>;
  updateSchool: (id: string, data: Partial<School>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSchool(schoolId?: string): UseSchoolReturn {
  const [school, setSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setSchools(data || []);

      if (schoolId) {
        const found = data?.find(s => s.id === schoolId);
        setSchool(found || null);
      } else if (data?.length === 1) {
        setSchool(data[0]);
      }
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch schools");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const createSchool = useCallback(async (data: Partial<School>): Promise<School | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique school code
      const code = `SCH-${Date.now().toString(36).toUpperCase()}`;

      const { data: newSchool, error: createError } = await supabase
        .from("schools")
        .insert({
          name: data.name || "New School",
          code,
          address: data.address,
          phone: data.phone,
          email: data.email,
          subscription_status: "trial",
          settings: data.settings || {},
        })
        .select()
        .single();

      if (createError) throw createError;

      // Assign school_admin role to creator
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "school_admin",
        school_id: newSchool.id,
      });

      // Update profile with school_id
      await supabase
        .from("profiles")
        .update({ school_id: newSchool.id })
        .eq("id", user.id);

      await fetchSchools();
      return newSchool;
    } catch (err) {
      console.error("Error creating school:", err);
      setError(err instanceof Error ? err.message : "Failed to create school");
      return null;
    }
  }, [fetchSchools]);

  const updateSchool = useCallback(async (id: string, data: Partial<School>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("schools")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchSchools();
      return true;
    } catch (err) {
      console.error("Error updating school:", err);
      setError(err instanceof Error ? err.message : "Failed to update school");
      return false;
    }
  }, [fetchSchools]);

  return {
    school,
    schools,
    isLoading,
    error,
    createSchool,
    updateSchool,
    refetch: fetchSchools,
  };
}

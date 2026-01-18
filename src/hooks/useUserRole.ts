import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  role: AppRole;
  school_id: string | null;
}

interface UseUserRoleReturn {
  roles: UserRole[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isSchoolAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  isStudent: boolean;
  schoolId: string | null;
  hasRole: (role: AppRole) => boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRoles([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } else {
        setRoles(data || []);
      }
    } catch (err) {
      console.error("Error in useUserRole:", err);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.some(r => r.role === role);

  const isSuperAdmin = hasRole("super_admin");
  const isSchoolAdmin = hasRole("school_admin");
  const isTeacher = hasRole("teacher");
  const isParent = hasRole("parent");
  const isStudent = hasRole("student");

  const schoolId = roles.find(r => r.school_id)?.school_id || null;

  return {
    roles,
    isLoading,
    isSuperAdmin,
    isSchoolAdmin,
    isTeacher,
    isParent,
    isStudent,
    schoolId,
    hasRole,
    refetch: fetchRoles,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteTeacherModal } from "@/components/teachers/InviteTeacherModal";
import { UserPlus, Upload, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CSVImport } from "@/components/shared/CSVImport";
import { toast } from "sonner";

interface Teacher {
  id: string;
  employee_id: string | null;
  specialization: string | null;
  hire_date: string | null;
  profile: { full_name: string; email: string | null } | null;
}

export function TeachersPage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin } = useUserRole();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const canManage = isSchoolAdmin || isSuperAdmin;

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("teachers")
        .select("*, profile:profiles(full_name, email)", { count: "exact" })
        .eq("school_id", schoolId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`employee_id.ilike.%${search}%,specialization.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setTeachers(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      toast.error("Failed to load teachers");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, page, pageSize, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Teacher removed"); fetchTeachers(); }
  };

  const columns: Column<Teacher>[] = [
    { key: "profile.full_name", header: "Name", render: (t) => t.profile?.full_name || "-" },
    { key: "profile.email", header: "Email", render: (t) => t.profile?.email || "-" },
    { key: "specialization", header: "Specialization", render: (t) => t.specialization || "-" },
    { key: "hire_date", header: "Hire Date", render: (t) => t.hire_date ? new Date(t.hire_date).toLocaleDateString() : "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">Manage your school's teaching staff</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />Invite Teacher
            </Button>
          </div>
        )}
      </div>

      <DataTable
        data={teachers}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search teachers..."
        onSearch={setSearch}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        actions={canManage ? (t) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 mr-2" />Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined}
      />

      <InviteTeacherModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} schoolId={schoolId || ""} onSuccess={fetchTeachers} />
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Import Teachers</DialogTitle></DialogHeader>
          <CSVImport type="teachers" schoolId={schoolId || ""} onSuccess={() => { setShowImportModal(false); fetchTeachers(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

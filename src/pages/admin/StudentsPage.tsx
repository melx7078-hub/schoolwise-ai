import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CSVImport } from "@/components/shared/CSVImport";
import { UserPlus, Upload, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Student {
  id: string;
  matricule: string | null;
  gender: string | null;
  date_of_birth: string | null;
  profile: { full_name: string; email: string | null } | null;
  class: { name: string } | null;
}

export function StudentsPage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin } = useUserRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);

  const canManage = isSchoolAdmin || isSuperAdmin;

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("students")
        .select("*, profile:profiles(full_name, email), class:classes(name)", { count: "exact" })
        .eq("school_id", schoolId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`matricule.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setStudents(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, page, pageSize, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Student removed"); fetchStudents(); }
  };

  const columns: Column<Student>[] = [
    { key: "profile.full_name", header: "Name", render: (s) => s.profile?.full_name || "-" },
    { key: "matricule", header: "Matricule", render: (s) => s.matricule || "-" },
    { key: "class.name", header: "Class", render: (s) => s.class?.name ? <Badge variant="secondary">{s.class.name}</Badge> : "-" },
    { key: "gender", header: "Gender", render: (s) => s.gender || "-" },
    { key: "date_of_birth", header: "DOB", render: (s) => s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage enrolled students</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <Button><UserPlus className="w-4 h-4 mr-2" />Add Student</Button>
          </div>
        )}
      </div>

      <DataTable
        data={students}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name or matricule..."
        onSearch={setSearch}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        actions={canManage ? (s) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 mr-2" />Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined}
      />

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Import Students</DialogTitle></DialogHeader>
          <CSVImport type="students" schoolId={schoolId || ""} onSuccess={() => { setShowImportModal(false); fetchStudents(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

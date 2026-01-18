import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Edit, Trash2, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  level: string | null;
  capacity: number | null;
  academic_year: { name: string } | null;
  student_count?: number;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

export function ClassesPage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin } = useUserRole();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [formData, setFormData] = useState({ name: "", level: "", capacity: "", academic_year_id: "" });

  const canManage = isSchoolAdmin || isSuperAdmin;

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("classes")
        .select("*, academic_year:academic_years(name)", { count: "exact" })
        .eq("school_id", schoolId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,level.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Get student counts for each class
      const classIds = data?.map(c => c.id) || [];
      let countMap: Record<string, number> = {};
      if (classIds.length > 0) {
        const { data: counts } = await supabase
          .from("students")
          .select("class_id")
          .in("class_id", classIds);
        
        countMap = counts?.reduce((acc: Record<string, number>, curr) => {
          if (curr.class_id) {
            acc[curr.class_id] = (acc[curr.class_id] || 0) + 1;
          }
          return acc;
        }, {}) || {};
      }

      const classesWithCount = (data || []).map(c => ({
        ...c,
        student_count: countMap[c.id] || 0,
      }));

      setClasses(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error("Error fetching classes:", err);
      toast.error("Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, page, pageSize, search]);

  const fetchAcademicYears = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("academic_years")
      .select("id, name, is_current")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false });
    setAcademicYears(data || []);
  }, [schoolId]);

  useEffect(() => { fetchClasses(); fetchAcademicYears(); }, [fetchClasses, fetchAcademicYears]);

  const handleSubmit = async () => {
    if (!formData.name || !schoolId) {
      toast.error("Class name is required");
      return;
    }

    const payload = {
      name: formData.name,
      level: formData.level || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      academic_year_id: formData.academic_year_id || null,
      school_id: schoolId,
    };

    if (editingClass) {
      const { error } = await supabase
        .from("classes")
        .update(payload)
        .eq("id", editingClass.id);
      if (error) toast.error("Failed to update class");
      else { toast.success("Class updated"); closeModal(); fetchClasses(); }
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) toast.error("Failed to create class");
      else { toast.success("Class created"); closeModal(); fetchClasses(); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will affect all associated students.")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Class removed"); fetchClasses(); }
  };

  const openEditModal = (cls: ClassData) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      level: cls.level || "",
      capacity: cls.capacity?.toString() || "",
      academic_year_id: "",
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingClass(null);
    setFormData({ name: "", level: "", capacity: "", academic_year_id: "" });
  };

  const columns: Column<ClassData>[] = [
    { key: "name", header: "Class Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "level", header: "Level", render: (c) => c.level ? <Badge variant="outline">{c.level}</Badge> : "-" },
    { key: "capacity", header: "Capacity", render: (c) => c.capacity || "-" },
    { key: "student_count", header: "Students", render: (c) => (
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span>{c.student_count || 0}</span>
      </div>
    )},
    { key: "academic_year.name", header: "Academic Year", render: (c) => c.academic_year?.name || "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage your school's classes and sections</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Class
          </Button>
        )}
      </div>

      <DataTable
        data={classes}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search classes..."
        onSearch={setSearch}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        actions={canManage ? (c) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditModal(c)}>
                <Edit className="w-4 h-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined}
      />

      <Dialog open={showAddModal} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Class Name *</Label>
              <Input
                placeholder="e.g., 6ème A, CM2, Terminal S"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="high_school">High School</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                placeholder="Maximum students"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={formData.academic_year_id} onValueChange={(v) => setFormData({ ...formData, academic_year_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingClass ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

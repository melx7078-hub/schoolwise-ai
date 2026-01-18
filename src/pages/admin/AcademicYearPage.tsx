import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Edit, Trash2, Check, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string | null;
}

export function AcademicYearPage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin } = useUserRole();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

  const canManage = isSchoolAdmin || isSuperAdmin;

  const fetchYears = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setYears(data || []);
    } catch (err) {
      console.error("Error fetching academic years:", err);
      toast.error("Failed to load academic years");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !schoolId) {
      toast.error("Please fill all required fields");
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      // If setting as current, unset other current years
      if (formData.is_current) {
        await supabase
          .from("academic_years")
          .update({ is_current: false })
          .eq("school_id", schoolId);
      }

      const payload = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current,
        school_id: schoolId,
      };

      if (editingYear) {
        const { error } = await supabase
          .from("academic_years")
          .update(payload)
          .eq("id", editingYear.id);
        if (error) throw error;
        toast.success("Academic year updated");
      } else {
        const { error } = await supabase.from("academic_years").insert(payload);
        if (error) throw error;
        toast.success("Academic year created");
      }

      closeModal();
      fetchYears();
    } catch (err) {
      console.error("Error saving academic year:", err);
      toast.error("Failed to save academic year");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This may affect related data.")) return;
    const { error } = await supabase.from("academic_years").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Academic year removed"); fetchYears(); }
  };

  const setAsCurrent = async (id: string) => {
    if (!schoolId) return;
    try {
      await supabase
        .from("academic_years")
        .update({ is_current: false })
        .eq("school_id", schoolId);
      
      await supabase
        .from("academic_years")
        .update({ is_current: true })
        .eq("id", id);

      toast.success("Current academic year updated");
      fetchYears();
    } catch (err) {
      toast.error("Failed to update current year");
    }
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
      is_current: year.is_current || false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingYear(null);
    setFormData({ name: "", start_date: "", end_date: "", is_current: false });
  };

  const currentYear = years.find(y => y.is_current);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Years</h1>
          <p className="text-muted-foreground">Manage your school's academic calendar</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Academic Year
          </Button>
        )}
      </div>

      {/* Current Year Card */}
      {currentYear && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Current Academic Year
                </CardTitle>
                <CardDescription>Active period for all academic activities</CardDescription>
              </div>
              <Badge className="bg-primary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Year Name</div>
                <div className="text-lg font-semibold">{currentYear.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">{format(parseISO(currentYear.start_date), "PPP")}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">End Date</div>
                <div className="font-medium">{format(parseISO(currentYear.end_date), "PPP")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Years */}
      <Card>
        <CardHeader>
          <CardTitle>All Academic Years</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : years.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No academic years configured yet. Create your first one!
            </div>
          ) : (
            <div className="space-y-3">
              {years.map((year) => (
                <div
                  key={year.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    year.is_current ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      year.is_current ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{year.name}</span>
                        {year.is_current && <Badge variant="secondary">Current</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(year.start_date), "MMM d, yyyy")} - {format(parseISO(year.end_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex gap-2">
                      {!year.is_current && (
                        <Button variant="outline" size="sm" onClick={() => setAsCurrent(year.id)}>
                          <Check className="w-4 h-4 mr-1" />Set Current
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(year)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(year.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingYear ? "Edit Academic Year" : "Add Academic Year"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Year Name *</Label>
              <Input
                placeholder="e.g., 2025-2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="is_current">Set as current academic year</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingYear ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

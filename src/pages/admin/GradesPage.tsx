import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  coefficient: number | null;
}

interface ClassOption {
  id: string;
  name: string;
}

interface StudentGrade {
  student_id: string;
  student_name: string;
  matricule: string | null;
  grades: Record<string, { id?: string; value: number | null; grade_type: string }>;
  average: number | null;
}

export function GradesPage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin, isTeacher } = useUserRole();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [gradeType, setGradeType] = useState<string>("exam");
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "", coefficient: "1" });

  const canManage = isSchoolAdmin || isSuperAdmin || isTeacher;

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name");
    setClasses(data || []);
    if (data?.length && !selectedClass) {
      setSelectedClass(data[0].id);
    }
  }, [schoolId, selectedClass]);

  const fetchSubjects = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("subjects")
      .select("id, name, code, coefficient")
      .eq("school_id", schoolId)
      .order("name");
    setSubjects(data || []);
    if (data?.length && !selectedSubject) {
      setSelectedSubject(data[0].id);
    }
  }, [schoolId, selectedSubject]);

  const fetchStudentsAndGrades = useCallback(async () => {
    if (!selectedClass || !selectedSubject) return;
    setIsLoading(true);
    try {
      // Get students in class
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, matricule, profile:profiles(full_name)")
        .eq("class_id", selectedClass);

      // Get grades for this subject
      const { data: gradesData } = await supabase
        .from("grades")
        .select("id, student_id, value, grade_type")
        .eq("subject_id", selectedSubject)
        .in("student_id", studentsData?.map(s => s.id) || []);

      const studentsList: StudentGrade[] = (studentsData || []).map(s => {
        const studentGrades = gradesData?.filter(g => g.student_id === s.id) || [];
        const grades: Record<string, { id?: string; value: number | null; grade_type: string }> = {};
        
        studentGrades.forEach(g => {
          grades[g.grade_type] = { id: g.id, value: g.value, grade_type: g.grade_type };
        });

        // Calculate average
        const values = studentGrades.map(g => g.value);
        const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

        return {
          student_id: s.id,
          student_name: s.profile?.full_name || "Unknown",
          matricule: s.matricule,
          grades,
          average,
        };
      });

      setStudents(studentsList.sort((a, b) => a.student_name.localeCompare(b.student_name)));
    } catch (err) {
      console.error("Error fetching grades:", err);
      toast.error("Failed to load grades");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => { fetchClasses(); fetchSubjects(); }, [fetchClasses, fetchSubjects]);
  useEffect(() => { fetchStudentsAndGrades(); }, [fetchStudentsAndGrades]);

  const updateGrade = (studentId: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      return {
        ...s,
        grades: {
          ...s.grades,
          [gradeType]: { ...s.grades[gradeType], value: numValue, grade_type: gradeType }
        }
      };
    }));
  };

  const saveGrades = async () => {
    if (!selectedSubject) return;
    setIsSaving(true);
    try {
      const updates: any[] = [];
      const inserts: any[] = [];

      students.forEach(s => {
        const grade = s.grades[gradeType];
        if (grade?.value !== null && grade?.value !== undefined) {
          if (grade.id) {
            updates.push({ id: grade.id, value: grade.value });
          } else {
            inserts.push({
              student_id: s.student_id,
              subject_id: selectedSubject,
              value: grade.value,
              grade_type: gradeType,
              max_value: 20,
              coefficient: 1,
            });
          }
        }
      });

      if (updates.length > 0) {
        for (const u of updates) {
          await supabase.from("grades").update({ value: u.value }).eq("id", u.id);
        }
      }

      if (inserts.length > 0) {
        await supabase.from("grades").insert(inserts);
      }

      toast.success("Grades saved successfully");
      fetchStudentsAndGrades();
    } catch (err) {
      console.error("Error saving grades:", err);
      toast.error("Failed to save grades");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name || !schoolId) {
      toast.error("Subject name is required");
      return;
    }
    const { error } = await supabase.from("subjects").insert({
      name: newSubject.name,
      code: newSubject.code || null,
      coefficient: parseFloat(newSubject.coefficient) || 1,
      school_id: schoolId,
    });
    if (error) toast.error("Failed to create subject");
    else {
      toast.success("Subject created");
      setShowAddSubjectModal(false);
      setNewSubject({ name: "", code: "", coefficient: "1" });
      fetchSubjects();
    }
  };

  const getGradeColor = (value: number | null) => {
    if (value === null) return "";
    if (value >= 16) return "text-green-600 font-semibold";
    if (value >= 12) return "text-blue-600";
    if (value >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrend = (avg: number | null) => {
    if (avg === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (avg >= 12) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (avg >= 10) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades</h1>
          <p className="text-muted-foreground">Manage student grades and assessments</p>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setShowAddSubjectModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Subject
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code && `(${s.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grade Type</label>
              <Select value={gradeType} onValueChange={setGradeType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="oral">Oral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <Button onClick={saveGrades} disabled={isSaving || !students.length} className="ml-auto">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Grades
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found in this class
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead className="text-center">{gradeType.charAt(0).toUpperCase() + gradeType.slice(1)} (/20)</TableHead>
                  <TableHead className="text-center">Average</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.matricule || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {canManage ? (
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          className="w-20 mx-auto text-center"
                          value={student.grades[gradeType]?.value ?? ""}
                          onChange={(e) => updateGrade(student.student_id, e.target.value)}
                        />
                      ) : (
                        <span className={getGradeColor(student.grades[gradeType]?.value ?? null)}>
                          {student.grades[gradeType]?.value ?? "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getGradeColor(student.average)}>
                        {student.average !== null ? student.average.toFixed(2) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrend(student.average)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Subject Modal */}
      <Dialog open={showAddSubjectModal} onOpenChange={setShowAddSubjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Name *</Label>
              <Input
                placeholder="e.g., Mathematics, Physics"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="e.g., MATH, PHY"
                value={newSubject.code}
                onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Coefficient</Label>
              <Input
                type="number"
                min="1"
                value={newSubject.coefficient}
                onChange={(e) => setNewSubject({ ...newSubject, coefficient: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubjectModal(false)}>Cancel</Button>
            <Button onClick={handleAddSubject}>Create Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

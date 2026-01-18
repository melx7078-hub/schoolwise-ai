import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, X, Clock, AlertCircle, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

interface StudentAttendance {
  student_id: string;
  student_name: string;
  matricule: string | null;
  status: AttendanceStatus | null;
  notes: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ElementType; color: string }> = {
  present: { label: "Present", icon: Check, color: "bg-green-100 text-green-700 hover:bg-green-200" },
  absent: { label: "Absent", icon: X, color: "bg-red-100 text-red-700 hover:bg-red-200" },
  late: { label: "Late", icon: Clock, color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  excused: { label: "Excused", icon: AlertCircle, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
};

export function AttendancePage() {
  const { schoolId, isSchoolAdmin, isSuperAdmin, isTeacher } = useUserRole();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const fetchStudentsAndAttendance = useCallback(async () => {
    if (!selectedClass || !selectedDate) return;
    setIsLoading(true);
    try {
      // Get students in class
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, matricule, profile:profiles(full_name)")
        .eq("class_id", selectedClass);

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // Get existing attendance for this date
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("student_id, status, notes")
        .eq("class_id", selectedClass)
        .eq("date", dateStr);

      const attendanceMap = new Map(
        attendanceData?.map(a => [a.student_id, { status: a.status, notes: a.notes || "" }])
      );

      const studentsList: StudentAttendance[] = (studentsData || []).map(s => ({
        student_id: s.id,
        student_name: s.profile?.full_name || "Unknown",
        matricule: s.matricule,
        status: attendanceMap.get(s.id)?.status || null,
        notes: attendanceMap.get(s.id)?.notes || "",
      }));

      setStudents(studentsList.sort((a, b) => a.student_name.localeCompare(b.student_name)));
    } catch (err) {
      console.error("Error fetching attendance:", err);
      toast.error("Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedDate]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { fetchStudentsAndAttendance(); }, [fetchStudentsAndAttendance]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, status } : s
    ));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: "present" as AttendanceStatus })));
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate) return;
    
    const studentsWithStatus = students.filter(s => s.status);
    if (studentsWithStatus.length === 0) {
      toast.error("Please mark attendance for at least one student");
      return;
    }

    setIsSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Delete existing records for this class/date
      await supabase
        .from("attendance")
        .delete()
        .eq("class_id", selectedClass)
        .eq("date", dateStr);

      // Insert new records
      const records = studentsWithStatus.map(s => ({
        student_id: s.student_id,
        class_id: selectedClass,
        date: dateStr,
        status: s.status!,
        notes: s.notes || null,
      }));

      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;

      toast.success("Attendance saved successfully");
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error("Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    total: students.length,
    present: students.filter(s => s.status === "present").length,
    absent: students.filter(s => s.status === "absent").length,
    late: students.filter(s => s.status === "late").length,
    excused: students.filter(s => s.status === "excused").length,
    unmarked: students.filter(s => !s.status).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track daily student attendance</p>
        </div>
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
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {canManage && (
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={markAllPresent} disabled={!students.length}>
                  Mark All Present
                </Button>
                <Button onClick={saveAttendance} disabled={isSaving || !students.length}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Attendance
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </CardContent></Card>
        <Card className="border-green-200 bg-green-50"><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.present}</div>
          <div className="text-xs text-green-600">Present</div>
        </CardContent></Card>
        <Card className="border-red-200 bg-red-50"><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
          <div className="text-xs text-red-600">Absent</div>
        </CardContent></Card>
        <Card className="border-yellow-200 bg-yellow-50"><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
          <div className="text-xs text-yellow-600">Late</div>
        </CardContent></Card>
        <Card className="border-blue-200 bg-blue-50"><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.excused}</div>
          <div className="text-xs text-blue-600">Excused</div>
        </CardContent></Card>
        <Card className="border-gray-200"><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{stats.unmarked}</div>
          <div className="text-xs text-muted-foreground">Unmarked</div>
        </CardContent></Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
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
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {student.student_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{student.student_name}</div>
                      {student.matricule && (
                        <div className="text-xs text-muted-foreground">{student.matricule}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(Object.entries(statusConfig) as [AttendanceStatus, typeof statusConfig.present][]).map(([status, config]) => {
                      const Icon = config.icon;
                      const isSelected = student.status === status;
                      return (
                        <Button
                          key={status}
                          variant="ghost"
                          size="sm"
                          disabled={!canManage}
                          className={cn(
                            "h-8 px-3",
                            isSelected ? config.color : "hover:bg-muted"
                          )}
                          onClick={() => updateStatus(student.student_id, status)}
                        >
                          <Icon className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">{config.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

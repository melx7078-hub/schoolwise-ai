import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { FileText, Download, Users, GraduationCap, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#1E3A8A", "#F97316", "#10B981", "#6366F1", "#EC4899"];

export function ReportsPage() {
  const { schoolId } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    avgAttendance: 0,
    avgGrade: 0,
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);
  const [classPerformance, setClassPerformance] = useState<any[]>([]);

  const fetchReportData = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      // Fetch counts
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      ]);

      // Fetch attendance stats
      const { data: attendanceStats } = await supabase
        .from("attendance")
        .select("status, class_id, classes!inner(school_id)")
        .eq("classes.school_id", schoolId);

      const presentCount = attendanceStats?.filter(a => a.status === "present").length || 0;
      const totalAttendance = attendanceStats?.length || 1;
      const avgAttendance = (presentCount / totalAttendance) * 100;

      // Fetch grade stats
      const { data: gradeStats } = await supabase
        .from("grades")
        .select("value, student_id, students!inner(school_id)")
        .eq("students.school_id", schoolId);

      const avgGrade = gradeStats?.length 
        ? gradeStats.reduce((sum, g) => sum + g.value, 0) / gradeStats.length 
        : 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        avgAttendance: Math.round(avgAttendance),
        avgGrade: Math.round(avgGrade * 10) / 10,
      });

      // Attendance by status for pie chart
      const statusCounts = attendanceStats?.reduce((acc: any, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {}) || {};

      setAttendanceData([
        { name: "Present", value: statusCounts.present || 0 },
        { name: "Absent", value: statusCounts.absent || 0 },
        { name: "Late", value: statusCounts.late || 0 },
        { name: "Excused", value: statusCounts.excused || 0 },
      ]);

      // Grade distribution
      const gradeRanges = [
        { range: "0-5", min: 0, max: 5, count: 0 },
        { range: "6-9", min: 6, max: 9, count: 0 },
        { range: "10-12", min: 10, max: 12, count: 0 },
        { range: "13-15", min: 13, max: 15, count: 0 },
        { range: "16-20", min: 16, max: 20, count: 0 },
      ];

      gradeStats?.forEach(g => {
        const range = gradeRanges.find(r => g.value >= r.min && g.value <= r.max);
        if (range) range.count++;
      });

      setGradeDistribution(gradeRanges.map(r => ({ name: r.range, students: r.count })));

      // Class performance
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);

      if (classes && gradeStats) {
        const { data: studentClasses } = await supabase
          .from("students")
          .select("id, class_id")
          .eq("school_id", schoolId);

        const classGrades: Record<string, { total: number; count: number; name: string }> = {};
        
        classes.forEach(c => {
          classGrades[c.id] = { total: 0, count: 0, name: c.name };
        });

        gradeStats.forEach(g => {
          const student = studentClasses?.find(s => s.id === g.student_id);
          if (student?.class_id && classGrades[student.class_id]) {
            classGrades[student.class_id].total += g.value;
            classGrades[student.class_id].count++;
          }
        });

        setClassPerformance(
          Object.values(classGrades)
            .filter(c => c.count > 0)
            .map(c => ({ name: c.name, average: Math.round((c.total / c.count) * 10) / 10 }))
        );
      }

    } catch (err) {
      console.error("Error fetching report data:", err);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Overview of your school's performance</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />Export Report
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                <div className="text-xs text-muted-foreground">Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalClasses}</div>
                <div className="text-xs text-muted-foreground">Classes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgAttendance}%</div>
                <div className="text-xs text-muted-foreground">Attendance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgGrade}/20</div>
                <div className="text-xs text-muted-foreground">Avg Grade</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
          <TabsTrigger value="performance">Class Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
              <CardDescription>Distribution of attendance statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Number of students per grade range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Class Performance</CardTitle>
              <CardDescription>Average grades by class</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 20]} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#F97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

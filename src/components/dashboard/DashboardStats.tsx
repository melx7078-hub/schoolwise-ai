import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";

const stats = [
  {
    label: "Total Students",
    value: "0",
    change: "Add your first student",
    changeType: "neutral" as const,
    icon: Users,
  },
  {
    label: "Total Teachers",
    value: "0",
    change: "Add your first teacher",
    changeType: "neutral" as const,
    icon: GraduationCap,
  },
  {
    label: "Active Classes",
    value: "0",
    change: "Create your first class",
    changeType: "neutral" as const,
    icon: BookOpen,
  },
  {
    label: "Attendance Rate",
    value: "—",
    change: "No data yet",
    changeType: "neutral" as const,
    icon: TrendingUp,
  },
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="stats-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-display font-bold">{stat.value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <stat.icon className="text-secondary" size={20} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {stat.change}
          </p>
        </div>
      ))}
    </div>
  );
}

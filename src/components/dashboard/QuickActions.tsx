import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserPlus, 
  GraduationCap, 
  ClipboardCheck, 
  FileText,
  Upload,
  Building2
} from "lucide-react";

const actions = [
  {
    icon: Building2,
    label: "Set Up School",
    description: "Configure your school profile",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: UserPlus,
    label: "Add Student",
    description: "Register a new student",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: GraduationCap,
    label: "Add Teacher",
    description: "Add a staff member",
    color: "bg-success/10 text-success",
  },
  {
    icon: ClipboardCheck,
    label: "Take Attendance",
    description: "Mark today's attendance",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: FileText,
    label: "Enter Grades",
    description: "Record student grades",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Upload,
    label: "Import CSV",
    description: "Bulk import data",
    color: "bg-muted text-muted-foreground",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-muted/80"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

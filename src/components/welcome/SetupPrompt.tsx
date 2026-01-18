import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSchool } from "@/hooks/useSchool";

interface SetupStep {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

export function SetupPrompt() {
  const navigate = useNavigate();
  const { schoolId, isSchoolAdmin, isSuperAdmin } = useUserRole();
  const { school, isLoading } = useSchool();

  if (!isSchoolAdmin && !isSuperAdmin) return null;
  if (isLoading) return null;

  // Check what's been set up
  const hasSchoolInfo = school?.name && school?.email;
  const hasAcademicYear = false; // Would check from context
  const hasClasses = false; // Would check from context

  const steps: SetupStep[] = [
    { id: "school", label: "Complete school information", completed: !!hasSchoolInfo, href: "/dashboard/settings" },
    { id: "academic", label: "Set up academic year", completed: false, href: "/dashboard/academic-year" },
    { id: "classes", label: "Create your first class", completed: false, href: "/dashboard/classes" },
    { id: "teachers", label: "Invite teachers", completed: false, href: "/dashboard/teachers" },
    { id: "students", label: "Add students", completed: false, href: "/dashboard/students" },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  // Don't show if mostly complete
  if (completedCount >= 4) return null;

  return (
    <Card className="border-secondary/30 bg-gradient-to-r from-secondary/5 to-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Complete Your School Setup</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the most out of SchoolSync by completing these steps.
            </p>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completedCount}/{steps.length} completed</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(step.href)}
                >
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className={step.completed ? "text-muted-foreground line-through" : ""}>
                      {step.label}
                    </span>
                  </div>
                  {!step.completed && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

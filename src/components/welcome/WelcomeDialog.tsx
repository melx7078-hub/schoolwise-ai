import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { Logo3D } from "@/components/Logo3D";
import { 
  Sparkles, ArrowRight, Users, GraduationCap, BookOpen, 
  ClipboardCheck, BarChart3, MessageSquare, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to SchoolSync Africa! 🎉",
    description: "Your complete school management platform designed for African excellence.",
    icon: Sparkles,
    content: (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Logo3D size="lg" />
        </div>
        <p className="text-muted-foreground">
          We're excited to have you on board! Let's take a quick tour of the platform.
        </p>
      </div>
    ),
  },
  {
    id: "students",
    title: "Manage Students",
    description: "Keep track of all your students in one place",
    icon: Users,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <div className="font-medium">Student Management</div>
            <div className="text-sm text-muted-foreground">Add, edit, and organize student records</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Import students via CSV for bulk enrollment
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Assign students to classes automatically
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Track student performance over time
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "teachers",
    title: "Invite Teachers",
    description: "Build your teaching team efficiently",
    icon: GraduationCap,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
          <GraduationCap className="w-8 h-8 text-secondary" />
          <div>
            <div className="font-medium">Teacher Invitations</div>
            <div className="text-sm text-muted-foreground">Invite teachers with customized permissions</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Send personalized invitation links
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Assign classes and subjects
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Control access with fine-grained permissions
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "attendance",
    title: "Track Attendance",
    description: "Monitor student presence effortlessly",
    icon: ClipboardCheck,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
          <ClipboardCheck className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-medium">Attendance Tracking</div>
            <div className="text-sm text-muted-foreground">Mark attendance quickly for any class</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            One-tap attendance marking
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            View attendance reports by class/student
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Automatic notifications for absences
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "ai",
    title: "AI Assistant",
    description: "Your intelligent helper for school management",
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 border border-purple-200">
          <MessageSquare className="w-8 h-8 text-purple-600" />
          <div>
            <div className="font-medium">AI-Powered Assistant</div>
            <div className="text-sm text-muted-foreground">Get instant help with any task</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Ask questions about your data
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Generate reports and summaries
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Get recommendations for improvements
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "done",
    title: "You're All Set! 🚀",
    description: "Start managing your school today",
    icon: CheckCircle2,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <p className="text-muted-foreground">
          You're ready to go! Explore the dashboard and start adding your school's data.
          If you need help, just click the AI Assistant button.
        </p>
      </div>
    ),
  },
];

export function WelcomeDialog({ isOpen, onClose, userName }: WelcomeDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { isSchoolAdmin, isSuperAdmin } = useUserRole();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem("welcomeCompleted", "true");
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("welcomeCompleted", "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              currentStep === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <step.icon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>{step.title}</DialogTitle>
              <DialogDescription>{step.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {step.content}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                idx === currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handlePrev}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

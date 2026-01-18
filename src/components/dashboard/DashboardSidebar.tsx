import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo3D } from "@/components/Logo3D";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  X,
  MessageSquare,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Students", href: "/dashboard/students" },
  { icon: GraduationCap, label: "Teachers", href: "/dashboard/teachers" },
  { icon: BookOpen, label: "Classes", href: "/dashboard/classes" },
  { icon: ClipboardCheck, label: "Attendance", href: "/dashboard/attendance" },
  { icon: FileText, label: "Grades", href: "/dashboard/grades" },
  { icon: Calendar, label: "Academic Year", href: "/dashboard/academic-year" },
  { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function DashboardSidebar({ isOpen, onClose, onOpenAI }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
            <Logo3D size="sm" />
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn("sidebar-nav-item", isActive && "active")}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* AI Assistant Button */}
            <button
              onClick={() => {
                onClose();
                onOpenAI();
              }}
              className="sidebar-nav-item w-full text-left mt-4 bg-sidebar-accent/50 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            >
              <MessageSquare size={20} />
              <span>AI Assistant</span>
              <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                New
              </span>
            </button>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut size={20} />
              <span className="ml-3">Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

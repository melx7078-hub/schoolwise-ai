import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, UserPlus, FileText, ClipboardCheck } from "lucide-react";

const activities = [
  {
    icon: UserPlus,
    title: "Welcome to SchoolSync!",
    description: "Start by setting up your school profile",
    time: "Just now",
    iconBg: "bg-secondary/10 text-secondary",
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
        <Clock size={18} className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${activity.iconBg} flex items-center justify-center shrink-0`}>
                  <activity.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

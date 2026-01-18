import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Copy, Check, Mail } from "lucide-react";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface InviteTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess?: () => void;
}

interface ClassOption {
  id: string;
  name: string;
  level: string | null;
}

export function InviteTeacherModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: InviteTeacherModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    can_manage_grades: true,
    can_manage_attendance: true,
    can_view_students: true,
    can_view_reports: false,
    can_send_notifications: false,
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchClasses();
    }
  }, [isOpen, schoolId]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, level")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const handleSubmit = async () => {
    setError("");
    
    const result = inviteSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("invite-teacher", {
        body: {
          email,
          schoolId,
          classIds: selectedClasses,
          permissions,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation");
      }

      const { inviteUrl } = response.data;
      setInviteLink(inviteUrl);
      toast.success("Invitation created successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Invite error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setEmail("");
    setSelectedClasses([]);
    setPermissions({
      can_manage_grades: true,
      can_manage_attendance: true,
      can_view_students: true,
      can_view_reports: false,
      can_send_notifications: false,
    });
    setInviteLink(null);
    setError("");
    onClose();
  };

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Teacher</DialogTitle>
          <DialogDescription>
            Send an invitation link to a new teacher
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Teacher's Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {/* Class Assignment */}
            {classes.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Classes</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-2">
                      <Checkbox
                        id={cls.id}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <label htmlFor={cls.id} className="text-sm cursor-pointer">
                        {cls.name} {cls.level && `(${cls.level})`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permissions */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="border rounded-lg p-3 space-y-3">
                {Object.entries(permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setPermissions((prev) => ({
                          ...prev,
                          [key]: checked === true,
                        }))
                      }
                    />
                    <label htmlFor={key} className="text-sm cursor-pointer capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-success font-medium mb-2">Invitation Created!</p>
              <p className="text-sm text-muted-foreground">
                Share this link with the teacher. It will expire in 7 days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!inviteLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Invitation"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

-- =============================================
-- AUDIT LOG TABLE for tracking all changes
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs
CREATE POLICY "School admins can view their school audit logs"
ON public.audit_logs FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin', school_id) 
  OR has_role(auth.uid(), 'super_admin')
);

-- Super admins can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- =============================================
-- TEACHER INVITATIONS TABLE
-- =============================================
CREATE TABLE public.teacher_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'teacher',
  permissions JSONB DEFAULT '{"can_manage_attendance": true, "can_manage_grades": true, "can_view_students": true}'::jsonb,
  class_ids UUID[] DEFAULT '{}',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Enable RLS on teacher_invitations
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_invitations
CREATE POLICY "School admins can manage invitations"
ON public.teacher_invitations FOR ALL
USING (
  has_role(auth.uid(), 'school_admin', school_id) 
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Anyone can view invitation by token for acceptance"
ON public.teacher_invitations FOR SELECT
USING (true);

-- =============================================
-- TEACHER PERMISSIONS TABLE
-- =============================================
CREATE TABLE public.teacher_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_ids UUID[] DEFAULT '{}',
  can_manage_attendance BOOLEAN DEFAULT true,
  can_manage_grades BOOLEAN DEFAULT true,
  can_view_students BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT false,
  can_send_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Enable RLS
ALTER TABLE public.teacher_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "School admins can manage teacher permissions"
ON public.teacher_permissions FOR ALL
USING (
  has_role(auth.uid(), 'school_admin', school_id) 
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Teachers can view their own permissions"
ON public.teacher_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = teacher_permissions.teacher_id
    AND t.profile_id = auth.uid()
  )
);

-- =============================================
-- AUDIT LOG TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _school_id UUID;
  _user_id UUID;
  _old_data JSONB;
  _new_data JSONB;
BEGIN
  _user_id := auth.uid();
  
  -- Try to get school_id from the record
  IF TG_OP = 'DELETE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
    _school_id := OLD.school_id;
  ELSIF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _school_id := NEW.school_id;
  ELSE
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
    _school_id := NEW.school_id;
  END IF;

  -- Only log if we have a user
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      school_id,
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      _school_id,
      _user_id,
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      _old_data,
      _new_data
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- ADD AUDIT TRIGGERS TO KEY TABLES
-- =============================================
CREATE TRIGGER audit_students
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_teachers
AFTER INSERT OR UPDATE OR DELETE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_classes
AFTER INSERT OR UPDATE OR DELETE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_grades
AFTER INSERT OR UPDATE OR DELETE ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_attendance
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- =============================================
-- FUNCTION TO CHECK TEACHER ACCESS TO CLASS
-- =============================================
CREATE OR REPLACE FUNCTION public.teacher_has_class_access(_teacher_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_permissions tp
    WHERE tp.teacher_id = _teacher_id
    AND (_class_id = ANY(tp.class_ids) OR tp.class_ids = '{}')
  )
$$;

-- =============================================
-- FUNCTION TO GENERATE INVITATION TOKEN
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- =============================================
-- ADD INDEX FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_teacher_invitations_token ON public.teacher_invitations(token);
CREATE INDEX idx_teacher_invitations_email ON public.teacher_invitations(email);

-- =============================================
-- INSERT SUPER ADMIN ROLE FOR OWNER
-- =============================================
-- This will be done via the edge function when the super admin first signs up
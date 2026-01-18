-- Create custom types for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'parent', 'student');
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Schools table (multi-tenant root)
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_status public.subscription_status DEFAULT 'trial',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);

-- Academic years
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  matricule TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teachers
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_id TEXT,
  specialization TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parent-Student relationship
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  coefficient DECIMAL(3,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher-Class-Subject assignments
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id, academic_year_id)
);

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  grade_type TEXT NOT NULL, -- 'exam', 'quiz', 'assignment', 'participation'
  value DECIMAL(5,2) NOT NULL,
  max_value DECIMAL(5,2) DEFAULT 20,
  coefficient DECIMAL(3,1) DEFAULT 1.0,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- AI System Tools Registry
CREATE TABLE public.system_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  required_role public.app_role[] DEFAULT ARRAY['super_admin']::public.app_role[],
  is_active BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Chat Messages
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pending AI Actions (Human-in-the-loop)
CREATE TABLE public.pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _school_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (school_id = _school_id OR _school_id IS NULL OR role = 'super_admin')
  )
$$;

-- Function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Function to check if user belongs to school
CREATE OR REPLACE FUNCTION public.user_belongs_to_school(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (school_id = _school_id OR role = 'super_admin')
  )
$$;

-- RLS Policies

-- Schools: Super admins see all, others see their school
CREATE POLICY "Super admins can manage all schools"
  ON public.schools FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their school"
  ON public.schools FOR SELECT
  USING (id = public.get_user_school_id(auth.uid()));

-- Profiles: Users can see their own and same-school profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "School members can view school profiles"
  ON public.profiles FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

-- User roles: Only super admins and school admins can manage
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can view school roles"
  ON public.user_roles FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage school roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'school_admin', school_id)
    AND role != 'super_admin'
  );

-- Academic years: School isolation
CREATE POLICY "School members can view academic years"
  ON public.academic_years FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage academic years"
  ON public.academic_years FOR ALL
  USING (public.has_role(auth.uid(), 'school_admin', school_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Classes: School isolation
CREATE POLICY "School members can view classes"
  ON public.classes FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage classes"
  ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'school_admin', school_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Students: School isolation with parent access
CREATE POLICY "School members can view students"
  ON public.students FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "Admins and teachers can manage students"
  ON public.students FOR ALL
  USING (
    public.has_role(auth.uid(), 'school_admin', school_id) 
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Teachers: School isolation
CREATE POLICY "School members can view teachers"
  ON public.teachers FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage teachers"
  ON public.teachers FOR ALL
  USING (public.has_role(auth.uid(), 'school_admin', school_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Parent-Students: Parents can see their relationships
CREATE POLICY "Parents can view their student relationships"
  ON public.parent_students FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "School admins can manage parent relationships"
  ON public.parent_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
      AND (public.has_role(auth.uid(), 'school_admin', s.school_id) OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- Subjects: School isolation
CREATE POLICY "School members can view subjects"
  ON public.subjects FOR SELECT
  USING (public.user_belongs_to_school(auth.uid(), school_id));

CREATE POLICY "School admins can manage subjects"
  ON public.subjects FOR ALL
  USING (public.has_role(auth.uid(), 'school_admin', school_id) OR public.has_role(auth.uid(), 'super_admin'));

-- Teacher assignments: School isolation
CREATE POLICY "School members can view assignments"
  ON public.teacher_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
      AND public.user_belongs_to_school(auth.uid(), c.school_id)
    )
  );

CREATE POLICY "School admins can manage assignments"
  ON public.teacher_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
      AND (public.has_role(auth.uid(), 'school_admin', c.school_id) OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- Grades: Teachers can manage, parents/students can view
CREATE POLICY "Teachers can manage grades"
  ON public.grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
      AND (
        public.has_role(auth.uid(), 'teacher', s.school_id)
        OR public.has_role(auth.uid(), 'school_admin', s.school_id)
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  );

CREATE POLICY "Parents can view their children's grades"
  ON public.grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.student_id = student_id
      AND ps.parent_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own grades"
  ON public.grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
      AND s.profile_id = auth.uid()
    )
  );

-- Attendance: Similar to grades
CREATE POLICY "Staff can manage attendance"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
      AND (
        public.has_role(auth.uid(), 'teacher', c.school_id)
        OR public.has_role(auth.uid(), 'school_admin', c.school_id)
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  );

CREATE POLICY "Parents can view their children's attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.student_id = student_id
      AND ps.parent_id = auth.uid()
    )
  );

-- System tools: Role-based access
CREATE POLICY "Authenticated users can view active tools for their role"
  ON public.system_tools FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(required_role)
    )
  );

CREATE POLICY "Super admins can manage system tools"
  ON public.system_tools FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- AI Conversations: User owns their conversations
CREATE POLICY "Users can manage their conversations"
  ON public.ai_conversations FOR ALL
  USING (user_id = auth.uid());

-- AI Messages: Via conversation ownership
CREATE POLICY "Users can manage messages in their conversations"
  ON public.ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Pending actions: User and admin access
CREATE POLICY "Users can view their pending actions"
  ON public.pending_actions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage pending actions"
  ON public.pending_actions FOR ALL
  USING (
    public.has_role(auth.uid(), 'school_admin', school_id)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default system tools
INSERT INTO public.system_tools (tool_name, description, api_endpoint, required_role) VALUES
('search_students', 'Search for students by name, matricule, or class', '/api/tools/search-students', ARRAY['teacher', 'school_admin', 'super_admin']::public.app_role[]),
('get_class_stats', 'Get statistics for a specific class', '/api/tools/class-stats', ARRAY['teacher', 'school_admin', 'super_admin']::public.app_role[]),
('get_student_grades', 'Get grades for a specific student', '/api/tools/student-grades', ARRAY['teacher', 'school_admin', 'parent', 'student']::public.app_role[]),
('get_attendance_summary', 'Get attendance summary for class or student', '/api/tools/attendance-summary', ARRAY['teacher', 'school_admin', 'parent']::public.app_role[]),
('draft_parent_notification', 'Draft a notification message for parents (requires approval)', '/api/tools/draft-notification', ARRAY['teacher', 'school_admin']::public.app_role[]);
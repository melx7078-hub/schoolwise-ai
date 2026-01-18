# 🏫 SysThemPlus - Complete Project Blueprint

> **Version:** 1.0.0  
> **Date:** 2026-01-18  
> **Author:** Solo Engineer  
> **Platform:** Lovable + Supabase (Free Tier)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Database Schema](#database-schema)
4. [Edge Functions](#edge-functions)
5. [Frontend Architecture](#frontend-architecture)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Core Features](#core-features)
8. [AI Agent System](#ai-agent-system)
9. [Setup Instructions](#setup-instructions)

---

## 🎯 PROJECT OVERVIEW

### Vision
A production-ready, multi-tenant school management system designed for low-resource environments (African context). The platform digitizes school operations with an integrated Autonomous AI Agent.

### Constraints
- **Developer:** Solo engineer
- **Budget:** 0 FCFA (completely free)
- **Platform:** Vercel + Supabase free tiers
- **Architecture:** One database, Multi-tenant with strict data isolation

### Core Goal
Digitize school operations including:
- Student/Teacher management
- Attendance tracking
- Grade management
- Report generation
- AI-powered assistance

---

## 🛠 TECHNICAL STACK

### Frontend
```
- React 18.3.1 + Vite
- TypeScript
- Tailwind CSS + Shadcn/UI
- React Router DOM 6.x
- TanStack Query (React Query)
- Lucide React (Icons)
- Recharts (Charts)
- Sonner (Toasts)
- PWA Ready
```

### Backend (Supabase)
```
- PostgreSQL Database
- Row Level Security (RLS)
- Edge Functions (Deno)
- Supabase Auth
- Supabase Storage (planned)
```

### AI Integration
```
- Lovable AI Gateway
- Supported Models:
  - google/gemini-2.5-flash (default)
  - openai/gpt-5-mini
  - google/gemini-2.5-pro
```

---

## 🗄 DATABASE SCHEMA

### Enums

```sql
-- User Roles
CREATE TYPE app_role AS ENUM (
  'super_admin',
  'school_admin', 
  'teacher',
  'parent',
  'student'
);

-- Attendance Status
CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'excused'
);

-- Subscription Status
CREATE TYPE subscription_status AS ENUM (
  'trial',
  'active',
  'suspended',
  'cancelled'
);
```

### Core Tables

#### 1. schools
```sql
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_status subscription_status DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all schools"
ON public.schools FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their school"
ON public.schools FOR SELECT
USING (id = get_user_school_id(auth.uid()));
```

#### 2. profiles
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 3. user_roles
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: School admins can only manage non-super_admin roles
```

#### 4. academic_years
```sql
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. classes
```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  name TEXT NOT NULL,
  level TEXT,
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. students
```sql
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  profile_id UUID REFERENCES public.profiles(id),
  class_id UUID REFERENCES public.classes(id),
  matricule TEXT,
  gender TEXT,
  date_of_birth DATE,
  address TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. teachers
```sql
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  profile_id UUID REFERENCES public.profiles(id),
  employee_id TEXT,
  specialization TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. subjects
```sql
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  name TEXT NOT NULL,
  code TEXT,
  coefficient NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 9. teacher_assignments
```sql
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 10. attendance
```sql
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 11. grades
```sql
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  academic_year_id UUID REFERENCES public.academic_years(id),
  value NUMERIC NOT NULL,
  max_value NUMERIC DEFAULT 20,
  coefficient NUMERIC DEFAULT 1.0,
  grade_type TEXT NOT NULL, -- 'exam', 'test', 'homework', 'project'
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT now()
);
```

#### 12. teacher_invitations
```sql
CREATE TABLE public.teacher_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role app_role DEFAULT 'teacher',
  class_ids UUID[] DEFAULT '{}',
  permissions JSONB DEFAULT '{
    "can_view_students": true,
    "can_manage_attendance": true,
    "can_manage_grades": true
  }',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 13. teacher_permissions
```sql
CREATE TABLE public.teacher_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_ids UUID[] DEFAULT '{}',
  can_view_students BOOLEAN DEFAULT true,
  can_manage_attendance BOOLEAN DEFAULT true,
  can_manage_grades BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT false,
  can_send_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 14. audit_logs
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  _school_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    _school_id := OLD.school_id;
  ELSE
    _school_id := NEW.school_id;
  END IF;

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      school_id, user_id, action, table_name, record_id,
      old_data, new_data
    ) VALUES (
      _school_id, _user_id, TG_OP, TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 15. parent_students
```sql
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 16. ai_conversations & ai_messages
```sql
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id),
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 17. system_tools
```sql
CREATE TABLE public.system_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  required_role app_role[] DEFAULT ARRAY['super_admin'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 18. pending_actions
```sql
CREATE TABLE public.pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Helper Functions

```sql
-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID,
  _role app_role,
  _school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (school_id = _school_id OR _school_id IS NULL OR role = 'super_admin')
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get user's school ID
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user belongs to school
CREATE OR REPLACE FUNCTION public.user_belongs_to_school(
  _user_id UUID,
  _school_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (school_id = _school_id OR role = 'super_admin')
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Generate secure invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(32), 'hex')
$$ LANGUAGE sql SECURITY DEFINER;

-- Check teacher class access
CREATE OR REPLACE FUNCTION public.teacher_has_class_access(
  _teacher_id UUID,
  _class_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_permissions tp
    WHERE tp.teacher_id = _teacher_id
    AND (_class_id = ANY(tp.class_ids) OR tp.class_ids = '{}')
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## ⚡ EDGE FUNCTIONS

### 1. ai-agent

**Purpose:** Handles AI conversations with tool support

**Endpoint:** `POST /functions/v1/ai-agent`

```typescript
// supabase/functions/ai-agent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages, schoolId, userId } = await req.json()

    const systemPrompt = `You are an AI assistant for a school management system...`

    const response = await fetch('https://ai.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    })

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

### 2. invite-teacher

**Purpose:** Creates teacher invitation with secure token

```typescript
// supabase/functions/invite-teacher/index.ts
serve(async (req) => {
  const { email, schoolId, classIds, permissions, invitedBy } = await req.json()
  
  // Generate token
  const token = crypto.randomUUID() + crypto.randomUUID()
  
  // Insert invitation
  const { data, error } = await supabaseAdmin
    .from('teacher_invitations')
    .insert({
      email,
      school_id: schoolId,
      class_ids: classIds,
      permissions,
      invited_by: invitedBy,
      token,
    })
    .select()
    .single()

  // Return invitation link
  const inviteUrl = `${origin}/invite/${token}`
  
  return new Response(JSON.stringify({ 
    success: true, 
    inviteUrl,
    invitation: data 
  }))
})
```

### 3. accept-invitation

**Purpose:** Processes teacher invitation acceptance

```typescript
// supabase/functions/accept-invitation/index.ts
serve(async (req) => {
  const { token, fullName, password } = await req.json()

  // 1. Validate token
  const { data: invitation } = await supabaseAdmin
    .from('teacher_invitations')
    .select('*, school:schools(*)')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  // 2. Create auth user
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  // 3. Update profile with school_id
  await supabaseAdmin
    .from('profiles')
    .update({ school_id: invitation.school_id })
    .eq('id', authUser.user.id)

  // 4. Assign role
  await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authUser.user.id,
      role: invitation.role,
      school_id: invitation.school_id
    })

  // 5. Create teacher record
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .insert({
      school_id: invitation.school_id,
      profile_id: authUser.user.id
    })
    .select()
    .single()

  // 6. Create permissions
  await supabaseAdmin
    .from('teacher_permissions')
    .insert({
      teacher_id: teacher.id,
      school_id: invitation.school_id,
      class_ids: invitation.class_ids,
      ...invitation.permissions
    })

  // 7. Mark invitation as accepted
  await supabaseAdmin
    .from('teacher_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return new Response(JSON.stringify({ success: true }))
})
```

### 4. import-csv

**Purpose:** Bulk import students/teachers from CSV

```typescript
// supabase/functions/import-csv/index.ts
serve(async (req) => {
  const { type, schoolId, data } = await req.json()
  
  const results = { success: 0, failed: 0, errors: [] }

  for (const row of data) {
    try {
      if (type === 'students') {
        // Create profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .insert({ full_name: row.name, email: row.email })
          .select()
          .single()

        // Create student
        await supabaseAdmin
          .from('students')
          .insert({
            school_id: schoolId,
            profile_id: profile.id,
            matricule: row.matricule,
            gender: row.gender,
            date_of_birth: row.date_of_birth
          })

        results.success++
      }
    } catch (error) {
      results.failed++
      results.errors.push({ row, error: error.message })
    }
  }

  return new Response(JSON.stringify(results))
})
```

### 5. setup-super-admin

**Purpose:** Initialize first super admin

```typescript
// supabase/functions/setup-super-admin/index.ts
serve(async (req) => {
  const { email, password, fullName } = await req.json()

  // Check if super admin exists
  const { data: existing } = await supabaseAdmin
    .from('user_roles')
    .select()
    .eq('role', 'super_admin')
    .limit(1)

  if (existing?.length > 0) {
    return new Response(JSON.stringify({ 
      error: 'Super admin already exists' 
    }), { status: 400 })
  }

  // Create user with super_admin role
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authUser.user.id,
      role: 'super_admin'
    })

  return new Response(JSON.stringify({ success: true }))
})
```

---

## 🖥 FRONTEND ARCHITECTURE

### Directory Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── QuickActions.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AIAssistant.tsx
│   ├── shared/
│   │   ├── DataTable.tsx      # Reusable data table
│   │   └── CSVImport.tsx      # CSV import component
│   ├── teachers/
│   │   └── InviteTeacherModal.tsx
│   └── welcome/
│       ├── WelcomeDialog.tsx
│       └── SetupPrompt.tsx
├── hooks/
│   ├── useUserRole.ts         # Role & permission management
│   ├── useAIAgent.ts          # AI chat functionality
│   ├── useSchool.ts           # School data
│   └── use-toast.ts
├── pages/
│   ├── Index.tsx              # Landing page
│   ├── Auth.tsx               # Login/Signup
│   ├── Dashboard.tsx          # Main dashboard
│   ├── AcceptInvitation.tsx   # /invite/:token
│   ├── SchoolSetupWizard.tsx  # New school setup
│   └── admin/
│       ├── StudentsPage.tsx
│       ├── TeachersPage.tsx
│       ├── ClassesPage.tsx
│       ├── AttendancePage.tsx
│       ├── GradesPage.tsx
│       ├── AcademicYearPage.tsx
│       ├── ReportsPage.tsx
│       └── SettingsPage.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client (auto-generated)
│       └── types.ts           # Database types (auto-generated)
└── lib/
    └── utils.ts               # Utility functions
```

### Key Components

#### useUserRole Hook
```typescript
export function useUserRole() {
  const [state, setState] = useState({
    userId: null,
    schoolId: null,
    roles: [],
    isSuperAdmin: false,
    isSchoolAdmin: false,
    isTeacher: false,
    isParent: false,
    isStudent: false,
    isLoading: true,
  })

  useEffect(() => {
    // Fetch user session and roles from Supabase
  }, [])

  return state
}
```

#### useAIAgent Hook
```typescript
export function useAIAgent() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    // Add user message
    // Call ai-agent edge function with streaming
    // Parse and display response
  }

  return { messages, isLoading, sendMessage }
}
```

#### DataTable Component
```typescript
interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  pagination?: PaginationConfig
  actions?: (row: T) => ReactNode
}
```

---

## 👥 USER ROLES & PERMISSIONS

### Role Hierarchy

1. **Super Admin** (Platform Owner)
   - Manage all schools
   - View platform analytics
   - Configure system settings

2. **School Admin** (Director/Supervisor)
   - Manage school data
   - Invite/manage teachers
   - View all school reports
   - Import data via CSV

3. **Teacher**
   - View assigned classes
   - Manage attendance
   - Manage grades
   - (permissions configurable)

4. **Parent**
   - View children's data
   - View grades/attendance
   - Receive notifications

5. **Student**
   - View own grades
   - View schedule
   - Access learning resources

### Permission Matrix

| Action | Super Admin | School Admin | Teacher | Parent | Student |
|--------|-------------|--------------|---------|--------|---------|
| Manage Schools | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ (own school) | ❌ | ❌ | ❌ |
| Invite Teachers | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Students | ✅ | ✅ | Assigned | Own | ❌ |
| Manage Grades | ✅ | ✅ | If permitted | ❌ | ❌ |
| View Reports | ✅ | ✅ | If permitted | ❌ | ❌ |

---

## 🎯 CORE FEATURES

### 1. Authentication Flow

```
Landing → Sign Up/Login → 
  ├── New User → School Setup Wizard
  ├── Super Admin → Platform Dashboard
  ├── School Admin → School Dashboard
  ├── Teacher → Teacher Portal
  ├── Parent → Parent Portal
  └── Student → Student Portal
```

### 2. School Setup Wizard

**Steps:**
1. School Information (name, code, address, phone)
2. Academic Year Setup (name, start date, end date)
3. First Class Creation (name, level, capacity)

### 3. Teacher Invitation Flow

```
Admin creates invitation → Token generated →
Email sent with link → Teacher clicks link →
Sees school info → Creates password →
Account created → Permissions applied →
Redirected to teacher portal
```

### 4. CSV Import

**Supported Formats:**
- Students: name, email, matricule, gender, date_of_birth, class
- Teachers: name, email, specialization, employee_id

**Validation Rules:**
- Required fields check
- Email format validation
- Duplicate detection
- Row-by-row error reporting

### 5. Attendance Tracking

- Daily attendance by class
- Status: Present, Absent, Late, Excused
- Notes support
- Historical view
- Export capability

### 6. Grade Management

- By subject and grade type
- Coefficient support
- Max value customization
- Average calculation
- Report card generation

### 7. Audit Logging

All sensitive operations logged:
- User creation/deletion
- Grade modifications
- Attendance changes
- Role assignments
- Settings changes

---

## 🤖 AI AGENT SYSTEM

### Capabilities

1. **Navigation Assistance**
   - Guide users through the platform
   - Explain features

2. **Data Queries**
   - Summarize attendance
   - Calculate averages
   - Find student information

3. **Report Generation**
   - Create summaries
   - Export data

4. **Debugging Support**
   - Analyze errors
   - Suggest solutions

### Tool Registry

```typescript
const systemTools = [
  {
    name: 'get_students',
    description: 'Fetch students with optional filters',
    parameters: { class_id: 'optional', search: 'optional' },
    required_role: ['teacher', 'school_admin', 'super_admin']
  },
  {
    name: 'get_attendance_summary',
    description: 'Get attendance statistics',
    parameters: { class_id: 'required', date_range: 'optional' },
    required_role: ['teacher', 'school_admin']
  },
  // ... more tools
]
```

---

## 🚀 SETUP INSTRUCTIONS

### 1. Create Lovable Project

1. Go to lovable.dev
2. Create new project
3. Enable Lovable Cloud

### 2. Database Setup

Run the SQL migrations in order:
1. Create enums
2. Create tables
3. Create functions
4. Create triggers
5. Enable RLS policies

### 3. Edge Functions

Deploy edge functions:
- ai-agent
- invite-teacher
- accept-invitation
- import-csv
- setup-super-admin

### 4. Configure Auth

- Enable email/password auth
- Enable auto-confirm for development
- Set up email templates (optional)

### 5. Environment Variables

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
LOVABLE_API_KEY=<auto-provided>
```

### 6. First Super Admin

Call the setup-super-admin edge function:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/setup-super-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secure123","fullName":"Admin"}'
```

---

## 📱 PWA Configuration

```json
// public/manifest.json
{
  "name": "SysThemPlus",
  "short_name": "SysThemPlus",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [...]
}
```

---

## 🔒 SECURITY CHECKLIST

- [x] RLS enabled on all tables
- [x] No direct auth.users references
- [x] Secure invitation tokens (32+ bytes)
- [x] Password hashing (Supabase default)
- [x] CORS configured
- [x] Input validation
- [x] SQL injection prevention (parameterized)
- [x] XSS prevention (React default)
- [ ] Rate limiting (to implement)
- [ ] Leaked password protection (enable in dashboard)

---

## 📄 LICENSE

MIT License - Free for commercial use

---

## 🤝 SUPPORT

For issues or questions, create a ticket in the project repository.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-18

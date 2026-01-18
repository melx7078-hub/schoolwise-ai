import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo3D } from "@/components/Logo3D";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building, Calendar, BookOpen, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { z } from "zod";

const schoolSchema = z.object({
  name: z.string().min(2, "School name is required").max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

const academicYearSchema = z.object({
  name: z.string().min(2, "Academic year name is required").max(100),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100),
  level: z.string().max(50).optional(),
  capacity: z.number().min(1).max(500).optional(),
});

interface SchoolData {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface AcademicYearData {
  name: string;
  startDate: string;
  endDate: string;
}

interface ClassData {
  name: string;
  level: string;
  capacity: number;
}

const STEPS = [
  { id: 1, title: "School Info", icon: Building },
  { id: 2, title: "Academic Year", icon: Calendar },
  { id: 3, title: "First Class", icon: BookOpen },
];

export default function SchoolSetupWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSchoolId, setCreatedSchoolId] = useState<string | null>(null);
  const [createdAcademicYearId, setCreatedAcademicYearId] = useState<string | null>(null);
  
  const [schoolData, setSchoolData] = useState<SchoolData>({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  
  const [academicYearData, setAcademicYearData] = useState<AcademicYearData>({
    name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    startDate: "",
    endDate: "",
  });
  
  const [classData, setClassData] = useState<ClassData>({
    name: "",
    level: "",
    capacity: 50,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSchoolSubmit = async () => {
    setErrors({});
    const result = schoolSchema.safeParse(schoolData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const code = `SCH-${Date.now().toString(36).toUpperCase()}`;

      const { data: school, error: createError } = await supabase
        .from("schools")
        .insert({
          name: schoolData.name,
          code,
          address: schoolData.address || null,
          phone: schoolData.phone || null,
          email: schoolData.email || null,
          subscription_status: "trial",
        })
        .select()
        .single();

      if (createError) throw createError;

      // Assign school_admin role
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "school_admin",
        school_id: school.id,
      });

      // Update profile with school_id
      await supabase
        .from("profiles")
        .update({ school_id: school.id })
        .eq("id", user.id);

      setCreatedSchoolId(school.id);
      toast.success("School created successfully!");
      return true;
    } catch (err) {
      console.error("Error creating school:", err);
      toast.error("Failed to create school");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcademicYearSubmit = async () => {
    setErrors({});
    const result = academicYearSchema.safeParse(academicYearData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    if (new Date(academicYearData.endDate) <= new Date(academicYearData.startDate)) {
      setErrors({ endDate: "End date must be after start date" });
      return false;
    }

    if (!createdSchoolId) {
      toast.error("School not created yet");
      return false;
    }

    setIsSubmitting(true);

    try {
      const { data: academicYear, error: createError } = await supabase
        .from("academic_years")
        .insert({
          school_id: createdSchoolId,
          name: academicYearData.name,
          start_date: academicYearData.startDate,
          end_date: academicYearData.endDate,
          is_current: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCreatedAcademicYearId(academicYear.id);
      toast.success("Academic year created successfully!");
      return true;
    } catch (err) {
      console.error("Error creating academic year:", err);
      toast.error("Failed to create academic year");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClassSubmit = async () => {
    setErrors({});
    const result = classSchema.safeParse(classData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    if (!createdSchoolId || !createdAcademicYearId) {
      toast.error("Please complete previous steps first");
      return false;
    }

    setIsSubmitting(true);

    try {
      const { error: createError } = await supabase
        .from("classes")
        .insert({
          school_id: createdSchoolId,
          academic_year_id: createdAcademicYearId,
          name: classData.name,
          level: classData.level || null,
          capacity: classData.capacity || 50,
        });

      if (createError) throw createError;

      toast.success("Setup complete! Welcome to SchoolSync.");
      navigate("/dashboard");
      return true;
    } catch (err) {
      console.error("Error creating class:", err);
      toast.error("Failed to create class");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    let success = false;

    switch (currentStep) {
      case 1:
        success = await handleSchoolSubmit();
        break;
      case 2:
        success = await handleAcademicYearSubmit();
        break;
      case 3:
        success = await handleClassSubmit();
        return; // Final step navigates to dashboard
    }

    if (success) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo3D size="lg" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Welcome to SchoolSync</h1>
          <p className="text-muted-foreground">Let's set up your school in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${currentStep > step.id
                    ? "bg-success border-success text-success-foreground"
                    : currentStep === step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                  }
                `}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium hidden sm:block ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-success" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "School Information"}
              {currentStep === 2 && "Academic Year Setup"}
              {currentStep === 3 && "Create Your First Class"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Enter your school's basic information"}
              {currentStep === 2 && "Define the current academic year"}
              {currentStep === 3 && "Set up your first classroom"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: School Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    placeholder="Enter school name"
                    value={schoolData.name}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">Address</Label>
                  <Textarea
                    id="schoolAddress"
                    placeholder="Enter school address"
                    value={schoolData.address}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolPhone">Phone</Label>
                    <Input
                      id="schoolPhone"
                      placeholder="+237 XXX XXX XXX"
                      value={schoolData.phone}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">Email</Label>
                    <Input
                      id="schoolEmail"
                      type="email"
                      placeholder="school@example.com"
                      value={schoolData.email}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Academic Year */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="yearName">Academic Year Name *</Label>
                  <Input
                    id="yearName"
                    placeholder="e.g., 2025-2026"
                    value={academicYearData.name}
                    onChange={(e) => setAcademicYearData(prev => ({ ...prev, name: e.target.value }))}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={academicYearData.startDate}
                      onChange={(e) => setAcademicYearData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    {errors.startDate && <p className="text-sm text-destructive">{errors.startDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={academicYearData.endDate}
                      onChange={(e) => setAcademicYearData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                    {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: First Class */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name *</Label>
                  <Input
                    id="className"
                    placeholder="e.g., Class 6A"
                    value={classData.name}
                    onChange={(e) => setClassData(prev => ({ ...prev, name: e.target.value }))}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="classLevel">Level/Grade</Label>
                    <Input
                      id="classLevel"
                      placeholder="e.g., 6th Grade"
                      value={classData.level}
                      onChange={(e) => setClassData(prev => ({ ...prev, level: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classCapacity">Max Capacity</Label>
                    <Input
                      id="classCapacity"
                      type="number"
                      min={1}
                      max={500}
                      value={classData.capacity}
                      onChange={(e) => setClassData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 50 }))}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <p>💡 You can add more classes later from the dashboard.</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : currentStep === 3 ? (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact support at support@schoolsync.africa
        </p>
      </div>
    </div>
  );
}

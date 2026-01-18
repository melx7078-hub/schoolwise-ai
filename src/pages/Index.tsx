import { Link } from "react-router-dom";
import { Logo3D } from "@/components/Logo3D";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  Users, 
  BarChart3, 
  Shield, 
  Smartphone, 
  Wifi,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  ClipboardCheck,
  MessageSquare
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Multi-Tenant Architecture",
    description: "Manage multiple schools from a single platform with complete data isolation.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance & Grades",
    description: "Track student attendance and manage grades with automated report cards.",
  },
  {
    icon: MessageSquare,
    title: "AI-Powered Assistant",
    description: "Intelligent chatbot that helps you search records and draft notifications.",
  },
  {
    icon: Shield,
    title: "Role-Based Security",
    description: "Granular access control for admins, teachers, parents, and students.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Optimized for smartphones with offline-capable PWA technology.",
  },
  {
    icon: Wifi,
    title: "Low Bandwidth Ready",
    description: "Designed for African internet conditions with minimal data usage.",
  },
];

const stats = [
  { value: "10+", label: "Schools Supported" },
  { value: "7,000+", label: "Students Managed" },
  { value: "99.9%", label: "Uptime Guaranteed" },
  { value: "0 FCFA", label: "Initial Cost" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo3D size="sm" />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-hero-pattern opacity-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-secondary/5 to-transparent" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary font-medium text-sm mb-8 fade-in">
              <GraduationCap size={16} />
              <span>African Tech Excellence</span>
            </div>

            {/* Centered 3D Logo */}
            <div className="flex justify-center mb-8 fade-in stagger-1">
              <Logo3D size="xl" showText={false} />
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6 fade-in stagger-2">
              <span className="gradient-text">Modern School Management</span>
              <br />
              <span className="text-foreground">for Africa</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 fade-in stagger-3">
              Digitize your school operations with a powerful, mobile-first platform 
              designed for low-resource environments. Zero initial cost.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in stagger-4">
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start Free Today
                  <ArrowRight size={20} />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-sm text-muted-foreground fade-in stagger-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" />
                <span>Secure by design</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need to <span className="gradient-text">Run Your School</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed specifically for African educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="stats-card group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <feature.icon className="text-secondary" size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                  Built by Africans,
                  <br />
                  <span className="gradient-text">For Africa</span>
                </h2>
                <p className="text-muted-foreground mb-6">
                  SchoolSync Africa was created by Hilarus Gbagoule with a vision to 
                  transform education management across the continent. We understand 
                  the unique challenges of African schools and have designed every 
                  feature with those realities in mind.
                </p>
                <ul className="space-y-3">
                  {[
                    "Works on 2G/3G networks",
                    "Offline-first architecture",
                    "Minimal data consumption",
                    "Mobile-optimized interface",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="text-success" size={20} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 p-8 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 flex flex-col items-center gap-2">
                      <BookOpen className="text-primary" size={32} />
                      <span className="text-sm font-medium">Curriculum</span>
                    </div>
                    <div className="glass-card p-4 flex flex-col items-center gap-2">
                      <BarChart3 className="text-secondary" size={32} />
                      <span className="text-sm font-medium">Analytics</span>
                    </div>
                    <div className="glass-card p-4 flex flex-col items-center gap-2">
                      <Users className="text-primary" size={32} />
                      <span className="text-sm font-medium">Community</span>
                    </div>
                    <div className="glass-card p-4 flex flex-col items-center gap-2">
                      <Shield className="text-secondary" size={32} />
                      <span className="text-sm font-medium">Security</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 animated-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Ready to Transform Your School?
            </h2>
            <p className="text-lg text-white/80 mb-10">
              Join thousands of schools across Africa already using SchoolSync 
              to streamline their operations.
            </p>
            <Link to="/auth?mode=signup">
              <Button 
                size="xl" 
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-xl"
              >
                Get Started for Free
                <ArrowRight size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <GraduationCap size={24} />
              <span className="font-display font-bold">SchoolSync Africa</span>
            </div>
            <p className="text-sm text-background/60">
              © {new Date().getFullYear()} SchoolSync Africa. Built with ❤️ by Hilarus Gbagoule.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

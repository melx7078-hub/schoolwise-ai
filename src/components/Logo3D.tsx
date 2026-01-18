import { GraduationCap } from "lucide-react";

interface Logo3DProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
  xl: "w-28 h-28 text-3xl",
};

const iconSizes = {
  sm: 20,
  md: 28,
  lg: 40,
  xl: 56,
};

export function Logo3D({ size = "md", showText = true }: Logo3DProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="logo-3d" style={{ width: "auto", height: "auto" }}>
        <div className={`logo-3d-inner ${sizeClasses[size]}`}>
          <GraduationCap 
            size={iconSizes[size]} 
            className="text-white drop-shadow-lg relative z-10" 
            strokeWidth={1.5}
          />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg leading-tight tracking-tight">
            <span className="text-primary">School</span>
            <span className="text-secondary">Sync</span>
          </span>
          <span className="text-xs text-muted-foreground font-medium -mt-0.5">Africa</span>
        </div>
      )}
    </div>
  );
}

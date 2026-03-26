import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary font-bold text-white",
          sizeStyles[size]
        )}
      >
        AT
      </div>
      <span className="text-lg font-semibold text-text-primary">
        Assured Trade
      </span>
    </div>
  );
}

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline",
        // Variantes mejoradas manteniendo colores originales
        premium: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:shadow-[var(--shadow-premium)] transition-all duration-300 font-semibold tracking-wide",
        success: "bg-success text-success-foreground hover:bg-success/90 transition-all duration-200",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 transition-all duration-200",
        error: "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200",
        glass: "bg-card/60 border border-border/30 backdrop-blur-md hover:bg-card/80 transition-all duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        // Nuevos tamaños
        xs: "h-7 rounded px-2 text-xs",
        "2xl": "h-14 rounded-xl px-12 text-lg",
      },
      animation: {
        none: "",
        bounce: "hover:animate-bounce",
        pulse: "hover:animate-pulse",
        wiggle: "hover:animate-wiggle",
        float: "hover:animate-float",
        glow: "hover:animate-pulse-glow",
        lift: "hover:scale-105 hover:shadow-lg transition-all duration-200",
        shine: "hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation,
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {loading ? (loadingText || "Cargando...") : children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </Comp>
    );
  }
);
EnhancedButton.displayName = "EnhancedButton";

// Componentes especializados con colores originales
export const PremiumButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton ref={ref} variant="premium" {...props} />
);
PremiumButton.displayName = "PremiumButton";

export const SuccessButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton ref={ref} variant="success" {...props} />
);
SuccessButton.displayName = "SuccessButton";

export const WarningButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton ref={ref} variant="warning" {...props} />
);
WarningButton.displayName = "WarningButton";

export const ErrorButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton ref={ref} variant="error" {...props} />
);
ErrorButton.displayName = "ErrorButton";

export const GlassButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton ref={ref} variant="glass" {...props} />
);
GlassButton.displayName = "GlassButton";

export { EnhancedButton, buttonVariants };

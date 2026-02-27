import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-sm",
        elevated: "bg-card border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-premium)] transition-shadow duration-200",
        glass: "bg-card/60 border-border/30 backdrop-blur-md shadow-[var(--shadow-card)]",
        premium: "bg-gradient-to-br from-card to-card/80 border-border/50 shadow-[var(--shadow-card)] backdrop-blur-sm",
        success: "bg-success/10 border-success/30 text-success-foreground",
        warning: "bg-warning/10 border-warning/30 text-warning-foreground",
        error: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
        dark: "bg-card border-border text-card-foreground",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "cursor-pointer hover:scale-105 transition-transform duration-200",
        false: "",
      },
      glow: {
        none: "",
        primary: "hover:shadow-[var(--shadow-glow)] transition-all duration-200",
        success: "hover:shadow-lg hover:shadow-success/25 transition-all duration-200",
        warning: "hover:shadow-lg hover:shadow-warning/25 transition-all duration-200",
        error: "hover:shadow-lg hover:shadow-destructive/25 transition-all duration-200",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      glow: "none",
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, interactive, glow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive, glow, className }))}
      {...props}
    />
  )
);
EnhancedCard.displayName = "EnhancedCard";

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
EnhancedCardHeader.displayName = "EnhancedCardHeader";

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
EnhancedCardTitle.displayName = "EnhancedCardTitle";

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
EnhancedCardDescription.displayName = "EnhancedCardDescription";

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
EnhancedCardContent.displayName = "EnhancedCardContent";

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
EnhancedCardFooter.displayName = "EnhancedCardFooter";

// Componentes especializados con colores originales
export const PremiumCard = React.forwardRef<HTMLDivElement, Omit<EnhancedCardProps, 'variant'>>(
  (props, ref) => <EnhancedCard ref={ref} variant="premium" glow="primary" {...props} />
);
PremiumCard.displayName = "PremiumCard";

export const GlassCard = React.forwardRef<HTMLDivElement, Omit<EnhancedCardProps, 'variant'>>(
  (props, ref) => <EnhancedCard ref={ref} variant="glass" {...props} />
);
GlassCard.displayName = "GlassCard";

export const ElevatedCard = React.forwardRef<HTMLDivElement, Omit<EnhancedCardProps, 'variant'>>(
  (props, ref) => <EnhancedCard ref={ref} variant="elevated" {...props} />
);
ElevatedCard.displayName = "ElevatedCard";

export const InteractiveCard = React.forwardRef<HTMLDivElement, Omit<EnhancedCardProps, 'interactive'>>(
  (props, ref) => <EnhancedCard ref={ref} interactive {...props} />
);
InteractiveCard.displayName = "InteractiveCard";

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
};

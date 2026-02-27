import { cn } from "@/lib/utils";
import { getServiceIcon, ServiceIcons } from "@/lib/icons";
import { colors } from "@/lib/styles";

interface ServiceIconProps {
  category: 'haircut' | 'beard' | 'styling' | 'treatment' | 'other';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'outline' | 'filled';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

const variantClasses = {
  default: 'text-gray-600',
  outline: 'text-gray-600 border border-gray-300 rounded-lg p-2',
  filled: 'text-white rounded-lg p-2',
};

export function ServiceIcon({ 
  category, 
  size = 'md', 
  variant = 'default',
  className 
}: ServiceIconProps) {
  const Icon = getServiceIcon(category);
  const sizeClass = sizeClasses[size];
  const variantClass = variantClasses[variant];
  
  // Color específico para cada categoría
  const categoryColor = colors.service[category];
  
  const iconClasses = cn(
    sizeClass,
    variantClass,
    className
  );

  if (variant === 'filled') {
    return (
      <div 
        className={iconClasses}
        style={{ backgroundColor: categoryColor }}
      >
        <Icon className={sizeClass} />
      </div>
    );
  }

  return (
    <Icon 
      className={iconClasses}
      style={variant === 'default' ? { color: categoryColor } : undefined}
    />
  );
}

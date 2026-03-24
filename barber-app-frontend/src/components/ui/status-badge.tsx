import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getStatusIcon, StatusIcons } from "@/lib/icons";
import { colors } from "@/lib/styles";

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'expired' | 'completed' | 'cancelled' | 'confirmed';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Activo',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconColor: colors.success[600],
  },
  inactive: {
    label: 'Inactivo',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: colors.secondary[600],
  },
  pending: {
    label: 'Pendiente',
    variant: 'outline' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: colors.warning[600],
  },
  expired: {
    label: 'Vencida',
    variant: 'outline' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: colors.warning[600],
  },
  completed: {
    label: 'Completado',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconColor: colors.success[600],
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconColor: colors.error[600],
  },
  confirmed: {
    label: 'Confirmado',
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: colors.primary[600],
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2',
};

export function StatusBadge({ 
  status, 
  showIcon = true, 
  size = 'md',
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = getStatusIcon(status);
  const sizeClass = sizeClasses[size];

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        config.className,
        sizeClass,
        'flex items-center gap-1 font-medium',
        className
      )}
    >
      {showIcon && (
        <Icon 
          className="h-3 w-3" 
          style={{ color: config.iconColor }}
        />
      )}
      {config.label}
    </Badge>
  );
}

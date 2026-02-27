import { useState } from 'react';
import { BarChart3, Users, Calendar, DollarSign, TrendingUp, Scissors, Clock, MapPin, Building2 } from "lucide-react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import AdminUsersManagement from './admin/AdminUsersManagement';
import AdminBarbershopsManagement from './admin/AdminBarbershopsManagement';
import AdminReports from './admin/AdminReports';
import AdminBookingsManagement from './admin/AdminBookingsManagement';


// Removed hardcoded stats - will use real data from API

// Removed hardcoded data - will use real data from API

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('overview');

  // System stats
  const { data: systemStats } = useQuery({
    queryKey: ['adminSystemStats'],
    queryFn: async () => {
      const r = await api.get('/api/admin/dashboard');
      return r.data as {
        totalUsers: number;
        activeBarbers: number;
        todayAppointments: number;
        monthlyRevenue: number;
        growthRate: number;
      };
    }
  });

  // Top barbers
  const { data: topBarbers } = useQuery({
    queryKey: ['adminTopBarbers'],
    queryFn: async () => {
      const r = await api.get('/api/admin/top-barbers');
      return r.data as Array<{
        id?: string;
        _id?: string;
        name: string;
        appointments: number;
        revenue: number;
        rating: number;
        location: string;
      }>;
    }
  });

  // Recent bookings
  const { data: recentBookings } = useQuery({
    queryKey: ['adminRecentBookings'],
    queryFn: async () => {
      const r = await api.get('/api/bookings?limit=5&sort=-createdAt');
      return r.data as Array<{ 
        id?: string;
        _id?: string; 
        date: string; 
        startTime: string; 
        user: { name: string }; 
        barber: { name: string }; 
        barbershop: { name: string }; 
        status: string 
      }>;
    }
  });

  const modules = [
    { id: 'overview', label: 'Vista General', icon: BarChart3 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'barbershops', label: 'Barberías', icon: Building2 },
    { id: 'bookings', label: 'Reservas', icon: Calendar },
    { id: 'reports', label: 'Reportes', icon: TrendingUp }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'users':
        return <AdminUsersManagement />;
      case 'barbershops':
        return <AdminBarbershopsManagement />;
      case 'bookings':
        return <AdminBookingsManagement />;
      case 'reports':
        return <AdminReports />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground">
          Vista general del sistema BarberApp
        </p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuarios</p>
                <p className="text-2xl font-bold">{(systemStats?.totalUsers || 0).toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Barberos Activos</p>
                <p className="text-2xl font-bold">{systemStats?.activeBarbers || 0}</p>
              </div>
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Citas Hoy</p>
                <p className="text-2xl font-bold">{systemStats?.todayAppointments || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Mes</p>
                <p className="text-2xl font-bold">${((systemStats?.monthlyRevenue || 0) / 1000).toFixed(0)}k</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crecimiento</p>
                <p className="text-2xl font-bold text-success">+{systemStats?.growthRate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Resumen de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {(systemStats?.totalUsers || 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Usuarios registrados</p>
              <div className="mt-4 text-xs text-muted-foreground">
                {systemStats?.activeBarbers || 0} barberos activos
              </div>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Actividad Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-success mb-2">
                {systemStats?.todayAppointments || 0}
              </div>
              <p className="text-sm text-muted-foreground">Citas programadas</p>
              <div className="mt-4 text-xs text-muted-foreground">
                Últimas 24 horas
              </div>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                ${((systemStats?.monthlyRevenue || 0) / 1000).toFixed(0)}k
              </div>
              <p className="text-sm text-muted-foreground">Ingresos totales</p>
              <div className="mt-4 text-xs text-success flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{systemStats?.growthRate || 0}% vs mes anterior
              </div>
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Reservas Recientes
            </CardTitle>
            <CardDescription>Últimas reservas del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentBookings || []).map((booking) => (
              <div key={getId(booking)} className="flex items-center justify-between p-3 rounded-lg bg-card/30">
                <div>
                  <div className="text-sm font-medium">{booking.user?.name} con {booking.barber?.name}</div>
                  <div className="text-xs text-muted-foreground">{booking.barbershop?.name} • {booking.date} • {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <Badge variant={booking.status === 'pending' ? 'secondary' : booking.status === 'confirmed' ? 'default' : 'outline'}>
                  {booking.status}
                </Badge>
              </div>
            ))}
            {(!recentBookings || recentBookings.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                No hay reservas recientes
              </div>
            )}
          </CardContent>
        </EnhancedCard>

        {/* Top Barbers */}
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Barberos del Mes
            </CardTitle>
            <CardDescription>
              Mejores performances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(topBarbers || []).map((barber, index) => (
              <div
                key={getId(barber)}
                className="flex items-center gap-4 p-3 rounded-lg bg-card/30"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{barber.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{barber.location}</span>
                    <span>•</span>
                    <span>{barber.appointments} citas</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">
                    ${(barber.revenue / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ⭐ {barber.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
            {(!topBarbers || topBarbers.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </EnhancedCard>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            return (
              <Button
                key={module.id}
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setActiveModule(module.id)}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {module.label}
                {isActive && (
                  <div className="w-2 h-2 bg-primary-foreground rounded-full ml-1" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Module Content */}
      <div className="min-h-[600px]">
        {renderModule()}
      </div>
    </div>
  );
}

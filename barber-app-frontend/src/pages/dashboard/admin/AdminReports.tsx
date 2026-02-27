import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getId } from '@/lib/id';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Scissors,
  Clock,
  MapPin,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeBarbers: number;
  todayAppointments: number;
  monthlyRevenue: number;
  growthRate: number;
  totalBookings: number;
  bookingsPerDay: Record<string, number>;
  bookingsPerBarber: Record<string, number>;
  bookingsPerBarbershop: Record<string, number>;
  timeFrequency: Record<string, number>;
  estimatedRevenue: number;
}

interface TopBarber {
  id?: string;
  _id?: string;
  name: string;
  appointments: number;
  revenue: number;
  rating: number;
  location: string;
}

interface MonthlyData {
  month: string;
  appointments: number;
  revenue: number;
  growth: number;
}

export default function AdminReports() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [barbershopFilter, setBarbershopFilter] = useState<string>('all');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [dateError, setDateError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Obtener estadísticas del dashboard
  const { data: dashboardStats, isLoading: statsLoading, isRefetching: statsRefetching } = useQuery<DashboardStats>({
    queryKey: ['adminDashboardStats', dateRange, barbershopFilter, barberFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);
      if (barbershopFilter !== 'all') params.append('barbershopId', barbershopFilter);
      if (barberFilter !== 'all') params.append('barberId', barberFilter);
      
      const response = await api.get(`/api/admin/dashboard?${params.toString()}`);
      return response.data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Obtener top barberos
  const { data: topBarbers, isLoading: topBarbersLoading } = useQuery<TopBarber[]>({
    queryKey: ['adminTopBarbers', dateRange, barbershopFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        params.append('month', (fromDate.getMonth() + 1).toString());
        params.append('year', fromDate.getFullYear().toString());
      }
      if (barbershopFilter !== 'all') {
        params.append('barbershopId', barbershopFilter);
      }
      const response = await api.get(`/api/admin/top-barbers?${params.toString()}`);
      return response.data;
    }
  });

  // Obtener datos mensuales
  const { data: monthlyData, isLoading: monthlyDataLoading } = useQuery<MonthlyData[]>({
    queryKey: ['adminMonthlyData', dateRange, barbershopFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        params.append('year', fromDate.getFullYear().toString());
      }
      if (barbershopFilter !== 'all') {
        params.append('barbershopId', barbershopFilter);
      }
      const response = await api.get(`/api/admin/monthly-data?${params.toString()}`);
      return response.data;
    }
  });

  // Obtener barberías para filtros
  const { data: barbershops } = useQuery({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const response = await api.get('/api/admin/barbershops');
      return response.data;
    }
  });

  // Obtener barberos para filtros
  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const response = await api.get('/api/admin/users?role=barber');
      return response.data;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CO').format(num);
  };

  const getTopTimeSlots = () => {
    if (!dashboardStats?.timeFrequency) return [];
    return Object.entries(dashboardStats.timeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getTopBarbershops = () => {
    if (!dashboardStats?.bookingsPerBarbershop) return [];
    return Object.entries(dashboardStats.bookingsPerBarbershop)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  // Validar rango de fechas
  const validateDateRange = (from: string, to: string) => {
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        setDateError('La fecha "Desde" debe ser anterior a "Hasta"');
        return false;
      }
    }
    setDateError('');
    return true;
  };

  // Manejar cambio de fecha "desde"
  const handleFromDateChange = (value: string) => {
    setDateRange(prev => ({ ...prev, from: value }));
    if (value && dateRange.to) {
      validateDateRange(value, dateRange.to);
    } else {
      setDateError('');
    }
  };

  // Manejar cambio de fecha "hasta"
  const handleToDateChange = (value: string) => {
    setDateRange(prev => ({ ...prev, to: value }));
    if (dateRange.from && value) {
      validateDateRange(dateRange.from, value);
    } else {
      setDateError('');
    }
  };

  // Actualizar datos
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }),
        queryClient.invalidateQueries({ queryKey: ['adminTopBarbers'] }),
        queryClient.invalidateQueries({ queryKey: ['adminMonthlyData'] })
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setDateRange({ from: '', to: '' });
    setBarbershopFilter('all');
    setBarberFilter('all');
    setDateError('');
  };

  const exportReport = () => {
    // Implementar exportación de reportes
    return;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reportes y Analytics
          </h2>
          <p className="text-muted-foreground">
            Análisis detallado del rendimiento del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </EnhancedButton>
          <EnhancedButton variant="premium" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </EnhancedButton>
        </div>
      </div>

      {/* Filtros */}
      <EnhancedCard variant="premium" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              value={dateRange.from}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={dateError ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <Label htmlFor="to">Hasta</Label>
            <Input
              id="to"
              type="date"
              value={dateRange.to}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={dateError ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <Label>Barbería</Label>
            <Select value={barbershopFilter} onValueChange={setBarbershopFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las barberías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las barberías</SelectItem>
                {barbershops?.map(shop => (
                  <SelectItem key={getId(shop)} value={getId(shop)}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Barbero</Label>
            <Select value={barberFilter} onValueChange={setBarberFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los barberos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los barberos</SelectItem>
                {barbers?.map(barber => (
                  <SelectItem key={getId(barber)} value={getId(barber)}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Mensaje de error y botón de limpiar */}
        <div className="mt-4 flex items-center justify-between">
          {dateError && (
            <p className="text-sm text-red-500 flex items-center gap-2">
              <span>⚠️</span>
              {dateError}
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </EnhancedCard>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuarios Totales</p>
                {statsLoading ? (
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(dashboardStats?.totalUsers || 0)}</p>
                )}
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{dashboardStats?.growthRate || 0}% este mes
                </p>
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
                <p className="text-2xl font-bold">{dashboardStats?.activeBarbers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  En {barbershops?.length || 0} barberías
                </p>
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
                <p className="text-2xl font-bold">{dashboardStats?.todayAppointments || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats?.totalBookings || 0} totales
                </p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats?.monthlyRevenue || 0)}</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{dashboardStats?.growthRate || 0}% vs mes anterior
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Barberos */}
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Barberos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topBarbersLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Cargando barberos...</p>
              </div>
            ) : topBarbers && topBarbers.length > 0 ? (
              topBarbers.map((barber, index) => (
                <div
                  key={getId(barber)}
                  className="flex items-center gap-4 p-3 rounded-lg bg-card/30 hover:bg-card/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm">
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
                      {formatCurrency(barber.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ⭐ {barber.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay datos de barberos disponibles</p>
              </div>
            )}
          </CardContent>
        </EnhancedCard>

        {/* Horarios más populares */}
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horarios Más Populares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Cargando horarios...</p>
              </div>
            ) : getTopTimeSlots().length > 0 ? (
              getTopTimeSlots().map(([time, count], index) => (
                <div key={time} className="flex items-center justify-between p-3 rounded-lg bg-card/30 hover:bg-card/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    <span className="font-medium">{time}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{count}</div>
                    <div className="text-xs text-muted-foreground">citas</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay datos de horarios disponibles</p>
              </div>
            )}
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Resumen mensual */}
      <EnhancedCard variant="premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumen Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyDataLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando datos mensuales...</p>
            </div>
          ) : monthlyData && monthlyData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="text-center p-4 rounded-lg bg-card/30 hover:bg-card/50 transition-colors">
                  <div className="text-lg font-bold text-muted-foreground mb-2">
                    {month.month}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold">{month.appointments}</div>
                      <div className="text-xs text-muted-foreground">citas</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(month.revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">ingresos</div>
                    </div>
                    {month.growth !== 0 && (
                      <div className={`text-xs ${month.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {month.growth > 0 ? '+' : ''}{month.growth.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos mensuales disponibles</p>
            </div>
          )}
        </CardContent>
      </EnhancedCard>

      {/* Top Barberías */}
      <EnhancedCard variant="premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Top Barberías por Reservas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando barberías...</p>
            </div>
          ) : getTopBarbershops().length > 0 ? (
            <div className="space-y-3">
              {getTopBarbershops().map(([barbershopId, count], index) => {
                const barbershop = barbershops?.find(shop => getId(shop) === barbershopId);
                return (
                  <div key={barbershopId} className="flex items-center justify-between p-3 rounded-lg bg-card/30 hover:bg-card/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{barbershop?.name || 'Barbería desconocida'}</div>
                        <div className="text-sm text-muted-foreground">{barbershop?.location || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{count}</div>
                      <div className="text-xs text-muted-foreground">reservas</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos de barberías disponibles</p>
            </div>
          )}
        </CardContent>
      </EnhancedCard>
    </div>
  );
}

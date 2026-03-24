import { Calendar, Clock, Users, Star, Search, Filter, Eye, CheckCircle, XCircle, AlertCircle, DollarSign, TrendingUp, Phone, MapPin, Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { formatReminderWindow, getSentReminderWindows, isAutoAssignedBooking } from "@/lib/booking-insights";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { EnhancedDialog } from "@/components/ui/enhanced-dialog";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AgendaItem {
  id?: string;
  _id?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  user: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    phone?: string;
  };
  barbershop: {
    id?: string;
    _id?: string;
    name: string;
    address: string;
    location: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    type?: string;
    eventType?: string;
    assignmentMode?: string;
    reminderWindowMinutes?: number;
  }>;
}

export default function BarberAgenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [viewType, setViewType] = useState<'day' | 'week'>('day');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaItem | null>(null);

  // Get agenda data
  const { data: agenda, isLoading, isError } = useQuery({
    queryKey: ['barberAgenda', selectedDate, viewType],
    queryFn: async () => {
      const r = await api.get('/api/bookings/barber/agenda', {
        params: { 
          date: selectedDate, 
          type: viewType 
        },
        timeout: 8000
      });
      return (r.data?.agenda ?? []) as AgendaItem[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // Get today's stats
  const { data: todayStats } = useQuery({
    queryKey: ['barberTodayStats', selectedDate],
    queryFn: async () => {
      const r = await api.get('/api/bookings/barber/stats', {
        params: { date: selectedDate, type: 'day' },
        timeout: 6000
      });
      return r.data as {
        totalAppointments: number;
        completedAppointments: number;
        pendingAppointments: number;
        cancelledAppointments: number;
        totalRevenue: number;
        averageRating: number;
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Update appointment status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['barberAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['barberTodayStats'] });
    },
    onError: (e: any) => toast({
      title: 'Error al actualizar estado',
      description: e?.response?.data?.message || 'Intenta nuevamente',
      variant: 'destructive'
    })
  });

  const filteredAgenda = (agenda ?? []).filter(item => {
    const matchesSearch = 
      item.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barbershop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "confirmed":
        return { status: 'confirmed' as const, label: 'Confirmada' };
      case "pending":
        return { status: 'pending' as const, label: 'Pendiente' };
      case "completed":
        return { status: 'completed' as const, label: 'Completada' };
      case "cancelled":
        return { status: 'cancelled' as const, label: 'Cancelada' };
      default:
        return { status: 'pending' as const, label: status };
    }
  };

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};


  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className={cn("text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent")}>
            Mi Agenda
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus citas y horarios
          </p>
        </div>
        <SkeletonGrid count={4} variant="appointment" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className={cn("text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent")}>
            Mi Agenda
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus citas y horarios
          </p>
        </div>
        <EnhancedCard variant="error" className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar la agenda</h3>
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información de tus citas
          </p>
          <EnhancedButton 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['barberAgenda'] })}
            variant="default"
          >
            Reintentar
          </EnhancedButton>
        </EnhancedCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent")}>
            Mi Agenda
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus citas y horarios del día
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(selectedDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton
            variant={viewType === 'day' ? 'premium' : 'outline'}
            size="sm"
            onClick={() => setViewType('day')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Día
          </EnhancedButton>
          <EnhancedButton
            variant={viewType === 'week' ? 'premium' : 'outline'}
            size="sm"
            onClick={() => setViewType('week')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Semana
          </EnhancedButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedCard variant="premium" glow="primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Citas</p>
                <p className="text-3xl font-bold text-primary">{todayStats?.totalAppointments || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Hoy</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="success" glow="success">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Completadas</p>
                <p className="text-3xl font-bold text-success">{todayStats?.completedAppointments || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {todayStats?.totalAppointments ? 
                    Math.round((todayStats.completedAppointments / todayStats.totalAppointments) * 100) : 0}% del total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success">
                <CheckCircle className="h-6 w-6 text-success-foreground" />
              </div>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="warning" glow="warning">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-warning">{todayStats?.pendingAppointments || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Por confirmar</p>
              </div>
              <div className="p-3 rounded-lg bg-warning">
                <AlertCircle className="h-6 w-6 text-warning-foreground" />
              </div>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium" glow="primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Ingresos</p>
                <p className="text-3xl font-bold text-primary">
                  ${todayStats?.totalRevenue?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Hoy
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Controls */}
      <EnhancedCard variant="glass" className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 w-full sm:w-[180px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, servicio o barbería..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* Agenda List */}
      <div className="space-y-6">
        {filteredAgenda.length > 0 ? (
          filteredAgenda.map((appointment) => {
            const statusConfig = getStatusConfig(appointment.status);
            return (
              <EnhancedCard key={getId(appointment)} variant="premium" glow="primary" className="group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg">
                        <Scissors className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                            {appointment.serviceName}
                          </h3>
                          <StatusBadge 
                            status={statusConfig.status} 
                            size="md"
                            showIcon={true}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isAutoAssignedBooking(appointment) && (
                            <Badge variant="secondary">Autoasignada</Badge>
                          )}
                          {getSentReminderWindows(appointment).map((windowMinutes) => (
                            <Badge key={`${getId(appointment)}-${windowMinutes}`} variant="outline">
                              Recordatorio {formatReminderWindow(windowMinutes)}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{appointment.user.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.barbershop.name}</span>
                          </div>
                          {appointment.user.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{appointment.user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary mb-1">
                          ${appointment.servicePrice.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.serviceDuration} minutos
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <EnhancedDialog
                          open={getId(selectedAppointment) === getId(appointment)}
                          onOpenChange={(open) => !open && setSelectedAppointment(null)}
                          title="Detalle de la Cita"
                          description="Información completa de la cita"
                          size="lg"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow">
                                <Scissors className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <h3 className="text-2xl font-semibold">{appointment.serviceName}</h3>
                                <StatusBadge 
                                  status={statusConfig.status} 
                                  size="lg"
                                  showIcon={true}
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {isAutoAssignedBooking(appointment) && (
                                    <Badge variant="secondary">Asignación automática</Badge>
                                  )}
                                  {getSentReminderWindows(appointment).map((windowMinutes) => (
                                    <Badge key={`detail-${getId(appointment)}-${windowMinutes}`} variant="outline">
                                      Recordatorio enviado {formatReminderWindow(windowMinutes)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  Información de la Cita
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fecha:</span>
                                    <span className="font-medium">{formatDate(appointment.date)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Hora:</span>
                                    <span className="font-medium">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duración:</span>
                                    <span className="font-medium">{appointment.serviceDuration} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Precio:</span>
                                    <span className="font-bold text-lg text-primary">${appointment.servicePrice.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                  <Users className="h-5 w-5" />
                                  Información del Cliente
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nombre:</span>
                                    <span className="font-medium">{appointment.user.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium">{appointment.user.email}</span>
                                  </div>
                                  {appointment.user.phone && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Teléfono:</span>
                                      <span className="font-medium">{appointment.user.phone}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Barbería:</span>
                                    <span className="font-medium">{appointment.barbershop.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ubicación:</span>
                                    <span className="font-medium">{appointment.barbershop.location}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {appointment.notes && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-lg">Notas</h4>
                                <div className="bg-muted/50 p-4 rounded-lg border">
                                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t">
                              {appointment.status === 'pending' && (
                                <EnhancedButton 
                                  onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'confirmed' })}
                                  disabled={updateStatus.isPending}
                                  variant="success"
                                  loading={updateStatus.isPending}
                                  loadingText="Confirmando..."
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirmar Cita
                                </EnhancedButton>
                              )}
                              {appointment.status === 'confirmed' && (
                                <EnhancedButton 
                                  onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'completed' })}
                                  disabled={updateStatus.isPending}
                                  variant="premium"
                                  loading={updateStatus.isPending}
                                  loadingText="Completando..."
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                   Completada
                                </EnhancedButton>
                              )}
                              {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                                <EnhancedButton 
                                  variant="error"
                                  onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'cancelled' })}
                                  disabled={updateStatus.isPending}
                                  loading={updateStatus.isPending}
                                  loadingText="Cancelando..."
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancelar Cita
                                </EnhancedButton>
                              )}
                            </div>
                          </div>
                        </EnhancedDialog>

                        <EnhancedButton
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </EnhancedButton>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            );
          })
        ) : (
          <EnhancedCard variant="glass" className="text-center p-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Calendar className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || statusFilter !== "all" ? "No se encontraron citas" : "No hay citas programadas"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "No se encontraron citas que coincidan con los filtros aplicados. Intenta ajustar los criterios de búsqueda."
                : `No tienes citas programadas para el ${viewType === 'day' ? 'día' : 'período'} seleccionado.`
              }
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <EnhancedButton
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Limpiar Filtros
              </EnhancedButton>
            )}
          </EnhancedCard>
        )}
      </div>
    </div>
  );
}

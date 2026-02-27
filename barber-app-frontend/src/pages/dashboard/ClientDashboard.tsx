import { Calendar, Clock, Scissors, Star, Plus, ArrowRight, Eye, MapPin, User, BookOpen, History, Settings, Heart, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { useState, useMemo } from "react";
import BookAppointment from "../book/BookAppointment";

// Removed hardcoded data - will use real data from API

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-success/20 text-success";
    case "pending":
      return "bg-warning/20 text-warning";
    case "completed":
      return "bg-primary/20 text-primary";
    case "cancelled":
      return "bg-destructive/20 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};


const getStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Confirmada";
    case "pending":
      return "Pendiente";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
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
  try {
    // Si ya está en formato HH:MM, devolverlo directamente
    if (timeString && timeString.includes(':')) {
      return timeString;
    }
    
    // Si está en formato HHMM (4 dígitos), convertir a HH:MM
    if (timeString && timeString.length === 4 && !isNaN(Number(timeString))) {
      return `${timeString.slice(0, 2)}:${timeString.slice(2, 4)}`;
    }
    
    // Intentar crear fecha con la hora
    const date = new Date(`2000-01-01T${timeString}`);
    if (isNaN(date.getTime())) {
      return timeString; // Devolver el string original si no se puede formatear
    }
    
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return timeString; // Devolver el string original en caso de error
  }
};


// Función para determinar si una reserva es "próxima" (futura y activa)
const isUpcomingAppointment = (appointment: any) => {
  const [yy, mm, dd] = String(appointment.date || '').split('-').map(Number);
  const appointmentDate = (yy && mm && dd)
    ? new Date(yy, mm - 1, dd)
    : new Date(appointment.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Resetear a medianoche para comparación
  
  // Solo mostrar reservas futuras (incluyendo hoy) y con estados activos
  const isFutureOrToday = appointmentDate >= today;
  const isActiveStatus = appointment.status === 'pending' || appointment.status === 'confirmed';

  return isFutureOrToday && isActiveStatus;
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState<string>('overview');

  const { data: bookings } = useQuery({
    queryKey: ['clientBookings'],
    queryFn: async () => {
      const r = await api.get('/api/bookings/my-bookings', { params: { type: 'all' }, timeout: 8000 });
      return r.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showBookingForm, setShowBookingForm] = useState<boolean>(false);
  const [bookingPrefill, setBookingPrefill] = useState<{ barbershopId?: string; barberId?: string }>({});
  const [favoritesSearch, setFavoritesSearch] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Queries para el formulario de reserva
  const { data: shops } = useQuery({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const r = await api.get('/api/barbershops');
      return r.data as Array<{ id?: string; _id?: string; name: string; location?: string; address?: string }>;
    },
  });

  const { data: allBarbers } = useQuery({
    queryKey: ['allBarbers'],
    queryFn: async () => {
      const r = await api.get('/api/users', { params: { role: 'barber' } });
      return r.data as Array<{ id?: string; _id?: string; name: string; barbershop?: { id?: string; _id?: string; name?: string } }>;
    },
  });

  const { data: favorites } = useQuery<{ favoriteBarbers: string[]; favoriteBarbershops: string[] }>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/users/me/favorites');
      return r.data as { favoriteBarbers: string[]; favoriteBarbershops: string[] };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (payload: { type: 'barber' | 'barbershop'; id: string; favorite?: boolean }) => {
      const r = await api.post('/api/users/me/favorites', payload);
      return r.data as { favoriteBarbers: string[]; favoriteBarbershops: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    }
  });

  const barbersById = useMemo(() => {
    const map = new Map<string, { id?: string; _id?: string; name: string }>();
    (allBarbers ?? []).forEach((b) => {
      const id = getId(b);
      if (id) map.set(id, b);
    });
    return map;
  }, [allBarbers]);

  const shopsById = useMemo(() => {
    const map = new Map<string, { id?: string; _id?: string; name: string }>();
    (shops ?? []).forEach((s) => {
      const id = getId(s);
      if (id) map.set(id, s);
    });
    return map;
  }, [shops]);

  const normalizedBookings = useMemo(() => {
    const list = Array.isArray(bookings)
      ? bookings
      : (bookings as any)?.bookings ?? (bookings as any)?.agenda ?? [];
    return list.map((b: any) => {
      const rawBarber = b.barber ?? b.barberId;
      const rawShop = b.barbershop ?? b.barbershopId;
      const barberObj = typeof rawBarber === 'string' ? barbersById.get(rawBarber) : rawBarber;
      const shopObj = typeof rawShop === 'string' ? shopsById.get(rawShop) : rawShop;
      return {
        ...b,
        _id: b._id ?? b.id,
        barber: barberObj ?? rawBarber,
        barbershop: shopObj ?? rawShop
      };
    });
  }, [bookings, barbersById, shopsById]);

  const recentAppointments = useMemo(() => {
    const items = (normalizedBookings ?? []).filter((b) => b.status === 'completed');
    const sorted = [...items].sort((a, b) => {
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);
      return bDate.getTime() - aDate.getTime();
    });
    return sorted.slice(0, 5);
  }, [normalizedBookings]);

  // Módulos de navegación para el cliente
  const modules = [
    { id: 'overview', label: 'Vista General', icon: Calendar },
    { id: 'appointments', label: 'Mis Citas', icon: BookOpen },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'appointments':
        return renderAppointments();
      case 'history':
        return renderHistory();
      case 'favorites':
        return renderFavorites();
      case 'profile':
        return renderProfile();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };
  
  // Filtrar solo las reservas próximas (futuras y activas)
  const upcomingAppointments = (normalizedBookings ?? []).filter(isUpcomingAppointment);
  
  // Aplicar filtros adicionales a las reservas próximas
  const filtered = upcomingAppointments.filter(b => {
    const okDate = !filterDate || b.date === filterDate;
    const okStatus = filterStatus === 'all' || b.status === filterStatus;
    return okDate && okStatus;
  });

  const [selected, setSelected] = useState<null | any>(null);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/api/bookings/${id}/cancel`);
    },
    onSuccess: () => {
      toast({ title: 'Reserva cancelada' });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: any) => toast({ title: 'Error al cancelar', description: e?.response?.data?.message || 'Intenta nuevamente', variant: 'destructive' })
  });

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          ¡Hola, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Gestiona tus citas y descubre nuevos barberos
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnhancedCard variant="premium" className="group hover:shadow-premium transition-all duration-300 cursor-pointer" onClick={() => setActiveModule('appointments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agendar Cita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-2xl bg-gradient-premium w-fit">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Reserva tu próxima cita con tu barbero favorito</p>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium" className="group hover:shadow-premium transition-all duration-300 cursor-pointer" onClick={() => setActiveModule('appointments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Mis Citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-2xl bg-primary/20 w-fit">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Ver y gestionar todas tus reservas</p>
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium" className="group hover:shadow-premium transition-all duration-300 cursor-pointer" onClick={() => setActiveModule('favorites')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Explorar Barberos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-2xl bg-secondary/50 w-fit">
                <Scissors className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Descubre nuevos profesionales</p>
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative group">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
          <Input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Próximas Citas
            </h2>
            <p className="text-muted-foreground">
              Tus citas futuras pendientes y confirmadas
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Ver todas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((appointment) => (
              <EnhancedCard key={getId(appointment)} variant="premium" className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header con servicio y estado */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0">
                          <Scissors className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">{appointment.serviceName || 'Servicio de Barbería'}</h3>
                          <Badge className={`${getStatusColor(appointment.status)} text-xs mt-1`}>
                            {getStatusLabel(appointment.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-primary">
                          ${appointment.servicePrice?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          30 min
                        </div>
                      </div>
                    </div>

                    {/* Información de la cita */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{formatDate(appointment.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{formatTime(appointment.time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">con {appointment.barber?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{appointment.barbershop?.name}</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelected(appointment)}
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                          <DialogHeader>
                            <DialogTitle className="text-xl">Detalle de la Cita</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <div className="p-4 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0 mx-auto sm:mx-0">
                                <Scissors className="h-8 w-8 text-primary-foreground" />
                              </div>
                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                <h3 className="text-xl font-semibold truncate">{appointment.serviceName || 'Servicio de Barbería'}</h3>
                                <Badge className={`${getStatusColor(appointment.status)} mt-2`}>
                                  {getStatusLabel(appointment.status)}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Información de la Cita</h4>
                                <div className="space-y-2 text-sm">
                                  <div>Fecha: {formatDate(appointment.date)}</div>
                                  <div>Hora: {formatTime(appointment.time)}</div>
                                  <div>Duración: 30 minutos</div>
                                  <div>Precio: ${appointment.servicePrice?.toLocaleString() || '0'}</div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-3">Barbero y Barbería</h4>
                                <div className="space-y-2 text-sm">
                                  <div>Barbero: {appointment.barber?.name}</div>
                                  <div>Barbería: {appointment.barbershop?.name}</div>
                                  <div>Estado: {getStatusLabel(appointment.status)}</div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-border/50">
                              {appointment.status !== 'cancelled' && (
                                <Button 
                                  variant="destructive" 
                                  onClick={() => cancelMutation.mutate(getId(appointment))}
                                  disabled={cancelMutation.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  Cancelar Cita
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                        
                      {appointment.status !== 'cancelled' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => cancelMutation.mutate(getId(appointment))}
                          disabled={cancelMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          Cancelar Cita
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            ))
          ) : (
            <EnhancedCard variant="premium">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tienes citas próximas</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus !== "all" || filterDate
                    ? "No se encontraron citas próximas con los filtros aplicados"
                    : "No tienes citas futuras pendientes o confirmadas. Agenda tu próxima cita con uno de nuestros barberos"
                  }
                </p>
                {(filterStatus !== "all" || filterDate) && (
                  <Button variant="outline" onClick={() => {
                    setFilterStatus("all");
                    setFilterDate("");
                  }}>
                    Limpiar Filtros
                  </Button>
                )}
              </CardContent>
            </EnhancedCard>
          )}
        </div>
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Mis Citas
        </h1>
        <p className="text-muted-foreground">
          Gestiona todas tus citas programadas
        </p>
      </div>

      {/* Botón para crear nueva cita */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              if (!showBookingForm) {
                setBookingPrefill({});
              }
              setShowBookingForm(!showBookingForm);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {showBookingForm ? 'Ocultar Reserva' : 'Nueva Cita'}
          </Button>
        </div>
      </div>

      {/* Formulario de nueva cita */}
      {showBookingForm && (
        <EnhancedCard variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agendar Nueva Cita
            </CardTitle>
            <CardDescription>
              Flujo rápido e intuitivo para crear tu reserva
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookAppointment
              key={`${bookingPrefill.barbershopId ?? 'none'}-${bookingPrefill.barberId ?? 'none'}`}
              initialBarbershopId={bookingPrefill.barbershopId}
              initialBarberId={bookingPrefill.barberId}
              onBooked={() => {
                setShowBookingForm(false);
                queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
              }}
            />
          </CardContent>
        </EnhancedCard>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative group">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
          <Input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((appointment) => (
            <EnhancedCard key={getId(appointment)} variant="premium" className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header con servicio y estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0">
                        <Scissors className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">{appointment.serviceName || 'Servicio de Barbería'}</h3>
                        <Badge className={`${getStatusColor(appointment.status)} text-xs mt-1`}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-primary">
                        ${appointment.servicePrice?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        30 min
                      </div>
                    </div>
                  </div>

                  {/* Información de la cita */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{formatTime(appointment.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">con {appointment.barber?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{appointment.barbershop?.name}</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelected(appointment)}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                        <DialogHeader>
                          <DialogTitle className="text-xl">Detalle de la Cita</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="p-4 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0 mx-auto sm:mx-0">
                              <Scissors className="h-8 w-8 text-primary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                              <h3 className="text-xl font-semibold truncate">{appointment.serviceName || 'Servicio de Barbería'}</h3>
                              <Badge className={`${getStatusColor(appointment.status)} mt-2`}>
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-3">Información de la Cita</h4>
                              <div className="space-y-2 text-sm">
                                <div>Fecha: {formatDate(appointment.date)}</div>
                                <div>Hora: {formatTime(appointment.time)}</div>
                                <div>Duración: 30 minutos</div>
                                <div>Precio: ${appointment.servicePrice?.toLocaleString() || '0'}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3">Barbero y Barbería</h4>
                              <div className="space-y-2 text-sm">
                                <div>Barbero: {appointment.barber?.name}</div>
                                <div>Barbería: {appointment.barbershop?.name}</div>
                                <div>Estado: {getStatusLabel(appointment.status)}</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-border/50">
                            {appointment.status !== 'cancelled' && (
                              <Button 
                                variant="destructive" 
                                onClick={() => cancelMutation.mutate(getId(appointment))}
                                disabled={cancelMutation.isPending}
                                className="w-full sm:w-auto"
                              >
                                Cancelar Cita
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                      
                    {appointment.status !== 'cancelled' && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => cancelMutation.mutate(getId(appointment))}
                        disabled={cancelMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        Cancelar Cita
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          ))
        ) : (
          <EnhancedCard variant="premium">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tienes citas próximas</h3>
              <p className="text-muted-foreground mb-4">
                {filterStatus !== "all" || filterDate
                  ? "No se encontraron citas próximas con los filtros aplicados"
                  : "No tienes citas futuras pendientes o confirmadas. Agenda tu próxima cita con uno de nuestros barberos"
                }
              </p>
              {(filterStatus !== "all" || filterDate) && (
                <Button variant="outline" onClick={() => {
                  setFilterStatus("all");
                  setFilterDate("");
                }}>
                  Limpiar Filtros
                </Button>
              )}
            </CardContent>
          </EnhancedCard>
        )}
      </div>
    </div>
  );

  const renderHistory = () => {
    // Filtrar historial: completadas/canceladas o fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const historyAppointments = (normalizedBookings ?? []).filter(appointment => {
      const statusMatch = appointment.status === 'completed' || appointment.status === 'cancelled';
      const [yy, mm, dd] = String(appointment.date || '').split('-').map(Number);
      const apptDate = (yy && mm && dd)
        ? new Date(yy, mm - 1, dd)
        : new Date(appointment.date);
      const isPast = apptDate < today;
      return statusMatch || isPast;
    });

    // Estadísticas del historial
    const totalAppointments = historyAppointments.length;
    const completedAppointments = historyAppointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = historyAppointments.filter(a => a.status === 'cancelled').length;
    const averageRating = historyAppointments
      .filter(a => (a as any).rating)
      .reduce((sum, a) => sum + ((a as any).rating || 0), 0) / 
      historyAppointments.filter(a => (a as any).rating).length || 0;

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Historial de Citas
          </h1>
          <p className="text-muted-foreground">
            Revisa todas tus citas completadas y canceladas
          </p>
        </div>

        {/* Estadísticas del historial */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <EnhancedCard variant="premium">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-2 p-2 rounded-lg bg-primary/10 w-fit">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">{totalAppointments}</div>
              <div className="text-sm text-muted-foreground">Total Citas</div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="premium">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-2 p-2 rounded-lg bg-green-500/10 w-fit">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500">{completedAppointments}</div>
              <div className="text-sm text-muted-foreground">Completadas</div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="premium">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-2 p-2 rounded-lg bg-red-500/10 w-fit">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-500">{cancelledAppointments}</div>
              <div className="text-sm text-muted-foreground">Canceladas</div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="premium">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-2 p-2 rounded-lg bg-yellow-500/10 w-fit">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-500">
                {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Calificación Promedio</div>
            </CardContent>
          </EnhancedCard>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
            <Input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <div>
            <Select>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de citas del historial */}
        <div className="space-y-4">
          {historyAppointments.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {historyAppointments.length} citas ordenadas por fecha (más recientes primero)
              </p>
            </div>
          )}
          {historyAppointments.length > 0 ? (
            historyAppointments
              .sort((a, b) => {
                // Función para crear fecha válida con manejo de errores
                const createValidDate = (dateStr: string, timeStr: string) => {
                  try {
                    // Intentar diferentes formatos de hora
                    let time = timeStr;
                    if (timeStr && !timeStr.includes(':')) {
                      // Si la hora no tiene :, asumir formato HHMM
                      time = timeStr.length === 4 ? 
                        `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}` : 
                        timeStr;
                    }
                    
                    // Crear fecha con formato ISO
                    const dateTimeStr = `${dateStr}T${time}:00`;
                    const date = new Date(dateTimeStr);
                    
                    // Verificar si la fecha es válida
                    if (isNaN(date.getTime())) {
                      return new Date(dateStr); // Fallback a solo fecha
                    }
                    
                    return date;
                  } catch (error) {
                    return new Date(dateStr); // Fallback a solo fecha
                  }
                };
                
                const dateA = createValidDate(a.date, a.time);
                const dateB = createValidDate(b.date, b.time);
                return dateB.getTime() - dateA.getTime(); // Más reciente primero
              })
              .map((appointment) => (
                <EnhancedCard key={getId(appointment)} variant="premium" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header con servicio y estado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-3 rounded-lg flex-shrink-0 ${
                            appointment.status === 'completed' 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : 'bg-gradient-to-r from-red-500 to-red-600'
                          }`}>
                            <Scissors className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold truncate">
                              {appointment.serviceName || 'Servicio de Barbería'}
                            </h3>
                            <Badge className={`mt-1 ${
                              appointment.status === 'completed' 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}>
                              {appointment.status === 'completed' ? 'Completada' : 'Cancelada'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-primary">
                            ${appointment.servicePrice?.toLocaleString() || '0'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            30 min
                          </div>
                        </div>
                      </div>

                      {/* Información de la cita */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{formatTime(appointment.time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">con {appointment.barber?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{appointment.barbershop?.name}</span>
                        </div>
                      </div>

                      {/* Calificación si está completada */}
                      {appointment.status === 'completed' && (appointment as any).rating && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <span className="text-sm font-medium">Tu calificación:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < ((appointment as any).rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-1">
                              ({(appointment as any).rating}/5)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))
          ) : (
            <EnhancedCard variant="premium">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <History className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tienes historial de citas</h3>
                <p className="text-muted-foreground mb-4">
                  Cuando completes o canceles citas, aparecerán aquí
                </p>
                <Button 
                  onClick={() => setActiveModule('appointments')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agendar Nueva Cita
                </Button>
              </CardContent>
            </EnhancedCard>
          )}
        </div>
      </div>
    );
  };

  const renderFavorites = () => {
    const favoriteShopIds = new Set(favorites?.favoriteBarbershops || []);
    const favoriteBarberIds = new Set(favorites?.favoriteBarbers || []);

    const filteredShops = (shops ?? [])
      .filter((shop) => {
        const term = favoritesSearch.toLowerCase();
        const matches = shop.name.toLowerCase().includes(term) ||
          (shop.location || '').toLowerCase().includes(term) ||
          (shop.address || '').toLowerCase().includes(term);
        if (!matches) return false;
        if (onlyFavorites) return favoriteShopIds.has(getId(shop));
        return true;
      })
      .sort((a, b) => Number(favoriteShopIds.has(getId(b))) - Number(favoriteShopIds.has(getId(a))));

    const filteredBarbers = (allBarbers ?? [])
      .filter((barber) => {
        const term = favoritesSearch.toLowerCase();
        const matches = barber.name.toLowerCase().includes(term);
        if (!matches) return false;
        if (onlyFavorites) return favoriteBarberIds.has(getId(barber));
        return true;
      })
      .sort((a, b) => Number(favoriteBarberIds.has(getId(b))) - Number(favoriteBarberIds.has(getId(a))));

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Favoritos y búsqueda
          </h1>
          <p className="text-muted-foreground">
            Busca barberías y barberos, y marca tus favoritos para elegir más rápido
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Buscar por nombre, ubicación o dirección..."
            value={favoritesSearch}
            onChange={(e) => setFavoritesSearch(e.target.value)}
          />
          <Button
            type="button"
            variant={onlyFavorites ? "default" : "outline"}
            onClick={() => setOnlyFavorites((v) => !v)}
            className="md:w-[220px]"
          >
            <Heart className="h-4 w-4 mr-2" />
            {onlyFavorites ? 'Solo favoritos' : 'Todos'}
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Barberías</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map((shop) => {
              const shopId = getId(shop);
              const isFav = favoriteShopIds.has(shopId);
              return (
                <EnhancedCard key={shopId} variant="premium">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{shop.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{shop.location || shop.address || 'Sin ubicación'}</div>
                      </div>
                      <Button
                        type="button"
                        variant={isFav ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFavorite.mutate({ type: 'barbershop', id: shopId })}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => {
                      setBookingPrefill({ barbershopId: shopId });
                      setShowBookingForm(true);
                      setActiveModule('appointments');
                    }}>
                      Elegir barbería
                    </Button>
                  </CardContent>
                </EnhancedCard>
              );
            })}
            {filteredShops.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay barberías con ese criterio.</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Barberos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBarbers.map((barber) => {
              const barberId = getId(barber);
              const isFav = favoriteBarberIds.has(barberId);
              return (
                <EnhancedCard key={barberId} variant="premium">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{barber.name}</div>
                      </div>
                      <Button
                        type="button"
                        variant={isFav ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFavorite.mutate({ type: 'barber', id: barberId })}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      const shopId = barber.barbershop ? getId(barber.barbershop) : '';
                      setBookingPrefill({
                        barbershopId: shopId || undefined,
                        barberId,
                      });
                      setShowBookingForm(true);
                      setActiveModule('appointments');
                    }}>
                      Elegir barbero
                    </Button>
                  </CardContent>
                </EnhancedCard>
              );
            })}
            {filteredBarbers.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay barberos con ese criterio.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Mi Perfil
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal
        </p>
      </div>

      <EnhancedCard variant="premium">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h3 className="text-xl font-semibold truncate">{user?.name}</h3>
              <p className="text-muted-foreground truncate">ID: {user?.id}</p>
              <Badge variant="outline" className="mt-2">
                Cliente
              </Badge>
            </div>
          </div>
        </CardContent>
      </EnhancedCard>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Personaliza tu experiencia
        </p>
      </div>

      <EnhancedCard variant="premium">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Notificaciones</h3>
                <p className="text-sm text-muted-foreground">Recibe notificaciones sobre tus citas</p>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Configurar
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Privacidad</h3>
                <p className="text-sm text-muted-foreground">Gestiona tu información personal</p>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Configurar
              </Button>
            </div>
          </div>
        </CardContent>
      </EnhancedCard>
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

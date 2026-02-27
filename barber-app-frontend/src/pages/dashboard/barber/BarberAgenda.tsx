import { Calendar, Clock, User, MapPin, Scissors, Eye, DollarSign, Phone, Mail, ArrowUpDown, UserPlus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function BarberAgenda() {
  const [agendaDate, setAgendaDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showWalkInDialog, setShowWalkInDialog] = useState<boolean>(false);
  const [walkInForm, setWalkInForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceId: '',
    date: new Date().toISOString().slice(0,10),
    time: '',
    notes: ''
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: agenda } = useQuery({
    queryKey: ['barberAgenda', agendaDate],
    queryFn: async () => {
      const r = await api.get('/api/bookings/barber/agenda', { 
        params: { date: agendaDate, type: 'week' },
        timeout: 8000
      });
      return (r.data?.agenda ?? []) as Array<{ 
        id?: string;
        _id?: string; 
        date: string; 
        startTime: string; 
        endTime: string; 
        user: { 
          name: string; 
          email?: string; 
          phone?: string; 
        }; 
        barbershop: { 
          name: string; 
          address?: string; 
          phone?: string; 
        }; 
        serviceName: string;
        servicePrice: number;
        serviceDuration: number;
        status: string;
        notes?: string;
      }>;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Obtener servicios del barbero
  const { data: barberServices, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['barberServices'],
    queryFn: async () => {
      const r = await api.get('/api/services/barber');
      const services = r.data?.services ?? [];
      return services as Array<{
        id?: string;
        _id?: string;
        name: string;
        price: number;
        duration: number;
        description?: string;
        isActive?: boolean;
      }>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      queryClient.invalidateQueries({ queryKey: ['barberAgenda', agendaDate] });
    },
    onError: (e: any) => toast({ 
      title: 'Error', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const createWalkInBooking = useMutation({
    mutationFn: async (formData: typeof walkInForm) => {
      const r = await api.post('/api/bookings/walk-in', formData);
      return r.data;
    },
    onSuccess: () => {
      toast({ title: 'Reserva creada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['barberAgenda', agendaDate] });
      queryClient.invalidateQueries({ queryKey: ['barberClients'] });
      setShowWalkInDialog(false);
      setWalkInForm({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        serviceId: '',
        date: new Date().toISOString().slice(0,10),
        time: '',
        notes: ''
      });
    },
    onError: (e: any) => toast({ 
      title: 'Error al crear reserva', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success/20 text-success";
      case "pending": return "bg-warning/20 text-warning";
      case "completed": return "bg-primary/20 text-primary";
      case "cancelled": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmada";
      case "pending": return "Pendiente";
      case "completed": return "Completada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const appointmentDate = new Date(dateString);
    
    return today.getFullYear() === appointmentDate.getFullYear() &&
           today.getMonth() === appointmentDate.getMonth() &&
           today.getDate() === appointmentDate.getDate();
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = new Date(dateString);
    
    return tomorrow.getFullYear() === appointmentDate.getFullYear() &&
           tomorrow.getMonth() === appointmentDate.getMonth() &&
           tomorrow.getDate() === appointmentDate.getDate();
  };

  const isYesterday = (dateString: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const appointmentDate = new Date(dateString);
    
    return yesterday.getFullYear() === appointmentDate.getFullYear() &&
           yesterday.getMonth() === appointmentDate.getMonth() &&
           yesterday.getDate() === appointmentDate.getDate();
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.clientName || !walkInForm.serviceId || !walkInForm.time) {
      toast({
        title: 'Campos requeridos',
        description: 'Nombre del cliente, servicio y hora son obligatorios',
        variant: 'destructive'
      });
      return;
    }
    createWalkInBooking.mutate(walkInForm);
  };

  const handleWalkInFormChange = (field: string, value: string) => {
    setWalkInForm(prev => ({ ...prev, [field]: value }));
  };

  const filteredAgenda = (agenda ?? [])
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .sort((a, b) => {
      // Primero ordenar por estado: pending primero, luego por fecha
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Si ambos tienen el mismo estado, ordenar por fecha y hora (más recientes primero)
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Mi Agenda
            </h2>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
              <ArrowUpDown className="h-3 w-3" />
              <span>Pendientes primero</span>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Semana de {agendaDate}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
            <Input 
              type="date" 
              value={agendaDate} 
              onChange={(e) => setAgendaDate(e.target.value)}
              className="pl-10 w-full sm:w-auto"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
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
          <Button 
            onClick={() => setShowWalkInDialog(true)}
            className="w-full sm:w-auto bg-success hover:bg-success/90"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Cliente Walk-in</span>
            <span className="xs:hidden">Walk-in</span>
          </Button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAgenda.length > 0 ? (
          filteredAgenda.map((appointment) => (
            <Card key={getId(appointment)} className="card-premium hover:shadow-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0">
                      <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-semibold">
                          {appointment.serviceName || 'Servicio de Barbería'}
                        </h3>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <div className="flex items-center gap-2">
                            <span className="truncate">{formatDate(appointment.date)}</span>
                            {isToday(appointment.date) && (
                              <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                                Hoy
                              </Badge>
                            )}
                            {isTomorrow(appointment.date) && (
                              <Badge variant="secondary" className="text-xs">
                                Mañana
                              </Badge>
                            )}
                            {isYesterday(appointment.date) && (
                              <Badge variant="outline" className="text-xs">
                                Ayer
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">Cliente: {appointment.user?.name}</span>
                          {appointment.isWalkIn && (
                            <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
                              Walk-in
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{appointment.barbershop?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {appointment.servicePrice ? formatPrice(appointment.servicePrice) : '$0'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {appointment.serviceDuration || 30} min
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <EnhancedButton 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden xs:inline">Ver Detalles</span>
                            <span className="xs:hidden">Ver</span>
                          </EnhancedButton>
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
                                <h3 className="text-xl font-semibold truncate">
                                  {appointment.serviceName || 'Servicio de Barbería'}
                                </h3>
                                <Badge className={`${getStatusColor(appointment.status)} mt-2`}>
                                  {getStatusLabel(appointment.status)}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Información de la Cita</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Fecha: {formatDate(appointment.date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>Hora: {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>Duración: {appointment.serviceDuration || 30} minutos</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <span>Precio: {appointment.servicePrice ? formatPrice(appointment.servicePrice) : '$0'}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-3">Cliente y Barbería</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>Cliente: {appointment.user?.name}</span>
                                    {appointment.isWalkIn && (
                                      <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
                                        Walk-in
                                      </Badge>
                                    )}
                                  </div>
                                  {appointment.user?.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      <span>{appointment.user.email}</span>
                                    </div>
                                  )}
                                  {appointment.user?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground" />
                                      <span>{appointment.user.phone}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>Barbería: {appointment.barbershop?.name}</span>
                                  </div>
                                  {appointment.barbershop?.address && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{appointment.barbershop.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {appointment.notes && (
                              <div>
                                <h4 className="font-semibold mb-3">Notas</h4>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                  {appointment.notes}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-border/50">
                              {appointment.status === 'pending' && (
                                <Button 
                                  variant="default" 
                                  onClick={() => {
                                    updateStatus.mutate({ id: getId(appointment), status: 'confirmed' });
                                    setSelectedAppointment(null);
                                  }}
                                  disabled={updateStatus.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  Confirmar Cita
                                </Button>
                              )}
                              {appointment.status === 'confirmed' && (
                                <Button 
                                  variant="default" 
                                  onClick={() => {
                                    updateStatus.mutate({ id: getId(appointment), status: 'completed' });
                                    setSelectedAppointment(null);
                                  }}
                                  disabled={updateStatus.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  Marcar como Completada
                                </Button>
                              )}
                              {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                                <Button 
                                  variant="destructive" 
                                  onClick={() => {
                                    updateStatus.mutate({ id: getId(appointment), status: 'cancelled' });
                                    setSelectedAppointment(null);
                                  }}
                                  disabled={updateStatus.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  Cancelar Cita
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {appointment.status === 'pending' && (
                        <EnhancedButton 
                          variant="success"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                          className="text-xs"
                        >
                          <span className="hidden xs:inline">Confirmar</span>
                          <span className="xs:hidden">Conf</span>
                        </EnhancedButton>
                      )}
                      {appointment.status === 'confirmed' && (
                        <EnhancedButton 
                          variant="premium"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'completed' })}
                          disabled={updateStatus.isPending}
                          className="text-xs"
                        >
                          <span className="hidden xs:inline">Completar</span>
                          <span className="xs:hidden">Comp</span>
                        </EnhancedButton>
                      )}
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <EnhancedButton 
                          variant="error"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: getId(appointment), status: 'cancelled' })}
                          disabled={updateStatus.isPending}
                          className="text-xs"
                        >
                          <span className="hidden xs:inline">Cancelar</span>
                          <span className="xs:hidden">Canc</span>
                        </EnhancedButton>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="card-premium">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tienes citas programadas</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== "all"
                  ? "No se encontraron citas con el filtro aplicado"
                  : "No hay citas para esta fecha"
                }
              </p>
              {statusFilter !== "all" && (
                <Button variant="outline" onClick={() => setStatusFilter("all")}>
                  Limpiar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Walk-in Dialog */}
      <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cliente Walk-in
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWalkInSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Cliente *</label>
                <Input
                  value={walkInForm.clientName}
                  onChange={(e) => handleWalkInFormChange('clientName', e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={walkInForm.clientPhone}
                  onChange={(e) => handleWalkInFormChange('clientPhone', e.target.value)}
                  placeholder="Número de teléfono"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={walkInForm.clientEmail}
                  onChange={(e) => handleWalkInFormChange('clientEmail', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Servicio *</label>
                <Select 
                  value={walkInForm.serviceId} 
                  onValueChange={(value) => handleWalkInFormChange('serviceId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      servicesLoading ? "Cargando servicios..." : 
                      servicesError ? "Error al cargar servicios" :
                      "Seleccionar servicio"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesLoading ? (
                      <SelectItem value="loading" disabled>Cargando servicios...</SelectItem>
                    ) : servicesError ? (
                      <SelectItem value="error" disabled>Error al cargar servicios</SelectItem>
                    ) : (barberServices || []).filter((service) => service.isActive !== false).length === 0 ? (
                      <SelectItem value="empty" disabled>No hay servicios disponibles</SelectItem>
                    ) : (
                      (barberServices || [])
                        .filter((service) => service.isActive !== false)
                        .map((service) => (
                        <SelectItem key={getId(service)} value={getId(service)}>
                          {service.name} - {formatPrice(service.price)} ({service.duration}min)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {servicesError && (
                  <p className="text-xs text-destructive">
                    Error: {servicesError?.response?.data?.message || 'No se pudieron cargar los servicios'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha *</label>
                <Input
                  type="date"
                  value={walkInForm.date}
                  onChange={(e) => handleWalkInFormChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora *</label>
                <Input
                  type="time"
                  value={walkInForm.time}
                  onChange={(e) => handleWalkInFormChange('time', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                value={walkInForm.notes}
                onChange={(e) => handleWalkInFormChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre el servicio..."
                className="w-full p-3 border border-input rounded-md resize-none h-20"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-border/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowWalkInDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createWalkInBooking.isPending}
                className="w-full sm:w-auto bg-success hover:bg-success/90"
              >
                {createWalkInBooking.isPending ? 'Creando...' : 'Crear Reserva'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

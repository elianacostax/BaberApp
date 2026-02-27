import { Calendar, Clock, Scissors, MapPin, Star, Search, Filter, X, Eye, AlertCircle, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLoadingSpinner, CardLoadingSkeleton } from "@/components/ui/loading-spinner";
import { PageErrorDisplay } from "@/components/ui/error-boundary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Appointment {
  id?: string;
  _id?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  barber: {
    id?: string;
    _id?: string;
    name: string;
    specialty: string;
  };
  barbershop: {
    id?: string;
    _id?: string;
    name: string;
    address: string;
    location: string;
  };
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showReplicateDialog, setShowReplicateDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const normalizeAppointments = (data: any): Appointment[] => {
    const list = Array.isArray(data)
      ? data
      : data?.bookings ?? data?.agenda ?? [];
    return list.map((a: any) => ({
      ...a,
      _id: a._id ?? a.id,
      barber: a.barber ?? a.barberId,
      barbershop: a.barbershop ?? a.barbershopId
    }));
  };

  const { data: appointments, isLoading, isError } = useQuery({
    queryKey: ['clientAppointments'],
    queryFn: async () => {
      const r = await api.get('/api/bookings/my-bookings', { params: { type: 'all' }, timeout: 8000 });
      return normalizeAppointments(r.data);
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos (nueva API)
  });

  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/api/bookings/${id}/cancel`);
    },
    onSuccess: () => {
      toast({ title: 'Cita cancelada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['clientAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: any) => toast({ 
      title: 'Error al cancelar cita', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async ({ id, newDate, newTime }: { id: string; newDate: string; newTime: string }) => {
      await api.put(`/api/bookings/${id}/reschedule`, { 
        date: newDate, 
        startTime: newTime 
      });
    },
    onSuccess: () => {
      toast({ title: 'Cita reagendada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['clientAppointments'] });
    },
    onError: (e: any) => toast({ 
      title: 'Error al reagendar cita', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const replicateAppointment = useMutation({
    mutationFn: async ({ appointment, newDate, newTime }: { appointment: Appointment; newDate: string; newTime: string }) => {
      await api.post('/api/bookings', {
        barberId: getId(appointment.barber),
        barbershopId: getId(appointment.barbershop),
        serviceName: appointment.serviceName,
        servicePrice: appointment.servicePrice,
        serviceDuration: appointment.serviceDuration,
        date: newDate,
        startTime: newTime,
        endTime: newTime // Se calculará en el backend
      });
    },
    onSuccess: () => {
      toast({ title: 'Cita replicada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['clientAppointments'] });
      setShowReplicateDialog(false);
    },
    onError: (e: any) => toast({ 
      title: 'Error al replicar cita', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const rateAppointment = useMutation({
    mutationFn: async ({ id, rating, review }: { id: string; rating: number; review: string }) => {
      await api.post(`/api/reviews`, {
        appointmentId: id,
        rating,
        review
      });
    },
    onSuccess: () => {
      toast({ title: 'Calificación enviada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['clientAppointments'] });
      setShowRatingDialog(false);
      setRating(0);
      setReview("");
    },
    onError: (e: any) => toast({ 
      title: 'Error al enviar calificación', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const filteredAppointments = ((appointments as Appointment[]) || []).filter(appointment => {
    const matchesSearch = 
      appointment.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.barbershop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    const matchesDate = !dateFilter || appointment.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
  return new Date(timeString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

  const isUpcoming = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.date + 'T' + appointment.startTime);
    const now = new Date();
    return appointmentDate > now && appointment.status !== 'cancelled' && appointment.status !== 'completed';
  };

  const canCancel = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.date + 'T' + appointment.startTime);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilAppointment > 24 && appointment.status === 'confirmed';
  };

  const canRate = (appointment: Appointment) => {
    return appointment.status === 'completed' && !appointment.rating;
  };

  const canReplicate = (appointment: Appointment) => {
    return appointment.status === 'completed' || appointment.status === 'cancelled';
  };

  const handleReplicate = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewDate("");
    setNewTime("");
    setShowReplicateDialog(true);
  };

  const handleRate = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRating(0);
    setReview("");
    setShowRatingDialog(true);
  };

  const handleReplicateSubmit = () => {
    if (selectedAppointment && newDate && newTime) {
      replicateAppointment.mutate({
        appointment: selectedAppointment,
        newDate,
        newTime
      });
    }
  };

  const handleRateSubmit = () => {
    if (selectedAppointment && rating > 0) {
      rateAppointment.mutate({
        id: getId(selectedAppointment),
        rating,
        review
      });
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mis Reservas
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas tus citas programadas
          </p>
        </div>
        <PageLoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mis Reservas
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas tus citas programadas
          </p>
        </div>
        <PageErrorDisplay 
          error={isError} 
          retry={() => queryClient.invalidateQueries({ queryKey: ['clientAppointments'] })}
          isRetrying={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Mis Reservas
        </h1>
        <p className="text-muted-foreground">
          Gestiona todas tus citas programadas
        </p>
      </div>

      {/* Stats - Destacando Próximas y Completadas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-premium border-2 border-success/20 bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximas</p>
                <p className="text-3xl font-bold text-success">
                  {(appointments as Appointment[])?.filter(a => isUpcoming(a)).length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Citas por venir</p>
              </div>
              <Clock className="h-10 w-10 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-3xl font-bold text-primary">
                  {(appointments as Appointment[])?.filter(a => a.status === 'completed').length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Citas finalizadas</p>
              </div>
              <Scissors className="h-10 w-10 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Citas</p>
                <p className="text-2xl font-bold">{(appointments as Appointment[])?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Todas las citas</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold">
                  {(appointments as Appointment[])?.filter(a => a.status === 'cancelled').length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Citas canceladas</p>
              </div>
              <X className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por servicio, barbero o barbería..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
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
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <Card key={getId(appointment)} className="card-premium hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-premium">
                      <Scissors className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{appointment.serviceName}</h3>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4" />
                          <span>con {appointment.barber.name} • {appointment.barber.specialty}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{appointment.barbershop.name} • {appointment.barbershop.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        ${appointment.servicePrice.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.serviceDuration} min
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalle de la Cita</DialogTitle>
                          </DialogHeader>
    <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="p-4 rounded-lg bg-gradient-premium">
                                <Scissors className="h-8 w-8 text-primary-foreground" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold">{appointment.serviceName}</h3>
                                <Badge className={getStatusColor(appointment.status)}>
                                  {getStatusLabel(appointment.status)}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Información de la Cita</h4>
                                <div className="space-y-2 text-sm">
                                  <div>Fecha: {formatDate(appointment.date)}</div>
                                  <div>Hora: {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</div>
                                  <div>Duración: {appointment.serviceDuration} minutos</div>
                                  <div>Precio: ${appointment.servicePrice.toLocaleString()}</div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-3">Barbero y Barbería</h4>
                                <div className="space-y-2 text-sm">
                                  <div>Barbero: {appointment.barber.name}</div>
                                  <div>Especialidad: {appointment.barber.specialty}</div>
                                  <div>Barbería: {appointment.barbershop.name}</div>
                                  <div>Ubicación: {appointment.barbershop.location}</div>
                                  <div>Dirección: {appointment.barbershop.address}</div>
                                </div>
                              </div>
                            </div>

                            {appointment.rating && (
                              <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Tu Calificación</h4>
                                <div className="flex items-center gap-2 mb-2">
                                  {renderStars(appointment.rating)}
                                  <span className="text-sm text-muted-foreground">
                                    {appointment.rating}/5
                                  </span>
                                </div>
                                {appointment.review && (
                                  <p className="text-sm text-muted-foreground italic">
                                    "{appointment.review}"
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 justify-end">
                              {isUpcoming(appointment) && canCancel(appointment) && (
                                <Button 
                                  variant="destructive" 
                                  onClick={() => cancelAppointment.mutate(getId(appointment))}
                                  disabled={cancelAppointment.isPending}
                                >
                                  Cancelar Cita
                                </Button>
                              )}
                              {canRate(appointment) && (
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleRate(appointment)}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Calificar
                                </Button>
                              )}
                              {canReplicate(appointment) && (
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleReplicate(appointment)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Replicar
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Botones de acción rápida */}
                      {isUpcoming(appointment) && canCancel(appointment) && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => cancelAppointment.mutate(getId(appointment))}
                          disabled={cancelAppointment.isPending}
                        >
                          Cancelar
                        </Button>
                      )}
                      {canRate(appointment) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRate(appointment)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Calificar
                        </Button>
                      )}
                      {canReplicate(appointment) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReplicate(appointment)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Replicar
                        </Button>
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
                {searchTerm || statusFilter !== "all" || dateFilter
                  ? "No se encontraron citas con los filtros aplicados"
                  : "Agenda tu primera cita con uno de nuestros barberos"
                }
              </p>
              {!searchTerm && statusFilter === "all" && !dateFilter && (
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Cita
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para replicar cita */}
      <Dialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replicar Cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppointment && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Cita a replicar:</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedAppointment.serviceName} con {selectedAppointment.barber.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  ${selectedAppointment.servicePrice.toLocaleString()} • {selectedAppointment.serviceDuration} min
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newDate">Nueva Fecha</Label>
                <Input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="newTime">Nueva Hora</Label>
                <Input
                  id="newTime"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowReplicateDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleReplicateSubmit}
                disabled={!newDate || !newTime || replicateAppointment.isPending}
              >
                {replicateAppointment.isPending ? 'Replicando...' : 'Replicar Cita'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para calificar cita */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar Cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppointment && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Cita completada:</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedAppointment.serviceName} con {selectedAppointment.barber.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedAppointment.date)} • {formatTime(selectedAppointment.startTime)}
                </p>
        </div>
      )}
            
            <div>
              <Label>Calificación</Label>
              <div className="flex gap-1 mt-2">
                {renderStars(rating, true)}
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating > 0 ? `${rating}/5` : 'Selecciona una calificación'}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="review">Reseña (opcional)</Label>
              <Textarea
                id="review"
                placeholder="Comparte tu experiencia..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowRatingDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRateSubmit}
                disabled={rating === 0 || rateAppointment.isPending}
              >
                {rateAppointment.isPending ? 'Enviando...' : 'Enviar Calificación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

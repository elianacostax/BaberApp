import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera, Clock, Scissors, Eye, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ProfileData {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  bio?: string;
  address?: string;
  city?: string;
  // Barber specific fields
  specialty?: string;
  experience?: number;
  barbershop?: {
    id?: string;
    _id?: string;
    name: string;
    address: string;
  };
  // Client specific fields
  preferences?: {
    favoriteBarbers: string[];
    preferredServices: string[];
  };
}

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

export default function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/users/profile');
      return r.data as ProfileData;
    },
    enabled: !!user?.id,
  });

  // Query para obtener citas próximas (solo futuras y activas)
  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['upcomingAppointments', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/bookings');
      const allAppointments = r.data as Appointment[];
      
      // Filtrar solo citas futuras y activas
      const now = new Date();
      return allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date + 'T' + appointment.startTime);
        return appointmentDate > now && 
               appointment.status !== 'cancelled' && 
               appointment.status !== 'completed';
      }).slice(0, 3); // Solo mostrar las próximas 3 citas
    },
    enabled: !!user?.id && user?.role === 'client',
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    specialty: '',
    experience: 0,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.put('/api/users/profile', data);
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Perfil actualizado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      setIsEditing(false);
    },
    onError: (e: any) => toast({ 
      title: 'Error al actualizar perfil', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        address: profile.address || '',
        city: profile.city || '',
        specialty: profile.specialty || '',
        experience: profile.experience || 0,
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      phone: '',
      bio: '',
      address: '',
      city: '',
      specialty: '',
      experience: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client':
        return 'Cliente';
      case 'barber':
        return 'Barbero';
      case 'admin':
        return 'Administrador';
      case 'owner':
        return 'Propietario';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'client':
        return 'bg-primary/15 text-primary';
      case 'barber':
        return 'bg-success/15 text-success';
      case 'admin':
        return 'bg-warning/15 text-warning';
      case 'owner':
        return 'bg-primary/15 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Funciones auxiliares para las citas
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
  return new Date(timeString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

  if (profileLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-48"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y profesional
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="card-premium">
        <CardContent className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-gradient-premium text-primary-foreground text-2xl">
                      {getInitials(formData.name || profile?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Biografía</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              {profile?.role === 'barber' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Especialidad</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="Ej: Cortes modernos, Barba clásica"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Años de experiencia</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateProfile.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-gradient-premium text-primary-foreground text-2xl">
                    {getInitials(profile?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{profile?.name}</h2>
                    <Badge className={getRoleColor(profile?.role || '')}>
                      {getRoleLabel(profile?.role || '')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {profile?.bio && (
                <div>
                  <h3 className="font-semibold mb-2">Biografía</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Información Personal</h3>
                  <div className="space-y-2">
                    {profile?.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.address}</span>
                      </div>
                    )}
                    {profile?.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Miembro desde {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </div>

                {profile?.role === 'barber' && (
                  <div>
                    <h3 className="font-semibold mb-3">Información Profesional</h3>
                    <div className="space-y-2">
                      {profile.specialty && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Especialidad: </span>
                          <span>{profile.specialty}</span>
                        </div>
                      )}
                      {profile.experience && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Experiencia: </span>
                          <span>{profile.experience} años</span>
                        </div>
                      )}
                      {profile.barbershop && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Barbería: </span>
                          <span>{profile.barbershop.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas Reservas - Solo para clientes */}
      {user?.role === 'client' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximas Reservas
            </CardTitle>
            <CardDescription>
              Tus próximas citas programadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                      <div className="w-20 h-8 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={getId(appointment)} className="border border-border/50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
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
                          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalle de la Cita</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="flex items-center gap-4">
                                <div className="p-4 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                                  <Scissors className="h-8 w-8 text-primary-foreground" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">{appointment.serviceName}</h3>
                                  <Badge className={getStatusColor(appointment.status)}>
                                    {getStatusLabel(appointment.status)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-4 w-4 ${
                                            star <= (appointment.rating || 0)
                                              ? 'fill-warning text-warning'
                                              : 'text-muted-foreground'
                                          }`}
                                        />
                                      ))}
                                    </div>
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
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Enlace para ver todas las reservas */}
                <div className="text-center pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Todas las Reservas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tienes citas próximas</h3>
                <p className="text-muted-foreground mb-4">
                  Agenda tu próxima cita con uno de nuestros barberos
                </p>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Cita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

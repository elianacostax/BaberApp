import { Users, Calendar, Star, Phone, Mail, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useState } from "react";

interface Client {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  totalAppointments: number;
  lastAppointment?: string;
  totalSpent: number;
  rating: number;
  favoriteService?: string;
}

export default function BarberClients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['barberClients', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/barbers/me/clients', { timeout: 8000 });
      return r.data as Client[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: clientAppointments } = useQuery({
    queryKey: ['clientAppointments', getId(selectedClient)],
    queryFn: async () => {
      if (!selectedClient) return [];
      const r = await api.get('/api/bookings', {
        params: { userId: getId(selectedClient), sort: '-date,-time' },
        timeout: 6000
      });
      return r.data as Array<{
        id?: string;
        _id?: string;
        date: string;
        startTime: string;
        serviceName: string;
        status: string;
        servicePrice: number;
      }>;
    },
    enabled: !!selectedClient,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  const filteredClients = (clients || [])
    .filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "appointments":
          return b.totalAppointments - a.totalAppointments;
        case "spent":
          return b.totalSpent - a.totalSpent;
        case "rating":
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Mis Clientes
        </h1>
        <p className="text-muted-foreground">
          Gestiona y conoce a tus clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{clients?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-2xl font-bold">
                  {clients?.filter(c => c.totalAppointments > 0).length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Calificación</p>
                <p className="text-2xl font-bold">
                  {clients && clients.length > 0 
                    ? (clients.reduce((acc, c) => acc + c.rating, 0) / clients.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Star className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold">
                  ${clients?.reduce((acc, c) => acc + c.totalSpent, 0).toLocaleString() || '0'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
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
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="appointments">Citas</SelectItem>
            <SelectItem value="spent">Gastado</SelectItem>
            <SelectItem value="rating">Calificación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-premium">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <Card key={getId(client)} className="card-premium hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-premium text-primary-foreground">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClient(client)}
                      >
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Detalles del Cliente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-gradient-premium text-primary-foreground text-lg">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-semibold">{client.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{client.email}</span>
                            </div>
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg bg-card/50">
                            <div className="text-2xl font-bold text-primary">{client.totalAppointments}</div>
                            <div className="text-sm text-muted-foreground">Citas</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-card/50">
                            <div className="text-2xl font-bold text-success">${client.totalSpent.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Gastado</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-card/50">
                            <div className="text-2xl font-bold text-warning">{client.rating.toFixed(1)}</div>
                            <div className="text-sm text-muted-foreground">Calificación</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-card/50">
                            <div className="text-2xl font-bold text-primary">
                              {client.lastAppointment ? formatDate(client.lastAppointment) : 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Última Cita</div>
                          </div>
                        </div>

                        {clientAppointments && clientAppointments.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Historial de Citas</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {clientAppointments.map((appointment) => (
                                <div key={getId(appointment)} className="flex items-center justify-between p-3 rounded-lg bg-card/30">
                                  <div>
                                    <div className="font-medium">{appointment.serviceName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatDate(appointment.date)} • {appointment.startTime}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={
                                      appointment.status === 'completed' ? 'default' :
                                      appointment.status === 'confirmed' ? 'secondary' :
                                      appointment.status === 'cancelled' ? 'destructive' : 'outline'
                                    }>
                                      {appointment.status}
                                    </Badge>
                                    <div className="text-sm font-semibold mt-1">
                                      ${Number(appointment.servicePrice || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Citas totales:</span>
                    <span className="font-semibold">{client.totalAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total gastado:</span>
                    <span className="font-semibold">${client.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Calificación promedio:</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-semibold">{client.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  {client.favoriteService && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Servicio favorito:</span>
                      <Badge variant="outline">{client.favoriteService}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tienes clientes aún</h3>
            <p className="text-muted-foreground">
              Los clientes aparecerán aquí cuando agenden citas contigo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

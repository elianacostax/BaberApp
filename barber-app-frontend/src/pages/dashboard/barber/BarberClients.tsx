import { Users, Search, Filter, Star, Calendar, MapPin, Phone, Mail, History, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function BarberClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['barberClients', debouncedSearchTerm, sortBy],
    queryFn: async () => {
      const r = await api.get('/api/barbers/me/clients', {
        params: { search: debouncedSearchTerm, sort: sortBy }
      });
      return r.data as Array<{
        id?: string;
        _id?: string;
        name: string;
        email: string;
        phone?: string;
        totalAppointments: number;
        lastAppointment?: string;
        totalSpent: number;
        rating: number;
        location?: string;
      }>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: clientHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['barberClientHistory', selectedClient ? getId(selectedClient) : 'none'],
    queryFn: async () => {
      if (!selectedClient) return [];
      const r = await api.get('/api/bookings', {
        params: { userId: getId(selectedClient), sort: '-date,-time' }
      });
      return r.data as Array<{
        id?: string;
        _id?: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
        serviceName: string;
        servicePrice: number;
      }>;
    },
    enabled: !!selectedClient
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-warning text-warning' 
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const handleContact = (client: any) => {
    if (client.email) {
      window.open(`mailto:${client.email}`, '_blank');
    } else if (client.phone) {
      window.open(`tel:${client.phone}`, '_blank');
    } else {
      toast({
        title: "Información de contacto no disponible",
        description: "Este cliente no tiene email o teléfono registrado",
        variant: "destructive"
      });
    }
  };

  const handleViewHistory = (client: any) => {
    setSelectedClient(client);
  };

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Mis Clientes
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona la información de tus clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Filtros</span>
            <span className="xs:hidden">Filtros</span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <span className="hidden xs:inline">Exportar</span>
            <span className="xs:hidden">Exp</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="lastAppointment">Última cita</SelectItem>
            <SelectItem value="totalAppointments">Total citas</SelectItem>
            <SelectItem value="totalSpent">Total gastado</SelectItem>
            <SelectItem value="rating">Calificación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-premium">
              <CardContent className="p-4 sm:p-6">
                <div className="animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-16 bg-muted rounded"></div>
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="card-premium">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error al cargar clientes</h3>
            <p className="text-muted-foreground mb-4">
              No se pudieron cargar los clientes. Intenta nuevamente.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(clients || []).map((client) => (
          <EnhancedCard key={getId(client)} variant="premium" className="group cursor-pointer" interactive>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getRatingStars(client.rating)}
                  <span className="text-xs sm:text-sm text-muted-foreground ml-1">
                    ({client.rating.toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-card/50">
                    <div className="text-lg sm:text-2xl font-bold text-primary">{client.totalAppointments}</div>
                    <div className="text-xs text-muted-foreground">Citas</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-card/50">
                    <div className="text-lg sm:text-2xl font-bold text-success">
                      {formatPrice(client.totalSpent)}
                    </div>
                    <div className="text-xs text-muted-foreground">Gastado</div>
                  </div>
                </div>

                {client.lastAppointment && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Última cita: {formatDate(client.lastAppointment)}</span>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}

                {client.location && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{client.location}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs sm:text-sm"
                    onClick={() => handleContact(client)}
                  >
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Contactar</span>
                    <span className="xs:hidden">Contactar</span>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => handleViewHistory(client)}
                      >
                        <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Ver Historial</span>
                        <span className="xs:hidden">Historial</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Historial de {client.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{client.totalAppointments}</div>
                            <div className="text-sm text-muted-foreground">Total Citas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-success">{formatPrice(client.totalSpent)}</div>
                            <div className="text-sm text-muted-foreground">Total Gastado</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-warning">{client.rating.toFixed(1)}</div>
                            <div className="text-sm text-muted-foreground">Calificación</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold">Información de Contacto</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{client.email}</span>
                            </div>
                            {client.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {client.lastAppointment && (
                          <div className="space-y-2">
                            <h4 className="font-semibold">Última Cita</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(client.lastAppointment)}</span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h4 className="font-semibold">Historial de Citas</h4>
                          {historyLoading && (
                            <div className="text-sm text-muted-foreground">Cargando historial...</div>
                          )}
                          {!historyLoading && (!clientHistory || clientHistory.length === 0) && (
                            <div className="text-sm text-muted-foreground">No hay citas registradas.</div>
                          )}
                          {!historyLoading && (clientHistory || []).map((apt) => (
                            <div key={getId(apt)} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{apt.serviceName || 'Servicio'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(apt.date)} • {new Date(apt.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatPrice(apt.servicePrice || 0)}</div>
                                <div className="text-xs text-muted-foreground">{apt.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!clients || clients.length === 0) && (
        <Card className="card-premium">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tienes clientes aún</h3>
            <p className="text-muted-foreground mb-4">
              Los clientes aparecerán aquí cuando hagan su primera reserva contigo
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

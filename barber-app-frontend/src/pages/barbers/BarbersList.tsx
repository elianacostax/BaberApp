import { Scissors, Star, MapPin, Clock, Search, Filter, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Barber {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience: number; // years
  barbershop: {
    id?: string;
    _id?: string;
    name: string;
    address: string;
    location: string;
  };
  services: Array<{
    id?: string;
    _id?: string;
    name: string;
    price: number;
    duration: number;
  }>;
  schedule: Record<string, { start: string; end: string }>;
  isAvailable: boolean;
}

export default function BarbersList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  const { data: barbers, isLoading, error } = useQuery({
    queryKey: ['barbersList'],
    queryFn: async () => {
      const r = await api.get('/api/barbers', { timeout: 8000 });
      return r.data as Barber[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });

  const { data: locations } = useQuery({
    queryKey: ['barbershopLocations'],
    queryFn: async () => {
      const r = await api.get('/api/barbers/locations', { timeout: 6000 });
      return r.data as string[];
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  const filteredBarbers = (barbers || [])
    .filter(barber => {
      const matchesSearch = 
        barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.barbershop?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = locationFilter === "all" || barber.barbershop?.location === locationFilter;
      const matchesRating = ratingFilter === "all" || barber.rating >= parseInt(ratingFilter);
      return matchesSearch && matchesLocation && matchesRating;
    })
    .sort((a, b) => b.rating - a.rating);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? "fill-warning text-warning"
                : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  const getAvailabilityStatus = (barber: Barber) => {
    const now = new Date();
    const dayOfWeek = now.getDay().toString();
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todaySchedule = barber.schedule[dayOfWeek];
    if (!todaySchedule || !todaySchedule.start || !todaySchedule.end) {
      return { status: "closed", text: "Cerrado hoy" };
    }
    
    if (currentTime >= todaySchedule.start && currentTime <= todaySchedule.end) {
      return { status: "open", text: "Abierto ahora" };
    }
    
    return { status: "closed", text: `Abre a las ${todaySchedule.start}` };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Nuestros Barberos
        </h1>
        <p className="text-muted-foreground">
          Encuentra el barbero perfecto para ti
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Barberos</p>
                <p className="text-2xl font-bold">{barbers?.length || 0}</p>
              </div>
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponibles Ahora</p>
                <p className="text-2xl font-bold">
                  {barbers?.filter(b => getAvailabilityStatus(b).status === "open").length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                <p className="text-2xl font-bold">
                  {barbers && barbers.length > 0 
                    ? (barbers.reduce((acc, b) => acc + b.rating, 0) / barbers.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Star className="h-8 w-8 text-warning" />
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
              placeholder="Buscar barberos, especialidades o barberías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ubicación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ubicaciones</SelectItem>
            {locations?.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Calificación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="4">4+ estrellas</SelectItem>
            <SelectItem value="3">3+ estrellas</SelectItem>
            <SelectItem value="2">2+ estrellas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-destructive mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Error al cargar barberos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Barbers Grid */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-premium">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
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
        ) : filteredBarbers.length > 0 ? (
          filteredBarbers.map((barber) => {
            const availability = getAvailabilityStatus(barber);
            return (
              <Card key={getId(barber)} className="card-premium hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gradient-premium text-primary-foreground text-lg">
                          {getInitials(barber.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{barber.name}</h3>
                        <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(barber.rating)}
                          <span className="text-xs text-muted-foreground">
                            ({barber.reviewCount} reseñas)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={availability.status === "open" ? "default" : "secondary"}>
                      {availability.text}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{barber.barbershop?.name || 'Sin barbería'} • {barber.barbershop?.location || 'Sin ubicación'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{barber.experience} años de experiencia</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold">Servicios populares:</h4>
                    <div className="flex flex-wrap gap-1">
                      {barber.services.slice(0, 3).map((service) => (
                        <Badge key={getId(service)} variant="outline" className="text-xs">
                          {service.name}
                        </Badge>
                      ))}
                      {barber.services.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{barber.services.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedBarber(barber)}
                        >
                          Ver Perfil
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Perfil de {barber.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                              <AvatarFallback className="bg-gradient-premium text-primary-foreground text-2xl">
                                {getInitials(barber.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-2xl font-semibold">{barber.name}</h3>
                              <p className="text-muted-foreground">{barber.specialty}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {renderStars(barber.rating)}
                                <span className="text-sm text-muted-foreground">
                                  {barber.reviewCount} reseñas
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Información</h4>
                              <div className="space-y-1 text-sm">
                                <div>Experiencia: {barber.experience} años</div>
                                <div>Barbería: {barber.barbershop?.name || 'Sin barbería'}</div>
                                <div>Ubicación: {barber.barbershop?.location || 'Sin ubicación'}</div>
                                <div>Dirección: {barber.barbershop?.address || 'Sin dirección'}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Contacto</h4>
                              <div className="space-y-1 text-sm">
                                <div>{barber.email}</div>
                                {barber.phone && <div>{barber.phone}</div>}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-3">Servicios</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {barber.services.map((service) => (
                                <div key={getId(service)} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                                  <div>
                                    <div className="font-medium">{service.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {service.duration} minutos
                                    </div>
                                  </div>
                                  <div className="font-semibold">
                                    ${service.price.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/book?barber=${getId(barber)}`)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Scissors className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No se encontraron barberos</h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

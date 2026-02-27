import { Star, Users, TrendingUp, Calendar, Search, Filter, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoadingSpinner, CardLoadingSkeleton } from "@/components/ui/loading-spinner";
import { PageErrorDisplay } from "@/components/ui/error-boundary";

interface Review {
  id?: string;
  _id?: string;
  rating: number;
  review: string;
  user: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
  };
  appointment: {
    id?: string;
    _id?: string;
    date: string;
    serviceName: string;
    servicePrice: number;
  };
  createdAt: string;
}

export default function BarberReviews() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const { data: reviews, isLoading, isError } = useQuery({
    queryKey: ['barberReviews', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/reviews/barber', { timeout: 8000 });
      return r.data as Review[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['barberReviewStats', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/reviews/barber/stats', { timeout: 6000 });
      return r.data as {
        totalReviews: number;
        averageRating: number;
        ratingDistribution: { [key: number]: number };
        recentReviews: number;
        monthlyGrowth: number;
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });

  const filteredReviews = (reviews || []).filter(review => {
    const matchesSearch = 
      review.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.review.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.appointment.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }[size];

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-yellow-600";
    if (rating >= 2.5) return "text-orange-600";
    return "text-red-600";
  };

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mis Calificaciones
          </h1>
          <p className="text-muted-foreground">
            Revisa las calificaciones y reseñas de tus clientes
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
            Mis Calificaciones
          </h1>
          <p className="text-muted-foreground">
            Revisa las calificaciones y reseñas de tus clientes
          </p>
        </div>
        <PageErrorDisplay
          error={isError}
          retry={() => window.location.reload()}
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
          Mis Calificaciones
        </h1>
        <p className="text-muted-foreground">
          Revisa las calificaciones y reseñas de tus clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reseñas</p>
                <p className="text-2xl font-bold">{reviewStats?.totalReviews || 0}</p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                <p className={`text-2xl font-bold ${getRatingColor(reviewStats?.averageRating || 0)}`}>
                  {reviewStats?.averageRating?.toFixed(1) || '0.0'}
                </p>
                <div className="flex mt-1">
                  {renderStars(Math.round(reviewStats?.averageRating || 0), 'sm')}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reseñas Recientes</p>
                <p className="text-2xl font-bold text-success">{reviewStats?.recentReviews || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crecimiento</p>
                <p className={`text-2xl font-bold ${(reviewStats?.monthlyGrowth || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(reviewStats?.monthlyGrowth || 0) >= 0 ? '+' : ''}{reviewStats?.monthlyGrowth || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      {reviewStats?.ratingDistribution && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle>Distribución de Calificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviewStats.ratingDistribution[rating] || 0;
                const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, servicio o reseña..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Calificación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="5">5 estrellas</SelectItem>
            <SelectItem value="4">4 estrellas</SelectItem>
            <SelectItem value="3">3 estrellas</SelectItem>
            <SelectItem value="2">2 estrellas</SelectItem>
            <SelectItem value="1">1 estrella</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes</SelectItem>
            <SelectItem value="oldest">Más antiguas</SelectItem>
            <SelectItem value="highest">Mayor calificación</SelectItem>
            <SelectItem value="lowest">Menor calificación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <Card key={getId(review)} className="card-premium hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-premium">
                      <Star className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{review.user.name}</h3>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">
                            ({review.rating}/5)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(review.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{review.appointment.serviceName}</span>
                        </div>
                      </div>
                      {review.review && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{review.review}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        ${review.appointment.servicePrice.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(review.appointment.date)}
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedReview(review)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalle de la Reseña</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="p-4 rounded-lg bg-gradient-premium">
                              <Star className="h-8 w-8 text-primary-foreground" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">{review.user.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(review.rating, 'lg')}
                                <span className="text-lg font-semibold">
                                  {review.rating}/5
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-3">Información del Cliente</h4>
                              <div className="space-y-2 text-sm">
                                <div>Nombre: {review.user.name}</div>
                                <div>Email: {review.user.email}</div>
                                <div>Fecha de reseña: {formatDate(review.createdAt)}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3">Servicio</h4>
                              <div className="space-y-2 text-sm">
                                <div>Servicio: {review.appointment.serviceName}</div>
                                <div>Precio: ${review.appointment.servicePrice.toLocaleString()}</div>
                                <div>Fecha del servicio: {formatDate(review.appointment.date)}</div>
                              </div>
                            </div>
                          </div>

                          {review.review && (
                            <div>
                              <h4 className="font-semibold mb-2">Reseña</h4>
                              <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg italic">
                                "{review.review}"
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="card-premium">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Star className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay calificaciones aún</h3>
              <p className="text-muted-foreground">
                {searchTerm || ratingFilter !== "all"
                  ? "No se encontraron reseñas con los filtros aplicados"
                  : "Las calificaciones de tus clientes aparecerán aquí"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

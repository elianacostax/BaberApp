import { Scissors, Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function BarberServices() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    duration: 30,
    price: 0,
    category: "haircut"
  });
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    duration: 30,
    price: 0,
    category: "haircut"
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: servicesData } = useQuery({
    queryKey: ['barberServices'],
    queryFn: async () => {
      const r = await api.get('/api/services/barber');
      return r.data as {
        services: Array<{
          id?: string;
          _id?: string;
          name: string;
          description: string;
          duration: number;
          price: number;
          category: string;
          isActive: boolean;
          source?: 'barbershop' | 'custom';
          hasCustomPrice?: boolean;
        }>;
        barbershop?: { _id?: string; id?: string };
      };
    }
  });

  const services = servicesData?.services ?? [];
  const barbershopId = getId(servicesData?.barbershop);

  const createService = useMutation({
    mutationFn: async (serviceData: typeof newService) => {
      await api.post('/api/services/custom', serviceData);
    },
    onSuccess: () => {
      toast({ title: 'Servicio creado' });
      queryClient.invalidateQueries({ queryKey: ['barberServices'] });
      setIsAdding(false);
      setNewService({ name: "", description: "", duration: 30, price: 0, category: "haircut" });
    },
    onError: (e: any) => toast({ 
      title: 'Error', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (data.source === 'barbershop') {
        const payload = { ...data };
        delete payload.source;
        await api.post(`/api/services/custom-price/${id}`, { 
          price: payload.price,
          isActive: payload.isActive !== undefined ? payload.isActive : true
        });
        return;
      }
      await api.put(`/api/services/custom/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Servicio actualizado' });
      queryClient.invalidateQueries({ queryKey: ['barberServices'] });
      setEditingId(null);
    },
    onError: (e: any) => toast({ 
      title: 'Error', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/services/custom/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Servicio eliminado' });
      queryClient.invalidateQueries({ queryKey: ['barberServices'] });
    },
    onError: (e: any) => toast({ 
      title: 'Error', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const toggleServiceStatus = useMutation({
    mutationFn: async ({ id, isActive, source, price }: { id: string; isActive: boolean; source?: string; price: number }) => {
      if (source === 'custom') {
        await api.put(`/api/services/custom/${id}`, { isActive });
        return;
      }
      await api.post(`/api/services/custom-price/${id}`, { price, isActive });
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      queryClient.invalidateQueries({ queryKey: ['barberServices'] });
    },
    onError: (e: any) => toast({ 
      title: 'Error', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "haircut": return "Corte";
      case "beard": return "Barba";
      case "mustache": return "Bigote";
      case "eyebrows": return "Cejas";
      case "shampoo": return "Shampoo";
      case "styling": return "Peinado";
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "haircut": return "bg-primary/20 text-primary";
      case "beard": return "bg-warning/20 text-warning";
      case "mustache": return "bg-success/20 text-success";
      case "eyebrows": return "bg-info/20 text-info";
      case "shampoo": return "bg-secondary/20 text-secondary";
      case "styling": return "bg-accent/20 text-accent";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const startEditing = (service: any) => {
    setEditingId(getId(service));
    setEditForm({
      name: service.name || "",
      description: service.description || "",
      duration: service.duration || 30,
      price: service.price || 0,
      category: service.category || "haircut"
    });
  };

  const isCustomService = (service: any) => service.source === 'custom';

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Mis Servicios
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los servicios que ofreces a tus clientes
          </p>
        </div>
        <EnhancedButton 
          variant="premium" 
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Nuevo Servicio</span>
          <span className="xs:hidden">Nuevo</span>
        </EnhancedButton>
      </div>

      {/* Add Service Form */}
      {isAdding && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Agregar Nuevo Servicio</CardTitle>
            <CardDescription className="text-sm">Completa la información del servicio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm">Nombre del Servicio</Label>
                <Input
                  id="name"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Corte clásico"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-sm">Categoría</Label>
                <select
                  id="category"
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background mt-1"
                >
                  <option value="haircut">Corte</option>
                  <option value="beard">Barba</option>
                  <option value="mustache">Bigote</option>
                  <option value="eyebrows">Cejas</option>
                  <option value="shampoo">Shampoo</option>
                  <option value="styling">Peinado</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-sm">Descripción</Label>
              <Input
                id="description"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del servicio"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration" className="text-sm">Duración (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newService.duration}
                  onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  min="15"
                  max="180"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="price" className="text-sm">Precio ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => createService.mutate(newService)}
                disabled={!newService.name || createService.isPending}
                className="flex-1 sm:flex-none"
              >
                Crear Servicio
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAdding(false);
                  setNewService({ name: "", description: "", duration: 30, price: 0, category: "haircut" });
                }}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {(services || []).map((service) => (
          <EnhancedCard key={getId(service)} variant="premium" className="group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow flex-shrink-0">
                    <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{service.name}</h3>
                    <Badge className={getCategoryColor(service.category)}>
                      {getCategoryLabel(service.category)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const serviceId = getId(service);
                      if (editingId === serviceId) {
                        setEditingId(null);
                      } else {
                        startEditing(service);
                      }
                    }}
                    className="p-1 sm:p-2"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (service.source !== 'custom') {
                        toast({
                          title: 'No se puede eliminar',
                          description: 'Solo puedes eliminar servicios personalizados',
                          variant: 'destructive'
                        });
                        return;
                      }
                      deleteService.mutate(getId(service));
                    }}
                    className="text-destructive hover:text-destructive p-1 sm:p-2"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>

              {editingId === getId(service) && (
                <div className="space-y-3 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={service.source === 'barbershop'}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Categoría</Label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                        disabled={service.source === 'barbershop'}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background mt-1 text-sm"
                      >
                        <option value="haircut">Corte</option>
                        <option value="beard">Barba</option>
                        <option value="mustache">Bigote</option>
                        <option value="eyebrows">Cejas</option>
                        <option value="shampoo">Shampoo</option>
                        <option value="styling">Peinado</option>
                      </select>
                    </div>
                  </div>
                  <div>
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        disabled={service.source === 'barbershop'}
                        className="mt-1 text-sm"
                      />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Duración (min)</Label>
                      <Input
                        type="number"
                        value={editForm.duration}
                        onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                        disabled={service.source === 'barbershop'}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Precio</Label>
                      <Input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (service.source === 'barbershop') {
                          updateService.mutate({ 
                            id: getId(service), 
                            data: { price: editForm.price, isActive: service.isActive, source: 'barbershop' } 
                          });
                        } else {
                          updateService.mutate({ id: getId(service), data: editForm });
                        }
                      }}
                    >
                      Guardar
                    </Button>
                    {service.source === 'barbershop' && (
                      <div className="text-xs text-muted-foreground self-center">
                        Solo precio y estado para servicios de la barbería.
                      </div>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {service.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{service.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-center p-2 sm:p-3 rounded-lg bg-card/50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span className="text-base sm:text-lg font-bold text-primary">{service.duration}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">minutos</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-lg bg-card/50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                    <span className="text-base sm:text-lg font-bold text-success">${service.price}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">precio</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Estado:</span>
                  <Badge variant={service.isActive ? "default" : "secondary"} className="text-xs">
                    {service.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleServiceStatus.mutate({ 
                    id: getId(service), 
                    isActive: !service.isActive,
                    source: service.source,
                    price: service.price,
                    duration: service.duration,
                    name: service.name,
                    description: service.description,
                    category: service.category
                  })}
                  className="text-xs sm:text-sm w-full sm:w-auto"
                >
                  <span className="hidden xs:inline">{service.isActive ? "Ocultar" : "Ofrecer"}</span>
                  <span className="xs:hidden">{service.isActive ? "Ocultar" : "Ofrecer"}</span>
                </Button>
              </div>
            </CardContent>
          </EnhancedCard>
        ))}
      </div>

      {(!services || services.length === 0) && !isAdding && (
        <Card className="card-premium">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Scissors className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tienes servicios configurados</h3>
            <p className="text-muted-foreground mb-4">
              Agrega servicios para que los clientes puedan reservar contigo
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Servicio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

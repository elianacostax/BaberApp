import { Plus, Edit, Trash2, Clock, DollarSign, Settings, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ServiceIcon } from "@/components/ui/service-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { EnhancedDialog, ConfirmDialog } from "@/components/ui/enhanced-dialog";
import { utilityClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

interface Service {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category: 'haircut' | 'beard' | 'styling' | 'treatment' | 'other';
  isActive: boolean;
  isRequired?: boolean;
  source: 'barbershop' | 'custom';
  hasCustomPrice?: boolean;
}

export default function BarberServices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'custom' | 'barbershop'>('all');

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['barberServices', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/services/barber', { timeout: 6000 });
      return r.data as { services: Service[]; barbershop: { id?: string; _id?: string; name: string }; barber: { id?: string; _id?: string; name: string } };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  const allServices = servicesData?.services || [];
  
  // Filtrar servicios
  const filteredServices = allServices.filter(service => {
    switch (filter) {
      case 'active':
        return service.isActive;
      case 'inactive':
        return !service.isActive;
      case 'custom':
        return service.source === 'custom';
      case 'barbershop':
        return service.source === 'barbershop';
      default:
        return true;
    }
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    category: 'other' as 'haircut' | 'beard' | 'styling' | 'treatment' | 'other',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 30,
      price: 0,
      category: 'other',
    });
    setEditingService(null);
  };

  const createService = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/api/services/custom', data);
    },
    onSuccess: () => {
      toast({ title: 'Servicio creado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['barberServices', user?.id] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ 
      title: 'Error al crear servicio', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await api.put(`/api/services/custom/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Servicio actualizado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['barberServices', user?.id] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ 
      title: 'Error al actualizar servicio', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/services/custom/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Servicio eliminado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['barberServices', user?.id] });
    },
    onError: (e: any) => toast({ 
      title: 'Error al eliminar servicio', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const toggleServiceStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/api/services/${id}`, { isActive });
    },
    onSuccess: () => {
      toast({ title: 'Estado del servicio actualizado' });
      queryClient.invalidateQueries({ queryKey: ['barberServices', user?.id] });
    },
    onError: (e: any) => toast({ 
      title: 'Error al actualizar estado', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      category: service.category,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (serviceToDelete) {
      deleteService.mutate(getId(serviceToDelete));
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateService.mutate({ id: getId(editingService), data: formData });
    } else {
      createService.mutate(formData);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent")}>
            Mis Servicios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los servicios que ofreces a tus clientes
          </p>
          {servicesData?.barbershop && (
            <p className="text-sm text-muted-foreground mt-1">
              Barbería: <span className="font-medium">{servicesData.barbershop.name}</span>
            </p>
          )}
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className={cn(utilityClasses.buttonPrimary, "w-full sm:w-auto")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos ({allServices.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          <Eye className="h-4 w-4 mr-1" />
          Activos ({allServices.filter(s => s.isActive).length})
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('inactive')}
        >
          <EyeOff className="h-4 w-4 mr-1" />
          Inactivos ({allServices.filter(s => !s.isActive).length})
        </Button>
        <Button
          variant={filter === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('custom')}
        >
          <Settings className="h-4 w-4 mr-1" />
          Personalizados ({allServices.filter(s => s.source === 'custom').length})
        </Button>
        <Button
          variant={filter === 'barbershop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('barbershop')}
        >
          Barbería ({allServices.filter(s => s.source === 'barbershop').length})
        </Button>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} variant="service" />
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={getId(service)} className={cn(utilityClasses.cardPremium, "group")}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ServiceIcon 
                      category={service.category} 
                      variant="filled" 
                      size="lg"
                    />
                    <div className="space-y-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {service.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={service.isActive ? 'active' : 'inactive'} 
                          size="sm"
                        />
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {service.source === 'custom' ? 'Personalizado' : 'Barbería'}
                        </Badge>
                        {service.hasCustomPrice && (
                          <Badge variant="secondary" className="text-xs">
                            Precio personalizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {service.source === 'custom' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(service)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(service)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                )}
                
                <Separator />
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">${service.price.toLocaleString()}</span>
                  </div>
                </div>

                {service.source === 'custom' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => toggleServiceStatus.mutate({ 
                      id: getId(service), 
                      isActive: !service.isActive 
                    })}
                    disabled={toggleServiceStatus.isPending}
                  >
                    {service.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Settings className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {filter === 'all' ? 'No tienes servicios creados' : 'No hay servicios que coincidan con el filtro'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {filter === 'all' 
              ? 'Comienza creando tu primer servicio personalizado para que los clientes puedan agendar citas'
              : 'Intenta cambiar el filtro para ver más servicios'
            }
          </p>
          {filter === 'all' && (
            <Button 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className={utilityClasses.buttonPrimary}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Servicio
            </Button>
          )}
        </div>
      )}

      {/* Modal para crear/editar servicio */}
      <EnhancedDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
        description={editingService ? 'Modifica los detalles de tu servicio' : 'Agrega un nuevo servicio personalizado'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Servicio</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Corte + Barba Premium"
              required
              className={utilityClasses.inputPrimary}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el servicio en detalle..."
              rows={3}
              className={utilityClasses.inputPrimary}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                min="15"
                step="15"
                required
                className={utilityClasses.inputPrimary}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                min="0"
                required
                className={utilityClasses.inputPrimary}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as any })}
            >
              <SelectTrigger className={utilityClasses.inputPrimary}>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haircut">Corte de Cabello</SelectItem>
                <SelectItem value="beard">Barba</SelectItem>
                <SelectItem value="styling">Estilizado</SelectItem>
                <SelectItem value="treatment">Tratamiento</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={createService.isPending || updateService.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createService.isPending || updateService.isPending}
              className={utilityClasses.buttonPrimary}
            >
              {createService.isPending || updateService.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingService ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                editingService ? 'Actualizar Servicio' : 'Crear Servicio'
              )}
            </Button>
          </div>
        </form>
      </EnhancedDialog>

      {/* Modal de confirmación para eliminar */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Servicio"
        description={`¿Estás seguro de que quieres eliminar el servicio "${serviceToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        isLoading={deleteService.isPending}
      />
    </div>
  );
}

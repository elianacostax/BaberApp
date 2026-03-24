import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getId } from '@/lib/id';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedDialog } from '@/components/ui/enhanced-dialog';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Clock, 
  Phone,
  Mail,
  Users,
  Star,
  Calendar,
  Settings,
  Scissors,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';

interface Barbershop {
  id?: string;
  _id?: string;
  name: string;
  location: string;
  description?: string;
  phone?: string;
  email?: string;
  openingHours?: {
    openHour: number;
    closeHour: number;
  };
  services?: Array<{
    id?: string;
    _id?: string;
    name: string;
    price: number;
    duration: number;
  }>;
  barbers?: Array<{
    id?: string;
    _id?: string;
    name: string;
  }>;
  createdAt: string;
  isActive: boolean;
}

interface Barber {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  barbershop?: {
    id?: string;
    _id?: string;
    name: string;
  } | null;
}

interface BarberDiagnostic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  activeServiceCount: number;
  hasScheduleConfigured: boolean;
  issues: Array<'no_active_services' | 'no_schedule'>;
  barbershop: {
    id: string;
    name: string;
    location?: string;
  } | null;
}

export default function AdminBarbershopsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para formularios
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [assignShopId, setAssignShopId] = useState<string>('');
  const [barberSearch, setBarberSearch] = useState('');
  const [barberFilter, setBarberFilter] = useState<'all' | 'assigned' | 'unassigned' | 'thisShop'>('all');
  const [diagnosticShopFilter, setDiagnosticShopFilter] = useState<string>('all');
  const [diagnosticIssueFilter, setDiagnosticIssueFilter] = useState<'all' | 'no_active_services' | 'no_schedule' | 'with_issues'>('with_issues');

  // Servicios por barbería
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    category: 'haircut'
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Formulario de creación/edición
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    phone: '',
    email: '',
    openHour: 9,
    closeHour: 18
  });

  // Obtener barberías
  const { data: barbershops, isLoading: barbershopsLoading } = useQuery<Barbershop[]>({
    queryKey: ['adminBarbershops', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      
      const response = await api.get(`/api/admin/barbershops?${params.toString()}`);
      return response.data;
    }
  });

  const { data: barbers } = useQuery<Barber[]>({
    queryKey: ['adminBarbers'],
    queryFn: async () => {
      const response = await api.get('/api/admin/users?role=barber');
      return response.data as Barber[];
    }
  });

  const { data: diagnosticsData, isLoading: diagnosticsLoading } = useQuery<{
    summary: {
      totalBarbers: number;
      withoutActiveServices: number;
      withoutSchedule: number;
      withIssues: number;
    };
    barbers: BarberDiagnostic[];
  }>({
    queryKey: ['adminBarberDiagnostics', diagnosticShopFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (diagnosticShopFilter !== 'all') params.append('barbershopId', diagnosticShopFilter);
      const response = await api.get(`/api/admin/barbers/diagnostics?${params.toString()}`);
      return response.data;
    }
  });

  // Crear barbería
  const createBarbershop = useMutation({
    mutationFn: async (barbershopData: typeof formData) => {
      const response = await api.post('/api/barbershops', {
        ...barbershopData,
        openingHours: {
          openHour: barbershopData.openHour,
          closeHour: barbershopData.closeHour
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Barbería creada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al crear barbería', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Actualizar barbería
  const updateBarbershop = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await api.put(`/api/barbershops/${id}`, {
        ...data,
        openingHours: {
          openHour: data.openHour || formData.openHour,
          closeHour: data.closeHour || formData.closeHour
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Barbería actualizada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar barbería', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Eliminar barbería
  const deleteBarbershop = useMutation({
    mutationFn: async (barbershopId: string) => {
      await api.delete(`/api/barbershops/${barbershopId}`);
    },
    onSuccess: () => {
      toast({ title: 'Barbería eliminada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al eliminar barbería', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  const assignBarber = useMutation({
    mutationFn: async ({ barberId, barbershopId }: { barberId: string; barbershopId: string | null }) => {
      await api.put(`/api/admin/users/${barberId}`, { barbershop: barbershopId });
    },
    onSuccess: () => {
      toast({ title: 'Asignación actualizada' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbers'] });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al asignar barbero', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  const createService = useMutation({
    mutationFn: async ({ barbershopId, data }: { barbershopId: string; data: typeof serviceForm }) => {
      await api.post(`/api/barbershops/${barbershopId}/services`, data);
    },
    onSuccess: () => {
      toast({ title: 'Servicio creado' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
      setServiceForm({ name: '', description: '', duration: 30, price: 0, category: 'haircut' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al crear servicio', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  const updateService = useMutation({
    mutationFn: async ({ barbershopId, serviceId, data }: { barbershopId: string; serviceId: string; data: typeof serviceForm }) => {
      await api.put(`/api/barbershops/${barbershopId}/services/${serviceId}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Servicio actualizado' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
      setEditingServiceId(null);
      setServiceForm({ name: '', description: '', duration: 30, price: 0, category: 'haircut' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar servicio', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  const deleteService = useMutation({
    mutationFn: async ({ barbershopId, serviceId }: { barbershopId: string; serviceId: string }) => {
      await api.delete(`/api/barbershops/${barbershopId}/services/${serviceId}`);
    },
    onSuccess: () => {
      toast({ title: 'Servicio eliminado' });
      queryClient.invalidateQueries({ queryKey: ['adminBarbershops'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al eliminar servicio', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Filtrar barberías
  const filteredBarbershops = barbershops?.filter(barbershop => {
    const matchesSearch = barbershop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         barbershop.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const filteredBarbers = (barbers || []).filter(barber => {
    const matchesSearch = barber.name.toLowerCase().includes(barberSearch.toLowerCase()) ||
      (barber.email || '').toLowerCase().includes(barberSearch.toLowerCase());

    const currentShopId = getId(barber.barbershop);
    const isAssigned = !!currentShopId;

    if (barberFilter === 'assigned' && !isAssigned) return false;
    if (barberFilter === 'unassigned' && isAssigned) return false;
    if (barberFilter === 'thisShop' && (!assignShopId || currentShopId !== assignShopId)) return false;

    return matchesSearch;
  });

  const filteredDiagnosticBarbers = (diagnosticsData?.barbers || []).filter((barber) => {
    if (diagnosticIssueFilter === 'with_issues') return barber.issues.length > 0;
    if (diagnosticIssueFilter === 'no_active_services') return barber.issues.includes('no_active_services');
    if (diagnosticIssueFilter === 'no_schedule') return barber.issues.includes('no_schedule');
    return true;
  });

  useEffect(() => {
    if (!selectedBarbershop || !barbershops) return;
    const updated = barbershops.find(shop => getId(shop) === getId(selectedBarbershop));
    if (updated) {
      setSelectedBarbershop(updated);
    }
  }, [barbershops, selectedBarbershop]);

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      description: '',
      phone: '',
      email: '',
      openHour: 9,
      closeHour: 18
    });
    setSelectedBarbershop(null);
  };

  const handleEdit = (barbershop: Barbershop) => {
    setSelectedBarbershop(barbershop);
    setFormData({
      name: barbershop.name,
      location: barbershop.location,
      description: barbershop.description || '',
      phone: barbershop.phone || '',
      email: barbershop.email || '',
      openHour: barbershop.openingHours?.openHour || 9,
      closeHour: barbershop.openingHours?.closeHour || 18
    });
    setIsEditDialogOpen(true);
  };

  const handleManageServices = (barbershop: Barbershop) => {
    setSelectedBarbershop(barbershop);
    setEditingServiceId(null);
    setServiceForm({ name: '', description: '', duration: 30, price: 0, category: 'haircut' });
    setIsServicesDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedBarbershop) {
      updateBarbershop.mutate({ id: getId(selectedBarbershop), data: formData });
    } else {
      createBarbershop.mutate(formData);
    }
  };

  const formatTime = (hour: number) => {
    return `${String(hour).padStart(2, '0')}:00`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gestión de Barberías
          </h2>
          <p className="text-muted-foreground">
            Administra las barberías del sistema y sus configuraciones
          </p>
        </div>
        <EnhancedButton 
          onClick={() => setIsCreateDialogOpen(true)}
          variant="premium"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Crear Barbería
        </EnhancedButton>
      </div>

      {/* Filtros */}
      <EnhancedCard variant="premium" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las barberías</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </EnhancedCard>

      {/* Asignación rápida de barberos */}
      <EnhancedCard variant="premium" className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Asignar Barberos a Barberías</h3>
              <p className="text-sm text-muted-foreground">Selecciona una barbería y asigna barberos con un clic</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Barbería destino</Label>
              <Select value={assignShopId} onValueChange={setAssignShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbería" />
                </SelectTrigger>
                <SelectContent>
                  {(barbershops || []).map(shop => (
                    <SelectItem key={getId(shop)} value={getId(shop)}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar barbero</Label>
              <Input
                placeholder="Nombre o email"
                value={barberSearch}
                onChange={(e) => setBarberSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Filtro</Label>
              <Select value={barberFilter} onValueChange={(v: any) => setBarberFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="assigned">Asignados</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  <SelectItem value="thisShop">De esta barbería</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredBarbers.map((barber) => {
              const currentShopId = getId(barber.barbershop);
              const currentShopName = barber.barbershop?.name || 'Sin barbería';
              const canAssign = !!assignShopId && currentShopId !== assignShopId;

              return (
                <div key={getId(barber)} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border/50">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{barber.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{barber.email || 'Sin email'}</div>
                    <div className="text-xs text-muted-foreground">Actual: {currentShopName}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!canAssign}
                      onClick={() => assignBarber.mutate({ barberId: getId(barber), barbershopId: assignShopId })}
                    >
                      Asignar
                    </Button>
                    {currentShopId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assignBarber.mutate({ barberId: getId(barber), barbershopId: null })}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredBarbers.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay barberos con ese criterio.</div>
            )}
          </div>
        </div>
      </EnhancedCard>

      <EnhancedCard variant="premium" className="p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Diagnóstico Operativo de Barberos
              </h3>
              <p className="text-sm text-muted-foreground">
                Detecta barberos sin servicios activos o sin horario configurado.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">Barberos</div>
                <div className="text-xl font-semibold">{diagnosticsData?.summary.totalBarbers || 0}</div>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">Con problemas</div>
                <div className="text-xl font-semibold text-amber-600">{diagnosticsData?.summary.withIssues || 0}</div>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">Sin servicios</div>
                <div className="text-xl font-semibold text-red-600">{diagnosticsData?.summary.withoutActiveServices || 0}</div>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">Sin horario</div>
                <div className="text-xl font-semibold text-orange-600">{diagnosticsData?.summary.withoutSchedule || 0}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Barbería</Label>
              <Select value={diagnosticShopFilter} onValueChange={setDiagnosticShopFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las barberías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las barberías</SelectItem>
                  {(barbershops || []).map((shop) => (
                    <SelectItem key={getId(shop)} value={getId(shop)}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Problema</Label>
              <Select value={diagnosticIssueFilter} onValueChange={(value: any) => setDiagnosticIssueFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="with_issues">Solo con problemas</SelectItem>
                  <SelectItem value="no_active_services">Sin servicios activos</SelectItem>
                  <SelectItem value="no_schedule">Sin horario configurado</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {diagnosticsLoading ? (
            <div className="text-sm text-muted-foreground">Cargando diagnóstico...</div>
          ) : filteredDiagnosticBarbers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No hay barberos que coincidan con este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDiagnosticBarbers.map((barber) => (
                <div key={barber.id} className="rounded-lg border border-border/50 p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium">{barber.name}</div>
                        {!barber.isActive && <Badge variant="secondary">Inactivo</Badge>}
                        {barber.issues.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Requiere atención
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{barber.email || 'Sin email'}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {barber.barbershop?.name || 'Sin barbería'}{barber.barbershop?.location ? ` • ${barber.barbershop.location}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={barber.activeServiceCount > 0 ? 'default' : 'destructive'}>
                        {barber.activeServiceCount} servicios activos
                      </Badge>
                      <Badge variant={barber.hasScheduleConfigured ? 'default' : 'secondary'}>
                        {barber.hasScheduleConfigured ? 'Horario configurado' : 'Sin horario'}
                      </Badge>
                    </div>
                  </div>
                  {barber.issues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {barber.issues.includes('no_active_services') && (
                        <Badge variant="outline">Sin servicios activos</Badge>
                      )}
                      {barber.issues.includes('no_schedule') && (
                        <Badge variant="outline">Sin horario configurado</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Lista de barberías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarbershops.map((barbershop) => (
          <EnhancedCard key={getId(barbershop)} variant="premium" className="group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{barbershop.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{barbershop.location}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={barbershop.isActive ? 'default' : 'secondary'}>
                  {barbershop.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>

              {barbershop.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {barbershop.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {barbershop.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{barbershop.phone}</span>
                  </div>
                )}
                {barbershop.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{barbershop.email}</span>
                  </div>
                )}
                {barbershop.openingHours && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTime(barbershop.openingHours.openHour)} - {formatTime(barbershop.openingHours.closeHour)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{barbershop.barbers?.length || 0} barberos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>{barbershop.services?.length || 0} servicios</span>
                </div>
              </div>

              <div className="flex gap-2">
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(barbershop)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </EnhancedButton>
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageServices(barbershop)}
                  className="flex-1"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Servicios
                </EnhancedButton>
                <EnhancedButton
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteBarbershop.mutate(getId(barbershop))}
                  disabled={deleteBarbershop.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </EnhancedButton>
              </div>
            </CardContent>
          </EnhancedCard>
        ))}
      </div>

      {filteredBarbershops.length === 0 && !barbershopsLoading && (
        <EnhancedCard variant="premium" className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No se encontraron barberías</h3>
          <p className="text-muted-foreground">
            Ajusta los filtros o crea una nueva barbería
          </p>
        </EnhancedCard>
      )}

      {/* Dialog de creación/edición */}
      <EnhancedDialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
        title={selectedBarbershop ? 'Editar Barbería' : 'Crear Barbería'}
        description={selectedBarbershop ? 'Modifica los datos de la barbería' : 'Agrega una nueva barbería al sistema'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de la barbería"
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Dirección o ciudad"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción de la barbería"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@barberia.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="openHour">Hora de Apertura</Label>
              <Select 
                value={formData.openHour.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, openHour: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {formatTime(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="closeHour">Hora de Cierre</Label>
              <Select 
                value={formData.closeHour.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, closeHour: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {formatTime(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <EnhancedButton
              onClick={handleSubmit}
              disabled={!formData.name || !formData.location}
              variant="premium"
            >
              {selectedBarbershop ? 'Actualizar' : 'Crear'}
            </EnhancedButton>
          </div>
        </div>
      </EnhancedDialog>

      {/* Dialog de servicios por barbería */}
      <EnhancedDialog
        open={isServicesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsServicesDialogOpen(false);
            setEditingServiceId(null);
            setServiceForm({ name: '', description: '', duration: 30, price: 0, category: 'haircut' });
          }
        }}
        title={`Servicios - ${selectedBarbershop?.name || ''}`}
        description="Gestiona el catálogo de servicios de esta barbería"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <select
                value={serviceForm.category}
                onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="haircut">Corte</option>
                <option value="beard">Barba</option>
                <option value="mustache">Bigote</option>
                <option value="eyebrows">Cejas</option>
                <option value="shampoo">Shampoo</option>
                <option value="styling">Peinado</option>
                <option value="treatment">Tratamiento</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={serviceForm.description}
                onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Duración (min)</Label>
              <Input
                type="number"
                min={15}
                value={serviceForm.duration}
                onChange={(e) => setServiceForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Precio</Label>
              <Input
                type="number"
                min={0}
                value={serviceForm.price}
                onChange={(e) => setServiceForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!selectedBarbershop) return;
                if (editingServiceId) {
                  updateService.mutate({ barbershopId: getId(selectedBarbershop), serviceId: editingServiceId, data: serviceForm });
                } else {
                  createService.mutate({ barbershopId: getId(selectedBarbershop), data: serviceForm });
                }
              }}
              disabled={!serviceForm.name || !selectedBarbershop}
            >
              {editingServiceId ? 'Actualizar Servicio' : 'Agregar Servicio'}
            </Button>
            {editingServiceId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingServiceId(null);
                  setServiceForm({ name: '', description: '', duration: 30, price: 0, category: 'haircut' });
                }}
              >
                Cancelar edición
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {(selectedBarbershop?.services || []).map((service) => (
              <div key={getId(service)} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div className="min-w-0">
                  <div className="font-medium truncate">{service.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {service.duration} min · ${service.price}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingServiceId(getId(service));
                      setServiceForm({
                        name: service.name,
                        description: (service as any).description || '',
                        duration: service.duration,
                        price: service.price,
                        category: (service as any).category || 'haircut'
                      });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (!selectedBarbershop) return;
                      deleteService.mutate({ barbershopId: getId(selectedBarbershop), serviceId: getId(service) });
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {(!selectedBarbershop?.services || selectedBarbershop.services.length === 0) && (
              <div className="text-sm text-muted-foreground">No hay servicios en esta barbería.</div>
            )}
          </div>
        </div>
      </EnhancedDialog>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getId } from '@/lib/id';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedDialog } from '@/components/ui/enhanced-dialog';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Calendar, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  Clock,
  User,
  Scissors,
  Building2,
  Download,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  AlertCircle,
  Ban
} from 'lucide-react';

interface Booking {
  id?: string;
  _id?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  servicePrice: number;
  user: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
  };
  barber: {
    id?: string;
    _id?: string;
    name: string;
  };
  barbershop: {
    id?: string;
    _id?: string;
    name: string;
    location: string;
  };
  service?: {
    id?: string;
    _id?: string;
    name: string;
    duration: number;
  };
  createdAt: string;
}

interface Barbershop {
  id?: string;
  _id?: string;
  name: string;
  location: string;
}

interface Barber {
  id?: string;
  _id?: string;
  name: string;
}

export default function AdminBookingsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [barbershopFilter, setBarbershopFilter] = useState<string>('all');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Estados para edición de reserva
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    barberId: '',
    date: '',
    startTime: '',
    endTime: '',
    status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    servicePrice: 0
  });
  
  // Estado para tracking de cambios de estado individuales
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  // Obtener reservas
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['adminBookings', statusFilter, barbershopFilter, barberFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (barbershopFilter !== 'all') params.append('barbershop', barbershopFilter);
      if (barberFilter !== 'all') params.append('barber', barberFilter);
      if (dateFilter) params.append('date', dateFilter);
      
      const response = await api.get(`/api/bookings?${params.toString()}`);
      return response.data;
    }
  });

  // Obtener barberías para filtros
  const { data: barbershops } = useQuery<Barbershop[]>({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const response = await api.get('/api/admin/barbershops');
      return response.data;
    }
  });

  // Obtener barberos para filtros
  const { data: barbers } = useQuery<Barber[]>({
    queryKey: ['barbers'],
    queryFn: async () => {
      const response = await api.get('/api/admin/users?role=barber');
      return response.data;
    }
  });

  // Actualizar estado de reserva
  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      setChangingStatus(id);
      await api.patch(`/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado exitosamente' });
      // Invalidar consultas de todos los roles para que se actualice en tiempo real
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['barberBookings'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminTopBarbers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMonthlyData'] });
      setChangingStatus(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar estado', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
      setChangingStatus(null);
    }
  });

  // Actualizar múltiples reservas
  const updateMultipleBookings = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(ids.map(id => api.patch(`/api/bookings/${id}`, { status })));
    },
    onSuccess: () => {
      toast({ title: `${selectedBookings.length} reservas actualizadas exitosamente` });
      // Invalidar consultas de todos los roles para que se actualice en tiempo real
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['barberBookings'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminTopBarbers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMonthlyData'] });
      setSelectedBookings([]);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar reservas', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Eliminar reserva
  const deleteBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.delete(`/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      toast({ title: 'Reserva eliminada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al eliminar reserva', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Actualizar reserva completa
  const updateBooking = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.patch(`/api/bookings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Reserva actualizada exitosamente' });
      // Invalidar consultas de todos los roles para que se actualice en tiempo real
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['barberBookings'] });
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminTopBarbers'] });
      queryClient.invalidateQueries({ queryKey: ['adminMonthlyData'] });
      setIsEditDialogOpen(false);
      setEditingBooking(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar reserva', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Contar filtros activos
  const activeFiltersCount = [
    searchTerm,
    statusFilter !== 'all',
    barbershopFilter !== 'all',
    barberFilter !== 'all',
    dateFilter
  ].filter(Boolean).length;

  // Filtrar reservas
  const filteredBookings = bookings?.filter(booking => {
    // Filtro de búsqueda
    const matchesSearch = 
      (booking.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.barber?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.barbershop?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de estado
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    // Filtro de barbería
    const matchesBarbershop = barbershopFilter === 'all' || getId(booking.barbershop) === barbershopFilter;
    
    // Filtro de barbero
    const matchesBarber = barberFilter === 'all' || getId(booking.barber) === barberFilter;
    
    // Filtro de fecha
    const matchesDate = !dateFilter || booking.date === dateFilter;
    
    return matchesSearch && matchesStatus && matchesBarbershop && matchesBarber && matchesDate;
  }) || [];

  // Paginación
  const totalPages = Math.ceil(filteredBookings.length / pageSize);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(paginatedBookings.map(booking => getId(booking)));
    } else {
      setSelectedBookings([]);
    }
  };

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    if (checked) {
      setSelectedBookings(prev => [...prev, bookingId]);
    } else {
      setSelectedBookings(prev => prev.filter(id => id !== bookingId));
    }
  };

  // Abrir diálogo de edición
  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditFormData({
      barberId: getId(booking.barber),
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      servicePrice: booking.servicePrice
    });
    setIsEditDialogOpen(true);
  };

  // Manejar cambios en el formulario de edición
  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Guardar cambios de la reserva
  const handleSaveBooking = () => {
    if (!editingBooking) return;
    
    updateBooking.mutate({
      id: getId(editingBooking),
      data: editFormData
    });
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingBooking(null);
    setEditFormData({
      barberId: '',
      date: '',
      startTime: '',
      endTime: '',
      status: 'pending',
      servicePrice: 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // Obtener opciones de cambio de estado para administrador
  const getStatusChangeOptions = (currentStatus: string) => {
    const allStatuses = [
      { value: 'pending', label: 'Pendiente', icon: AlertCircle, color: 'text-yellow-500' },
      { value: 'confirmed', label: 'Confirmada', icon: CheckCircle, color: 'text-green-500' },
      { value: 'completed', label: 'Completada', icon: Clock, color: 'text-blue-500' },
      { value: 'cancelled', label: 'Cancelada', icon: Ban, color: 'text-red-500' }
    ];

    // El administrador puede cambiar a cualquier estado desde cualquier estado
    return allStatuses.filter(status => status.value !== currentStatus);
  };

  // Obtener icono y color del estado actual
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return { icon: AlertCircle, color: 'text-yellow-500' };
      case 'confirmed': return { icon: CheckCircle, color: 'text-green-500' };
      case 'completed': return { icon: Clock, color: 'text-blue-500' };
      case 'cancelled': return { icon: Ban, color: 'text-red-500' };
      default: return { icon: AlertCircle, color: 'text-gray-500' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const exportBookings = () => {
    // Implementar exportación de reservas
    console.log('Exporting bookings...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gestión de Reservas
          </h2>
          <p className="text-muted-foreground">
            Administra todas las reservas del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportBookings}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reservas..."
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
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="confirmed">Confirmadas</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={barbershopFilter} onValueChange={setBarbershopFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por barbería" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las barberías</SelectItem>
              {barbershops?.map(shop => (
                <SelectItem key={getId(shop)} value={getId(shop)}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={barberFilter} onValueChange={setBarberFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por barbero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los barberos</SelectItem>
              {barbers?.map(barber => (
                <SelectItem key={getId(barber)} value={getId(barber)}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filtrar por fecha"
          />
        </div>
        
        {/* Filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros activos:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Búsqueda: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Estado: {statusFilter}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {barbershopFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Barbería: {barbershops?.find(s => getId(s) === barbershopFilter)?.name || 'Desconocida'}
                  <button
                    onClick={() => setBarbershopFilter('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {barberFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Barbero: {barbers?.find(b => getId(b) === barberFilter)?.name || 'Desconocido'}
                  <button
                    onClick={() => setBarberFilter('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Fecha: {new Date(dateFilter).toLocaleDateString('es-CO')}
                  <button
                    onClick={() => setDateFilter('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Botón para limpiar filtros */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeFiltersCount > 0 && (
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setBarbershopFilter('all');
              setBarberFilter('all');
              setDateFilter('');
            }}
            disabled={activeFiltersCount === 0}
          >
            <Filter className="h-4 w-4 mr-2" />
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      {/* Acciones masivas */}
      {selectedBookings.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedBookings.length} reservas seleccionadas
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMultipleBookings.mutate({ ids: selectedBookings, status: 'confirmed' })}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMultipleBookings.mutate({ ids: selectedBookings, status: 'completed' })}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Completar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updateMultipleBookings.mutate({ ids: selectedBookings, status: 'cancelled' })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBookings([])}
            >
              Cancelar selección
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de reservas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Reservas ({filteredBookings.length})
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  Filtradas
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Seleccionar todo</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {paginatedBookings.map((booking) => (
              <div
                key={getId(booking)}
                className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-card/30 transition-colors"
              >
                <Checkbox
                  checked={selectedBookings.includes(getId(booking))}
                  onCheckedChange={(checked) => handleSelectBooking(getId(booking), checked as boolean)}
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.user?.name || 'Cliente'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{booking.user?.email || 'Sin email'}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scissors className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.barber?.name || 'Barbero'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{booking.service?.name || 'Servicio no especificado'}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.barbershop?.name || 'Barbería'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{booking.barbershop?.location || 'Sin ubicación'}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">{booking.date}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-primary">{formatCurrency(booking.servicePrice)}</div>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBooking(booking)}
                    title="Editar reserva"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {/* Menú desplegable para cambio de estado */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={changingStatus === getId(booking)}
                        title="Cambiar estado"
                      >
                        {changingStatus === getId(booking) ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          (() => {
                            const { icon: Icon, color } = getStatusIcon(booking.status);
                            return <Icon className={`h-4 w-4 ${color}`} />;
                          })()
                        )}
                        {changingStatus !== getId(booking) && <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {getStatusChangeOptions(booking.status).map((option) => {
                        const Icon = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => updateBookingStatus.mutate({ 
                              id: getId(booking), 
                              status: option.value 
                            })}
                            className="flex items-center gap-2"
                          >
                            <Icon className={`h-4 w-4 ${option.color}`} />
                            <span>Cambiar a {option.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBooking.mutate(getId(booking))}
                    disabled={deleteBooking.isPending}
                    title="Eliminar reserva"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {paginatedBookings.length === 0 && !bookingsLoading && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {activeFiltersCount > 0 ? 'No se encontraron reservas con los filtros aplicados' : 'No hay reservas disponibles'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeFiltersCount > 0 
                  ? 'Intenta ajustar o limpiar los filtros para ver más resultados'
                  : 'Las reservas aparecerán aquí cuando se creen'
                }
              </p>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setBarbershopFilter('all');
                    setBarberFilter('all');
                    setDateFilter('');
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredBookings.length)} de {filteredBookings.length} reservas
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de edición de reserva */}
      <EnhancedDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        size="lg"
        title="Editar Reserva"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Editar Reserva</h2>
            <p className="text-muted-foreground">
              Modifica los datos de la reserva de {editingBooking?.user?.name || 'Cliente'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Barbero asignado */}
            <div className="space-y-2">
              <Label htmlFor="barber">Barbero Asignado</Label>
              <Select
                value={editFormData.barberId}
                onValueChange={(value) => handleEditFormChange('barberId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbero" />
                </SelectTrigger>
                <SelectContent>
                  {barbers?.map(barber => (
                    <SelectItem key={getId(barber)} value={getId(barber)}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => handleEditFormChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={editFormData.date}
                onChange={(e) => handleEditFormChange('date', e.target.value)}
              />
            </div>

            {/* Hora de inicio */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de Inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={editFormData.startTime}
                onChange={(e) => handleEditFormChange('startTime', e.target.value)}
              />
            </div>

            {/* Hora de fin */}
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de Fin</Label>
              <Input
                id="endTime"
                type="time"
                value={editFormData.endTime}
                onChange={(e) => handleEditFormChange('endTime', e.target.value)}
              />
            </div>

            {/* Precio del servicio */}
            <div className="space-y-2">
              <Label htmlFor="servicePrice">Precio del Servicio (COP)</Label>
              <Input
                id="servicePrice"
                type="number"
                value={editFormData.servicePrice}
                onChange={(e) => handleEditFormChange('servicePrice', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Información de la reserva */}
          {editingBooking && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Información de la Reserva</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{editingBooking.user?.name || 'Cliente'}</p>
                  <p className="text-muted-foreground">{editingBooking.user?.email || 'Sin email'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Barbería:</span>
                  <p className="font-medium">{editingBooking.barbershop?.name || 'Barbería'}</p>
                  <p className="text-muted-foreground">{editingBooking.barbershop?.location || 'Sin ubicación'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={updateBooking.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBooking}
              disabled={updateBooking.isPending}
            >
              {updateBooking.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </EnhancedDialog>
    </div>
  );
}

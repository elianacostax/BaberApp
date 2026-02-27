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
import { Badge } from '@/components/ui/badge';
import { EnhancedDialog } from '@/components/ui/enhanced-dialog';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Shield, 
  Scissors, 
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: 'client' | 'barber' | 'admin' | 'owner';
  barbershop?: {
    id?: string;
    _id?: string;
    name: string;
  };
  createdAt: string;
  isActive: boolean;
}

interface Barbershop {
  id?: string;
  _id?: string;
  name: string;
  location: string;
}

export default function AdminUsersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [barbershopFilter, setBarbershopFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para formularios
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Formulario de creación/edición
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client' as 'client' | 'barber' | 'admin' | 'owner',
    barbershop: ''
  });

  // Obtener usuarios
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['adminUsers', roleFilter, barbershopFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (barbershopFilter !== 'all') params.append('barbershop', barbershopFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      
      const response = await api.get(`/api/admin/users?${params.toString()}`);
      return response.data;
    }
  });

  // Obtener barberías
  const { data: barbershops } = useQuery<Barbershop[]>({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const response = await api.get('/api/admin/barbershops');
      return response.data;
    }
  });

  // Crear usuario
  const createUser = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const response = await api.post('/api/admin/users', userData);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Usuario creado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al crear usuario', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Actualizar usuario
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await api.put(`/api/admin/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Usuario actualizado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar usuario', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Eliminar usuario
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({ title: 'Usuario eliminado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al eliminar usuario', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Filtrar usuarios
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'client',
      barbershop: ''
    });
    setSelectedUser(null);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      barbershop: getId(user.barbershop) || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedUser) {
      updateUser.mutate({ id: getId(selectedUser), data: formData });
    } else {
      createUser.mutate(formData);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'owner': return <Shield className="h-4 w-4" />;
      case 'barber': return <Scissors className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'owner': return 'default';
      case 'barber': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gestión de Usuarios
          </h2>
          <p className="text-muted-foreground">
            Administra clientes, barberos y administradores del sistema
          </p>
        </div>
        <EnhancedButton 
          onClick={() => setIsCreateDialogOpen(true)}
          variant="premium"
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Crear Usuario
        </EnhancedButton>
      </div>

      {/* Filtros */}
      <EnhancedCard variant="premium" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
              <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="client">Clientes</SelectItem>
              <SelectItem value="barber">Barberos</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="owner">Propietarios</SelectItem>
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </EnhancedCard>

      {/* Lista de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <EnhancedCard key={getId(user)} variant="premium" className="group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                {user.barbershop && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{user.barbershop.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Registrado: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(user)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </EnhancedButton>
                <EnhancedButton
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteUser.mutate(getId(user))}
                  disabled={deleteUser.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </EnhancedButton>
              </div>
            </CardContent>
          </EnhancedCard>
        ))}
      </div>

      {filteredUsers.length === 0 && !usersLoading && (
        <EnhancedCard variant="premium" className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios</h3>
          <p className="text-muted-foreground">
            Ajusta los filtros o crea un nuevo usuario
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
        title={selectedUser ? 'Editar Usuario' : 'Crear Usuario'}
        description={selectedUser ? 'Modifica los datos del usuario' : 'Agrega un nuevo usuario al sistema'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder={selectedUser ? "Dejar vacío para mantener actual" : "Contraseña"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData(prev => ({
                    ...prev,
                    role: value,
                    barbershop: value === 'barber' ? prev.barbershop : ''
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="barber">Barbero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="owner">Propietario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="barbershop">Barbería</Label>
              <Select 
                value={formData.barbershop} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, barbershop: value }))}
                disabled={formData.role !== 'barber'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbería" />
                </SelectTrigger>
                <SelectContent>
                  {barbershops?.map(shop => (
                    <SelectItem key={getId(shop)} value={getId(shop)}>
                      {shop.name}
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
              disabled={!formData.name || !formData.email || (!selectedUser && !formData.password)}
              variant="premium"
            >
              {selectedUser ? 'Actualizar' : 'Crear'}
            </EnhancedButton>
          </div>
        </div>
      </EnhancedDialog>
    </div>
  );
}

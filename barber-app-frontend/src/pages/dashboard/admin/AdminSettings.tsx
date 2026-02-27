import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  Settings, 
  Bell, 
  Mail, 
  Shield, 
  Database, 
  Clock, 
  DollarSign,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SystemSettings {
  general: {
    appName: string;
    appDescription: string;
    timezone: string;
    currency: string;
    language: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    emailTemplates: {
      bookingConfirmation: string;
      bookingReminder: string;
      bookingCancellation: string;
    };
  };
  business: {
    defaultBookingDuration: number;
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    cancellationPolicy: string;
    refundPolicy: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    twoFactorEnabled: boolean;
  };
  maintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    systemBackup: {
      enabled: boolean;
      frequency: string;
      lastBackup: string;
    };
  };
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para los formularios
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Obtener configuración del sistema
  const { data: settings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await api.get('/api/admin/settings');
      return response.data;
    }
  });

  // Estados locales para los formularios
  const [generalSettings, setGeneralSettings] = useState({
    appName: '',
    appDescription: '',
    timezone: '',
    currency: 'COP',
    language: 'es'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    emailTemplates: {
      bookingConfirmation: '',
      bookingReminder: '',
      bookingCancellation: ''
    }
  });

  const [businessSettings, setBusinessSettings] = useState({
    defaultBookingDuration: 60,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 2,
    cancellationPolicy: '',
    refundPolicy: ''
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    twoFactorEnabled: false
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    systemBackup: {
      enabled: true,
      frequency: 'daily',
      lastBackup: ''
    }
  });

  // Actualizar configuración
  const updateSettings = useMutation({
    mutationFn: async (settingsData: Partial<SystemSettings>) => {
      await api.put('/api/admin/settings', settingsData);
    },
    onSuccess: () => {
      toast({ title: 'Configuración actualizada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al actualizar configuración', 
        description: error?.response?.data?.message || 'Intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  // Inicializar datos cuando se cargan
  useEffect(() => {
    if (settings) {
      setGeneralSettings(settings.general);
      setNotificationSettings(settings.notifications);
      setBusinessSettings(settings.business);
      setSecuritySettings(settings.security);
      setMaintenanceSettings(settings.maintenance);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData = {
        general: generalSettings,
        notifications: notificationSettings,
        business: businessSettings,
        security: securitySettings,
        maintenance: maintenanceSettings
      };
      await updateSettings.mutateAsync(settingsData);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'business', label: 'Negocio', icon: DollarSign },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'maintenance', label: 'Mantenimiento', icon: Database }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Configuración del Sistema
          </h2>
          <p className="text-muted-foreground">
            Administra la configuración global de BarberApp
          </p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </EnhancedButton>
          <EnhancedButton 
            variant="premium" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </EnhancedButton>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <EnhancedCard variant="premium" className="p-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </EnhancedCard>

      {/* Contenido de las pestañas */}
      <div className="space-y-6">
        {/* Configuración General */}
        {activeTab === 'general' && (
          <EnhancedCard variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="appName">Nombre de la Aplicación</Label>
                  <Input
                    id="appName"
                    value={generalSettings.appName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, appName: e.target.value }))}
                    placeholder="BarberApp"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select 
                    value={generalSettings.timezone} 
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
                      <SelectItem value="Europe/London">Europa/Londres</SelectItem>
                      <SelectItem value="America/New_York">América/Nueva York</SelectItem>
                      <SelectItem value="America/Los_Angeles">América/Los Ángeles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="appDescription">Descripción de la Aplicación</Label>
                <Textarea
                  id="appDescription"
                  value={generalSettings.appDescription}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, appDescription: e.target.value }))}
                  placeholder="Descripción de la aplicación"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <Select 
                    value={generalSettings.currency} 
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">Peso Colombiano ($)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Select 
                    value={generalSettings.language} 
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        )}

        {/* Configuración de Notificaciones */}
        {activeTab === 'notifications' && (
          <EnhancedCard variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Configuración de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones por Email</Label>
                    <p className="text-sm text-muted-foreground">Enviar notificaciones por correo electrónico</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailEnabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones SMS</Label>
                    <p className="text-sm text-muted-foreground">Enviar notificaciones por SMS</p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsEnabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones Push</Label>
                    <p className="text-sm text-muted-foreground">Enviar notificaciones push a la aplicación</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushEnabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushEnabled: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Plantillas de Email</h4>
                
                <div>
                  <Label htmlFor="bookingConfirmation">Confirmación de Reserva</Label>
                  <Textarea
                    id="bookingConfirmation"
                    value={notificationSettings.emailTemplates.bookingConfirmation}
                    onChange={(e) => setNotificationSettings(prev => ({ 
                      ...prev, 
                      emailTemplates: { 
                        ...prev.emailTemplates, 
                        bookingConfirmation: e.target.value 
                      } 
                    }))}
                    placeholder="Plantilla para confirmación de reserva"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="bookingReminder">Recordatorio de Reserva</Label>
                  <Textarea
                    id="bookingReminder"
                    value={notificationSettings.emailTemplates.bookingReminder}
                    onChange={(e) => setNotificationSettings(prev => ({ 
                      ...prev, 
                      emailTemplates: { 
                        ...prev.emailTemplates, 
                        bookingReminder: e.target.value 
                      } 
                    }))}
                    placeholder="Plantilla para recordatorio de reserva"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="bookingCancellation">Cancelación de Reserva</Label>
                  <Textarea
                    id="bookingCancellation"
                    value={notificationSettings.emailTemplates.bookingCancellation}
                    onChange={(e) => setNotificationSettings(prev => ({ 
                      ...prev, 
                      emailTemplates: { 
                        ...prev.emailTemplates, 
                        bookingCancellation: e.target.value 
                      } 
                    }))}
                    placeholder="Plantilla para cancelación de reserva"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        )}

        {/* Configuración de Negocio */}
        {activeTab === 'business' && (
          <EnhancedCard variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Configuración de Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="defaultBookingDuration">Duración por Defecto (minutos)</Label>
                  <Input
                    id="defaultBookingDuration"
                    type="number"
                    value={businessSettings.defaultBookingDuration}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, defaultBookingDuration: parseInt(e.target.value) }))}
                    min="15"
                    max="300"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAdvanceBookingDays">Máximo Días de Antelación</Label>
                  <Input
                    id="maxAdvanceBookingDays"
                    type="number"
                    value={businessSettings.maxAdvanceBookingDays}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, maxAdvanceBookingDays: parseInt(e.target.value) }))}
                    min="1"
                    max="365"
                  />
                </div>
                <div>
                  <Label htmlFor="minAdvanceBookingHours">Mínimo Horas de Antelación</Label>
                  <Input
                    id="minAdvanceBookingHours"
                    type="number"
                    value={businessSettings.minAdvanceBookingHours}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, minAdvanceBookingHours: parseInt(e.target.value) }))}
                    min="0"
                    max="72"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cancellationPolicy">Política de Cancelación</Label>
                <Textarea
                  id="cancellationPolicy"
                  value={businessSettings.cancellationPolicy}
                  onChange={(e) => setBusinessSettings(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                  placeholder="Política de cancelación de reservas"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="refundPolicy">Política de Reembolso</Label>
                <Textarea
                  id="refundPolicy"
                  value={businessSettings.refundPolicy}
                  onChange={(e) => setBusinessSettings(prev => ({ ...prev, refundPolicy: e.target.value }))}
                  placeholder="Política de reembolso"
                  rows={4}
                />
              </div>
            </CardContent>
          </EnhancedCard>
        )}

        {/* Configuración de Seguridad */}
        {activeTab === 'security' && (
          <EnhancedCard variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Configuración de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="sessionTimeout">Timeout de Sesión (horas)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    min="1"
                    max="168"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLoginAttempts">Máximo Intentos de Login</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                    min="3"
                    max="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="passwordMinLength">Longitud Mínima de Contraseña</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) }))}
                    min="6"
                    max="32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticación de Dos Factores</Label>
                    <p className="text-sm text-muted-foreground">Requerir 2FA para administradores</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        )}

        {/* Configuración de Mantenimiento */}
        {activeTab === 'maintenance' && (
          <EnhancedCard variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Configuración de Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo de Mantenimiento</Label>
                    <p className="text-sm text-muted-foreground">Activar modo de mantenimiento para todos los usuarios</p>
                  </div>
                  <Switch
                    checked={maintenanceSettings.maintenanceMode}
                    onCheckedChange={(checked) => setMaintenanceSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>

                {maintenanceSettings.maintenanceMode && (
                  <div>
                    <Label htmlFor="maintenanceMessage">Mensaje de Mantenimiento</Label>
                    <Textarea
                      id="maintenanceMessage"
                      value={maintenanceSettings.maintenanceMessage}
                      onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                      placeholder="Mensaje que verán los usuarios durante el mantenimiento"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Respaldo del Sistema</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Respaldo Automático</Label>
                    <p className="text-sm text-muted-foreground">Realizar respaldos automáticos de la base de datos</p>
                  </div>
                  <Switch
                    checked={maintenanceSettings.systemBackup.enabled}
                    onCheckedChange={(checked) => setMaintenanceSettings(prev => ({ 
                      ...prev, 
                      systemBackup: { ...prev.systemBackup, enabled: checked } 
                    }))}
                  />
                </div>

                {maintenanceSettings.systemBackup.enabled && (
                  <div>
                    <Label htmlFor="backupFrequency">Frecuencia de Respaldo</Label>
                    <Select 
                      value={maintenanceSettings.systemBackup.frequency} 
                      onValueChange={(value) => setMaintenanceSettings(prev => ({ 
                        ...prev, 
                        systemBackup: { ...prev.systemBackup, frequency: value } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {maintenanceSettings.systemBackup.lastBackup && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Último respaldo: {maintenanceSettings.systemBackup.lastBackup}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </EnhancedCard>
        )}
      </div>
    </div>
  );
}

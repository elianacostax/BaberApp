import { useState } from 'react';
import { Calendar, Clock, Users, Scissors, BarChart3, Settings, Scissors as ScissorsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import BarberAgenda from './barber/BarberAgenda';
import BarberClients from './barber/BarberClients';
import BarberServices from './barber/BarberServices';
import BarberSchedule from './barber/BarberSchedule';
import { ModuleNavigation } from "@/components/layout/ModuleNavigation";

export default function BarberDashboard() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('overview');


  const modules = [
    { id: 'overview', label: 'Vista General', icon: BarChart3 },
    { id: 'agenda', label: 'Mi Agenda', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Servicios', icon: ScissorsIcon },
    { id: 'schedule', label: 'Horarios', icon: Clock }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'agenda':
        return <BarberAgenda />;
      case 'clients':
        return <BarberClients />;
      case 'services':
        return <BarberServices />;
      case 'schedule':
        return <BarberSchedule />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            ¡Hola, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestiona tu agenda y servicios profesionales
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {new Date().toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <EnhancedButton 
            variant="premium" 
            size="sm" 
            onClick={() => setActiveModule('agenda')}
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Ver Agenda</span>
            <span className="xs:hidden">Agenda</span>
          </EnhancedButton>
          <EnhancedButton 
            variant="outline" 
            size="sm" 
            onClick={() => setActiveModule('services')}
            className="w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Configurar</span>
            <span className="xs:hidden">Config</span>
          </EnhancedButton>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20 rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
              <div>
            <h2 className="text-lg sm:text-xl font-bold text-primary mb-2">
              ¡Bienvenido a tu panel de control!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Desde aquí puedes gestionar tu agenda, clientes, servicios y horarios de trabajo.
                </p>
              </div>
            </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <EnhancedCard variant="premium" glow="primary" className="group cursor-pointer" interactive onClick={() => setActiveModule('schedule')}>
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow w-fit shadow-lg">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg sm:text-xl mb-2 group-hover:text-primary transition-colors">Gestionar Horarios</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              Configura tu horario de trabajo y bloqueos
            </p>
            <EnhancedButton variant="outline" size="sm" className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Configurar</span>
              <span className="xs:hidden">Config</span>
            </EnhancedButton>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="success" glow="success" className="group cursor-pointer" interactive onClick={() => setActiveModule('services')}>
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl bg-success w-fit shadow-lg">
              <Scissors className="h-6 w-6 sm:h-8 sm:w-8 text-success-foreground" />
            </div>
            <h3 className="font-semibold text-lg sm:text-xl mb-2 group-hover:text-success transition-colors">Gestionar Servicios</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              Configura precios, duraciones y categorías
            </p>
            <EnhancedButton variant="outline" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Configurar</span>
              <span className="xs:hidden">Config</span>
            </EnhancedButton>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="premium" glow="primary" className="group cursor-pointer" interactive onClick={() => setActiveModule('clients')}>
          <CardContent className="p-4 sm:p-6 text-center">
            <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary to-primary-glow w-fit shadow-lg">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg sm:text-xl mb-2 group-hover:text-primary transition-colors">Mis Clientes</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              Ver historial e información de clientes
            </p>
            <EnhancedButton variant="outline" size="sm" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Ver Clientes</span>
              <span className="xs:hidden">Clientes</span>
            </EnhancedButton>
          </CardContent>
        </EnhancedCard>
      </div>
    </div>
  );

  return (
      <div className="space-y-6">
      {/* Navigation */}
      <ModuleNavigation modules={modules} activeModule={activeModule} onChange={setActiveModule} />

      {/* Module Content */}
      <div className="min-h-[600px] overflow-y-auto">
        {renderModule()}
            </div>
    </div>
  );
}

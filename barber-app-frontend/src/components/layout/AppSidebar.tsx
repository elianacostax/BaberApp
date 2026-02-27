import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  BarChart3,
  User,
  Settings,
  Clock,
  Scissors,
  LogOut,
  Menu,
  Star,
  CreditCard,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

const menuItems: Record<UserRole, Array<{
  title: string;
  url: string;
  icon: any;
  description?: string;
}>> = {
  client: [
    { title: "Inicio", url: "/dashboard", icon: Calendar, description: "Ver mis citas" },
    { title: "Agendar Cita", url: "/book", icon: Clock, description: "Nueva reserva" },
    { title: "Mis Reservas", url: "/appointments", icon: Calendar, description: "Historial" },
    { title: "Barberos", url: "/barbers", icon: Scissors, description: "Ver barberos" },
    { title: "Mi Perfil", url: "/profile", icon: User, description: "Datos personales" },
  ],
  barber: [
    { title: "Inicio", url: "/dashboard", icon: Calendar, description: "Mi agenda" },
    { title: "Servicios", url: "/services", icon: Scissors, description: "Mis servicios" },
    { title: "Clientes", url: "/clients", icon: Users, description: "Mis clientes" },
    { title: "Calificaciones", url: "/reviews", icon: Star, description: "Reseñas" },
    { title: "Mi Perfil", url: "/profile", icon: User, description: "Perfil profesional" },
  ],
  admin: [
    { title: "Inicio", url: "/dashboard", icon: BarChart3, description: "Panel general" },
    { title: "Citas", url: "/all-appointments", icon: Calendar, description: "Todas las citas" },
    { title: "Usuarios", url: "/users", icon: Users, description: "Gestión de usuarios" },
    { title: "Barberos", url: "/manage-barbers", icon: Scissors, description: "Gestión barberos" },
    { title: "Estadísticas", url: "/analytics", icon: BarChart3, description: "Reportes" },
    { title: "Facturación", url: "/billing", icon: CreditCard, description: "Ingresos" },
    { title: "Configuración", url: "/settings", icon: Settings, description: "Sistema" },
  ],
  owner: [
    { title: "Inicio", url: "/dashboard", icon: BarChart3, description: "Panel general" },
    { title: "Citas", url: "/all-appointments", icon: Calendar, description: "Reservas" },
    { title: "Usuarios", url: "/users", icon: Users, description: "Equipo" },
    { title: "Estadísticas", url: "/analytics", icon: BarChart3, description: "Reportes" },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  if (!user) return null;

  const items = menuItems[user.role] || [];
  const collapsed = state === "collapsed";
  const roleLabel = user.role === "client"
    ? "Cliente"
    : user.role === "barber"
      ? "Barbero"
      : user.role === "owner"
        ? "Propietario"
        : "Administrador";

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-72"} transition-all duration-300`}>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-premium">
            <Scissors className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BarberApp
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                Panel {roleLabel}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold mb-4">
            {!collapsed && "Navegación"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive: navActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                          navActive
                            ? "nav-active"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="space-y-3">
          {!collapsed && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {roleLabel}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            onClick={logout}
            className={`w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 ${
              collapsed ? "px-3" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

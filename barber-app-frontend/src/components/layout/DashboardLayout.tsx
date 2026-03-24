import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Scissors, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-primary to-primary/60">
                <Scissors className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  BarberApp
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                  Panel {user?.role === "client" ? "Cliente" : user?.role === "barber" ? "Barbero" : user?.role === "owner" ? "Propietario" : "Administrador"}
                </p>
              </div>
              <div className="sm:hidden">
                <h2 className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  BarberApp
                </h2>
              </div>
            </div>

            <div className="hidden md:block text-sm text-muted-foreground">
              {user?.role === "client" && "Reserva, revisa y administra tus citas"}
              {user?.role === "barber" && "Gestiona tu agenda, servicios y clientes"}
              {(user?.role === "admin" || user?.role === "owner") && "Administra barberías, barberos, reservas y clientes"}
            </div>
          </div>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Profile - Responsive */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-card/50">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
              </div>
              <div className="text-xs sm:text-sm hidden sm:block">
                <div className="font-medium truncate max-w-24">{user?.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {user?.role === "client" ? "Cliente" : user?.role === "barber" ? "Barbero" : user?.role === "owner" ? "Propietario" : "Administrador"}
                </div>
              </div>
              <div className="text-xs sm:hidden">
                <div className="font-medium truncate max-w-16">{user?.name}</div>
              </div>
            </div>
            
            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2 sm:p-2.5"
            >
              <LogOut className="h-4 w-4 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import AuthPage from "./pages/AuthPage";
import RegisterBarbershopPage from "./pages/RegisterBarbershopPage";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Index from "./pages/Index";
const ClientDashboard = lazy(() => import("./pages/dashboard/ClientDashboard"));
const BarberDashboard = lazy(() => import("./pages/dashboard/BarberDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const AdminManageBarbers = lazy(() => import("./pages/dashboard/AdminManageBarbers"));
const MyAppointments = lazy(() => import("./pages/appointments/MyAppointments"));
const BookAppointment = lazy(() => import("./pages/book/BookAppointment"));
const BarberServices = lazy(() => import("./pages/services/BarberServices"));
const BarberClients = lazy(() => import("./pages/clients/BarberClients"));
const BarberReviews = lazy(() => import("./pages/reviews/BarberReviews"));
const BarberAgenda = lazy(() => import("./pages/agenda/BarberAgenda"));
const BarbersList = lazy(() => import("./pages/barbers/BarbersList"));
const UserProfile = lazy(() => import("./pages/profile/UserProfile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (nueva API)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">Cargando pantalla...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/register-barbershop" element={<RegisterBarbershopPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={
                <DashboardLayout>
                  <DashboardRouter />
                </DashboardLayout>
              } />
              
              {/* Protected Routes */}
              <Route path="/book" element={<DashboardLayout><BookAppointment /></DashboardLayout>} />
              <Route path="/appointments" element={<DashboardLayout><MyAppointments /></DashboardLayout>} />
              <Route path="/barbers" element={<DashboardLayout><BarbersList /></DashboardLayout>} />
              <Route path="/profile" element={<DashboardLayout><UserProfile /></DashboardLayout>} />
              <Route path="/schedule" element={<DashboardLayout><BarberAgenda /></DashboardLayout>} />
              <Route path="/services" element={<DashboardLayout><BarberServices /></DashboardLayout>} />
              <Route path="/clients" element={<DashboardLayout><BarberClients /></DashboardLayout>} />
              <Route path="/reviews" element={<DashboardLayout><BarberReviews /></DashboardLayout>} />
              <Route path="/all-appointments" element={<DashboardLayout><div>Todas las Citas</div></DashboardLayout>} />
              <Route path="/users" element={<DashboardLayout><div>Gestión de Usuarios</div></DashboardLayout>} />
              <Route path="/manage-barbers" element={<DashboardLayout><RequireAdmin><AdminManageBarbers /></RequireAdmin></DashboardLayout>} />
              <Route path="/analytics" element={<DashboardLayout><div>Estadísticas</div></DashboardLayout>} />
              <Route path="/billing" element={<DashboardLayout><div>Facturación</div></DashboardLayout>} />
              <Route path="/settings" element={<DashboardLayout><div>Configuración</div></DashboardLayout>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Component to route to correct dashboard based on user role
import { useAuth } from "./contexts/AuthContext";

const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/auth" replace />;
  
  switch (user.role) {
    case "client":
      return <ClientDashboard />;
    case "barber":
      return <BarberDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "owner":
      return <AdminDashboard />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default App;

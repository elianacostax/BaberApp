import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import AuthPage from "./pages/AuthPage";
import RegisterBarbershopPage from "./pages/RegisterBarbershopPage";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import BarberDashboard from "./pages/dashboard/BarberDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminManageBarbers from "./pages/dashboard/AdminManageBarbers";
import NotFound from "./pages/NotFound";
import MyAppointments from "./pages/appointments/MyAppointments";
import BookAppointment from "./pages/book/BookAppointment";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Index from "./pages/Index";
// New pages
import BarberServices from "./pages/services/BarberServices";
import BarberClients from "./pages/clients/BarberClients";
import BarberReviews from "./pages/reviews/BarberReviews";
import BarberAgenda from "./pages/agenda/BarberAgenda";
import BarbersList from "./pages/barbers/BarbersList";
import UserProfile from "./pages/profile/UserProfile";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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

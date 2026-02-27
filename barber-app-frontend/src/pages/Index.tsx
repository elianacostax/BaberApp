import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, Calendar, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="text-center max-w-4xl mx-auto animate-fade-in">
        {/* Logo and Brand */}
        <div className="mb-8">
          <div className="mx-auto mb-6 p-4 rounded-3xl bg-gradient-premium w-fit">
            <Scissors className="h-16 w-16 text-primary-foreground" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            BarberApp
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            La plataforma completa para gestionar tu barbería. 
            Agenda citas, gestiona barberos y haz crecer tu negocio.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card-premium p-6 text-center group hover:shadow-premium transition-all duration-300">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Gestión de Citas</h3>
            <p className="text-muted-foreground text-sm">
              Sistema completo para agendar y gestionar reservas
            </p>
          </div>
          
          <div className="card-premium p-6 text-center group hover:shadow-premium transition-all duration-300">
            <Users className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Multi-usuario</h3>
            <p className="text-muted-foreground text-sm">
              Para clientes, barberos y administradores
            </p>
          </div>
          
          <div className="card-premium p-6 text-center group hover:shadow-premium transition-all duration-300">
            <Star className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Experiencia Premium</h3>
            <p className="text-muted-foreground text-sm">
              Interfaz moderna y fácil de usar
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="btn-premium px-12 py-6 text-lg font-semibold"
            onClick={() => navigate("/auth")}
          >
            Comenzar Ahora
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Button 
              variant="link" 
              className="text-primary hover:text-primary-glow p-0 h-auto"
              onClick={() => navigate("/auth")}
            >
              Inicia sesión aquí
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

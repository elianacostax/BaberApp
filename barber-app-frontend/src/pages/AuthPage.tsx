import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "register" | "forgot-password";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, loading, resetPassword } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleForgotPassword = () => {
    setMode("forgot-password");
  };

  const handleSendReset = async () => {
    try {
      await resetPassword(email);
      toast({
        title: "Email enviado",
        description: "Si el email existe, recibirás instrucciones para resetear tu contraseña.",
      });
      setMode("login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al enviar el email de recuperación",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <div className="w-full max-w-md animate-fade-in">
        {mode === "login" && (
          <LoginForm
            onSwitchToRegister={() => setMode("register")}
            onForgotPassword={handleForgotPassword}
          />
        )}

        {mode === "register" && (
          <div className="space-y-4">
            <RegisterForm onSwitchToLogin={() => setMode("login")} />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/register-barbershop")}
            >
              Registrar una barbería
            </Button>
          </div>
        )}

        {mode === "forgot-password" && (
          <Card className="card-premium w-full max-w-md animate-scale-in">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Recuperar Contraseña
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Te enviaremos un link para resetear tu contraseña
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="reset-email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-premium pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendReset}
                className="btn-premium w-full h-12 text-base font-semibold"
                disabled={!email}
              >
                Enviar Email de Recuperación
              </Button>

              <Button
                variant="ghost"
                onClick={() => setMode("login")}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

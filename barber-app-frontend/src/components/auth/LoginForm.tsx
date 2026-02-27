import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Scissors, Mail, Lock, Loader2, Zap } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { gradients, utilityClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const description = (error as any)?.response?.data?.message
        || (error instanceof Error ? error.message : "Error al iniciar sesión");
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <EnhancedCard variant="glass" className="w-full max-w-md animate-scale-in">
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary to-primary-glow shadow-lg">
          <Scissors className="h-10 w-10 text-primary-foreground" />
        </div>
        <CardTitle className={cn("text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent")}>
          ¡Bienvenido de vuelta!
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Accede a tu cuenta de BarberApp
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold text-base">
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="tu@email.com"
                        className={cn(utilityClasses.inputPrimary, "pl-12 h-12 text-base")}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold text-base">
                    Contraseña
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        className={cn(utilityClasses.inputPrimary, "pl-12 pr-12 h-12 text-base")}
                      />
                      <EnhancedButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </EnhancedButton>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <EnhancedButton
                type="button"
                variant="link"
                onClick={onForgotPassword}
                className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
              >
                ¿Olvidaste tu contraseña?
              </EnhancedButton>
            </div>

            <EnhancedButton
              type="submit"
              variant="premium"
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={form.formState.isSubmitting}
              loading={form.formState.isSubmitting}
              loadingText="Iniciando sesión..."
              leftIcon={<Zap className="h-5 w-5" />}
            >
              Iniciar Sesión
            </EnhancedButton>
          </form>
        </Form>

        <div className="text-center pt-4 border-t">
          <span className="text-muted-foreground text-base">¿No tienes cuenta? </span>
          <EnhancedButton
            variant="link"
            onClick={onSwitchToRegister}
            className="text-primary hover:text-primary-glow p-0 h-auto font-semibold text-base"
          >
            Regístrate aquí
          </EnhancedButton>
        </div>
      </CardContent>
    </EnhancedCard>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Scissors, Mail, Lock, User, Phone, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradients, utilityClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data.email, data.password, {
        name: data.name,
        phone: data.phone,
      });
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const description = (error as any)?.response?.data?.message
        || (error instanceof Error ? error.message : "Error al crear la cuenta");
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
          ¡Únete a BarberApp!
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Crea tu cuenta y comienza tu experiencia
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold text-base">
                    Nombre Completo
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Tu nombre completo"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold text-base">
                    Teléfono
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="316 999 99 99"
                        className={cn(utilityClasses.inputPrimary, "pl-12 h-12 text-base")}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          placeholder="Contraseña"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold text-base">
                      Confirmar contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirmar"
                          className={cn(utilityClasses.inputPrimary, "pl-12 pr-12 h-12 text-base")}
                        />
                        <EnhancedButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
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
            </div>

            <EnhancedButton
              type="submit"
              variant="premium"
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={form.formState.isSubmitting}
              loading={form.formState.isSubmitting}
              loadingText="Creando cuenta..."
              leftIcon={<UserPlus className="h-5 w-5" />}
            >
              Crear Cuenta
            </EnhancedButton>
          </form>
        </Form>

        <div className="text-center pt-4 border-t">
          <span className="text-muted-foreground text-base">¿Ya tienes cuenta? </span>
          <EnhancedButton
            variant="link"
            onClick={onSwitchToLogin}
            className="text-primary hover:text-primary-glow p-0 h-auto font-semibold text-base"
          >
            Inicia sesión
          </EnhancedButton>
        </div>
      </CardContent>
    </EnhancedCard>
  );
}
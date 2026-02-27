import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedButton } from "@/components/ui/enhanced-button";

export default function RegisterBarbershopPage() {
  const navigate = useNavigate();
  const { registerBarbershop } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",
    barbershopName: "",
    location: "",
    address: "",
    phone: "",
    description: "",
    openHour: 9,
    closeHour: 18,
  });

  const onChange = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasLocation = Boolean(form.location?.trim());
    const hasAddress = Boolean(form.address?.trim());
    if (!hasLocation && !hasAddress) {
      toast({
        title: "Falta ubicación o dirección",
        description: "Debes completar al menos uno de los dos campos.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await registerBarbershop({
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
        ownerPhone: form.ownerPhone || undefined,
        barbershopName: form.barbershopName,
        location: form.location || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        description: form.description || undefined,
        openingHours: { openHour: Number(form.openHour), closeHour: Number(form.closeHour) },
      });
      toast({ title: "Barbería registrada", description: "Ya puedes gestionar tu panel." });
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const backendErrors = Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors.map((err: any) => err.message).filter(Boolean).join(", ")
        : null;
      toast({
        title: "Error al registrar barbería",
        description: backendErrors || error?.response?.data?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Registrar Barbería</CardTitle>
          <CardDescription>
            Crea tu barbería y el usuario propietario en un solo paso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del propietario</Label>
              <Input value={form.ownerName} onChange={(e) => onChange("ownerName", e.target.value)} />
            </div>
            <div>
              <Label>Email del propietario</Label>
              <Input type="email" value={form.ownerEmail} onChange={(e) => onChange("ownerEmail", e.target.value)} />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input type="password" value={form.ownerPassword} onChange={(e) => onChange("ownerPassword", e.target.value)} />
            </div>
            <div>
              <Label>Teléfono propietario</Label>
              <Input value={form.ownerPhone} onChange={(e) => onChange("ownerPhone", e.target.value)} />
            </div>
            <div>
              <Label>Nombre de barbería</Label>
              <Input value={form.barbershopName} onChange={(e) => onChange("barbershopName", e.target.value)} />
            </div>
            <div>
              <Label>Ubicación</Label>
              <Input value={form.location} onChange={(e) => onChange("location", e.target.value)} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => onChange("address", e.target.value)} />
            </div>
            <div>
              <Label>Teléfono barbería</Label>
              <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={(e) => onChange("description", e.target.value)} />
            </div>
            <div>
              <Label>Hora apertura</Label>
              <Input type="number" min={0} max={23} value={form.openHour} onChange={(e) => onChange("openHour", Number(e.target.value))} />
            </div>
            <div>
              <Label>Hora cierre</Label>
              <Input type="number" min={1} max={23} value={form.closeHour} onChange={(e) => onChange("closeHour", Number(e.target.value))} />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <EnhancedButton type="submit" variant="premium" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar barbería"}
              </EnhancedButton>
              <EnhancedButton type="button" variant="outline" onClick={() => navigate("/auth")}>
                Volver
              </EnhancedButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

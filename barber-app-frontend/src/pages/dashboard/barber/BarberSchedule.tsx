import { Clock, Calendar, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getId } from "@/lib/id";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function BarberSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string }>>({
    "0": { start: "", end: "" },
    "1": { start: "", end: "" },
    "2": { start: "", end: "" },
    "3": { start: "", end: "" },
    "4": { start: "", end: "" },
    "5": { start: "", end: "" },
    "6": { start: "", end: "" },
  });
  const [blockStart, setBlockStart] = useState<string>("");
  const [blockEnd, setBlockEnd] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load user profile with schedule
  const { data: profile } = useQuery({
    queryKey: ['myProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const r = await api.get(`/api/users/${user.id}/profile`);
      return r.data?.user as { 
        schedule?: Record<string, { start: string; end: string }>, 
        barbershop?: { openingHours?: { openHour: number; closeHour: number } } 
      } | null;
    },
    enabled: !!user?.id,
  });

  // Load availability blocks
  const { data: blocks } = useQuery({
    queryKey: ['availabilityBlocks', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/availability', { params: { barberId: user?.id } });
      return r.data as Array<{ id?: string; _id?: string; start: string; end: string; reason?: string }>;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile?.schedule) {
      const normalized: Record<string, { start: string; end: string }> = {
        "0": { start: "", end: "" },
        "1": { start: "", end: "" },
        "2": { start: "", end: "" },
        "3": { start: "", end: "" },
        "4": { start: "", end: "" },
        "5": { start: "", end: "" },
        "6": { start: "", end: "" },
      };
      for (const k of Object.keys(profile.schedule)) {
        const val = (profile.schedule as any)[k];
        if (val && typeof val.start === 'string' && typeof val.end === 'string') {
          normalized[k] = { start: val.start, end: val.end };
        }
      }
      setSchedule(normalized);
    }
  }, [profile]);

  const openingHours = profile?.barbershop?.openingHours;

  const isWithinOpeningHours = (hhmm: string | undefined, type: 'start' | 'end') => {
    if (!openingHours || !hhmm) return true;
    const [h, m] = hhmm.split(':').map(Number);
    if (type === 'start') return h >= openingHours.openHour;
    if (type === 'end') return h < openingHours.closeHour || (h === openingHours.closeHour && m === 0);
    return true;
  };

  const saveSchedule = useMutation({
    mutationFn: async () => {
      const payload = { schedule };
      await api.put('/api/users/me/schedule', payload);
    },
    onSuccess: () => toast({ title: 'Horario guardado' }),
    onError: (e: any) => toast({ 
      title: 'Error al guardar', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const createBlock = useMutation({
    mutationFn: async () => {
      await api.post('/api/availability', { 
        start: new Date(blockStart).toISOString(), 
        end: new Date(blockEnd).toISOString(), 
        reason: 'Bloqueo manual' 
      });
    },
    onSuccess: () => {
      setBlockStart("");
      setBlockEnd("");
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks', user?.id] });
      toast({ title: 'Bloqueo creado' });
    },
    onError: (e: any) => toast({ 
      title: 'Error al bloquear', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks', user?.id] });
      toast({ title: 'Bloqueo eliminado' });
    },
    onError: (e: any) => toast({ 
      title: 'Error al eliminar', 
      description: e?.response?.data?.message || 'Intenta nuevamente', 
      variant: 'destructive' 
    })
  });

  const days = [
    { k: "1", label: "Lunes" },
    { k: "2", label: "Martes" },
    { k: "3", label: "Miércoles" },
    { k: "4", label: "Jueves" },
    { k: "5", label: "Viernes" },
    { k: "6", label: "Sábado" },
    { k: "0", label: "Domingo" },
  ];

  const isScheduleValid = Object.entries(schedule).every(([_, val]) => 
    !val.start || !val.end || (val.start < val.end && isWithinOpeningHours(val.start, 'start') && isWithinOpeningHours(val.end, 'end'))
  );

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Mi Horario
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura tus horas de trabajo y bloqueos de disponibilidad
        </p>
      </div>

      {/* Schedule Configuration */}
      <EnhancedCard variant="premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horario de Trabajo
          </CardTitle>
          <CardDescription>
            Define tus horas de trabajo por día de la semana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((d) => (
            <div key={d.k} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-1">
                <Label className="text-sm sm:text-base font-medium">{d.label}</Label>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Hora de inicio</Label>
                <Input 
                  type="time" 
                  value={schedule[d.k].start} 
                  onChange={(e) => setSchedule((s) => ({ 
                    ...s, 
                    [d.k]: { ...s[d.k], start: e.target.value } 
                  }))} 
                  min={openingHours ? String(openingHours.openHour).padStart(2,'0')+':00' : undefined}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Hora de fin</Label>
                <Input 
                  type="time" 
                  value={schedule[d.k].end} 
                  onChange={(e) => setSchedule((s) => ({ 
                    ...s, 
                    [d.k]: { ...s[d.k], end: e.target.value } 
                  }))} 
                  max={openingHours ? String(openingHours.closeHour).padStart(2,'0')+':00' : undefined}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-1">
                {schedule[d.k].start && schedule[d.k].end && (
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {schedule[d.k].start} - {schedule[d.k].end}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {openingHours && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
              <AlertCircle className="h-4 w-4 text-info" />
              <span className="text-sm text-info">
                Horario de la barbería: {String(openingHours.openHour).padStart(2,'0')}:00 - {String(openingHours.closeHour).padStart(2,'0')}:00
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-border/50">
            <EnhancedButton 
              onClick={() => saveSchedule.mutate()} 
              disabled={saveSchedule.isPending || !isScheduleValid}
              variant="premium"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Horario
            </EnhancedButton>
          </div>
        </CardContent>
      </EnhancedCard>

      {/* Availability Blocks */}
      <EnhancedCard variant="premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Bloqueos de Disponibilidad
          </CardTitle>
          <CardDescription>
            Marca horarios específicos como no disponibles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-sm">Fecha y hora de inicio</Label>
              <Input 
                type="datetime-local" 
                value={blockStart} 
                onChange={(e) => setBlockStart(e.target.value)} 
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">Fecha y hora de fin</Label>
              <Input 
                type="datetime-local" 
                value={blockEnd} 
                onChange={(e) => setBlockEnd(e.target.value)} 
                className="mt-1 text-sm"
              />
            </div>
            <div className="pt-6">
              <EnhancedButton 
                onClick={() => createBlock.mutate()} 
                disabled={!blockStart || !blockEnd || createBlock.isPending}
                variant="outline"
                className="w-full sm:w-auto text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Crear Bloqueo</span>
                <span className="xs:hidden">Crear</span>
              </EnhancedButton>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-medium">Bloqueos activos</Label>
            <div className="space-y-2">
              {(blocks ?? []).map((block) => (
                <div key={getId(block)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/30">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium">
                      {new Date(block.start).toLocaleString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} — {new Date(block.end).toLocaleString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {block.reason && (
                      <div className="text-xs text-muted-foreground">{block.reason}</div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteBlock.mutate(getId(block))}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto text-xs"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Eliminar</span>
                    <span className="xs:hidden">Eliminar</span>
                  </Button>
                </div>
              ))}
              {(!blocks || blocks.length === 0) && (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tienes bloqueos programados</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </EnhancedCard>
    </div>
  );
}

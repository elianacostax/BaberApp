import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getId } from '@/lib/id';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Barbershop = { id?: string; _id?: string; name: string; openingHours?: { openHour: number; closeHour: number } };
type Barber = { id?: string; _id?: string; name: string; email: string };

export default function AdminManageBarbers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>('');

  // Create barber form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Schedule editor for selected barber
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string }>>({
    '0': { start: '', end: '' },
    '1': { start: '', end: '' },
    '2': { start: '', end: '' },
    '3': { start: '', end: '' },
    '4': { start: '', end: '' },
    '5': { start: '', end: '' },
    '6': { start: '', end: '' },
  });

  const { data: shops } = useQuery<Barbershop[]>({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const r = await api.get('/api/barbershops');
      return r.data as Barbershop[];
    },
  });

  const { data: barbers } = useQuery<Barber[]>({
    queryKey: ['barbers', selectedShop],
    queryFn: async () => {
      if (!selectedShop) return [] as Barber[];
      const r = await api.get('/api/users', { params: { role: 'barber', barbershop: selectedShop } });
      return r.data as Barber[];
    },
    enabled: !!selectedShop,
  });

  const createBarber = useMutation({
    mutationFn: async () => {
      await api.post('/api/admin/users', { name, email, password, role: 'barber', barbershop: selectedShop });
    },
    onSuccess: () => {
      setName(''); setEmail(''); setPassword('');
      queryClient.invalidateQueries({ queryKey: ['barbers', selectedShop] });
      toast({ title: 'Barbero creado' });
    },
    onError: (e: any) => toast({ title: 'Error al crear barbero', description: e?.response?.data?.message || 'Intenta nuevamente', variant: 'destructive' })
  });

  const openingHours = useMemo(() => {
    const s = (shops ?? []).find(sh => getId(sh) === selectedShop);
    return s?.openingHours;
  }, [shops, selectedShop]);

  const isWithinOpeningHours = (hhmm: string | undefined, type: 'start' | 'end') => {
    if (!openingHours || !hhmm) return true;
    const [h, m] = hhmm.split(':').map(Number);
    if (type === 'start') return h >= openingHours.openHour;
    if (type === 'end') return h < openingHours.closeHour || (h === openingHours.closeHour && m === 0);
    return true;
  };

  const loadBarberProfile = useQuery({
    queryKey: ['adminBarberProfile', selectedBarber],
    queryFn: async () => {
      if (!selectedBarber) return null;
      const r = await api.get(`/api/users/${selectedBarber}/profile`);
      return r.data?.user as { schedule?: Record<string, { start: string; end: string }> } | null;
    },
    enabled: !!selectedBarber,
  });

  useEffect(() => {
    const prof = loadBarberProfile.data;
    if (prof?.schedule) {
      const normalized: Record<string, { start: string; end: string }> = {
        '0': { start: '', end: '' },
        '1': { start: '', end: '' },
        '2': { start: '', end: '' },
        '3': { start: '', end: '' },
        '4': { start: '', end: '' },
        '5': { start: '', end: '' },
        '6': { start: '', end: '' },
      };
      for (const k of Object.keys(prof.schedule)) {
        const val = (prof.schedule as any)[k];
        if (val && typeof val.start === 'string' && typeof val.end === 'string') {
          normalized[k] = { start: val.start, end: val.end };
        }
      }
      setSchedule(normalized);
    }
  }, [loadBarberProfile.data]);

  const updateSchedule = useMutation({
    mutationFn: async () => {
      await api.put(`/api/admin/barbers/${selectedBarber}/schedule`, { schedule });
    },
    onSuccess: () => toast({ title: 'Horario actualizado' }),
    onError: (e: any) => toast({ title: 'Error al actualizar', description: e?.response?.data?.message || 'Intenta nuevamente', variant: 'destructive' })
  });

  const canSaveSchedule = selectedBarber && Object.entries(schedule).every(([_, val]) => !val.start || !val.end || (val.start < val.end && isWithinOpeningHours(val.start, 'start') && isWithinOpeningHours(val.end, 'end')));

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle>Crear Barbero</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Barbería</Label>
            <Select value={selectedShop} onValueChange={(v) => { setSelectedShop(v); setSelectedBarber(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Elige barbería" />
              </SelectTrigger>
              <SelectContent>
                {(shops ?? []).map(s => (
                  <SelectItem key={getId(s)} value={getId(s)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => createBarber.mutate()} disabled={!selectedShop || !name || !email || !password || createBarber.isPending}>Crear Barbero</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle>Editar Horario de Barbero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-1">
              <Label>Seleccionar barbero</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber} disabled={!selectedShop}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedShop ? 'Elige barbero' : 'Primero elige barbería'} />
                </SelectTrigger>
                <SelectContent>
                  {(barbers ?? []).map(b => (
                    <SelectItem key={getId(b)} value={getId(b)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {openingHours ? (
              <div className="sm:col-span-2 text-sm text-muted-foreground">
                Rango permitido: {String(openingHours.openHour).padStart(2,'0')}:00 - {String(openingHours.closeHour).padStart(2,'0')}:00
              </div>
            ) : null}
          </div>

          {[
            { k: '1', label: 'Lunes' },
            { k: '2', label: 'Martes' },
            { k: '3', label: 'Miércoles' },
            { k: '4', label: 'Jueves' },
            { k: '5', label: 'Viernes' },
            { k: '6', label: 'Sábado' },
            { k: '0', label: 'Domingo' },
          ].map(d => (
            <div key={d.k} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-1">
                <Label>{d.label}</Label>
              </div>
              <div>
                <Label className="text-sm">Inicio</Label>
                <Input type="time" value={schedule[d.k].start} onChange={(e) => setSchedule((s) => ({ ...s, [d.k]: { ...s[d.k], start: e.target.value } }))} min={openingHours ? String(openingHours.openHour).padStart(2,'0')+':00' : undefined} disabled={!selectedBarber} />
              </div>
              <div>
                <Label className="text-sm">Fin</Label>
                <Input type="time" value={schedule[d.k].end} onChange={(e) => setSchedule((s) => ({ ...s, [d.k]: { ...s[d.k], end: e.target.value } }))} max={openingHours ? String(openingHours.closeHour).padStart(2,'0')+':00' : undefined} disabled={!selectedBarber} />
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button onClick={() => updateSchedule.mutate()} disabled={!canSaveSchedule || updateSchedule.isPending}>Guardar horario</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

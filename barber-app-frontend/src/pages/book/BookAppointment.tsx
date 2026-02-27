import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Barbershop = { id?: string; _id?: string; name: string };
type Service = { id?: string; _id?: string; name: string; duration: number; price: number };
type Barber = { id?: string; _id?: string; name: string };
type Slot = { start: string; end: string };

export default function BookAppointment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [shopSearch, setShopSearch] = useState<string>('');
  const [barberSearch, setBarberSearch] = useState<string>('');
  const [onlyFavoriteShops, setOnlyFavoriteShops] = useState<boolean>(false);
  const [onlyFavoriteBarbers, setOnlyFavoriteBarbers] = useState<boolean>(false);

  const { data: shops } = useQuery<Barbershop[]>({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const r = await api.get('/api/barbershops');
      return r.data as Barbershop[];
    },
  });

  const { data: favorites } = useQuery<{ favoriteBarbers: string[]; favoriteBarbershops: string[] }>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const r = await api.get('/api/users/me/favorites');
      return r.data as { favoriteBarbers: string[]; favoriteBarbershops: string[] };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (payload: { type: 'barber' | 'barbershop'; id: string; favorite?: boolean }) => {
      const r = await api.post('/api/users/me/favorites', payload);
      return r.data as { favoriteBarbers: string[]; favoriteBarbershops: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ['services', selectedShop, selectedBarber],
    queryFn: async () => {
      if (!selectedShop) return [] as Service[];
      const params = new URLSearchParams({ barbershopId: selectedShop });
      if (selectedBarber) params.append('barberId', selectedBarber);
      
      const r = await api.get(`/api/services/available?${params}`);
      return r.data?.services ?? [];
    },
    enabled: !!selectedShop,
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

  // Disponibilidad de slots
  const { data: availability } = useQuery<{ availableSlots: Slot[] }>({
    queryKey: ['availability', selectedShop, selectedBarber, selectedService, date],
    queryFn: async () => {
      if (!selectedShop || !selectedBarber || !selectedService || !date) return { availableSlots: [] };
      const r = await api.get('/api/bookings/availability', {
        params: {
          barbershopId: selectedShop,
          barberId: selectedBarber,
          serviceId: selectedService,
          date,
        },
      });
      return r.data as { availableSlots: Slot[] };
    },
    enabled: !!selectedShop && !!selectedBarber && !!selectedService && !!date,
  });

  const slotOptions = useMemo(() => {
    const slots = availability?.availableSlots ?? [];
    return slots.map((s) => {
      const d = new Date(s.start);
      const hh = `${d.getHours()}`.padStart(2, '0');
      const mm = `${d.getMinutes()}`.padStart(2, '0');
      return { value: `${hh}:${mm}`, label: `${hh}:${mm}` };
    });
  }, [availability]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        barbershop: selectedShop,
        barber: selectedBarber,
        serviceId: selectedService,
        date,
        time,
      };
      const r = await api.post('/api/bookings', payload);
      return r.data;
    },
    onSuccess: () => {
      toast({ title: 'Reserva creada', description: 'Tu cita fue agendada correctamente.' });
      setSelectedService('');
      setSelectedBarber('');
      setDate('');
      setTime('');
    },
    onError: (error: any) => {
      const description = error?.response?.data?.message || 'No se pudo crear la reserva';
      toast({ title: 'Error', description, variant: 'destructive' });
    }
  });

  useEffect(() => {
    setSelectedService('');
  }, [selectedShop]);

  useEffect(() => {
    // Si se selecciona un slot, sincroniza el campo time (HH:mm)
    if (selectedSlot) {
      setTime(selectedSlot);
    }
  }, [selectedSlot]);

  const canSubmit = selectedShop && selectedService && selectedBarber && date && selectedSlot;

  const getId = (item: { id?: string; _id?: string }) => item.id ?? item._id ?? '';
  const favoriteShopIds = new Set(favorites?.favoriteBarbershops || []);
  const favoriteBarberIds = new Set(favorites?.favoriteBarbers || []);

  const shopOptions = (shops ?? [])
    .map((s) => ({ id: getId(s), name: s.name }))
    .filter((s) => s.id)
    .filter((s) => s.name.toLowerCase().includes(shopSearch.toLowerCase()))
    .filter((s) => (onlyFavoriteShops ? favoriteShopIds.has(s.id) : true))
    .sort((a, b) => Number(favoriteShopIds.has(b.id)) - Number(favoriteShopIds.has(a.id)));
  const serviceOptions = (services ?? []).map((s) => ({ id: getId(s), name: s.name })).filter((s) => s.id);
  const barberOptions = (barbers ?? [])
    .map((b) => ({ id: getId(b), name: b.name }))
    .filter((b) => b.id)
    .filter((b) => b.name.toLowerCase().includes(barberSearch.toLowerCase()))
    .filter((b) => (onlyFavoriteBarbers ? favoriteBarberIds.has(b.id) : true))
    .sort((a, b) => Number(favoriteBarberIds.has(b.id)) - Number(favoriteBarberIds.has(a.id)));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Agendar Cita</h2>
      <Card>
        <CardHeader>
          <CardTitle>Selecciona opciones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm mb-2">Barbería</label>
            <div className="flex items-center gap-2 mb-2">
              <Input placeholder="Buscar barbería..." value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} />
              <Button
                type="button"
                variant={onlyFavoriteShops ? "default" : "outline"}
                onClick={() => setOnlyFavoriteShops((v) => !v)}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Elige barbería" />
              </SelectTrigger>
              <SelectContent>
                {shopOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="inline-flex items-center gap-2">
                      {favoriteShopIds.has(s.id) && <Heart className="h-3 w-3 text-primary" />}
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedShop && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={() => toggleFavorite.mutate({ type: 'barbershop', id: selectedShop })}
              >
                <Heart className={`h-4 w-4 mr-2 ${favoriteShopIds.has(selectedShop) ? 'text-primary' : ''}`} />
                {favoriteShopIds.has(selectedShop) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              </Button>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2">Servicio</label>
            <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Elige servicio" />
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-2">Barbero</label>
            <div className="flex items-center gap-2 mb-2">
              <Input placeholder="Buscar barbero..." value={barberSearch} onChange={(e) => setBarberSearch(e.target.value)} />
              <Button
                type="button"
                variant={onlyFavoriteBarbers ? "default" : "outline"}
                onClick={() => setOnlyFavoriteBarbers((v) => !v)}
                disabled={!selectedShop}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
            <Select value={selectedBarber} onValueChange={setSelectedBarber} disabled={!selectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Elige barbero" />
              </SelectTrigger>
              <SelectContent>
                {barberOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="inline-flex items-center gap-2">
                      {favoriteBarberIds.has(b.id) && <Heart className="h-3 w-3 text-primary" />}
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBarber && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={() => toggleFavorite.mutate({ type: 'barber', id: selectedBarber })}
              >
                <Heart className={`h-4 w-4 mr-2 ${favoriteBarberIds.has(selectedBarber) ? 'text-primary' : ''}`} />
                {favoriteBarberIds.has(selectedBarber) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              </Button>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2">Fecha</label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Hora disponible</label>
            <Select value={selectedSlot} onValueChange={setSelectedSlot} disabled={!date || (slotOptions.length === 0)}>
              <SelectTrigger>
                <SelectValue placeholder={date ? (slotOptions.length ? 'Elige hora' : 'Sin horarios disponibles') : 'Selecciona fecha primero'} />
              </SelectTrigger>
              <SelectContent>
                {slotOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getId } from '@/lib/id';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Scissors,
  Search,
  Sparkles,
  Star,
  Store,
  UserRound,
} from 'lucide-react';

type Barbershop = {
  id?: string;
  _id?: string;
  name: string;
  location?: string;
  address?: string;
  openingHours?: {
    openHour?: number;
    closeHour?: number;
  };
};
type Service = { id?: string; _id?: string; name: string; duration: number; price: number };
type Barber = {
  id?: string;
  _id?: string;
  name: string;
  barbershop?: { id?: string; _id?: string };
  services?: Array<{ id?: string; _id?: string; isActive?: boolean }>;
  customPrices?: Record<string, { price?: number; isActive?: boolean }>;
  customServices?: Array<{ id?: string; _id?: string; isActive?: boolean }>;
};
type Slot = { start: string; end: string };
type RecommendedBarber = {
  barber: { id?: string; _id?: string; name: string };
  firstAvailableSlot?: Slot | null;
  matchingSlot?: Slot | null;
  availableSlotsCount?: number;
};

type BookAppointmentProps = {
  initialBarbershopId?: string;
  initialBarberId?: string;
  onBooked?: () => void;
};

const STEPS = [
  { key: 1, label: 'Barbería', icon: Store },
  { key: 2, label: 'Servicio', icon: Scissors },
  { key: 3, label: 'Barbero', icon: UserRound },
  { key: 4, label: 'Fecha', icon: CalendarDays },
  { key: 5, label: 'Hora', icon: Clock3 },
] as const;

export default function BookAppointment({
  initialBarbershopId = '',
  initialBarberId = '',
  onBooked,
}: BookAppointmentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<number>(1);
  const [selectedShop, setSelectedShop] = useState<string>(initialBarbershopId);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>(initialBarberId);
  const [barberSelectionMode, setBarberSelectionMode] = useState<'manual' | 'auto'>(initialBarberId ? 'manual' : 'auto');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [shopSearch, setShopSearch] = useState<string>('');
  const [barberSearch, setBarberSearch] = useState<string>('');
  const [onlyFavoriteShops, setOnlyFavoriteShops] = useState<boolean>(false);
  const [onlyFavoriteBarbers, setOnlyFavoriteBarbers] = useState<boolean>(false);

  const minDate = new Date().toISOString().split('T')[0];

  const { data: shops, isLoading: shopsLoading, isError: shopsError } = useQuery<Barbershop[]>({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const r = await api.get('/api/barbershops');
      const payload = r.data;
      const list = Array.isArray(payload) ? payload : (payload?.barbershops ?? payload?.data ?? []);
      return list as Barbershop[];
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

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['services', selectedShop],
    queryFn: async () => {
      if (!selectedShop) return [];
      const params = new URLSearchParams({ barbershopId: selectedShop });
      const r = await api.get(`/api/services/available?${params}`);
      return r.data?.services ?? [];
    },
    enabled: !!selectedShop,
  });

  const { data: barbers, isLoading: barbersLoading, isError: barbersError } = useQuery<Barber[]>({
    queryKey: ['barbers', selectedShop],
    queryFn: async () => {
      if (!selectedShop) return [];
      try {
        const r = await api.get('/api/barbers');
        const payload = r.data;
        const list = Array.isArray(payload) ? payload : (payload?.barbers ?? payload?.data ?? []);
        return (list as Barber[]).filter((barber) => {
          const shopId = barber?.barbershop?.id ?? barber?.barbershop?._id;
          return shopId === selectedShop;
        });
      } catch {
        const r = await api.get('/api/users', {
          params: { role: 'barber', barbershop: selectedShop, isActive: true },
        });
        const payload = r.data;
        const list = Array.isArray(payload) ? payload : (payload?.users ?? payload?.data ?? []);
        return list as Barber[];
      }
    },
    enabled: !!selectedShop,
  });

  const { data: recommendation, isLoading: recommendationLoading } = useQuery<{
    recommendedBarber?: RecommendedBarber | null;
  }>({
    queryKey: ['bookingRecommendation', selectedShop, selectedService, date],
    queryFn: async () => {
      if (!selectedShop || !selectedService || !date) return { recommendedBarber: null };
      const r = await api.get('/api/bookings/recommendation', {
        params: {
          barbershopId: selectedShop,
          serviceId: selectedService,
          date,
        },
      });
      return r.data as { recommendedBarber?: RecommendedBarber | null };
    },
    enabled: barberSelectionMode === 'auto' && !!selectedShop && !!selectedService && !!date,
  });

  const effectiveBarberId =
    barberSelectionMode === 'auto'
      ? getId(recommendation?.recommendedBarber?.barber || null)
      : selectedBarber;

  const { data: availability, isLoading: availabilityLoading } = useQuery<{ availableSlots: Slot[] }>({
    queryKey: ['availability', selectedShop, effectiveBarberId, selectedService, date, barberSelectionMode],
    queryFn: async () => {
      if (!selectedShop || !effectiveBarberId || !selectedService || !date) return { availableSlots: [] };
      const r = await api.get('/api/bookings/availability', {
        params: {
          barbershopId: selectedShop,
          barberId: effectiveBarberId,
          serviceId: selectedService,
          date,
        },
      });
      return r.data as { availableSlots: Slot[] };
    },
    enabled: !!selectedShop && !!effectiveBarberId && !!selectedService && !!date,
  });

  const slotOptions = useMemo(() => {
    const slots = availability?.availableSlots ?? [];
    return slots.map((slot) => {
      const d = new Date(slot.start);
      const hh = `${d.getHours()}`.padStart(2, '0');
      const mm = `${d.getMinutes()}`.padStart(2, '0');
      const hour = Number(hh);
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
      return {
        value: `${hh}:${mm}`,
        label: `${normalizedHour}:${mm} ${meridiem}`,
      };
    });
  }, [availability]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        barbershop: selectedShop,
        barber: barberSelectionMode === 'manual' ? selectedBarber : undefined,
        serviceId: selectedService,
        date,
        time,
      };
      const r = await api.post('/api/bookings', payload);
      return r.data;
    },
    onSuccess: () => {
      toast({ title: 'Reserva creada', description: 'Tu cita fue agendada correctamente.' });
      setStep(1);
      setSelectedShop('');
      setSelectedService('');
      setSelectedBarber('');
      setBarberSelectionMode('auto');
      setDate('');
      setTime('');
      setSelectedSlot('');
      queryClient.invalidateQueries({ queryKey: ['clientBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['barbers'] });
      onBooked?.();
    },
    onError: (error: any) => {
      const description = error?.response?.data?.message || 'No se pudo crear la reserva';
      toast({ title: 'Error', description, variant: 'destructive' });
    },
  });

  useEffect(() => {
    setSelectedBarber('');
    setBarberSelectionMode(initialBarberId ? 'manual' : 'auto');
    setSelectedService('');
    setDate('');
    setSelectedSlot('');
    setTime('');
    if (step > 1) setStep(1);
  }, [selectedShop]);

  useEffect(() => {
    setDate('');
    setSelectedSlot('');
    setTime('');
    if (step > 3) setStep(3);
  }, [selectedBarber, barberSelectionMode]);

  useEffect(() => {
    if (selectedService && !(services ?? []).some((service) => getId(service) === selectedService)) {
      setSelectedService('');
      if (step > 2) setStep(2);
    }
  }, [services, selectedService, step]);

  useEffect(() => {
    if (initialBarbershopId) setSelectedShop(initialBarbershopId);
    if (initialBarberId) setSelectedBarber(initialBarberId);
    if (initialBarberId) setBarberSelectionMode('manual');
  }, [initialBarbershopId, initialBarberId]);

  useEffect(() => {
    setSelectedSlot('');
    setTime('');
    if (step > 4) setStep(4);
  }, [selectedService, date]);

  useEffect(() => {
    if (selectedSlot) setTime(selectedSlot);
  }, [selectedSlot]);

  const favoriteShopIds = new Set(favorites?.favoriteBarbershops || []);
  const favoriteBarberIds = new Set(favorites?.favoriteBarbers || []);

  const shopOptions = (shops ?? [])
    .map((shop) => ({ ...shop, id: getId(shop) }))
    .filter((shop) => shop.id)
    .filter((shop) => shop.name.toLowerCase().includes(shopSearch.toLowerCase()))
    .filter((shop) => (onlyFavoriteShops ? favoriteShopIds.has(shop.id) : true))
    .sort((a, b) => Number(favoriteShopIds.has(b.id)) - Number(favoriteShopIds.has(a.id)));

  const serviceOptions = (services ?? [])
    .map((service) => ({ ...service, id: getId(service) }))
    .filter((service) => service.id);

  const barberOptions = (barbers ?? [])
    .map((barber) => ({ ...barber, id: getId(barber) }))
    .filter((barber) => barber.id)
    .filter((barber) => barber.name.toLowerCase().includes(barberSearch.toLowerCase()))
    .filter((barber) => {
      if (!selectedService) return true;
      const hasServicesList = Array.isArray(barber.services) && barber.services.length > 0;
      if (hasServicesList) {
        return barber.services.some((service) => {
          const serviceId = service.id ?? service._id;
          return serviceId === selectedService && service.isActive !== false;
        });
      }

      const enabledByPrice = !!barber.customPrices?.[selectedService]?.isActive;
      const enabledByCustomService = (barber.customServices ?? []).some((service) => {
        const serviceId = service.id ?? service._id;
        return serviceId === selectedService && service.isActive;
      });
      if (!barber.customPrices && !barber.customServices) return true;
      return enabledByPrice || enabledByCustomService;
    })
    .filter((barber) => (onlyFavoriteBarbers ? favoriteBarberIds.has(barber.id) : true))
    .sort((a, b) => Number(favoriteBarberIds.has(b.id)) - Number(favoriteBarberIds.has(a.id)));

  const selectedShopData = shopOptions.find((shop) => shop.id === selectedShop);
  const selectedServiceData = serviceOptions.find((service) => service.id === selectedService);
  const selectedBarberData = barberOptions.find((barber) => barber.id === selectedBarber);
  const recommendedBarberData = recommendation?.recommendedBarber?.barber;
  const displayBarberName =
    barberSelectionMode === 'auto'
      ? recommendedBarberData?.name || 'Asignación automática'
      : selectedBarberData?.name;

  const canGoNext =
    (step === 1 && !!selectedShop) ||
    (step === 2 && !!selectedService) ||
    (step === 3 && (barberSelectionMode === 'auto' || !!selectedBarber)) ||
    (step === 4 && !!date);

  const canSubmit =
    !!selectedShop &&
    !!selectedService &&
    !!effectiveBarberId &&
    !!date &&
    !!selectedSlot &&
    !!time &&
    (barberSelectionMode === 'manual' || !!recommendedBarberData);

  const goNext = () => {
    if (step < 5 && canGoNext) {
      setStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const goToPreviousStep = (targetStep: number) => {
    if (targetStep < step) {
      setStep(targetStep);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-white sm:text-2xl">¿Dónde quieres tu cita?</h3>
          <p className="text-sm text-zinc-400">Elige tu barbería favorita o busca una cerca de ti.</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Buscar barbería..."
                className="h-12 rounded-xl border-zinc-700 bg-zinc-800/60 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="button"
              variant={onlyFavoriteShops ? 'default' : 'outline'}
              className="h-12 rounded-xl border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700"
              onClick={() => setOnlyFavoriteShops((value) => !value)}
            >
              <Heart className={`h-4 w-4 ${onlyFavoriteShops ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {shopsLoading && <p className="text-sm text-zinc-400">Cargando barberías...</p>}
          {shopsError && <p className="text-sm text-red-400">Error cargando barberías.</p>}
          {!shopsLoading && shopOptions.length === 0 && <p className="text-sm text-zinc-500">No hay barberías para ese filtro.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            {shopOptions.map((shop) => {
              const isSelected = selectedShop === shop.id;
              const openHour = Number(shop.openingHours?.openHour ?? 9);
              const closeHour = Number(shop.openingHours?.closeHour ?? 20);
              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => setSelectedShop(shop.id)}
                  className={`rounded-xl border px-4 py-3.5 text-left transition ${
                    isSelected
                      ? 'border-amber-500 bg-gradient-to-r from-amber-500/15 to-amber-500/5'
                      : 'border-zinc-700 bg-zinc-800/55 hover:border-zinc-500'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-medium text-zinc-100">{shop.name}</p>
                    <Heart
                      className={`h-4 w-4 cursor-pointer text-zinc-500 hover:text-amber-400 ${
                        favoriteShopIds.has(shop.id) ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite.mutate({ type: 'barbershop', id: shop.id });
                      }}
                    />
                  </div>
                  <p className="flex items-center gap-1 text-xs text-zinc-400">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    4.8 · Abierto hasta {closeHour}:00
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white sm:text-2xl">¿Qué servicio necesitas?</h3>
          <p className="text-sm text-zinc-400">Selecciona el servicio que deseas para tu visita.</p>
          {servicesLoading && <p className="text-sm text-zinc-400">Cargando servicios...</p>}
          {!servicesLoading && serviceOptions.length === 0 && (
            <p className="text-sm text-zinc-500">No hay servicios disponibles para la barbería seleccionada.</p>
          )}
          <div className="space-y-2.5">
            {serviceOptions.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service.id)}
                  className={`flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-gradient-to-r from-amber-500/15 to-amber-500/5'
                      : 'border-zinc-700 bg-zinc-800/55 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-medium text-zinc-100">{service.name}</span>
                  <span className="text-xs text-zinc-400 sm:text-right">~{service.duration} min · ${Number(service.price).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-white sm:text-2xl">Elige tu barbero</h3>
          <p className="text-sm text-zinc-400">Puedes escoger uno manualmente o dejar que el sistema te asigne el mejor disponible.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setBarberSelectionMode('auto');
                setSelectedBarber('');
              }}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                barberSelectionMode === 'auto'
                  ? 'border-amber-500 bg-gradient-to-r from-amber-500/15 to-amber-500/5'
                  : 'border-zinc-700 bg-zinc-800/55 hover:border-zinc-500'
              }`}
            >
              <p className="font-medium text-zinc-100">Asignación automática</p>
              <p className="mt-1 text-xs text-zinc-400">El sistema te sugerirá el barbero con mejor disponibilidad cuando elijas la fecha.</p>
            </button>
            <button
              type="button"
              onClick={() => setBarberSelectionMode('manual')}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                barberSelectionMode === 'manual'
                  ? 'border-amber-500 bg-gradient-to-r from-amber-500/15 to-amber-500/5'
                  : 'border-zinc-700 bg-zinc-800/55 hover:border-zinc-500'
              }`}
            >
              <p className="font-medium text-zinc-100">Elegir manualmente</p>
              <p className="mt-1 text-xs text-zinc-400">Selecciona tu barbero favorito antes de ver la agenda.</p>
            </button>
          </div>

          {barberSelectionMode === 'manual' && (
            <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={barberSearch}
                onChange={(e) => setBarberSearch(e.target.value)}
                placeholder="Buscar barbero..."
                className="h-12 rounded-xl border-zinc-700 bg-zinc-800/60 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="button"
              variant={onlyFavoriteBarbers ? 'default' : 'outline'}
              className="h-12 rounded-xl border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700"
              onClick={() => setOnlyFavoriteBarbers((value) => !value)}
            >
              <Heart className={`h-4 w-4 ${onlyFavoriteBarbers ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {barbersLoading && <p className="text-sm text-zinc-400">Cargando barberos...</p>}
          {barbersError && <p className="text-sm text-red-400">Error cargando barberos.</p>}
          {!barbersLoading && barberOptions.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-400">
              {selectedService
                ? 'No encontramos barberos con ese servicio activo en esta barbería. Prueba con otro servicio o revisa la configuración del negocio.'
                : 'No hay barberos disponibles para ese filtro.'}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {barberOptions.map((barber) => {
              const isSelected = selectedBarber === barber.id;
              const initial = barber.name?.trim()?.[0]?.toUpperCase() || 'B';
              return (
                <button
                  key={barber.id}
                  type="button"
                  onClick={() => setSelectedBarber(barber.id)}
                  className={`rounded-xl border px-4 py-3.5 text-left transition ${
                    isSelected
                      ? 'border-amber-500 bg-gradient-to-r from-amber-500/15 to-amber-500/5'
                      : 'border-zinc-700 bg-zinc-800/55 hover:border-zinc-500'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-700 text-sm font-bold text-zinc-200">{initial}</div>
                    <Heart
                      className={`h-4 w-4 cursor-pointer text-zinc-500 hover:text-amber-400 ${
                        favoriteBarberIds.has(barber.id) ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite.mutate({ type: 'barber', id: barber.id });
                      }}
                    />
                  </div>
                  <p className="font-medium text-zinc-100">{barber.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    4.9
                  </p>
                </button>
              );
            })}
          </div>
            </>
          )}
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white sm:text-2xl">¿Cuándo te gustaría ir?</h3>
          <p className="text-sm text-zinc-400">Selecciona la fecha para tu cita.</p>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl border-zinc-700 bg-zinc-800/60 pl-10 text-zinc-100 focus-visible:ring-amber-500"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white sm:text-2xl">Hora disponible</h3>
        <p className="text-sm text-zinc-400">Escoge el horario que más te convenga.</p>
        {barberSelectionMode === 'auto' && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {recommendationLoading ? (
              <span>Buscando el mejor barbero disponible...</span>
            ) : recommendedBarberData ? (
              <div className="space-y-1">
                <p className="font-medium">Recomendado: {recommendedBarberData.name}</p>
                <p className="text-xs text-amber-200">
                  El sistema eligió al barbero con mejor disponibilidad para esta fecha.
                </p>
              </div>
            ) : (
              <span>No encontramos un barbero disponible para esa fecha y servicio.</span>
            )}
          </div>
        )}
        {availabilityLoading && <p className="text-sm text-zinc-400">Cargando horarios...</p>}
        {!availabilityLoading && slotOptions.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-400">
            No hay horarios disponibles para esa fecha. Prueba con otro día o cambia de barbero.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {slotOptions.map((slot) => {
            const isSelected = selectedSlot === slot.value;
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => setSelectedSlot(slot.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400 text-zinc-900 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]'
                    : 'border-zinc-700 bg-zinc-800/55 text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.08),_rgba(14,14,18,0.94)_35%,_rgba(6,8,14,1)_100%)] p-3 sm:p-6 md:p-8">
      <div className="mx-auto max-w-[780px] space-y-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Reserva rápida
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">Agenda tu cita</h2>
          <p className="mt-2 text-sm text-zinc-400">Sigue los pasos y confirma tu reserva sin complicaciones</p>
        </div>

        <div className="rounded-2xl border border-zinc-700/90 bg-zinc-900/78 p-3 shadow-[0_16px_60px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="-mx-1 mb-6 overflow-x-auto px-1 pb-2">
            <div className="inline-flex min-w-full items-center gap-1 sm:flex sm:justify-between sm:gap-3">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isCompleted = step > item.key;
                const isCurrent = step === item.key;
                const canGoBackWithIcon = item.key < step;
                const iconClass = isCompleted
                  ? 'bg-emerald-500 text-zinc-900 border-emerald-500'
                  : isCurrent
                    ? 'bg-zinc-900 text-amber-400 border-amber-500'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700';

                return (
                  <div key={item.key} className="flex min-w-[72px] items-center sm:flex-1 sm:min-w-0">
                    <div className="flex w-full flex-col items-center">
                      <button
                        type="button"
                        onClick={() => goToPreviousStep(item.key)}
                        disabled={!canGoBackWithIcon}
                        className={`grid h-9 w-9 place-items-center rounded-full border transition sm:h-10 sm:w-10 ${
                          canGoBackWithIcon ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                        } ${iconClass}`}
                        aria-label={`Paso ${item.label}`}
                        title={canGoBackWithIcon ? `Volver a ${item.label}` : item.label}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <span
                        className={`mt-2 text-[10px] sm:text-xs ${
                          isCompleted ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-zinc-500'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`mx-1 h-[2px] flex-1 ${step > item.key ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-h-[280px] sm:min-h-[305px]">{renderStepContent()}</div>

          <div className="mt-6 border-t border-zinc-800 pt-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={step === 1}
                className="w-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:text-zinc-600 sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="h-11 w-full rounded-xl bg-amber-500 px-7 font-semibold text-zinc-950 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400 sm:w-auto"
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => mutation.mutate()}
                  disabled={!canSubmit || mutation.isPending}
                  className="h-11 w-full rounded-xl bg-amber-500 px-7 font-semibold text-zinc-950 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400 sm:w-auto"
                >
                  {mutation.isPending ? 'Confirmando...' : 'Confirmar Reserva'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {selectedShopData?.name && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
              {selectedShopData.name}
            </span>
          )}
          {selectedServiceData?.name && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
              {selectedServiceData.name}
            </span>
          )}
          {displayBarberName && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
              {displayBarberName}
            </span>
          )}
          {date && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">{date}</span>
          )}
          {selectedSlot && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">{selectedSlot}</span>
          )}
        </div>
      </div>
    </section>
  );
}

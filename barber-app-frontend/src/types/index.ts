export type UserRole = 'client' | 'barber' | 'admin' | 'owner';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  schedule: any;
  photo: string;
  bio: string;
  services: any;
  barbershop_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in minutes
  category: 'haircut' | 'beard' | 'styling' | 'treatment' | 'other';
  source: 'barbershop' | 'custom';
  hasCustomPrice?: boolean;
}

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  phone?: string;
  owner_id: string;
  services: Service[];
  opening_hours: {
    openHour: number;
    closeHour: number;
  };
  is_active: boolean;
  description?: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  barbershop_id: string;
  barber_id: string;
  user_id: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  booking_date: string;
  booking_time: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AvailabilityBlock {
  id: string;
  barber_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  barber_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
}

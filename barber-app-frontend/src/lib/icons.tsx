import { 
  Scissors, 
  Clock, 
  DollarSign, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Heart, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Check,
  X,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Zap,
  Shield,
  Award,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Gift,
  Bell,
  MessageSquare,
  Camera,
  Image,
  FileText,
  BookOpen,
  Home,
  Menu,
  LogOut,
  Lock,
  Unlock,
  Key,
  UserCheck,
  UserX,
  UserPlus,
  Building2,
  Store,
  Map,
  Navigation,
  Compass,
  Globe,
  Wifi,
  Battery,
  Signal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Headphones,
  Speaker,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Wrench,
  Hammer,
  Cog,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Power,
  PowerOff,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Snowflake,
  Umbrella,
  Rainbow,
  Zap as Lightning,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon
} from "lucide-react";

// Iconos específicos para servicios de barbería
export const ServiceIcons = {
  haircut: Scissors,
  beard: User,
  styling: Zap,
  treatment: Heart,
  other: Settings,
};

// Iconos para estados
export const StatusIcons = {
  active: Check,
  inactive: X,
  pending: Clock,
  expired: Clock,
  completed: Check,
  cancelled: X,
  confirmed: Check,
};

// Iconos para categorías de usuario
export const UserIcons = {
  client: User,
  barber: Scissors,
  admin: Shield,
};

// Iconos para navegación
export const NavigationIcons = {
  home: Home,
  menu: Menu,
  back: ChevronLeft,
  forward: ChevronRight,
  up: ChevronUp,
  down: ChevronDown,
};

// Iconos para acciones
export const ActionIcons = {
  add: Plus,
  edit: Edit,
  delete: Trash2,
  view: Eye,
  hide: EyeOff,
  copy: Copy,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  search: Search,
  filter: Filter,
  more: MoreHorizontal,
};

// Iconos para estadísticas
export const StatsIcons = {
  revenue: DollarSign,
  appointments: Calendar,
  clients: Users,
  rating: Star,
  growth: TrendingUp,
  chart: BarChart3,
  pie: PieChart,
  activity: Activity,
  target: Target,
};

// Iconos para comunicación
export const CommunicationIcons = {
  message: MessageSquare,
  notification: Bell,
  email: Mail,
  phone: Phone,
  camera: Camera,
  image: Image,
};

// Iconos para configuración
export const ConfigIcons = {
  settings: Settings,
  security: Shield,
  privacy: Lock,
  account: User,
  preferences: Sliders,
  tools: Wrench,
};

// Función helper para obtener icono por categoría
export const getServiceIcon = (category: string) => {
  return ServiceIcons[category as keyof typeof ServiceIcons] || ServiceIcons.other;
};

// Función helper para obtener icono por estado
export const getStatusIcon = (status: string) => {
  return StatusIcons[status as keyof typeof StatusIcons] || StatusIcons.pending;
};

// Función helper para obtener icono por rol
export const getUserIcon = (role: string) => {
  return UserIcons[role as keyof typeof UserIcons] || UserIcons.client;
};

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Camera,
  Car,
  ChartColumn,
  ChartPie,
  Check,
  ChevronDown,
  CircleUser,
  CircleCheck,
  Clapperboard,
  Download,
  Eye,
  FileText,
  House,
  Landmark,
  Lightbulb,
  List,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  SendHorizontal,
  ShoppingBag,
  Sparkles,
  Star,
  Square,
  Store,
  Trash2,
  TrendingUp,
  Upload,
  TriangleAlert,
  Trophy,
  Utensils,
  Wallet,
  WandSparkles,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import type { ReactNode } from 'react';

/*
 * expenseAI icon set, backed by lucide-react. Components import these names (never lucide
 * directly), so the set stays consistent and can be swapped in one place. Each icon gets the
 * theme defaults: thin 1.5px stroke, w-5 h-5, and aria-hidden (pass aria-label and
 * aria-hidden={false} when an icon stands alone). Color comes from the current text color.
 */

export type IconProps = LucideProps;
export type Icon = (props: IconProps) => ReactNode;

function themed(Lucide: LucideIcon, name: string): Icon {
  function IconComponent({ className = 'w-5 h-5', ...props }: IconProps) {
    return <Lucide className={className} strokeWidth={1.5} aria-hidden {...props} />;
  }
  IconComponent.displayName = `${name}Icon`;
  return IconComponent;
}

// Categories
export const UtensilsIcon = themed(Utensils, 'Utensils');
export const CarIcon = themed(Car, 'Car');
export const FilmIcon = themed(Clapperboard, 'Film');
export const BagIcon = themed(ShoppingBag, 'Bag');
export const ReceiptIcon = themed(ReceiptText, 'Receipt');
export const BoxIcon = themed(Package, 'Box');

// Navigation & screens
export const DashboardIcon = themed(ChartColumn, 'Dashboard');
export const HomeIcon = themed(House, 'Home');
export const ListIcon = themed(List, 'List');
export const PlusIcon = themed(Plus, 'Plus');
export const StoreIcon = themed(Store, 'Store');
export const PieIcon = themed(ChartPie, 'Pie');
export const ChatIcon = themed(MessageSquare, 'Chat');
export const DownloadIcon = themed(Download, 'Download');
export const ArrowLeftIcon = themed(ArrowLeft, 'ArrowLeft');
export const LogOutIcon = themed(LogOut, 'LogOut');
export const BankIcon = themed(Landmark, 'Bank');
export const UserIcon = themed(CircleUser, 'User');
export const UploadIcon = themed(Upload, 'Upload');
export const NewsIcon = themed(Newspaper, 'News');
export const StarIcon = themed(Star, 'Star');

// Stats
export const WalletIcon = themed(Wallet, 'Wallet');
export const CalendarIcon = themed(Calendar, 'Calendar');
export const TrendIcon = themed(TrendingUp, 'Trend');
export const UpIcon = themed(ArrowUpRight, 'Up');
export const DownIcon = themed(ArrowDownRight, 'Down');
export const TrophyIcon = themed(Trophy, 'Trophy');
export const FileIcon = themed(FileText, 'File');

// Actions & status
export const SparkleIcon = themed(Sparkles, 'Sparkle');
export const CameraIcon = themed(Camera, 'Camera');
export const WandIcon = themed(WandSparkles, 'Wand');
export const SearchIcon = themed(Search, 'Search');
export const CheckIcon = themed(Check, 'Check');
export const CheckCircleIcon = themed(CircleCheck, 'CheckCircle');
export const EyeIcon = themed(Eye, 'Eye');
export const BulbIcon = themed(Lightbulb, 'Bulb');
export const AlertIcon = themed(TriangleAlert, 'Alert');
export const CloseIcon = themed(X, 'Close');
export const EditIcon = themed(Pencil, 'Edit');
export const TrashIcon = themed(Trash2, 'Trash');
export const StopIcon = themed(Square, 'Stop');
export const SendIcon = themed(SendHorizontal, 'Send');
export const ChevronIcon = themed(ChevronDown, 'Chevron');

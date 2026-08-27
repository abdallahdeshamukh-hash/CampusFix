import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: Platform.OS !== 'web',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type UserRole = 'student' | 'admin';

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
};

export type ComplaintStatus = 'reported' | 'in_progress' | 'resolved';

export type ComplaintCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Furniture'
  | 'Cleanliness'
  | 'WiFi'
  | 'Other';

export type Complaint = {
  id: string;
  user_id: string;
  title: string;
  category: ComplaintCategory;
  description: string | null;
  location: string;
  image_url: string | null;
  image_path: string | null;
  status: ComplaintStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORIES: ComplaintCategory[] = [
  'Electrical',
  'Plumbing',
  'Furniture',
  'Cleanliness',
  'WiFi',
  'Other',
];

export const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  reported: {
    label: 'Reported',
    color: '#dc2626',
    bgColor: '#fef2f2',
    dotColor: '#ef4444',
  },
  in_progress: {
    label: 'In Progress',
    color: '#d97706',
    bgColor: '#fffbeb',
    dotColor: '#f59e0b',
  },
  resolved: {
    label: 'Resolved',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    dotColor: '#22c55e',
  },
};

import { BillCategory } from '@/types';
import { Utensils, Car, Ticket, Hotel, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const CATEGORY_CONFIG: Record<BillCategory, { label: string; icon: LucideIcon; color: string; bgColor: string }> = {
  food: {
    label: '餐饮',
    icon: Utensils,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
  },
  transport: {
    label: '交通',
    icon: Car,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  ticket: {
    label: '门票',
    icon: Ticket,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
  },
  hotel: {
    label: '住宿',
    icon: Hotel,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100',
  },
  other: {
    label: '其他',
    icon: MoreHorizontal,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
};

export const CATEGORY_CHART_COLORS: Record<BillCategory, string> = {
  food: '#F97316',
  transport: '#3B82F6',
  ticket: '#A855F7',
  hotel: '#10B981',
  other: '#6B7280',
};

export const MEMBER_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#6366F1',
  '#84CC16',
];

export const SPLIT_TYPE_CONFIG = {
  equal: { label: '均分', description: '所有参与人平摊' },
  ratio: { label: '按比例', description: '按各自比例分摊' },
  fixed: { label: '固定金额', description: '每人固定金额' },
} as const;

export const STORAGE_KEY = 'trip-aa-tracker-data-v1';

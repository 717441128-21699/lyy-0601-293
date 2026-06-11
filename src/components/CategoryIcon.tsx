import { BillCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/constants';

interface CategoryIconProps {
  category: BillCategory;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-5 h-5 p-1',
  md: 'w-9 h-9 p-2',
  lg: 'w-12 h-12 p-3',
};

export default function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <div
      className={`${sizeMap[size]} ${config.bgColor} rounded-xl flex items-center justify-center shrink-0`}
    >
      <Icon className={`w-full h-full ${config.color}`} />
    </div>
  );
}

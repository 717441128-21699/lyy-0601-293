interface MemberAvatarProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export default function MemberAvatar({ name, color, size = 'md' }: MemberAvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );
}

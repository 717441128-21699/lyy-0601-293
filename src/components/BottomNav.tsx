import { NavLink } from 'react-router-dom';
import { Map, Receipt, Users, Wallet, ArrowLeftRight, PieChart, Settings } from 'lucide-react';

const navItems = [
  { to: '/trips', label: '行程', icon: Map },
  { to: '/bills', label: '账单', icon: Receipt },
  { to: '/members', label: '成员', icon: Users },
  { to: '/budget', label: '预算', icon: Wallet },
  { to: '/settlement', label: '结算', icon: ArrowLeftRight },
  { to: '/statistics', label: '统计', icon: PieChart },
  { to: '/export', label: '导出', icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] mb-0.5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : ''
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={`text-[10px] ${isActive ? 'font-medium' : ''}`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

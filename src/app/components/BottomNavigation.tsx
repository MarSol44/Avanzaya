import { LayoutDashboard, CalendarCheck, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'boards' | 'today' | 'profile';
  onTabChange: (tab: 'boards' | 'today' | 'profile') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'boards' as const, icon: LayoutDashboard, label: 'Tableros' },
    { id: 'today' as const, icon: CalendarCheck, label: 'Hoy' },
    { id: 'profile' as const, icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              />
              <span className={`text-xs transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

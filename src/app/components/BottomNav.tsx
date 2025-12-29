import { Target, Eye, TrendingUp, Settings } from 'lucide-react';

interface BottomNavProps {
  activeView: 'goals' | 'vision' | 'progress' | 'settings';
  onViewChange: (view: 'goals' | 'vision' | 'progress' | 'settings') => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const navItems = [
    { id: 'goals' as const, icon: Target, label: 'Metas' },
    { id: 'vision' as const, icon: Eye, label: 'Visión' },
    { id: 'progress' as const, icon: TrendingUp, label: 'Progreso' },
    { id: 'settings' as const, icon: Settings, label: 'Config' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import { User, ChevronRight, Settings, Bell, CircleHelp, LogOut } from 'lucide-react';

interface ProfileScreenProps {
  userName: string;
  userEmail: string;
}

export function ProfileScreen({ userName, userEmail }: ProfileScreenProps) {
  const menuItems = [
    { icon: Settings, label: 'Configuración', onClick: () => {} },
    { icon: Bell, label: 'Notificaciones', onClick: () => {} },
    { icon: CircleHelp, label: 'Ayuda y soporte', onClick: () => {} },
    { icon: LogOut, label: 'Cerrar sesión', onClick: () => {}, danger: true },
  ];

  return (
    <div className="pb-20">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-gray-900">Perfil</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 mb-1">{userName}</h2>
              <p className="text-gray-500">{userEmail}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${item.danger ? 'text-red-600' : 'text-gray-600'}`} />
                  <span className={item.danger ? 'text-red-600' : 'text-gray-900'}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400">Versión 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
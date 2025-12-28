import { useState } from 'react';
import { User, Lock, Bell, Moon, Sun, Globe, Cloud, LogOut, Camera } from 'lucide-react';

interface SettingsViewProps {
  userName: string;
  userPhoto?: string;
  onUpdateProfile: (name: string, photo?: string) => void;
  onLogout: () => void;
}

export function SettingsView({ userName, userPhoto, onUpdateProfile, onLogout }: SettingsViewProps) {
  const [name, setName] = useState(userName);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('es');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = () => {
    onUpdateProfile(name, userPhoto);
    alert('Perfil actualizado correctamente');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    // Simulate password change
    alert('Contraseña actualizada correctamente');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Profile section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-900 mb-6">Perfil</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl">
              {userPhoto ? (
                <img src={userPhoto} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-2">Nombre de usuario</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Guardar cambios
        </button>
      </div>

      {/* Security section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-600" />
            <h3 className="text-gray-900">Seguridad</h3>
          </div>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {showPasswordChange ? 'Cancelar' : 'Cambiar contraseña'}
          </button>
        </div>

        {showPasswordChange && (
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleChangePassword}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Actualizar contraseña
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="text-gray-900">Notificaciones</h3>
              <p className="text-sm text-gray-500">Recibir recordatorios de tareas y metas</p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              notifications ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                notifications ? 'translate-x-7' : ''
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-gray-600" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600" />
            )}
            <div>
              <h3 className="text-gray-900">Modo oscuro</h3>
              <p className="text-sm text-gray-500">Apariencia de la aplicación</p>
            </div>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                isDarkMode ? 'translate-x-7' : ''
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-900">Idioma</h3>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="fr">Français</option>
        </select>
      </div>

      {/* Sync */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="text-gray-900">Sincronización</h3>
            <p className="text-sm text-gray-500">Respalda tu información en la nube</p>
          </div>
        </div>
        <div className="space-y-2">
          <button className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors">
            <img
              src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
              alt="Google"
              className="w-6 h-6"
            />
            <span className="text-gray-700">Vincular con Google Drive</span>
          </button>
          <button className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors">
            <Cloud className="w-6 h-6 text-blue-600" />
            <span className="text-gray-700">Vincular con iCloud</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <button
          onClick={onLogout}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

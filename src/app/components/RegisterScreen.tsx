import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface RegisterScreenProps {
  onBack: () => void;
  onRegister: (name: string, email: string, password: string) => void;
}

export function RegisterScreen({ onBack, onRegister }: RegisterScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 2 fields
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Lunes');

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (!acceptTerms) {
      alert('Debes aceptar los términos y condiciones');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(name, email, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Back button */}
        <button
          onClick={step === 1 ? onBack : () => setStep(1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-gray-900 text-3xl mb-2">
            {step === 1 ? 'Crear cuenta' : 'Completa tu perfil'}
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Paso 1 de 2' : 'Paso 2 de 2 (Opcional)'}
          </p>
        </div>

        {/* Step 1: Create Account */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
            {/* Name */}
            <div>
              <label className="block text-gray-700 mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 mb-2">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Mínimo 8 caracteres</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-700 mb-2">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  required
                />
                <span className="text-gray-700 text-sm">
                  Acepto los{' '}
                  <button type="button" className="text-blue-600 hover:underline">
                    Términos y Condiciones
                  </button>{' '}
                  y la{' '}
                  <button type="button" className="text-blue-600 hover:underline">
                    Política de Privacidad
                  </button>
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear cuenta
            </button>
          </form>
        )}

        {/* Step 2: Profile Setup */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
            {/* Photo upload (placeholder) */}
            <div>
              <label className="block text-gray-700 mb-2">Foto de perfil (opcional)</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl">
                  {name.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Subir foto
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-gray-700 mb-2">Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-gray-700 mb-2">Zona horaria</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/New_York">Nueva York (GMT-5)</option>
                <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                <option value="Europe/Madrid">Madrid (GMT+1)</option>
                <option value="America/Bogota">Bogotá (GMT-5)</option>
                <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
              </select>
            </div>

            {/* First day of week */}
            <div>
              <label className="block text-gray-700 mb-2">Primer día de la semana</label>
              <select
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lunes">Lunes</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStep2Submit}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Omitir
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

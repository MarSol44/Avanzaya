import { Target } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onLogin, onRegister, onSkip }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Target className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-white text-4xl mb-3">Mi Visión</h1>
          <p className="text-blue-100 text-lg">
            Construye la vida que siempre imaginaste
          </p>
        </div>

        {/* Motivational text */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <p className="text-white text-center text-lg leading-relaxed">
            "El futuro pertenece a quienes creen en la belleza de sus sueños"
          </p>
          <p className="text-blue-100 text-center text-sm mt-2">
            — Eleanor Roosevelt
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onLogin}
            className="w-full px-6 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          >
            Iniciar sesión
          </button>
          
          <button
            onClick={onRegister}
            className="w-full px-6 py-4 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-all shadow-lg border-2 border-white/30"
          >
            Registrarse
          </button>
          
          <button
            onClick={onSkip}
            className="w-full px-6 py-4 bg-transparent text-white rounded-xl hover:bg-white/10 transition-all border-2 border-white/30"
          >
            Entrar sin cuenta
          </button>
        </div>

        {/* Footer */}
        <p className="text-blue-100 text-center text-sm mt-8">
          Tus datos están seguros y protegidos
        </p>
      </div>
    </div>
  );
}

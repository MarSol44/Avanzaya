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
            className="w-full px-6 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border-2 border-white/30 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Iniciar con Google
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
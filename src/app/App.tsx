import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { GoalsView } from './components/GoalsView';
import { ShortTermGoal } from './components/ShortTermGoals';
import { LongTermGoal } from './components/LongTermGoals';
import { VisionBoard, VisionCard } from './components/VisionBoard';
import { VisionStatement, Vision } from './components/VisionStatement';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { RealityCheck } from './components/RealityCheck';
import { RealityCheckSummary } from './components/RealityCheckSummary';
import { RealityCheckHistory, RealityCheckEntry } from './components/RealityCheckHistory';
import { FutureMe } from './components/FutureMe';
import { ComparisonView } from './components/ComparisonView';
import { Eye, LayoutGrid } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

interface AreaData {
  id: string;
  satisfaction?: number;
  friendsSatisfaction?: number;
  familySatisfaction?: number;
  romanticSatisfaction?: number;
  financialComfort?: 'bad' | 'neutral' | 'good';
  physicalHealth?: number;
  mentalHealth?: number;
  adjectives?: string[];
  reflections: { [key: string]: string };
}

interface FutureGoal {
  areaId: string;
  goal: string;
  why: string;
}

type AuthScreen = 'welcome' | 'login' | 'register';
type OnboardingStep = 'reality-check' | 'reality-summary' | 'future-me' | 'comparison' | null;

export default function App() {
  // Authentication & Onboarding
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);
  const [realityCheckData, setRealityCheckData] = useState<{ [key: string]: AreaData } | null>(null);
  const [realityCheckHistory, setRealityCheckHistory] = useState<RealityCheckEntry[]>([]);
  const [showRealityHistory, setShowRealityHistory] = useState(false);
  const [futureGoals, setFutureGoals] = useState<FutureGoal[]>([]);

  const [activeView, setActiveView] = useState<'goals' | 'vision' | 'progress' | 'settings'>('goals');
  const [visionSubView, setVisionSubView] = useState<'board' | 'statement'>('board');

  // User profile
  const [userName, setUserName] = useState('Usuario');
  const [userEmail, setUserEmail] = useState('usuario@ejemplo.com');
  const [userPhoto, setUserPhoto] = useState<string | undefined>(undefined);

  // Day routine habits
  const [dayHabits, setDayHabits] = useState<Habit[]>([
    { id: '1', name: 'Ejercicio matutino', completed: false },
    { id: '2', name: 'Meditación', completed: true },
    { id: '3', name: 'Leer 30 minutos', completed: false },
    { id: '4', name: 'Revisar metas del día', completed: true },
  ]);

  // Night routine habits
  const [nightHabits, setNightHabits] = useState<Habit[]>([
    { id: '5', name: 'Reflexión del día', completed: false },
    { id: '6', name: 'Planificar mañana', completed: false },
    { id: '7', name: 'Desconectar dispositivos', completed: false },
    { id: '8', name: 'Lectura antes de dormir', completed: false },
  ]);

  // Short-term goals
  const [shortTermGoals, setShortTermGoals] = useState<ShortTermGoal[]>([
    {
      id: 'st1',
      completed: false,
      name: 'Completar curso de React',
      deadline: new Date(2025, 2, 15),
      priority: 'Alta',
      description: 'Finalizar el curso avanzado de React en Udemy',
      motivation: 'Mejorar mis habilidades de desarrollo frontend',
      reward: 'Nuevo proyecto freelance',
      category: 'Carrera o Estudios',
      steps: [
        {
          id: 'step1',
          completed: true,
          name: 'Módulos 1-5',
          description: 'Completar los primeros 5 módulos del curso',
          expectedDate: new Date(2025, 1, 1),
        },
        {
          id: 'step2',
          completed: false,
          name: 'Proyecto práctico',
          description: 'Desarrollar el proyecto final del curso',
          expectedDate: new Date(2025, 1, 28),
        },
      ],
    },
    {
      id: 'st2',
      completed: false,
      name: 'Ahorrar $5,000',
      deadline: new Date(2025, 5, 30),
      priority: 'Media',
      category: 'Finanzas',
      motivation: 'Crear un fondo de emergencia',
      steps: [],
    },
    {
      id: 'st3',
      completed: true,
      name: 'Correr 5K',
      deadline: new Date(2025, 0, 20),
      priority: 'Baja',
      category: 'Salud Física',
      motivation: 'Mejorar mi condición física',
      steps: [],
    },
  ]);

  // Long-term goals
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([
    {
      id: 'lt1',
      completed: false,
      name: 'Convertirme en Senior Developer',
      deadline: new Date(2027, 11, 31),
      category: 'Carrera o Estudios',
      motivation: 'Alcanzar un nivel experto en desarrollo de software y liderar proyectos importantes',
      steps: [
        {
          id: 'ltstep1',
          completed: false,
          description: 'Obtener certificación de AWS',
          expectedDate: new Date(2025, 6, 30),
        },
        {
          id: 'ltstep2',
          completed: false,
          description: 'Liderar proyecto importante en la empresa',
          expectedDate: new Date(2026, 5, 30),
        },
        {
          id: 'ltstep3',
          completed: false,
          description: 'Mentorar a 3 desarrolladores junior',
          expectedDate: new Date(2027, 2, 30),
        },
      ],
    },
    {
      id: 'lt2',
      completed: false,
      name: 'Comprar una casa',
      deadline: new Date(2028, 11, 31),
      category: 'Finanzas',
      motivation: 'Tener un patrimonio propio y estabilidad para mi familia',
      steps: [
        {
          id: 'ltstep4',
          completed: false,
          description: 'Ahorrar para el enganche (20%)',
          expectedDate: new Date(2026, 11, 31),
        },
        {
          id: 'ltstep5',
          completed: false,
          description: 'Mejorar crédito a 750+',
          expectedDate: new Date(2027, 5, 30),
        },
      ],
    },
  ]);

  // Vision board
  const [visionCards, setVisionCards] = useState<VisionCard[]>([
    {
      id: '1',
      type: 'quote',
      content: 'Sé la mejor versión de ti mismo',
      position: { x: 10, y: 10 },
    },
    {
      id: '2',
      type: 'quote',
      content: 'El éxito es la suma de pequeños esfuerzos',
      position: { x: 50, y: 30 },
    },
  ]);

  // Vision statements
  const [visions, setVisions] = useState<Vision[]>([
    {
      id: 'v1',
      text: 'En 5 años, quiero ser una persona más saludable, disciplinada y enfocada en mi carrera. Habré alcanzado un puesto senior, tendré mi propia casa, y mantendré un balance perfecto entre trabajo y vida personal.',
      createdAt: new Date(),
    },
  ]);

  // Consecutive days tracker
  const [consecutiveDays, setConsecutiveDays] = useState(7);

  // Auth handlers
  const handleLogin = (email: string, password: string, rememberMe: boolean) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    // Skip onboarding for login
  };

  const handleRegister = (name: string, email: string, password: string) => {
    setUserName(name);
    setUserEmail(email);
    setIsLoggedIn(true);
    // Start onboarding for new users
    setOnboardingStep('reality-check');
  };

  const handleSkipAuth = () => {
    setIsLoggedIn(true);
    // Skip onboarding for guest users
  };

  const handleRealityCheckComplete = (data: { [key: string]: AreaData }) => {
    setRealityCheckData(data);
    
    // Save to history
    const newEntry: RealityCheckEntry = {
      id: `rc${Date.now()}`,
      date: new Date(),
      data: data,
    };
    setRealityCheckHistory([...realityCheckHistory, newEntry]);
    
    setOnboardingStep('reality-summary');
  };

  const handleRealitySummaryComplete = () => {
    setOnboardingStep('future-me');
  };

  const handleFutureMeComplete = (goals: FutureGoal[]) => {
    setFutureGoals(goals);
    
    // Add goals to vision statements
    const visionText = goals
      .map((g) => `${g.goal}${g.why ? ` - ${g.why}` : ''}`)
      .join('\n\n');
    
    if (visionText) {
      addVision(visionText);
    }
    
    setOnboardingStep('comparison');
  };

  const handleComparisonComplete = () => {
    setOnboardingStep(null);
  };

  const handleCloseOnboarding = () => {
    setOnboardingStep(null);
  };

  // Habit handlers
  const toggleDayHabit = (id: string) => {
    setDayHabits(habits =>
      habits.map(h => (h.id === id ? { ...h, completed: !h.completed } : h))
    );
  };

  const toggleNightHabit = (id: string) => {
    setNightHabits(habits =>
      habits.map(h => (h.id === id ? { ...h, completed: !h.completed } : h))
    );
  };

  const updateDayHabits = (updatedHabits: Habit[]) => {
    setDayHabits(updatedHabits);
  };

  const updateNightHabits = (updatedHabits: Habit[]) => {
    setNightHabits(updatedHabits);
  };

  // Goal handlers
  const toggleShortTermGoal = (id: string) => {
    setShortTermGoals(goals =>
      goals.map(g => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const updateShortTermGoal = (updatedGoal: ShortTermGoal) => {
    setShortTermGoals(goals =>
      goals.map(g => (g.id === updatedGoal.id ? updatedGoal : g))
    );
  };

  const addShortTermGoal = () => {
    const newGoal: ShortTermGoal = {
      id: `st${Date.now()}`,
      completed: false,
      name: 'Nueva meta',
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      priority: 'Media',
      steps: [],
    };
    setShortTermGoals([...shortTermGoals, newGoal]);
  };

  const toggleLongTermGoal = (id: string) => {
    setLongTermGoals(goals =>
      goals.map(g => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const updateLongTermGoal = (updatedGoal: LongTermGoal) => {
    setLongTermGoals(goals =>
      goals.map(g => (g.id === updatedGoal.id ? updatedGoal : g))
    );
  };

  const addLongTermGoal = () => {
    const newGoal: LongTermGoal = {
      id: `lt${Date.now()}`,
      completed: false,
      name: 'Nueva meta a largo plazo',
      deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
      steps: [],
    };
    setLongTermGoals([...longTermGoals, newGoal]);
  };

  // Vision handlers
  const addVisionCard = (card: Omit<VisionCard, 'id'>) => {
    setVisionCards([...visionCards, { ...card, id: `card-${Date.now()}` }]);
  };

  const removeVisionCard = (id: string) => {
    setVisionCards(visionCards.filter(c => c.id !== id));
  };

  const updateVisionCard = (id: string, updates: Partial<VisionCard>) => {
    setVisionCards(visionCards.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addVision = (text: string, title?: string) => {
    setVisions([...visions, { id: `v${Date.now()}`, title, text, createdAt: new Date() }]);
  };

  const updateVision = (id: string, text: string, title?: string) => {
    setVisions(visions.map(v => (v.id === id ? { ...v, title, text } : v)));
  };

  const deleteVision = (id: string) => {
    setVisions(visions.filter(v => v.id !== id));
  };

  const handleUpdateProfile = (name: string, email?: string, photo?: string) => {
    setUserName(name);
    if (email) setUserEmail(email);
    setUserPhoto(photo);
  };

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      setIsLoggedIn(false);
      setAuthScreen('welcome');
      setOnboardingStep(null);
    }
  };

  // Render authentication screens
  if (!isLoggedIn) {
    if (authScreen === 'welcome') {
      return (
        <WelcomeScreen
          onLogin={() => setAuthScreen('login')}
          onRegister={() => setAuthScreen('register')}
          onSkip={handleSkipAuth}
        />
      );
    }

    if (authScreen === 'login') {
      return (
        <LoginScreen
          onBack={() => setAuthScreen('welcome')}
          onLogin={handleLogin}
        />
      );
    }

    if (authScreen === 'register') {
      return (
        <RegisterScreen
          onBack={() => setAuthScreen('welcome')}
          onRegister={handleRegister}
        />
      );
    }
  }

  // Render onboarding screens
  if (onboardingStep === 'reality-check') {
    return (
      <RealityCheck
        onComplete={handleRealityCheckComplete}
        onClose={handleCloseOnboarding}
      />
    );
  }

  if (onboardingStep === 'reality-summary' && realityCheckData) {
    return (
      <RealityCheckSummary
        data={realityCheckData}
        onContinue={handleRealitySummaryComplete}
      />
    );
  }

  if (onboardingStep === 'future-me') {
    return (
      <FutureMe
        onComplete={handleFutureMeComplete}
        onClose={handleCloseOnboarding}
      />
    );
  }

  if (onboardingStep === 'comparison' && realityCheckData) {
    return (
      <ComparisonView
        realityCheckData={realityCheckData}
        futureGoals={futureGoals}
        onComplete={handleComparisonComplete}
      />
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-6">
        {activeView === 'goals' && (
          <GoalsView
            dayHabits={dayHabits}
            nightHabits={nightHabits}
            shortTermGoals={shortTermGoals}
            longTermGoals={longTermGoals}
            onToggleDayHabit={toggleDayHabit}
            onToggleNightHabit={toggleNightHabit}
            onUpdateDayHabits={updateDayHabits}
            onUpdateNightHabits={updateNightHabits}
            onAddShortTermGoal={addShortTermGoal}
            onToggleShortTermGoal={toggleShortTermGoal}
            onUpdateShortTermGoal={updateShortTermGoal}
            onAddLongTermGoal={addLongTermGoal}
            onToggleLongTermGoal={toggleLongTermGoal}
            onUpdateLongTermGoal={updateLongTermGoal}
          />
        )}

        {activeView === 'vision' && (
          <div className="space-y-6">
            <h1 className="text-2xl text-gray-900 mb-6">Mi Visión</h1>
            
            <div className="flex justify-center">
              <div className="inline-flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => setVisionSubView('board')}
                  className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    visionSubView === 'board'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Tablero
                </button>
                <button
                  onClick={() => setVisionSubView('statement')}
                  className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    visionSubView === 'statement'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Visión 5 años
                </button>
              </div>
            </div>

            {visionSubView === 'board' ? (
              <VisionBoard
                cards={visionCards}
                onAddCard={addVisionCard}
                onRemoveCard={removeVisionCard}
                onUpdateCard={updateVisionCard}
              />
            ) : (
              <VisionStatement
                visions={visions}
                onAddVision={addVision}
                onUpdateVision={updateVision}
                onDeleteVision={deleteVision}
              />
            )}
          </div>
        )}

        {activeView === 'progress' && (
          <div>
            <h1 className="text-2xl text-gray-900 mb-6">Mi Progreso</h1>
            <ProgressView
              shortTermGoals={shortTermGoals}
              longTermGoals={longTermGoals}
              consecutiveDays={consecutiveDays}
              onNavigateToGoals={() => setActiveView('goals')}
              onShowHistory={() => setShowRealityHistory(true)}
            />
          </div>
        )}

        {activeView === 'settings' && (
          <div>
            <h1 className="text-2xl text-gray-900 mb-6">Configuración</h1>
            <SettingsView
              userName={userName}
              userEmail={userEmail}
              userPhoto={userPhoto}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          </div>
        )}
      </div>

      <BottomNav activeView={activeView} onViewChange={setActiveView} />

      {/* Reality Check History Modal */}
      {showRealityHistory && (
        <RealityCheckHistory
          entries={realityCheckHistory}
          onClose={() => setShowRealityHistory(false)}
        />
      )}
    </div>
  );
}
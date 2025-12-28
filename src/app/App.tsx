import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { CalendarView } from './components/CalendarView';
import { RoutineTracker } from './components/RoutineTracker';
import { ShortTermGoals, ShortTermGoal } from './components/ShortTermGoals';
import { LongTermGoals, LongTermGoal } from './components/LongTermGoals';
import { VisionBoard, VisionCard } from './components/VisionBoard';
import { VisionStatement, Vision } from './components/VisionStatement';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { Eye, LayoutGrid } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

export default function App() {
  const [activeView, setActiveView] = useState<'calendar' | 'goals' | 'vision' | 'progress' | 'settings'>('calendar');
  const [visionSubView, setVisionSubView] = useState<'board' | 'statement'>('board');

  // User profile
  const [userName, setUserName] = useState('Usuario');
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

  const addVisionCard = (card: Omit<VisionCard, 'id'>) => {
    setVisionCards([...visionCards, { ...card, id: `card-${Date.now()}` }]);
  };

  const removeVisionCard = (id: string) => {
    setVisionCards(visionCards.filter(c => c.id !== id));
  };

  const updateVisionCard = (id: string, updates: Partial<VisionCard>) => {
    setVisionCards(visionCards.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addVision = (text: string) => {
    setVisions([...visions, { id: `v${Date.now()}`, text, createdAt: new Date() }]);
  };

  const updateVision = (id: string, text: string) => {
    setVisions(visions.map(v => (v.id === id ? { ...v, text } : v)));
  };

  const deleteVision = (id: string) => {
    setVisions(visions.filter(v => v.id !== id));
  };

  const handleUpdateProfile = (name: string, photo?: string) => {
    setUserName(name);
    setUserPhoto(photo);
  };

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      alert('Sesión cerrada');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-6">
        {activeView === 'calendar' && (
          <div className="space-y-6">
            <h1 className="text-2xl text-gray-900">Calendario y Rutinas</h1>
            
            {/* Calendar */}
            <CalendarView />

            {/* Routines */}
            <div className="grid md:grid-cols-2 gap-6">
              <RoutineTracker
                type="day"
                habits={dayHabits}
                onToggleHabit={toggleDayHabit}
                onUpdateHabits={updateDayHabits}
              />
              <RoutineTracker
                type="night"
                habits={nightHabits}
                onToggleHabit={toggleNightHabit}
                onUpdateHabits={updateNightHabits}
              />
            </div>
          </div>
        )}

        {activeView === 'goals' && (
          <div className="space-y-6">
            <h1 className="text-2xl text-gray-900">Mis Metas</h1>
            
            {/* Short-term goals */}
            <ShortTermGoals
              goals={shortTermGoals}
              onAddGoal={addShortTermGoal}
              onToggleGoal={toggleShortTermGoal}
              onUpdateGoal={updateShortTermGoal}
            />

            {/* Long-term goals */}
            <LongTermGoals
              goals={longTermGoals}
              onAddGoal={addLongTermGoal}
              onToggleGoal={toggleLongTermGoal}
              onUpdateGoal={updateLongTermGoal}
            />
          </div>
        )}

        {activeView === 'vision' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl text-gray-900">Mi Visión</h1>
              
              <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setVisionSubView('board')}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
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
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
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
            />
          </div>
        )}

        {activeView === 'settings' && (
          <div>
            <h1 className="text-2xl text-gray-900 mb-6">Configuración</h1>
            <SettingsView
              userName={userName}
              userPhoto={userPhoto}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          </div>
        )}
      </div>

      <BottomNav activeView={activeView} onViewChange={setActiveView} />
    </div>
  );
}
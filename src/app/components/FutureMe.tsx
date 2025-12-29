import { useState } from 'react';
import { X, GraduationCap, Users, Heart, DollarSign, Activity, Sparkles, Palette } from 'lucide-react';

interface FutureGoal {
  areaId: string;
  goal: string;
  why: string;
}

interface FutureMeProps {
  onComplete: (goals: FutureGoal[]) => void;
  onClose: () => void;
}

const AREAS = [
  {
    id: 'career',
    title: 'Carrera o Estudios',
    icon: GraduationCap,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'personal',
    title: 'Relaciones Personales',
    icon: Users,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'romantic',
    title: 'Relaciones Románticas',
    icon: Heart,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'finance',
    title: 'Finanzas',
    icon: DollarSign,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'health',
    title: 'Salud Física y Mental',
    icon: Activity,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'personality',
    title: 'Personalidad y Crecimiento Personal',
    icon: Sparkles,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
  {
    id: 'hobbies',
    title: 'Otros (Ocio, Hobbies, Intereses)',
    icon: Palette,
    subtitle: 'Cómo quiero sentirme y vivir aquí',
  },
];

export function FutureMe({ onComplete, onClose }: FutureMeProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [goals, setGoals] = useState<FutureGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState('');
  const [currentWhy, setCurrentWhy] = useState('');

  const handleSaveGoal = () => {
    if (selectedArea && currentGoal) {
      setGoals([
        ...goals.filter((g) => g.areaId !== selectedArea),
        {
          areaId: selectedArea,
          goal: currentGoal,
          why: currentWhy,
        },
      ]);
      setSelectedArea(null);
      setCurrentGoal('');
      setCurrentWhy('');
    }
  };

  const handleComplete = () => {
    onComplete(goals);
  };

  const getGoalForArea = (areaId: string) => {
    return goals.find((g) => g.areaId === areaId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 text-3xl mb-2">✨ Mi Yo del Futuro</h1>
            <p className="text-gray-600">
              Elige las áreas que quieres construir para la vida que imaginaste
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Area Cards */}
        {!selectedArea && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {AREAS.map((area) => {
                const Icon = area.icon;
                const hasGoal = getGoalForArea(area.id);
                
                return (
                  <button
                    key={area.id}
                    onClick={() => {
                      setSelectedArea(area.id);
                      const existingGoal = getGoalForArea(area.id);
                      if (existingGoal) {
                        setCurrentGoal(existingGoal.goal);
                        setCurrentWhy(existingGoal.why);
                      }
                    }}
                    className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 ${
                      hasGoal ? 'border-blue-600 bg-blue-50' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${hasGoal ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-gray-900 mb-1">{area.title}</h3>
                        <p className="text-gray-500 text-sm">{area.subtitle}</p>
                        {hasGoal && (
                          <p className="text-blue-600 text-sm mt-2">✓ Meta definida</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continue Button */}
            {goals.length > 0 && (
              <button
                onClick={handleComplete}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-lg"
              >
                Continuar ({goals.length} {goals.length === 1 ? 'área completada' : 'áreas completadas'})
              </button>
            )}
          </>
        )}

        {/* Goal Form */}
        {selectedArea && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              {(() => {
                const area = AREAS.find((a) => a.id === selectedArea);
                const Icon = area?.icon || Sparkles;
                return (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-gray-900 text-xl">{area?.title}</h2>
                  </div>
                );
              })()}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGoal();
              }}
              className="space-y-6"
            >
              {/* Goal */}
              <div>
                <label className="block text-gray-700 mb-2">
                  En 5 años quiero...
                </label>
                <textarea
                  value={currentGoal}
                  onChange={(e) => setCurrentGoal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe tu meta en esta área..."
                  required
                />
              </div>

              {/* Why */}
              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Por qué esto importa? (Opcional)
                </label>
                <textarea
                  value={currentWhy}
                  onChange={(e) => setCurrentWhy(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Explica por qué es importante para ti..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArea(null);
                    setCurrentGoal('');
                    setCurrentWhy('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

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

interface RealityCheckProps {
  onComplete: (data: { [key: string]: AreaData }) => void;
  onClose: () => void;
}

const AREAS = [
  {
    id: 'career',
    title: 'Carrera o Estudios',
    icon: '🎓',
    motivationalText: 'Mira dónde estás hoy',
  },
  {
    id: 'personal',
    title: 'Relaciones Personales',
    icon: '🤝',
    motivationalText: 'Registra tu estado actual y tus metas',
  },
  {
    id: 'romantic',
    title: 'Relaciones Románticas',
    icon: '❤️',
    motivationalText: 'Conoce en qué momento de tu vida estás',
  },
  {
    id: 'finance',
    title: 'Finanzas',
    icon: '💰',
    motivationalText: 'Mira dónde estás hoy',
  },
  {
    id: 'health',
    title: 'Salud Física y Mental',
    icon: '🧘',
    motivationalText: 'Registra tu estado actual y tus metas',
  },
  {
    id: 'personality',
    title: 'Personalidad y Crecimiento Personal',
    icon: '🌱',
    motivationalText: 'Conoce en qué momento de tu vida estás',
  },
  {
    id: 'hobbies',
    title: 'Otros (Ocio, Hobbies, Intereses)',
    icon: '🎨',
    motivationalText: 'Mira dónde estás hoy',
  },
];

export function RealityCheck({ onComplete, onClose }: RealityCheckProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<{ [key: string]: AreaData }>({});
  const [showReflection, setShowReflection] = useState(false);

  const currentArea = AREAS[currentStep];
  const currentData = data[currentArea.id] || {
    id: currentArea.id,
    reflections: {},
  };

  const updateData = (updates: Partial<AreaData>) => {
    setData({
      ...data,
      [currentArea.id]: {
        ...currentData,
        ...updates,
      },
    });
  };

  const updateReflection = (key: string, value: string) => {
    updateData({
      reflections: {
        ...currentData.reflections,
        [key]: value,
      },
    });
  };

  const handleNext = () => {
    if (currentStep < AREAS.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowReflection(false);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowReflection(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{currentArea.icon}</span>
              <h2 className="text-gray-900 text-xl">{currentArea.title}</h2>
            </div>
            <p className="text-blue-600 text-sm">
              {currentStep + 1} de {AREAS.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Motivational text */}
          <div className="text-center">
            <p className="text-gray-600 text-lg italic">"{currentArea.motivationalText}"</p>
          </div>

          {/* Career */}
          {currentArea.id === 'career' && (
            <>
              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Qué tan satisfecho estás?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.satisfaction || 5}
                    onChange={(e) => updateData({ satisfaction: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.satisfaction || 5}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Muy insatisfecho</span>
                  <span>Completamente satisfecho</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Qué obstáculos enfrentas?
                </label>
                <textarea
                  value={currentData.reflections.obstacles || ''}
                  onChange={(e) => updateReflection('obstacles', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Te sientes estancado o avanzando?
                </label>
                <textarea
                  value={currentData.reflections.progress || ''}
                  onChange={(e) => updateReflection('progress', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Personal Relationships */}
          {currentArea.id === 'personal' && (
            <>
              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Cómo te sientes con tus amigos?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.friendsSatisfaction || 5}
                    onChange={(e) => updateData({ friendsSatisfaction: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.friendsSatisfaction || 5}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Cómo te sientes con tu familia?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.familySatisfaction || 5}
                    onChange={(e) => updateData({ familySatisfaction: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.familySatisfaction || 5}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Cómo describirías la calidad de tus relaciones actualmente?
                </label>
                <textarea
                  value={currentData.reflections.relationshipQuality || ''}
                  onChange={(e) => updateReflection('relationshipQuality', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Te gustaría conocer más personas, fortalecer amistades actuales o mejorar relaciones con tu familia?
                </label>
                <textarea
                  value={currentData.reflections.relationshipGoals || ''}
                  onChange={(e) => updateReflection('relationshipGoals', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Te sientes valorado y respetado en tu círculo social?
                </label>
                <textarea
                  value={currentData.reflections.valued || ''}
                  onChange={(e) => updateReflection('valued', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Romantic Relationships */}
          {currentArea.id === 'romantic' && (
            <>
              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Cómo te sientes en tu situación romántica actual?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.romanticSatisfaction || 5}
                    onChange={(e) => updateData({ romanticSatisfaction: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.romanticSatisfaction || 5}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Hay alguien con quien quisieras mejorar la relación o conectar más profundamente?
                </label>
                <textarea
                  value={currentData.reflections.deeperConnection || ''}
                  onChange={(e) => updateReflection('deeperConnection', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Cómo podrías mejorar la relación con tu pareja?
                </label>
                <textarea
                  value={currentData.reflections.improvePartnership || ''}
                  onChange={(e) => updateReflection('improvePartnership', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Finance */}
          {currentArea.id === 'finance' && (
            <>
              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Te sientes cómodo/a con tu situación financiera?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['bad', 'neutral', 'good'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => updateData({ financialComfort: option })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        currentData.financialComfort === option
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option === 'bad' && 'Muy mal'}
                      {option === 'neutral' && 'Neutral'}
                      {option === 'good' && 'Muy bien'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Quieres ahorrar más, invertir o encontrar un trabajo a tiempo parcial?
                </label>
                <textarea
                  value={currentData.reflections.financialGoals || ''}
                  onChange={(e) => updateReflection('financialGoals', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Qué mejorarías de tu gestión financiera?
                </label>
                <textarea
                  value={currentData.reflections.financialImprovement || ''}
                  onChange={(e) => updateReflection('financialImprovement', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Health */}
          {currentArea.id === 'health' && (
            <>
              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Cómo calificarías tu salud física?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.physicalHealth || 5}
                    onChange={(e) => updateData({ physicalHealth: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.physicalHealth || 5}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-3">
                  ¿Cómo calificarías tu salud mental?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentData.mentalHealth || 5}
                    onChange={(e) => updateData({ mentalHealth: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-500">10</span>
                  <span className="text-blue-600 min-w-[2rem] text-center">
                    {currentData.mentalHealth || 5}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Ejemplo: nivel de estrés, ansiedad, felicidad
                </p>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Qué tan frecuente es el estrés, la ansiedad o el agotamiento emocional en tu vida?
                </label>
                <textarea
                  value={currentData.reflections.stress || ''}
                  onChange={(e) => updateReflection('stress', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Estás haciendo ejercicio, descansando y alimentándote adecuadamente?
                </label>
                <textarea
                  value={currentData.reflections.healthHabits || ''}
                  onChange={(e) => updateReflection('healthHabits', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Personality */}
          {currentArea.id === 'personality' && (
            <>
              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Cómo te ves a ti mismo/a hoy?
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Escribe 5 adjetivos que describan tu personalidad actual
                </p>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <input
                      key={i}
                      type="text"
                      value={currentData.adjectives?.[i] || ''}
                      onChange={(e) => {
                        const newAdjectives = [...(currentData.adjectives || ['', '', '', '', ''])];
                        newAdjectives[i] = e.target.value;
                        updateData({ adjectives: newAdjectives });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Adjetivo ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Qué aspectos de tu personalidad te gustan y cuáles te gustaría cambiar?
                </label>
                <textarea
                  value={currentData.reflections.personalityAspects || ''}
                  onChange={(e) => updateReflection('personalityAspects', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Sientes que estás creciendo como persona, o te falta algo para avanzar?
                </label>
                <textarea
                  value={currentData.reflections.personalGrowth || ''}
                  onChange={(e) => updateReflection('personalGrowth', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}

          {/* Hobbies */}
          {currentArea.id === 'hobbies' && (
            <>
              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Cuáles son tus pasatiempos más emocionantes o actividades que te gustaría explorar más?
                </label>
                <textarea
                  value={currentData.reflections.excitingHobbies || ''}
                  onChange={(e) => updateReflection('excitingHobbies', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Qué cosas nuevas te gustaría probar o aprender?
                </label>
                <textarea
                  value={currentData.reflections.newThings || ''}
                  onChange={(e) => updateReflection('newThings', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  ¿Sientes que dedicas suficiente tiempo a tus intereses?
                </label>
                <textarea
                  value={currentData.reflections.timeForInterests || ''}
                  onChange={(e) => updateReflection('timeForInterests', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {currentStep < AREAS.length - 1 ? 'Siguiente →' : 'Ver Resumen'}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Rocket } from 'lucide-react';

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

interface ComparisonViewProps {
  realityCheckData: { [key: string]: AreaData };
  futureGoals: FutureGoal[];
  onComplete: () => void;
}

const AREA_NAMES: { [key: string]: string } = {
  career: 'Carrera',
  personal: 'Relaciones',
  romantic: 'Romance',
  finance: 'Finanzas',
  health: 'Salud',
  personality: 'Personalidad',
  hobbies: 'Hobbies',
};

export function ComparisonView({ realityCheckData, futureGoals, onComplete }: ComparisonViewProps) {
  const [weeklyStep, setWeeklyStep] = useState('');

  // Calculate current scores
  const currentScores = Object.entries(realityCheckData).map(([id, areaData]) => {
    let score = 5;
    
    if (areaData.satisfaction !== undefined) {
      score = areaData.satisfaction;
    } else if (areaData.friendsSatisfaction !== undefined && areaData.familySatisfaction !== undefined) {
      score = (areaData.friendsSatisfaction + areaData.familySatisfaction) / 2;
    } else if (areaData.romanticSatisfaction !== undefined) {
      score = areaData.romanticSatisfaction;
    } else if (areaData.financialComfort) {
      score = areaData.financialComfort === 'bad' ? 3 : areaData.financialComfort === 'neutral' ? 5 : 8;
    } else if (areaData.physicalHealth !== undefined && areaData.mentalHealth !== undefined) {
      score = (areaData.physicalHealth + areaData.mentalHealth) / 2;
    }

    return {
      id,
      name: AREA_NAMES[id] || id,
      score: Math.round(score),
    };
  });

  const averageCurrentScore = Math.round(
    currentScores.reduce((sum, s) => sum + s.score, 0) / currentScores.length
  );

  // Get personality adjectives
  const personalityData = realityCheckData.personality;
  const currentAdjectives = personalityData?.adjectives?.filter(a => a) || [];

  const handleComplete = () => {
    if (weeklyStep) {
      // Save the weekly step
      console.log('Weekly step:', weeklyStep);
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center text-white mb-12">
          <h1 className="text-4xl mb-4">Tu Transformación</h1>
          <p className="text-blue-100 text-lg">
            Visualiza el cambio entre quién eres hoy y quién serás
          </p>
        </div>

        {/* Split View */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Current State */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-white text-2xl mb-6 text-center">Hoy</h2>
            
            {/* Score */}
            <div className="text-center mb-6">
              <div className="inline-block p-6 bg-white/20 rounded-xl">
                <p className="text-white/80 text-sm mb-2">Puntuación general</p>
                <p className="text-white text-5xl">{averageCurrentScore}<span className="text-2xl">/10</span></p>
              </div>
            </div>

            {/* Current keywords */}
            {currentAdjectives.length > 0 && (
              <div className="mb-6">
                <p className="text-white/80 text-sm mb-3 text-center">Cómo te defines:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentAdjectives.map((adj, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-white/20 text-white rounded-full text-sm"
                    >
                      {adj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Areas with low scores */}
            <div>
              <p className="text-white/80 text-sm mb-3 text-center">Áreas de mejora:</p>
              <div className="space-y-2">
                {currentScores
                  .filter(s => s.score < 7)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 4)
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-2">
                      <span className="text-white text-sm">{item.name}</span>
                      <span className="text-white/60 text-sm">{item.score}/10</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Future State */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-gray-900 text-2xl mb-6 text-center">En 5 años</h2>
            
            {/* Future score (optimistic projection) */}
            <div className="text-center mb-6">
              <div className="inline-block p-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <p className="text-white/90 text-sm mb-2">Puntuación proyectada</p>
                <p className="text-white text-5xl">9<span className="text-2xl">/10</span></p>
              </div>
            </div>

            {/* Future goals */}
            {futureGoals.length > 0 && (
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-3 text-center">Tus metas:</p>
                <div className="space-y-3">
                  {futureGoals.slice(0, 4).map((goal) => (
                    <div
                      key={goal.areaId}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4"
                    >
                      <p className="text-blue-600 text-xs mb-1">
                        {AREA_NAMES[goal.areaId] || goal.areaId}
                      </p>
                      <p className="text-gray-900 text-sm line-clamp-2">{goal.goal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {futureGoals.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  ✨ Una vida más plena y satisfactoria
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Action */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl mb-8">
          <h3 className="text-gray-900 text-xl mb-4 text-center">
            ¿Qué paso pequeño podrías dar esta semana?
          </h3>
          <textarea
            value={weeklyStep}
            onChange={(e) => setWeeklyStep(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            rows={3}
            placeholder="Ej: Hacer ejercicio 3 veces, leer un capítulo al día, hablar con un amigo..."
          />
          <p className="text-gray-500 text-sm text-center">
            El viaje de mil millas comienza con un solo paso
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleComplete}
          className="w-full px-8 py-5 bg-white text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-2xl transition-all text-xl font-medium border-2 border-white shadow-xl hover:scale-105"
        >
          <span className="flex items-center justify-center gap-3">
            <Rocket className="w-6 h-6 text-blue-600" />
            <span className="text-gray-900">Comenzar tu viaje</span>
          </span>
        </button>
      </div>
    </div>
  );
}

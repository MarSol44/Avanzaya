import { useState } from 'react';
import { BarChart3 } from 'lucide-react';

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

interface RealityCheckSummaryProps {
  data: { [key: string]: AreaData };
  onContinue: () => void;
}

const AREA_NAMES: { [key: string]: string } = {
  career: 'Carrera o Estudios',
  personal: 'Relaciones Personales',
  romantic: 'Relaciones Románticas',
  finance: 'Finanzas',
  health: 'Salud Física y Mental',
  personality: 'Personalidad',
  hobbies: 'Ocio y Hobbies',
};

export function RealityCheckSummary({ data, onContinue }: RealityCheckSummaryProps) {
  // Calculate scores
  const scores = Object.entries(data).map(([id, areaData]) => {
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

  const averageScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-gray-900 text-3xl mb-2">Resumen Visual</h1>
          <p className="text-gray-600">Tu estado actual en cada área de tu vida</p>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-center text-white mb-8">
          <p className="text-blue-100 mb-2">Puntuación general</p>
          <p className="text-5xl mb-2">{averageScore}<span className="text-2xl">/10</span></p>
          <p className="text-blue-100">
            {averageScore >= 8 ? '¡Excelente estado general!' : 
             averageScore >= 6 ? 'Buen equilibrio, con áreas de mejora' :
             averageScore >= 4 ? 'Varias áreas necesitan atención' :
             'Es momento de hacer cambios significativos'}
          </p>
        </div>

        {/* Bar Chart */}
        <div className="space-y-4 mb-8">
          {scores.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 text-sm">{item.name}</span>
                <span className="text-blue-600">{item.score}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.score >= 8 ? 'bg-green-500' :
                    item.score >= 6 ? 'bg-blue-500' :
                    item.score >= 4 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${(item.score / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Weakest Areas */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <h3 className="text-gray-900 mb-3">⚠️ Áreas que necesitan más atención</h3>
          <ul className="space-y-2">
            {scores
              .filter((s) => s.score < 6)
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((item) => (
                <li key={item.id} className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  {item.name} ({item.score}/10)
                </li>
              ))}
            {scores.filter((s) => s.score < 6).length === 0 && (
              <li className="text-gray-600">¡Ninguna! Todas tus áreas están en buen estado.</li>
            )}
          </ul>
        </div>

        {/* Strongest Areas */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <h3 className="text-gray-900 mb-3">✅ Tus fortalezas actuales</h3>
          <ul className="space-y-2">
            {scores
              .filter((s) => s.score >= 7)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((item) => (
                <li key={item.id} className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {item.name} ({item.score}/10)
                </li>
              ))}
            {scores.filter((s) => s.score >= 7).length === 0 && (
              <li className="text-gray-600">Hay espacio para crecer en todas las áreas.</li>
            )}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-lg"
        >
          🚀 Ver Tu Futuro
        </button>
      </div>
    </div>
  );
}

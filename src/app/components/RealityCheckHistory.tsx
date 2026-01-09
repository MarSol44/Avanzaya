import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

export interface RealityCheckEntry {
  id: string;
  date: Date;
  data: { [key: string]: any };
}

interface RealityCheckHistoryProps {
  entries: RealityCheckEntry[];
  onClose: () => void;
}

const AREA_NAMES: { [key: string]: { title: string; icon: string } } = {
  career: { title: 'Carrera o Estudios', icon: '🎓' },
  personal: { title: 'Relaciones Personales', icon: '🤝' },
  romantic: { title: 'Relaciones Románticas', icon: '❤️' },
  finance: { title: 'Finanzas', icon: '💰' },
  health: { title: 'Salud Física y Mental', icon: '🧘' },
  personality: { title: 'Personalidad y Crecimiento Personal', icon: '🌱' },
  hobbies: { title: 'Otros (Ocio, Hobbies, Intereses)', icon: '🎨' },
};

export function RealityCheckHistory({ entries, onClose }: RealityCheckHistoryProps) {
  const [selectedEntry, setSelectedEntry] = useState<RealityCheckEntry | null>(null);

  const renderEntryDetails = (entry: RealityCheckEntry) => {
    return (
      <div className="space-y-6">
        {Object.entries(entry.data).map(([areaId, areaData]: [string, any]) => {
          const areaInfo = AREA_NAMES[areaId];
          if (!areaInfo) return null;

          // Check if there's any written content
          const hasContent = Object.values(areaData.reflections || {}).some(
            (value) => value && String(value).trim() !== ''
          );

          // Only show areas with written reflections
          if (!hasContent) return null;

          return (
            <div key={areaId} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{areaInfo.icon}</span>
                <h3 className="text-gray-900 font-medium">{areaInfo.title}</h3>
              </div>

              <div className="space-y-3">
                {/* Sliders */}
                {areaData.satisfaction !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Satisfacción: </span>
                    <span className="text-blue-600 font-medium">{areaData.satisfaction}/10</span>
                  </div>
                )}
                {areaData.friendsSatisfaction !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Amigos: </span>
                    <span className="text-blue-600 font-medium">{areaData.friendsSatisfaction}/10</span>
                  </div>
                )}
                {areaData.familySatisfaction !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Familia: </span>
                    <span className="text-blue-600 font-medium">{areaData.familySatisfaction}/10</span>
                  </div>
                )}
                {areaData.romanticSatisfaction !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Situación romántica: </span>
                    <span className="text-blue-600 font-medium">{areaData.romanticSatisfaction}/10</span>
                  </div>
                )}
                {areaData.financialComfort !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Comodidad financiera: </span>
                    <span className="text-blue-600 font-medium">
                      {areaData.financialComfort === 'bad' && 'Muy mal'}
                      {areaData.financialComfort === 'neutral' && 'Neutral'}
                      {areaData.financialComfort === 'good' && 'Muy bien'}
                    </span>
                  </div>
                )}
                {areaData.physicalHealth !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Salud física: </span>
                    <span className="text-blue-600 font-medium">{areaData.physicalHealth}/10</span>
                  </div>
                )}
                {areaData.mentalHealth !== undefined && (
                  <div className="text-sm">
                    <span className="text-gray-600">Salud mental: </span>
                    <span className="text-blue-600 font-medium">{areaData.mentalHealth}/10</span>
                  </div>
                )}
                {areaData.adjectives && areaData.adjectives.some((adj: string) => adj.trim()) && (
                  <div className="text-sm">
                    <span className="text-gray-600">Adjetivos: </span>
                    <span className="text-gray-900">
                      {areaData.adjectives.filter((adj: string) => adj.trim()).join(', ')}
                    </span>
                  </div>
                )}

                {/* Reflections */}
                {Object.entries(areaData.reflections || {}).map(([key, value]: [string, any]) => {
                  if (!value || String(value).trim() === '') return null;
                  
                  return (
                    <div key={key} className="bg-white rounded p-3">
                      <p className="text-xs text-gray-500 mb-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-gray-900">{value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (selectedEntry) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-gray-900">Reality Check</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedEntry.date.toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderEntryDetails(selectedEntry)}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={() => setSelectedEntry(null)}
              className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-gray-900">Historial de Reality Check</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No hay registros de Reality Check</p>
              <p className="text-sm mt-1">Completa tu primer Reality Check para ver el historial</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-gray-900 font-medium">Reality Check</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {entry.date.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

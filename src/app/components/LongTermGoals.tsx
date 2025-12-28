import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { LongTermGoalModal } from './LongTermGoalModal';

export interface LongTermGoal {
  id: string;
  completed: boolean;
  name: string;
  deadline: Date;
  category?: string;
  motivation?: string;
  steps?: LongTermGoalStep[];
}

export interface LongTermGoalStep {
  id: string;
  completed: boolean;
  description: string;
  expectedDate: Date;
}

interface LongTermGoalsProps {
  goals: LongTermGoal[];
  onAddGoal: () => void;
  onToggleGoal: (id: string) => void;
  onUpdateGoal: (goal: LongTermGoal) => void;
}

const categories = [
  'Carrera o Estudios',
  'Relaciones Personales',
  'Relaciones Románticas',
  'Finanzas',
  'Salud Física',
  'Salud Mental',
  'Personalidad y Crecimiento Personal',
];

export function LongTermGoals({ goals, onAddGoal, onToggleGoal, onUpdateGoal }: LongTermGoalsProps) {
  const [selectedGoal, setSelectedGoal] = useState<LongTermGoal | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900">Metas a Largo Plazo (&gt; 1 año)</h2>
          <button
            onClick={onAddGoal}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Goals table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600">✓</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Meta a Largo Plazo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Fecha límite</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleGoal(goal.id);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        goal.completed
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {goal.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={goal.completed ? 'line-through text-gray-400' : 'text-gray-900'}>
                      {goal.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {goal.deadline.toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    {goal.category && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                        {goal.category}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {goals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay metas a largo plazo. ¡Agrega una nueva!
          </div>
        )}
      </div>

      {selectedGoal && (
        <LongTermGoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={onUpdateGoal}
        />
      )}
    </div>
  );
}

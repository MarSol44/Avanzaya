import { useState } from 'react';
import { Plus, Filter, Search, Check } from 'lucide-react';
import { ShortTermGoalModal } from './ShortTermGoalModal';

export type Priority = 'Alta' | 'Media' | 'Baja';

export interface ShortTermGoal {
  id: string;
  completed: boolean;
  name: string;
  deadline: Date;
  priority?: Priority;
  description?: string;
  motivation?: string;
  reward?: string;
  category?: string;
  steps?: GoalStep[];
}

export interface GoalStep {
  id: string;
  completed: boolean;
  name: string;
  description: string;
  expectedDate: Date;
}

interface ShortTermGoalsProps {
  goals: ShortTermGoal[];
  onAddGoal: () => void;
  onToggleGoal: (id: string) => void;
  onUpdateGoal: (goal: ShortTermGoal) => void;
}

export function ShortTermGoals({ goals, onAddGoal, onToggleGoal, onUpdateGoal }: ShortTermGoalsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'Todas'>('Todas');
  const [selectedGoal, setSelectedGoal] = useState<ShortTermGoal | null>(null);

  const getTimeEstimate = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Atrasado', color: 'text-red-600 bg-red-50' };
    if (days <= 7) return { text: `En ${days} día${days !== 1 ? 's' : ''}`, color: 'text-orange-600 bg-orange-50' };
    if (days <= 30) {
      const weeks = Math.ceil(days / 7);
      return { text: `En ${weeks} semana${weeks !== 1 ? 's' : ''}`, color: 'text-yellow-600 bg-yellow-50' };
    }
    const months = Math.ceil(days / 30);
    return { text: `En ${months} mes${months !== 1 ? 'es' : ''}`, color: 'text-blue-600 bg-blue-50' };
  };

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'Alta': return 'text-red-600 bg-red-50';
      case 'Media': return 'text-yellow-600 bg-yellow-50';
      case 'Baja': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'Todas' || goal.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const completedGoals = filteredGoals.filter(g => g.completed).length;
  const progressPercentage = filteredGoals.length > 0 ? (completedGoals / filteredGoals.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900">Metas a Corto Plazo (&lt; 1 año)</h2>
          <button
            onClick={onAddGoal}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progreso general</span>
            <span className="text-sm text-gray-900">{completedGoals}/{filteredGoals.length} completadas ({progressPercentage.toFixed(0)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar meta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | 'Todas')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas las prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        {/* Goals table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600">✓</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Meta</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Fecha límite</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Tiempo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {filteredGoals.map((goal) => {
                const timeEstimate = getTimeEstimate(goal.deadline);
                return (
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
                      <span className={`text-xs px-2 py-1 rounded-full ${timeEstimate.color}`}>
                        {timeEstimate.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {goal.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredGoals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterPriority !== 'Todas'
              ? 'No se encontraron metas con estos filtros'
              : 'No hay metas a corto plazo. ¡Agrega una nueva!'}
          </div>
        )}
      </div>

      {selectedGoal && (
        <ShortTermGoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={onUpdateGoal}
        />
      )}
    </div>
  );
}

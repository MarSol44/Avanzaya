import { CircularProgress } from './CircularProgress';
import { ProgressChart } from './ProgressChart';
import { ArrowRight, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ShortTermGoal } from './ShortTermGoals';
import { LongTermGoal } from './LongTermGoals';
import { useState } from 'react';

interface ProgressViewProps {
  shortTermGoals: ShortTermGoal[];
  longTermGoals: LongTermGoal[];
  consecutiveDays: number;
  onNavigateToGoals: () => void;
}

const categories = [
  'General',
  'Carrera o Estudios',
  'Relaciones Personales',
  'Relaciones Románticas',
  'Finanzas',
  'Salud Física',
  'Salud Mental',
  'Personalidad y Crecimiento Personal',
];

export function ProgressView({ shortTermGoals, longTermGoals, consecutiveDays, onNavigateToGoals }: ProgressViewProps) {
  // Short-term goals stats
  const completedShortTerm = shortTermGoals.filter(g => g.completed).length;
  const pendingShortTerm = shortTermGoals.filter(g => !g.completed && new Date(g.deadline) >= new Date()).length;
  const overdueShortTerm = shortTermGoals.filter(g => !g.completed && new Date(g.deadline) < new Date()).length;
  const shortTermPercentage = shortTermGoals.length > 0 
    ? (completedShortTerm / shortTermGoals.length) * 100 
    : 0;

  // Get status of each short-term goal for chart
  const shortTermChartData = shortTermGoals.map(goal => {
    if (goal.completed) return { name: goal.name, status: 'completed' };
    if (new Date(goal.deadline) < new Date()) return { name: goal.name, status: 'overdue' };
    return { name: goal.name, status: 'in-progress' };
  });

  // Long-term goals by category
  const longTermByCategory = categories.map(category => {
    const goalsInCategory = longTermGoals.filter(g => 
      category === 'General' ? !g.category : g.category === category
    );
    const completed = goalsInCategory.filter(g => g.completed).length;
    const total = goalsInCategory.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { category, completed, total, percentage };
  }).filter(item => item.total > 0);

  // Get status of each long-term goal for chart
  const longTermChartData = longTermGoals.map(goal => {
    if (goal.completed) return { name: goal.name, status: 'completed' };
    const stepsCompleted = goal.steps?.filter(s => s.completed).length || 0;
    const totalSteps = goal.steps?.length || 0;
    if (totalSteps === 0 || stepsCompleted === 0) return { name: goal.name, status: 'overdue' };
    return { name: goal.name, status: 'in-progress' };
  });

  const [showShortTermChart, setShowShortTermChart] = useState(false);
  const [showLongTermChart, setShowLongTermChart] = useState(false);

  return (
    <div className="space-y-6">
      {/* Motivational question */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl mb-2">¿Qué estoy haciendo hoy para acercarme a mi visión?</h2>
        <p className="text-blue-100">
          Cada pequeño paso cuenta. Mantén el enfoque en tus metas diarias.
        </p>
      </div>

      {/* Consecutive days */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-900 mb-1">Días consecutivos</h3>
            <p className="text-sm text-gray-500">Completando tareas</p>
          </div>
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            <div className="text-4xl text-blue-600">{consecutiveDays}</div>
          </div>
        </div>
      </div>

      {/* Short-term goals progress */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-900 mb-6">Progreso de Metas a Corto Plazo</h2>

        {/* Circular progress */}
        <div className="flex justify-center mb-8">
          <CircularProgress percentage={shortTermPercentage} size={200} />
        </div>

        {/* Stats table */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl text-green-600 mb-1">{completedShortTerm}</div>
            <div className="text-sm text-gray-600">Completadas</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl text-yellow-600 mb-1">{pendingShortTerm}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl text-red-600 mb-1">{overdueShortTerm}</div>
            <div className="text-sm text-gray-600">En progreso</div>
          </div>
        </div>

        {/* Progress chart with toggle */}
        {shortTermChartData.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowShortTermChart(!showShortTermChart)}
              className="w-full flex items-center justify-between text-sm text-gray-700 mb-3 hover:text-gray-900"
            >
              <span>Progreso por meta</span>
              {showShortTermChart ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {showShortTermChart && <ProgressChart goals={shortTermChartData} />}
          </div>
        )}

        <button
          onClick={onNavigateToGoals}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          Revisa tus metas y ajusta tu plan
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Long-term goals progress */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-900 mb-6">Progreso de Metas a Largo Plazo</h2>

        {/* Category breakdown */}
        {longTermByCategory.length > 0 ? (
          <div className="space-y-4 mb-6">
            {longTermByCategory.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{item.category}</span>
                  <span className="text-sm text-gray-500">
                    {item.completed}/{item.total} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 mb-6">
            No hay metas a largo plazo definidas
          </div>
        )}

        {/* Progress chart */}
        {longTermChartData.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowLongTermChart(!showLongTermChart)}
              className="w-full flex items-center justify-between text-sm text-gray-700 mb-3 hover:text-gray-900"
            >
              <span>Progreso por meta</span>
              {showLongTermChart ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {showLongTermChart && <ProgressChart goals={longTermChartData} />}
          </div>
        )}

        <button
          onClick={onNavigateToGoals}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
        >
          Visualizar metas de largo plazo
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
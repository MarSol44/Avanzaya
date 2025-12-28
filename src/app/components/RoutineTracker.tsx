import { useState } from 'react';
import { Check, Plus, Pencil } from 'lucide-react';
import { EditRoutineModal } from './EditRoutineModal';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

interface RoutineTrackerProps {
  type: 'day' | 'night';
  habits: Habit[];
  onToggleHabit: (id: string) => void;
  onUpdateHabits?: (habits: Habit[]) => void;
}

export function RoutineTracker({ type, habits, onToggleHabit, onUpdateHabits }: RoutineTrackerProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const title = type === 'day' ? 'Rutina de Día' : 'Rutina de Noche';
  const icon = type === 'day' ? '☀️' : '🌙';

  const completedCount = habits.filter(h => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  const handleSaveHabits = (updatedHabits: Habit[]) => {
    if (onUpdateHabits) {
      onUpdateHabits(updatedHabits);
    }
    setShowEditModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {completedCount}/{habits.length}
            </span>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Habits list */}
        <div className="space-y-2">
          {habits.map(habit => (
            <button
              key={habit.id}
              onClick={() => onToggleHabit(habit.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  habit.completed
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {habit.completed && <Check className="w-3 h-3 text-white" />}
              </div>
              <span
                className={`flex-1 transition-all ${
                  habit.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                }`}
              >
                {habit.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showEditModal && (
        <EditRoutineModal
          type={type}
          habits={habits}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveHabits}
        />
      )}
    </>
  );
}
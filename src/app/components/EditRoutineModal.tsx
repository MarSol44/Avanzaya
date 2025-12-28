import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

interface EditRoutineModalProps {
  type: 'day' | 'night';
  habits: Habit[];
  onClose: () => void;
  onSave: (habits: Habit[]) => void;
}

export function EditRoutineModal({ type, habits, onClose, onSave }: EditRoutineModalProps) {
  const [editedHabits, setEditedHabits] = useState<Habit[]>(habits);
  const [newHabitName, setNewHabitName] = useState('');

  const title = type === 'day' ? 'Rutina de Día' : 'Rutina de Noche';

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name: newHabitName,
        completed: false,
      };
      setEditedHabits([...editedHabits, newHabit]);
      setNewHabitName('');
    }
  };

  const handleRemoveHabit = (id: string) => {
    setEditedHabits(editedHabits.filter(h => h.id !== id));
  };

  const handleUpdateHabitName = (id: string, name: string) => {
    setEditedHabits(editedHabits.map(h => h.id === id ? { ...h, name } : h));
  };

  const handleSave = () => {
    onSave(editedHabits);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-gray-900">Editar {title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Add new habit */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
              placeholder="Nuevo hábito..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddHabit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Habits list */}
          <div className="space-y-2">
            {editedHabits.map((habit) => (
              <div key={habit.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={habit.name}
                  onChange={(e) => handleUpdateHabitName(habit.id, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleRemoveHabit(habit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {editedHabits.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay hábitos. Agrega uno nuevo arriba.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

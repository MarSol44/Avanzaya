import { useState } from 'react';
import { X, Plus, Check, RefreshCw } from 'lucide-react';
import { ShortTermGoal, GoalStep } from './ShortTermGoals';

interface ShortTermGoalModalProps {
  goal: ShortTermGoal;
  onClose: () => void;
  onUpdate: (goal: ShortTermGoal) => void;
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

export function ShortTermGoalModal({ goal, onClose, onUpdate }: ShortTermGoalModalProps) {
  const [editedGoal, setEditedGoal] = useState<ShortTermGoal>(goal);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newStepDate, setNewStepDate] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const handleSave = () => {
    onUpdate(editedGoal);
    onClose();
  };

  const handleToggleStep = (stepId: string) => {
    setEditedGoal({
      ...editedGoal,
      steps: editedGoal.steps?.map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      ),
    });
  };

  const handleAddStep = () => {
    if (newStepName.trim() && newStepDescription.trim() && newStepDate) {
      const newStep: GoalStep = {
        id: `step-${Date.now()}`,
        completed: false,
        name: newStepName,
        description: newStepDescription,
        expectedDate: new Date(newStepDate),
      };
      setEditedGoal({
        ...editedGoal,
        steps: [...(editedGoal.steps || []), newStep],
      });
      setNewStepName('');
      setNewStepDescription('');
      setNewStepDate('');
      setIsAddingStep(false);
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      setEditedGoal({ ...editedGoal, category: customCategory });
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const completedSteps = editedGoal.steps?.filter(s => s.completed).length || 0;
  const totalSteps = editedGoal.steps?.length || 0;
  const stepProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-gray-900">Detalles de la Meta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Descripción</h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Nombre</label>
              <input
                type="text"
                value={editedGoal.name}
                onChange={(e) => setEditedGoal({ ...editedGoal, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Motivación</label>
              <textarea
                value={editedGoal.motivation || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, motivation: e.target.value })}
                placeholder="¿Por qué es importante esta meta?"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Recompensa</label>
              <input
                type="text"
                value={editedGoal.reward || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, reward: e.target.value })}
                placeholder="¿Qué te darás al completarla?"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Plazo</label>
              <input
                type="date"
                value={editedGoal.deadline instanceof Date && !isNaN(editedGoal.deadline.getTime()) 
                  ? editedGoal.deadline.toISOString().split('T')[0] 
                  : ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, deadline: new Date(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Categoría</label>
              {!showCustomCategory ? (
                <div className="flex gap-2">
                  <select
                    value={editedGoal.category || ''}
                    onChange={(e) => setEditedGoal({ ...editedGoal, category: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCustomCategory(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nueva categoría"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddCustomCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => setShowCustomCategory(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Steps Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Pasos</h3>
              <button
                onClick={() => setIsAddingStep(!isAddingStep)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar paso
              </button>
            </div>

            {/* Progress */}
            {totalSteps > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progreso de pasos</span>
                  <span className="text-sm text-gray-900">{completedSteps}/{totalSteps} ({stepProgress.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stepProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Add step form */}
            {isAddingStep && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <input
                  type="text"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder="Nombre del paso"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={newStepDescription}
                  onChange={(e) => setNewStepDescription(e.target.value)}
                  placeholder="Descripción"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <input
                  type="date"
                  value={newStepDate}
                  onChange={(e) => setNewStepDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddStep}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => setIsAddingStep(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Steps table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 w-12">✓</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600">Fecha esperada</th>
                  </tr>
                </thead>
                <tbody>
                  {editedGoal.steps?.map((step) => (
                    <tr key={step.id} className="border-t border-gray-200">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStep(step.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            step.completed
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {step.completed && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                      <td className={`px-4 py-3 ${step.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {step.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{step.description}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {step.expectedDate.toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!editedGoal.steps || editedGoal.steps.length === 0) && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No hay pasos definidos. Agrega pasos para organizar tu meta.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Guardar y Sincronizar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
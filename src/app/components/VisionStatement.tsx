import { useState } from 'react';
import { Pencil, Plus, Trash2, Sparkles } from 'lucide-react';

export interface Vision {
  id: string;
  text: string;
  createdAt: Date;
}

interface VisionStatementProps {
  visions: Vision[];
  onAddVision: (text: string) => void;
  onUpdateVision: (id: string, text: string) => void;
  onDeleteVision: (id: string) => void;
}

export function VisionStatement({ visions, onAddVision, onUpdateVision, onDeleteVision }: VisionStatementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVisionText, setNewVisionText] = useState('');
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (newVisionText.trim()) {
      onAddVision(newVisionText);
      setNewVisionText('');
      setIsAdding(false);
    }
  };

  const handleEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateVision(id, editText);
      setEditingId(null);
      setEditText('');
    }
  };

  const startEdit = (vision: Vision) => {
    setEditingId(vision.id);
    setEditText(vision.text);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          <h2 className="text-gray-900">Tu mejor versión en 5 años</h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva visión
        </button>
      </div>

      {/* Add new vision */}
      {isAdding && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
          <label className="block text-sm text-gray-700">
            Describe cómo te ves en 5 años:
          </label>
          <textarea
            value={newVisionText}
            onChange={(e) => setNewVisionText(e.target.value)}
            placeholder="En 5 años, quiero ser una persona más saludable, disciplinada y enfocada en mi carrera. Habré alcanzado..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar visión
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewVisionText('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Visions list */}
      <div className="space-y-4">
        {visions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No has definido tu visión a 5 años</p>
            <p className="text-sm mt-1">Haz clic en "Nueva visión" para comenzar</p>
          </div>
        ) : (
          visions.map((vision) => (
            <div
              key={vision.id}
              className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200"
            >
              {editingId === vision.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(vision.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-gray-800 text-lg leading-relaxed italic">
                        "{vision.text}"
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(vision)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteVision(vision.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Creada el {vision.createdAt.toLocaleDateString('es-ES')}
                  </p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
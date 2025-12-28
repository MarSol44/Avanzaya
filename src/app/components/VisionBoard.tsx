import { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

export interface VisionCard {
  id: string;
  type: 'image' | 'quote';
  content: string;
  position: { x: number; y: number };
}

interface VisionBoardProps {
  cards: VisionCard[];
  onAddCard: (card: Omit<VisionCard, 'id'>) => void;
  onRemoveCard: (id: string) => void;
  onUpdateCard: (id: string, updates: Partial<VisionCard>) => void;
}

export function VisionBoard({ cards, onAddCard, onRemoveCard, onUpdateCard }: VisionBoardProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newQuote, setNewQuote] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addType, setAddType] = useState<'image' | 'quote' | null>(null);

  const handleAddQuote = () => {
    if (newQuote.trim()) {
      onAddCard({
        type: 'quote',
        content: newQuote,
        position: { x: Math.random() * 60, y: Math.random() * 60 },
      });
      setNewQuote('');
      setAddType(null);
      setShowAddMenu(false);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      onAddCard({
        type: 'image',
        content: newImageUrl,
        position: { x: Math.random() * 60, y: Math.random() * 60 },
      });
      setNewImageUrl('');
      setAddType(null);
      setShowAddMenu(false);
    }
  };

  const templates = [
    'Sé la mejor versión de ti mismo',
    'Un día a la vez',
    'El éxito es la suma de pequeños esfuerzos',
    'Cree en ti mismo',
    'Haz que cada día cuente',
    'Tu único límite eres tú mismo',
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-gray-900">Tablero de Visión</h2>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar
        </button>
      </div>

      {/* Add menu */}
      {showAddMenu && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAddType('quote')}
              className={`p-4 rounded-lg border-2 transition-all ${
                addType === 'quote'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm">Frase motivadora</div>
            </button>
            <button
              onClick={() => setAddType('image')}
              className={`p-4 rounded-lg border-2 transition-all ${
                addType === 'image'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-sm">Imagen</div>
            </button>
          </div>

          {addType === 'quote' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Escribe tu frase motivadora
                </label>
                <textarea
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder="Ejemplo: Soy capaz de lograr todo lo que me proponga"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  O usa una plantilla
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setNewQuote(template)}
                      className="p-2 text-xs text-left bg-white border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddQuote}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Agregar frase
              </button>
            </div>
          )}

          {addType === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  URL de la imagen
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Puedes usar imágenes de Unsplash, Pinterest o Google
                </p>
              </div>
              <button
                onClick={handleAddImage}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Agregar imagen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vision board grid */}
      <div className="relative min-h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
        {cards.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tu tablero está vacío</p>
              <p className="text-sm">Agrega imágenes y frases motivadoras</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                {card.type === 'image' ? (
                  <div className="aspect-square">
                    <img
                      src={card.content}
                      alt="Vision board"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300?text=Imagen';
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-6 aspect-square flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                    <p className="text-center text-gray-800 italic">
                      "{card.content}"
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => onRemoveCard(card.id)}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

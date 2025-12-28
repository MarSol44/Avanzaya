import { useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { FloatingButton } from './components/FloatingButton';
import { CreateTaskModal } from './components/CreateTaskModal';
import { BoardsScreen } from './screens/BoardsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BoardDetailScreen } from './screens/BoardDetailScreen';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

interface List {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

interface Board {
  id: string;
  title: string;
  taskCount: number;
  color: string;
  lists: List[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'boards' | 'today' | 'profile'>('boards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Datos de ejemplo
  const [boards, setBoards] = useState<Board[]>([
    {
      id: '1',
      title: 'Proyecto Personal',
      taskCount: 8,
      color: 'bg-blue-600',
      lists: [
        {
          id: '1-1',
          title: 'Por hacer',
          color: 'bg-blue-500',
          tasks: [
            {
              id: 't1',
              title: 'Diseñar mockups',
              description: 'Crear diseños para la nueva funcionalidad',
              priority: 'high',
              dueDate: 'Hoy',
            },
            {
              id: 't2',
              title: 'Reunión con el equipo',
              priority: 'medium',
              dueDate: 'Mañana',
            },
          ],
        },
        {
          id: '1-2',
          title: 'En progreso',
          color: 'bg-yellow-500',
          tasks: [
            {
              id: 't3',
              title: 'Implementar autenticación',
              description: 'Agregar sistema de login y registro',
              priority: 'high',
              dueDate: '3 días',
            },
          ],
        },
        {
          id: '1-3',
          title: 'Completado',
          color: 'bg-green-500',
          tasks: [
            {
              id: 't4',
              title: 'Configurar base de datos',
              priority: 'medium',
            },
          ],
        },
      ],
    },
    {
      id: '2',
      title: 'Trabajo',
      taskCount: 5,
      color: 'bg-purple-600',
      lists: [
        {
          id: '2-1',
          title: 'Tareas urgentes',
          color: 'bg-red-500',
          tasks: [
            {
              id: 't5',
              title: 'Revisar propuesta del cliente',
              priority: 'high',
              dueDate: 'Hoy',
            },
          ],
        },
        {
          id: '2-2',
          title: 'Esta semana',
          color: 'bg-blue-500',
          tasks: [
            {
              id: 't6',
              title: 'Preparar presentación',
              description: 'Slides para la reunión del viernes',
              priority: 'medium',
              dueDate: '2 días',
            },
            {
              id: 't7',
              title: 'Actualizar documentación',
              priority: 'low',
              dueDate: '5 días',
            },
          ],
        },
      ],
    },
    {
      id: '3',
      title: 'Casa',
      taskCount: 3,
      color: 'bg-green-600',
      lists: [
        {
          id: '3-1',
          title: 'Pendientes',
          color: 'bg-green-500',
          tasks: [
            {
              id: 't8',
              title: 'Comprar víveres',
              priority: 'medium',
              dueDate: 'Hoy',
            },
            {
              id: 't9',
              title: 'Llamar al técnico',
              priority: 'low',
            },
          ],
        },
      ],
    },
  ]);

  const todayTasks: Task[] = [
    {
      id: 't1',
      title: 'Diseñar mockups',
      description: 'Crear diseños para la nueva funcionalidad',
      priority: 'high',
      dueDate: '10:00 AM',
    },
    {
      id: 't5',
      title: 'Revisar propuesta del cliente',
      priority: 'high',
      dueDate: '2:00 PM',
    },
    {
      id: 't8',
      title: 'Comprar víveres',
      priority: 'medium',
      dueDate: '6:00 PM',
    },
  ];

  const completedTasks: Task[] = [
    {
      id: 't10',
      title: 'Responder correos',
      priority: 'low',
    },
  ];

  const handleCreateTask = (task: { title: string; description: string; priority: 'low' | 'medium' | 'high' }) => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      ...task,
      dueDate: 'Hoy',
    };

    // Agregar la tarea a la primera lista del primer tablero
    if (boards.length > 0 && boards[0].lists.length > 0) {
      const updatedBoards = [...boards];
      updatedBoards[0].lists[0].tasks.push(newTask);
      updatedBoards[0].taskCount += 1;
      setBoards(updatedBoards);
    }
  };

  const handleBoardClick = (boardId: string) => {
    setSelectedBoardId(boardId);
  };

  const handleBackToBoards = () => {
    setSelectedBoardId(null);
  };

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Contenido principal */}
      <div className="min-h-screen">
        {selectedBoard ? (
          <BoardDetailScreen
            boardTitle={selectedBoard.title}
            lists={selectedBoard.lists}
            onBack={handleBackToBoards}
          />
        ) : (
          <>
            {activeTab === 'boards' && (
              <BoardsScreen boards={boards} onBoardClick={handleBoardClick} />
            )}
            {activeTab === 'today' && (
              <TodayScreen tasks={todayTasks} completedTasks={completedTasks} />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen
                userName="María García"
                userEmail="maria.garcia@email.com"
              />
            )}
          </>
        )}
      </div>

      {/* Botón flotante - solo visible en tableros y hoy */}
      {!selectedBoard && (activeTab === 'boards' || activeTab === 'today') && (
        <FloatingButton onClick={() => setIsModalOpen(true)} />
      )}

      {/* Navegación inferior - oculta cuando se ve detalle del tablero */}
      {!selectedBoard && (
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Modal de crear tarea */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {/* Estilos adicionales */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </div>
  );
}

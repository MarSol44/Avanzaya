import { TaskList } from '../components/TaskList';
import { CalendarCheck } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

interface TodayScreenProps {
  tasks: Task[];
  completedTasks: Task[];
}

export function TodayScreen({ tasks, completedTasks }: TodayScreenProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <div className="pb-20">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-gray-900">Hoy</h1>
            <p className="text-gray-500 capitalize">{formattedDate}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <TaskList
            title="Pendientes"
            tasks={tasks}
            color="bg-blue-500"
          />
        </div>

        {completedTasks.length > 0 && (
          <div>
            <TaskList
              title="Completadas"
              tasks={completedTasks}
              color="bg-green-500"
            />
          </div>
        )}

        {tasks.length === 0 && completedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No hay tareas para hoy</h3>
            <p className="text-gray-500 max-w-xs">
              Agrega tareas para mantenerte organizado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

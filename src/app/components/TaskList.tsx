import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

interface TaskListProps {
  title: string;
  tasks: Task[];
  color?: string;
  onAddTask?: () => void;
}

export function TaskList({ title, tasks, color = 'bg-gray-100', onAddTask }: TaskListProps) {
  return (
    <div className="flex-shrink-0 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`}></div>
          <h3 className="text-gray-900">{title}</h3>
          <span className="text-gray-400">({tasks.length})</span>
        </div>
        {onAddTask && (
          <button 
            onClick={onAddTask}
            className="text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {tasks.map((task) => (
          <TaskCard key={task.id} {...task} />
        ))}
        {tasks.length === 0 && (
          <div className="bg-gray-50 rounded-xl p-4 min-w-[280px] border border-dashed border-gray-300 flex items-center justify-center">
            <p className="text-gray-400">No hay tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}

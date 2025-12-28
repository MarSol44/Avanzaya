import { ChevronRight } from 'lucide-react';

interface BoardCardProps {
  title: string;
  taskCount: number;
  color: string;
  onClick?: () => void;
}

export function BoardCard({ title, taskCount, color, onClick }: BoardCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white`}>
            <span className="text-xl">#</span>
          </div>
          <div>
            <h3 className="text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-500">
              {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );
}

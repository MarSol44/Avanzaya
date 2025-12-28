import { MoreVertical } from 'lucide-react';

interface TaskCardProps {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export function TaskCard({ title, description, priority, dueDate }: TaskCardProps) {
  const priorityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 min-w-[280px] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-gray-900 flex-1">{title}</h4>
        <button className="text-gray-400 hover:text-gray-600 -mt-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      {description && (
        <p className="text-gray-500 mb-3">{description}</p>
      )}
      
      <div className="flex items-center gap-2">
        {priority && (
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[priority]}`}>
            {priority === 'low' ? 'Baja' : priority === 'medium' ? 'Media' : 'Alta'}
          </span>
        )}
        {dueDate && (
          <span className="text-xs text-gray-500">{dueDate}</span>
        )}
      </div>
    </div>
  );
}

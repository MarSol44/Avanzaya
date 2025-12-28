import { TaskList } from '../components/TaskList';
import { ArrowLeft } from 'lucide-react';

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

interface BoardDetailScreenProps {
  boardTitle: string;
  lists: List[];
  onBack: () => void;
}

export function BoardDetailScreen({ boardTitle, lists, onBack }: BoardDetailScreenProps) {
  return (
    <div className="pb-20 min-h-screen">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 -ml-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">{boardTitle}</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {lists.map((list) => (
          <TaskList
            key={list.id}
            title={list.title}
            tasks={list.tasks}
            color={list.color}
          />
        ))}
      </div>
    </div>
  );
}

import { BoardCard } from '../components/BoardCard';

interface Board {
  id: string;
  title: string;
  taskCount: number;
  color: string;
}

interface BoardsScreenProps {
  boards: Board[];
  onBoardClick: (boardId: string) => void;
}

export function BoardsScreen({ boards, onBoardClick }: BoardsScreenProps) {
  return (
    <div className="pb-20">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-gray-900 mb-1">Mis Tableros</h1>
        <p className="text-gray-500">Organiza tus proyectos y tareas</p>
      </div>

      <div className="p-6 space-y-3">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            title={board.title}
            taskCount={board.taskCount}
            color={board.color}
            onClick={() => onBoardClick(board.id)}
          />
        ))}
      </div>
    </div>
  );
}

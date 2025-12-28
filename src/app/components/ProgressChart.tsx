interface Goal {
  name: string;
  status: 'completed' | 'in-progress' | 'overdue';
}

interface ProgressChartProps {
  goals: Goal[];
}

export function ProgressChart({ goals }: ProgressChartProps) {
  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
    }
  };

  const getStatusPercentage = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'in-progress':
        return 50;
      case 'overdue':
        return 25;
    }
  };

  return (
    <div className="space-y-3">
      {goals.map((goal, index) => {
        const percentage = getStatusPercentage(goal.status);
        const color = getStatusColor(goal.status);
        
        return (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700 truncate max-w-[70%]">
                {goal.name}
              </span>
              <span className="text-xs text-gray-500">
                {goal.status === 'completed' ? 'Completada' : 
                 goal.status === 'in-progress' ? 'En progreso' : 'Atrasada'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${color} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

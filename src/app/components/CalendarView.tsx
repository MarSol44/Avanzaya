import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  status?: 'completed' | 'incomplete' | 'no-progress' | 'current';
  events?: string[];
}

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
}

export function CalendarView({ onDateSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days with mock status
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      let status: CalendarDay['status'] = undefined;
      
      if (date.toDateString() === today.toDateString()) {
        status = 'current';
      } else if (date < today) {
        // Random status for demo
        const rand = Math.random();
        if (rand > 0.7) status = 'completed';
        else if (rand > 0.4) status = 'incomplete';
        else status = 'no-progress';
      }

      days.push({
        date,
        isCurrentMonth: true,
        status,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getStatusColor = (status?: CalendarDay['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'incomplete': return 'bg-yellow-400 text-gray-900';
      case 'no-progress': return 'bg-red-500 text-white';
      case 'current': return 'bg-gray-400 text-white ring-2 ring-blue-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => onDateSelect?.(day.date)}
            className={`
              aspect-square p-2 rounded-lg text-sm transition-all
              ${day.isCurrentMonth ? '' : 'opacity-30'}
              ${getStatusColor(day.status)}
              ${!day.status && day.isCurrentMonth ? 'hover:bg-gray-100' : ''}
            `}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-xs text-gray-600">Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400"></div>
          <span className="text-xs text-gray-600">Incompleto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-xs text-gray-600">Sin progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400 ring-2 ring-blue-600"></div>
          <span className="text-xs text-gray-600">Día actual</span>
        </div>
      </div>
    </div>
  );
}

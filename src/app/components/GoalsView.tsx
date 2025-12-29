import { useState } from 'react';
import { Calendar, Target } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { RoutineTracker } from './RoutineTracker';
import { ShortTermGoals, ShortTermGoal } from './ShortTermGoals';
import { LongTermGoals, LongTermGoal } from './LongTermGoals';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
}

interface GoalsViewProps {
  dayHabits: Habit[];
  nightHabits: Habit[];
  shortTermGoals: ShortTermGoal[];
  longTermGoals: LongTermGoal[];
  onToggleDayHabit: (id: string) => void;
  onToggleNightHabit: (id: string) => void;
  onUpdateDayHabits: (habits: Habit[]) => void;
  onUpdateNightHabits: (habits: Habit[]) => void;
  onAddShortTermGoal: () => void;
  onToggleShortTermGoal: (id: string) => void;
  onUpdateShortTermGoal: (goal: ShortTermGoal) => void;
  onAddLongTermGoal: () => void;
  onToggleLongTermGoal: (id: string) => void;
  onUpdateLongTermGoal: (goal: LongTermGoal) => void;
}

export function GoalsView({
  dayHabits,
  nightHabits,
  shortTermGoals,
  longTermGoals,
  onToggleDayHabit,
  onToggleNightHabit,
  onUpdateDayHabits,
  onUpdateNightHabits,
  onAddShortTermGoal,
  onToggleShortTermGoal,
  onUpdateShortTermGoal,
  onAddLongTermGoal,
  onToggleLongTermGoal,
  onUpdateLongTermGoal,
}: GoalsViewProps) {
  const [subView, setSubView] = useState<'calendar' | 'goals'>('calendar');

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex justify-center">
        <div className="inline-flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setSubView('calendar')}
            className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              subView === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendario
          </button>
          <button
            onClick={() => setSubView('goals')}
            className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              subView === 'goals'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Target className="w-4 h-4" />
            Mis Metas
          </button>
        </div>
      </div>

      {/* Content */}
      {subView === 'calendar' ? (
        <div className="space-y-6">
          {/* Calendar */}
          <CalendarView />

          {/* Routines */}
          <div className="grid md:grid-cols-2 gap-6">
            <RoutineTracker
              type="day"
              habits={dayHabits}
              onToggleHabit={onToggleDayHabit}
              onUpdateHabits={onUpdateDayHabits}
            />
            <RoutineTracker
              type="night"
              habits={nightHabits}
              onToggleHabit={onToggleNightHabit}
              onUpdateHabits={onUpdateNightHabits}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Short-term goals */}
          <ShortTermGoals
            goals={shortTermGoals}
            onAddGoal={onAddShortTermGoal}
            onToggleGoal={onToggleShortTermGoal}
            onUpdateGoal={onUpdateShortTermGoal}
          />

          {/* Long-term goals */}
          <LongTermGoals
            goals={longTermGoals}
            onAddGoal={onAddLongTermGoal}
            onToggleGoal={onToggleLongTermGoal}
            onUpdateGoal={onUpdateLongTermGoal}
          />
        </div>
      )}
    </div>
  );
}

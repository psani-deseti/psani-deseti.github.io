import React from 'react';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';

type ActivityData = Record<string, { minutes: number; wrote: boolean }>;

interface ActivityCalendarProps {
  activityData: ActivityData;
  isModal?: boolean;
  onClose?: () => void;
}

const WEEKDAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const MONTH_NAMES = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getMonthDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
};

const addDays = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ activityData, isModal = false, onClose }) => {
  const [currentMonth, setCurrentMonth] = React.useState(() => getMonthStart(new Date()));

  const monthDays = React.useMemo(() => getMonthDays(currentMonth), [currentMonth]);
  const monthStartDay = monthDays[0].getDay();
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const activeDateKeys = React.useMemo(
    () => new Set(Object.keys(activityData).filter(key => activityData[key]?.wrote)),
    [activityData]
  );

  const totalMinutes = React.useMemo(
    () => monthDays.reduce((sum, day) => sum + (activityData[getDateKey(day)]?.minutes ?? 0), 0),
    [activityData, monthDays]
  );

  const daysWritten = React.useMemo(
    () => monthDays.filter(day => activityData[getDateKey(day)]?.wrote).length,
    [activityData, monthDays]
  );

  const averageMinutes = daysWritten > 0 ? Math.round(totalMinutes / daysWritten) : 0;

  const allActiveDates = React.useMemo(
    () => Array.from(activeDateKeys).map(dateString => new Date(dateString)).sort((a, b) => a.getTime() - b.getTime()),
    [activeDateKeys]
  );

  const longestStreak = React.useMemo(() => {
    let longest = 0;
    let current = 0;
    let previous: Date | null = null;

    allActiveDates.forEach(date => {
      if (previous && getDateKey(date) === getDateKey(addDays(previous, 1))) {
        current += 1;
      } else {
        current = 1;
      }
      longest = Math.max(longest, current);
      previous = date;
    });

    return longest;
  }, [allActiveDates]);

  const currentStreak = React.useMemo(() => {
    let streak = 0;
    let date = new Date();

    while (activeDateKeys.has(getDateKey(date))) {
      streak += 1;
      date = addDays(date, -1);
    }

    return streak;
  }, [activeDateKeys]);

  const previousMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const getDayClasses = (day: Date) => {
    const key = getDateKey(day);
    const active = activeDateKeys.has(key);
    const previousKey = getDateKey(addDays(day, -1));
    const nextKey = getDateKey(addDays(day, 1));
    const connectedLeft = active && activeDateKeys.has(previousKey);
    const connectedRight = active && activeDateKeys.has(nextKey);

    const base = active
      ? 'border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg'
      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400';

    const rounded = active
      ? connectedLeft && connectedRight
        ? 'rounded-none'
        : connectedLeft
          ? 'rounded-r-2xl'
          : connectedRight
            ? 'rounded-l-2xl'
            : 'rounded-2xl'
      : 'rounded-2xl';

    return `${base} ${rounded}`;
  };

  const blanks = Array.from({ length: monthStartDay });

  const containerClasses = isModal
    ? 'max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl'
    : 'rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-300">Kalendář psaní</div>
          <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{monthLabel}</h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 max-w-2xl">
            Prohlédni si měsíc, svoje streaky a propojené dny psaní.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={previousMonth}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ← Předchozí
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Další →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 text-center text-xs uppercase tracking-[0.24em] font-black text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3 mt-3 text-center">
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="min-h-[100px] rounded-2xl border border-transparent bg-transparent" />
        ))}
        {monthDays.map(day => {
          const key = getDateKey(day);
          const entry = activityData[key];
          const isToday = key === getDateKey(new Date());
          const active = !!entry?.wrote;

          return (
            <div key={key} className={`${getDayClasses(day)} p-4 min-h-[100px] flex flex-col justify-between transition-all hover:scale-105`}>
              <div className="text-xs uppercase tracking-[0.24em] font-black">
                {WEEKDAYS[day.getDay()]}
              </div>
              <div className={`text-2xl font-black ${active ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                {day.getDate()}
              </div>
              <div className="text-sm leading-snug font-medium">
                {active ? `${entry.minutes} min` : '–'}
              </div>
              {isToday && (
                <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  Dnes
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-700">
          <div className="text-xs uppercase tracking-[0.18em] font-black text-slate-500 dark:text-slate-400">Aktivní dny</div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{daysWritten}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">z {monthDays.length}</div>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-5 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50">
          <div className="text-xs uppercase tracking-[0.18em] font-black text-emerald-600 dark:text-emerald-400">Celkem minut</div>
          <div className="mt-3 text-3xl font-black text-emerald-800 dark:text-emerald-200">{totalMinutes}</div>
          <div className="text-sm text-emerald-600 dark:text-emerald-400">minut za měsíc</div>
        </div>
        <div className="rounded-3xl bg-purple-50 p-5 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50">
          <div className="text-xs uppercase tracking-[0.18em] font-black text-purple-600 dark:text-purple-400">Nejdelší streak</div>
          <div className="mt-3 text-3xl font-black text-purple-800 dark:text-purple-200">{longestStreak}</div>
          <div className="text-sm text-purple-600 dark:text-purple-400">po sobě jdoucích dnů</div>
        </div>
        <div className="rounded-3xl bg-amber-50 p-5 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
          <div className="text-xs uppercase tracking-[0.18em] font-black text-amber-600 dark:text-amber-400">Current streak</div>
          <div className="mt-3 text-3xl font-black text-amber-800 dark:text-amber-200">{currentStreak}</div>
          <div className="text-sm text-amber-600 dark:text-amber-400">dnů v řadě</div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendar;

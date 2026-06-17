import { getToday } from '../../utils/date';

export default function Header({ title }: { title: string }) {
  const today = getToday();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = weekDays[new Date().getDay()];

  return (
    <header className="bg-white border-b border-warm-200 px-8 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brown-500">{title}</h2>
          <p className="text-sm text-brown-400 mt-1">
            {today} {dayOfWeek}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-warm-50 px-4 py-2 rounded-xl">
            <span className="text-2xl">🌅</span>
            <div>
              <p className="text-sm font-medium text-brown-500">祝您生意兴隆</p>
              <p className="text-xs text-brown-400">今天也要加油哦</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

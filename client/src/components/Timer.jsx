import { useEffect, useMemo, useState } from 'react';

// Countdown synced to the server clock. The server sends `endsAt` and its own
// `serverNow`; we translate the deadline into the client's clock to neutralize
// any skew, so the bar matches the authoritative server timer.
export default function Timer({ endsAt, serverNow, timeLimitMs }) {
  const clientEnd = useMemo(
    () => Date.now() + (endsAt - serverNow),
    [endsAt, serverNow]
  );
  const [remaining, setRemaining] = useState(Math.max(0, clientEnd - Date.now()));

  useEffect(() => {
    // A 250ms interval is smooth enough for the bar, far lighter than rAF, and
    // (unlike rAF) keeps advancing when the tab is backgrounded.
    setRemaining(Math.max(0, clientEnd - Date.now()));
    const id = setInterval(() => {
      setRemaining(Math.max(0, clientEnd - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, [clientEnd]);

  const seconds = Math.ceil(remaining / 1000);
  const pct = timeLimitMs ? Math.max(0, Math.min(100, (remaining / timeLimitMs) * 100)) : 0;
  const danger = seconds <= 5;

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm font-medium">
        <span className="text-slate-500">Осталось времени</span>
        <span className={danger ? 'text-red-600' : 'text-slate-700'}>{seconds} с</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-[width] duration-100 ${danger ? 'bg-red-500' : 'bg-brand-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

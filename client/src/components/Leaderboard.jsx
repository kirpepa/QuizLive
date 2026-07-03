const medals = ['🥇', '🥈', '🥉'];

// Reusable leaderboard list. `highlightId` marks the current participant.
export default function Leaderboard({ entries = [], highlightId }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">Пока нет участников.</p>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={e.participantId}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            e.participantId === highlightId
              ? 'border-brand-400 bg-brand-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="w-6 text-center font-semibold text-slate-500">
              {medals[i] || i + 1}
            </span>
            <span className="font-medium">
              {e.nickname}
              {e.connected === false && (
                <span className="ml-2 text-xs text-slate-400">(отключён)</span>
              )}
            </span>
          </span>
          <span className="font-bold text-brand-700">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}

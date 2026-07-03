import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function ParticipantDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/api/me/participations');
        setItems(data.participations);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">История участия</h1>
        <Link to="/join" className="btn-primary">
          Присоединиться к квизу
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="card text-center text-slate-500">
          Вы ещё не участвовали в квизах. Присоединитесь по коду комнаты!
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{p.session.quiz.title}</h3>
                <p className="text-xs text-slate-400">
                  {p.session.quiz.category} · код {p.session.roomCode}
                  {p.session.finishedAt &&
                    ` · ${new Date(p.session.finishedAt).toLocaleString('ru')}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-brand-700">{p.score} б.</p>
                <p className="text-xs text-slate-500">
                  Место {p.rank} из {p.totalParticipants}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

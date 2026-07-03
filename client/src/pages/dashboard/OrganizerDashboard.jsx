import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [q, s] = await Promise.all([api('/api/quizzes'), api('/api/me/sessions')]);
      setQuizzes(q.quizzes);
      setSessions(s.sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createQuiz() {
    setCreating(true);
    setError('');
    try {
      const { quiz } = await api('/api/quizzes', {
        method: 'POST',
        body: { title: 'Новый квиз' },
      });
      navigate(`/quizzes/${quiz.id}/edit`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function launch(quizId) {
    setError('');
    try {
      const { session } = await api('/api/sessions', {
        method: 'POST',
        body: { quizId },
      });
      navigate(`/host/${session.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(quizId) {
    if (!confirm('Удалить квиз со всеми вопросами и историей?')) return;
    try {
      await api(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои квизы</h1>
        <button className="btn-primary" onClick={createQuiz} disabled={creating}>
          {creating ? 'Создаём…' : '+ Новый квиз'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {quizzes.length === 0 ? (
        <div className="card text-center text-slate-500">
          У вас пока нет квизов. Создайте первый!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => (
            <div key={q.id} className="card flex flex-col">
              <div className="flex-1">
                <span className="inline-block rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {q.category}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{q.title}</h3>
                {q.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{q.description}</p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Вопросов: {q._count.questions} · Проведено сессий: {q._count.sessions}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="btn-primary flex-1"
                  onClick={() => launch(q.id)}
                  disabled={q._count.questions === 0}
                  title={q._count.questions === 0 ? 'Добавьте вопросы' : 'Запустить сессию'}
                >
                  ▶ Запустить
                </button>
                <button className="btn-secondary" onClick={() => navigate(`/quizzes/${q.id}/edit`)}>
                  Изменить
                </button>
                <button className="btn-secondary" onClick={() => remove(q.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xl font-bold">История проведённых квизов</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Проведённых сессий пока нет.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{s.quiz.title}</h3>
                    <p className="text-xs text-slate-400">
                      Код {s.roomCode} · {statusLabel(s.status)} · участников:{' '}
                      {s._count.participants}
                      {s.finishedAt && ` · ${new Date(s.finishedAt).toLocaleString('ru')}`}
                    </p>
                  </div>
                </div>
                {s.participants.length > 0 && (
                  <ol className="mt-3 space-y-1 text-sm">
                    {s.participants.slice(0, 5).map((p, i) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          {i + 1}. {p.nickname}
                        </span>
                        <span className="font-medium text-brand-700">{p.score}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(status) {
  return { pending: 'ожидание', active: 'идёт', finished: 'завершён' }[status] || status;
}

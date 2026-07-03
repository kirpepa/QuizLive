import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSocket, emitAck } from '../socket.js';
import { tokenStore, assetUrl } from '../api/client.js';
import Timer from '../components/Timer.jsx';
import Leaderboard from '../components/Leaderboard.jsx';

export default function HostSessionPage() {
  const { sessionId } = useParams();
  const [phase, setPhase] = useState('connecting'); // connecting | lobby | question | reveal | finished
  const [error, setError] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [reveal, setReveal] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    async function open() {
      const res = await emitAck('organizer:open', {
        sessionId,
        token: tokenStore.access,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setRoomCode(res.roomCode);
      setQuizTitle(res.quizTitle);
      setParticipants(res.participants || []);
      setLeaderboard(res.leaderboard || []);
      if (res.currentQuestion) {
        setQuestion(res.currentQuestion);
        setPhase('question');
      } else {
        setPhase(res.status === 'lobby' ? 'lobby' : res.status);
      }
    }

    const onParticipants = (list) => setParticipants(list);
    const onShow = (q) => {
      setQuestion(q);
      setReveal(null);
      setProgress({ answered: 0, total: 0 });
      setPhase('question');
    };
    const onProgress = (p) => setProgress(p);
    const onReveal = (data) => {
      setReveal(data);
      setLeaderboard(data.leaderboard || []);
      setPhase('reveal');
    };
    const onFinish = (data) => {
      setLeaderboard(data.leaderboard || []);
      setPhase('finished');
    };

    socket.on('room:participants', onParticipants);
    socket.on('question:show', onShow);
    socket.on('question:progress', onProgress);
    socket.on('question:reveal', onReveal);
    socket.on('quiz:finish', onFinish);
    socket.on('connect', open);
    open();

    return () => {
      socket.off('room:participants', onParticipants);
      socket.off('question:show', onShow);
      socket.off('question:progress', onProgress);
      socket.off('question:reveal', onReveal);
      socket.off('quiz:finish', onFinish);
      socket.off('connect', open);
    };
  }, [sessionId]);

  async function start() {
    const res = await emitAck('quiz:start', {});
    if (res.error) setError(res.error);
  }
  async function revealNow() {
    const res = await emitAck('quiz:reveal', {});
    if (res.error) setError(res.error);
  }
  async function next() {
    const res = await emitAck('quiz:next', {});
    if (res.error) setError(res.error);
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-red-600">{error}</p>
        <Link to="/dashboard" className="btn-secondary mt-4">
          ← В кабинет
        </Link>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join?code=${roomCode}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{quizTitle}</h1>
          <p className="text-sm text-slate-500">Панель организатора</p>
        </div>
        <Link to="/dashboard" className="btn-secondary">
          Выйти в кабинет
        </Link>
      </div>

      {/* Room code — always visible while running */}
      <div className="card flex flex-wrap items-center justify-between gap-4 bg-brand-50">
        <div>
          <p className="text-sm text-slate-500">Код комнаты</p>
          <p className="text-4xl font-black tracking-widest text-brand-700">{roomCode || '…'}</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Ссылка для входа:</p>
          <p className="font-medium text-brand-700">{joinUrl}</p>
        </div>
      </div>

      {phase === 'lobby' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Подключились: {participants.length}
            </h2>
            <button className="btn-primary" onClick={start} disabled={participants.length === 0}>
              ▶ Начать квиз
            </button>
          </div>
          {participants.length === 0 ? (
            <p className="text-sm text-slate-500">Ожидаем участников…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <span
                  key={p.participantId}
                  className="rounded-full bg-white px-3 py-1 text-sm shadow-sm"
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'question' && question && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Вопрос {question.index + 1} из {question.total}
            </span>
            <span>
              Ответили: {progress.answered} / {progress.total}
            </span>
          </div>
          <Timer
            endsAt={question.endsAt}
            serverNow={question.serverNow}
            timeLimitMs={question.timeLimitMs}
          />
          <h2 className="text-2xl font-bold">{question.text}</h2>
          {question.imageUrl && (
            <img
              src={assetUrl(question.imageUrl)}
              alt=""
              className="max-h-64 rounded-lg border border-slate-200"
            />
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                {o.text}
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={revealNow}>
            Показать ответ сейчас
          </button>
        </div>
      )}

      {phase === 'reveal' && reveal && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">Правильный ответ</h2>
            {question?.options.map((o) => {
              const correct = reveal.correctOptionIds.includes(o.id);
              return (
                <div
                  key={o.id}
                  className={`rounded-lg border px-4 py-3 ${
                    correct
                      ? 'border-green-400 bg-green-50 font-medium text-green-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {correct ? '✓ ' : ''}
                  {o.text}
                </div>
              );
            })}
            <button className="btn-primary w-full" onClick={next}>
              {reveal.isLast ? '🏁 Завершить и показать итоги' : 'Следующий вопрос →'}
            </button>
          </div>
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold">Лидерборд</h2>
            <Leaderboard entries={leaderboard} />
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="card space-y-4 text-center">
          <h2 className="text-2xl font-bold">🏆 Итоги квиза</h2>
          {leaderboard[0] && (
            <p className="text-lg">
              Победитель: <b className="text-brand-700">{leaderboard[0].nickname}</b> с{' '}
              {leaderboard[0].score} баллами!
            </p>
          )}
          <div className="mx-auto max-w-md text-left">
            <Leaderboard entries={leaderboard} />
          </div>
          <Link to="/dashboard" className="btn-primary">
            В кабинет
          </Link>
        </div>
      )}
    </div>
  );
}

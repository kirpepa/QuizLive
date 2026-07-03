import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function JoinPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const cleanCode = code.trim().toUpperCase();
    try {
      // Validate the room exists and is joinable before opening the socket.
      const { session } = await api(`/api/sessions/room/${cleanCode}`);
      if (session.status === 'finished') {
        throw new Error('Этот квиз уже завершён');
      }
      navigate('/play', { state: { code: cleanCode, nickname: nickname.trim() } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">Присоединиться к квизу</h1>
        <p className="mb-5 text-sm text-slate-500">
          Введите код комнаты от организатора и придумайте никнейм.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Код комнаты</label>
            <input
              className="input text-center text-2xl font-bold uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              required
            />
          </div>
          <div>
            <label className="label">Ваш никнейм</label>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Например, Аня"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Проверяем…' : 'Войти в комнату'}
          </button>
        </form>
        {!user && (
          <p className="mt-4 text-center text-xs text-slate-500">
            Можно играть без регистрации. Но история сохранится только у
            зарегистрированных участников.
          </p>
        )}
      </div>
    </div>
  );
}

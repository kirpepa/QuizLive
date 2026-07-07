import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function handleJoin(e) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    navigate(clean ? `/join?code=${clean}` : '/join');
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-500 to-brand-700 px-6 py-10 text-white shadow-card sm:px-10 sm:py-14">
        {/* decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            ⚡ Играйте вместе в реальном времени
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Квизы, в которые
            <br className="hidden sm:block" /> играют всей компанией
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-lg">
            Введите код от ведущего — и отвечайте на вопросы одновременно со всеми.
            Чем быстрее и точнее ответ, тем выше место в таблице лидеров.
          </p>

          {/* Join by code — primary action for participants */}
          <form onSubmit={handleJoin} className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="Код комнаты"
              className="h-12 w-full rounded-xl border-0 bg-white/95 px-4 text-center text-lg font-bold uppercase tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:font-medium placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-white/40 sm:w-52"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-white px-6 text-[15px] font-bold text-brand-600 transition hover:bg-brand-50 active:scale-[0.98]"
            >
              Присоединиться
            </button>
          </form>
        </div>
      </section>

      {/* How it works — plain, non-technical steps */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            n: '1',
            title: 'Введите код',
            text: 'Ведущий покажет код комнаты — введите его и своё имя. Регистрация не нужна.',
          },
          {
            n: '2',
            title: 'Отвечайте на скорость',
            text: 'Вопросы появляются у всех сразу. Успейте выбрать верный ответ, пока идёт время.',
          },
          {
            n: '3',
            title: 'Побеждайте',
            text: 'После каждого вопроса обновляется таблица лидеров. В финале — общий рейтинг.',
          },
        ].map((s) => (
          <div key={s.n} className="card transition-shadow hover:shadow-card-hover">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-base font-bold text-brand-600">
              {s.n}
            </span>
            <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      {/* Organizer CTA */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-white p-6 shadow-card sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-ink">Хотите провести свой квиз?</h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted">
            Соберите вопросы с картинками, одиночным или множественным выбором,
            запустите комнату и ведите игру с большого экрана.
          </p>
        </div>
        {user ? (
          <Link to="/dashboard" className="btn-primary shrink-0">
            Перейти в кабинет
          </Link>
        ) : (
          <Link to="/register" className="btn-primary shrink-0">
            Создать квиз
          </Link>
        )}
      </section>
    </div>
  );
}

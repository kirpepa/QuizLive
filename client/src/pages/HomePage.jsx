import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 p-10 text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Квизы в реальном времени</h1>
        <p className="mt-3 max-w-xl text-brand-50">
          Создавайте квизы, запускайте комнаты и играйте всей группой одновременно.
          Вопросы транслируются мгновенно, баллы считаются с учётом скорости, а
          победители определяются на живом лидерборде.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/join" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Присоединиться по коду
          </Link>
          {user ? (
            <Link to="/dashboard" className="btn border border-white/40 text-white hover:bg-white/10">
              Мой кабинет
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn border border-white/40 text-white hover:bg-white/10"
            >
              Создать квиз
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Для организаторов',
            text: 'Создавайте квизы с вопросами разных типов, картинками, одиночным и множественным выбором.',
          },
          {
            title: 'Для участников',
            text: 'Заходите по 6-значному коду комнаты — регистрация не обязательна. Отвечайте на ходу.',
          },
          {
            title: 'Реальное время',
            text: 'Серверный таймер, живой лидерборд и мгновенная синхронизация вопросов через WebSocket.',
          },
        ].map((f) => (
          <div key={f.title} className="card">
            <h3 className="font-semibold text-slate-800">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

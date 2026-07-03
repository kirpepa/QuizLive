import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-600">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            Q
          </span>
          QuizLive
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/join" className="btn-secondary">
            Присоединиться
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="btn-secondary">
                Кабинет
              </Link>
              <span className="hidden text-slate-500 sm:inline">
                {user.nickname} · {user.role === 'organizer' ? 'организатор' : 'участник'}
              </span>
              <button onClick={handleLogout} className="btn-secondary">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">
                Вход
              </Link>
              <Link to="/register" className="btn-primary">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

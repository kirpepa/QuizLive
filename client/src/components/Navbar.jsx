import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/80 shadow-header backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/join" className="btn-secondary hidden sm:inline-flex">
            Ввести код
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="btn-ghost font-semibold">
                Кабинет
              </Link>
              <span className="hidden items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-[13px] font-medium text-muted md:inline-flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  {user.nickname?.[0]?.toUpperCase() || '?'}
                </span>
                {user.nickname}
              </span>
              <button onClick={handleLogout} className="btn-ghost" title="Выйти">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost font-semibold">
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

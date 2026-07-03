import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuizEditorPage from './pages/QuizEditorPage.jsx';
import HostSessionPage from './pages/HostSessionPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import PlayPage from './pages/PlayPage.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/play" element={<PlayPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:id/edit"
            element={
              <ProtectedRoute role="organizer">
                <QuizEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/:sessionId"
            element={
              <ProtectedRoute role="organizer">
                <HostSessionPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div className="p-10 text-center">Страница не найдена</div>} />
        </Routes>
      </main>
    </div>
  );
}

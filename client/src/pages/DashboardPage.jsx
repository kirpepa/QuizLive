import { useAuth } from '../context/AuthContext.jsx';
import OrganizerDashboard from './dashboard/OrganizerDashboard.jsx';
import ParticipantDashboard from './dashboard/ParticipantDashboard.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  return user.role === 'organizer' ? <OrganizerDashboard /> : <ParticipantDashboard />;
}

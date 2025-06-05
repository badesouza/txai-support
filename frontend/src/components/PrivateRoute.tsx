import { Navigate } from 'react-router-dom';
import MasterPage from './MasterPage';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <MasterPage>{children}</MasterPage>;
} 
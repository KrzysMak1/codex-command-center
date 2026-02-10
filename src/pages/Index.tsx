import { useAppStore } from '@/store/useAppStore';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';

const Index = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Dashboard /> : <LoginPage />;
};

export default Index;

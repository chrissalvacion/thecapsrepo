import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users, 
  FolderKanban, 
  ShieldCheck, 
  MessageSquare, 
  LogOut,
  UserCheck,
  BarChart3,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';

export default function Layout({ user, onLogout }: { user: any, onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    onLogout();
    navigate('/login');
  };

  const activeClass = "bg-primary text-primary-foreground";
  const inactiveClass = "text-muted-foreground hover:bg-muted hover:text-foreground";

  const menuItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Defense', path: '/defenses', icon: ShieldCheck },
    { name: 'Consultations', path: '/consultations', icon: MessageSquare },
    { name: 'Panelists', path: '/panelists', icon: UserCheck },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const bottomMenuItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col pt-6">
        <div className="px-6 mb-8 flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">TheCapsRepo</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${isActive ? activeClass : inactiveClass}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-2 space-y-1">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${isActive ? activeClass : inactiveClass}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
          </div>
          <div className="flex items-center gap-4">
            <Link to="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {user?.name || user?.email}
            </Link>
          </div>
        </header>
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

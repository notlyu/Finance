import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Главная', path: '/' },
    { name: 'Операции', path: '/transactions' },
    { name: 'Цели', path: '/goals' },
    { name: 'Желания', path: '/wishes' },
    { name: 'Подушка', path: '/safety-pillow' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white shadow-lg">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-indigo-600">Финансы</h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">Выйти</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header & bottom nav */}
      <div className="flex flex-col flex-1 md:ml-64">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Финансы</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>Меню</button>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {item.name}
              </Link>
            ))}
            <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Выйти</button>
          </div>
        )}
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
        <div className="md:hidden bg-white border-t border-gray-200 flex justify-around py-2">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="text-xs text-gray-600">{item.name}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
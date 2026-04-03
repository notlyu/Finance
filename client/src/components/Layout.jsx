import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const memberMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setSelectedMember(res.data);
        
        if (res.data.family_id) {
          try {
            const famRes = await api.get(`/families/${res.data.family_id}`);
            if (famRes.data && famRes.data.Members) {
              setFamilyMembers(famRes.data.Members);
            }
          } catch (err) {
            console.error('Failed to fetch family members:', err);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (memberMenuRef.current && !memberMenuRef.current.contains(e.target)) {
        setMemberMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setMemberMenuOpen(false);
    window.dispatchEvent(new Event('memberContextChanged'));
  };

  // Primary nav items (always visible on mobile)
  const primaryNav = [
    { name: 'Главная', path: '/', icon: '🏠' },
    { name: 'Операции', path: '/transactions', icon: '💳' },
    { name: 'Цели', path: '/goals', icon: '🎯' },
    { name: 'Аналитика', path: '/analytics', icon: '📊' },
  ];

  // Secondary nav items (in "More" menu on mobile)
  const secondaryNav = [
    { name: 'Регулярные', path: '/recurring', icon: '🔄' },
    { name: 'Желания', path: '/wishes', icon: '⭐' },
    { name: 'Подушка', path: '/safety-pillow', icon: '🛡️' },
    { name: 'Бюджеты', path: '/budgets', icon: '💰' },
    { name: 'Семья', path: '/family', icon: '👨‍👩‍👧' },
    { name: 'Настройки', path: '/settings', icon: '⚙️' },
  ];

  const allNavItems = [...primaryNav, ...secondaryNav];

  // Member switcher component
  const MemberSwitcher = () => (
    <div className="relative" ref={memberMenuRef}>
      <button
        onClick={() => setMemberMenuOpen(!memberMenuOpen)}
        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {selectedMember?.name?.charAt(0) || '?'}
        </div>
        <span className="hidden sm:inline max-w-24 truncate">{selectedMember?.name || '...'}</span>
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {memberMenuOpen && familyMembers.length > 1 && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2">Переключить вид</p>
          </div>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => selectMember(m)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                selectedMember?.id === m.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                {m.name?.charAt(0) || '?'}
              </div>
              <span className="truncate">{m.name}</span>
              {selectedMember?.id === m.id && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-gray-900 shadow-lg">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Финансы</h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {allNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex flex-col border-t border-gray-200 dark:border-gray-700 p-3 gap-2">
          <MemberSwitcher />
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.name}</p>
              <button onClick={logout} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-left">Выйти</button>
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Mobile header & bottom nav */}
      <div className="flex flex-col flex-1 md:ml-64">
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Финансы</h1>
          <div className="flex items-center gap-2">
            <MemberSwitcher />
            <NotificationBell />
            <button className="text-gray-700 dark:text-gray-200" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>Меню</button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 shadow-lg p-2">
            {allNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {item.icon} {item.name}
              </Link>
            ))}
            <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Выйти</button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 text-gray-900 dark:text-gray-100 pb-16">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet context={{ selectedMember }} />
          </div>
        </main>
        {/* Mobile bottom nav */}
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around py-1 px-1 fixed bottom-0 left-0 right-0 z-40">
          {primaryNav.map((item) => (
            <Link key={item.path} to={item.path} className="flex flex-col items-center py-1 px-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          ))}
          {/* More button */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="flex flex-col items-center py-1 px-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <span className="text-lg">⋯</span>
              <span className="text-[10px] mt-0.5">Ещё</span>
            </button>
            {moreMenuOpen && (
              <div className="absolute bottom-full right-0 mb-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
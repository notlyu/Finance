import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const typeIcons = {
  goal_reached: '🎯',
  wish_completed: '✨',
  budget_exceeded: '⚠️',
  recurring_created: '📅',
  pillow_alert: '🛡️',
  info: 'ℹ️',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications', { params: { limit: 15 } }),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifsRes.data.notifications || []);
      setUnreadCount(countRes.data.count || 0);
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-on-surface-variant hover:opacity-70 transition-opacity active:scale-95"
        title="Уведомления"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-on-surface text-base">Уведомления</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">
                  Прочитать все
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2">notifications_none</span>
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-4 border-b border-outline-variant/10 transition ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 shrink-0">{typeIcons[n.type] || 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface">{n.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.read && (
                        <button onClick={() => markAsRead(n.id)} className="text-xs text-primary hover:underline px-1">✓</button>
                      )}
                      <button onClick={() => deleteNotif(n.id)} className="text-xs text-error hover:underline px-1">✕</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-outline-variant/20 text-center">
            <Link
              to="/settings"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Настройки уведомлений →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

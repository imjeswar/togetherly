import React, { useState, useEffect } from 'react';
import { Bell, Heart, Sparkles, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
  const { user, partner, relationship, isPaired, quickLogin, refreshUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: Notification) => !n.isRead).length);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel-subtle border-b border-white/5 px-4 lg:px-8 py-3 transition-all duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Greeting & Tagline */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-togetherly-rose flex items-center gap-1.5">
              <span>Togetherly</span>
              <span className="w-1.5 h-1.5 rounded-full bg-togetherly-gold inline-block animate-pulse" />
            </h1>
          </div>
          <p className="font-serif text-lg md:text-xl font-medium text-togetherly-text">
            {getGreeting()}, <span className="text-togetherly-roseLight">{user?.firstName || 'Love'}</span>
          </p>
        </div>

        {/* Center: Coupled Avatars with Spark */}
        {isPaired && partner && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-white/10 shadow-sm">
            <div className="relative">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user?.firstName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-togetherly-rose/50"
              />
            </div>
            
            <motion.div
              animate={{ scale: [1, 1.25, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-togetherly-gold"
            >
              <Heart className="w-4 h-4 fill-togetherly-rose text-togetherly-rose" />
            </motion.div>

            <div className="relative">
              <img
                src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'}
                alt={partner?.firstName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-togetherly-gold/50"
              />
            </div>
            <span className="text-xs text-togetherly-textMuted font-medium pr-1">
              & {partner.firstName}
            </span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher (Instant Partner Switch for Evaluation) */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs text-togetherly-textMuted">
            <span className="text-[11px] uppercase tracking-wider text-togetherly-gold font-medium">Demo:</span>
            {user?.email === 'alex@togetherly.app' ? (
              <button
                onClick={() => quickLogin('sarah')}
                className="text-togetherly-rose hover:text-white transition-colors flex items-center gap-1 font-medium"
                title="Switch view to Sarah"
              >
                <span>Switch to Sarah</span>
                <RefreshCw className="w-3 h-3" />
              </button>
            ) : user?.email === 'sarah@togetherly.app' ? (
              <button
                onClick={() => quickLogin('alex')}
                className="text-togetherly-rose hover:text-white transition-colors flex items-center gap-1 font-medium"
                title="Switch view to Alex"
              >
                <span>Switch to Alex</span>
                <RefreshCw className="w-3 h-3" />
              </button>
            ) : null}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) loadNotifications();
              }}
              className="p-2 rounded-full glass-panel hover:bg-white/10 text-togetherly-text transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-togetherly-textMuted hover:text-togetherly-rose transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-togetherly-rose text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-glow-rose">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl shadow-2xl border border-white/10 p-4 z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-togetherly-gold" />
                      <h4 className="font-medium text-sm text-togetherly-text">Notifications</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-togetherly-rose hover:text-togetherly-roseLight transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-togetherly-textMuted text-sm">
                        <Heart className="w-6 h-6 mx-auto mb-2 opacity-40 text-togetherly-rose" />
                        No notifications yet. You are all caught up!
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs transition-colors ${
                            n.isRead
                              ? 'bg-white/[0.02] border-white/5 text-togetherly-textMuted'
                              : 'bg-togetherly-rose/10 border-togetherly-rose/30 text-togetherly-text'
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium mb-1">
                            <span className="text-togetherly-roseLight">{n.title}</span>
                            <span className="text-[10px] text-togetherly-textMuted">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

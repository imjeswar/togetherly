import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Sparkles,
  Gamepad2,
  CalendarHeart,
  User,
  Compass,
  LogOut,
  Flame,
  HeartHandshake,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export const Sidebar: React.FC = () => {
  const { user, partner, relationship, isPaired, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Connect', path: '/connect', icon: Sparkles, badge: 'Daily' },
    { label: 'Games', path: '/games', icon: Gamepad2 },
    { label: 'Memories & Calendar', path: '/memories', icon: CalendarHeart },
    { label: 'Date Ideas', path: '/date-ideas', icon: Compass },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/welcome');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-togetherly-bgSecondary/90 border-r border-white/5 p-6 h-screen sticky top-0 justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-togetherly-roseDark to-togetherly-rose flex items-center justify-center shadow-glow-rose/40">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold tracking-wide text-togetherly-text">
              Togetherly
            </h2>
            <p className="text-[11px] text-togetherly-textMuted tracking-tight">
              A little moment. A stronger connection.
            </p>
          </div>
        </div>

        {/* Pairing Status Card */}
        {isPaired && relationship ? (
          <div className="mb-6 p-3.5 rounded-2xl glass-panel-accent border border-togetherly-rose/20">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-togetherly-gold font-medium flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-togetherly-gold text-togetherly-gold" />
                {relationship.streakCount} Day Streak
              </span>
              <span className="text-togetherly-roseLight font-medium">
                {relationship.couplePoints} pts
              </span>
            </div>
            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-togetherly-rose to-togetherly-gold h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (relationship.couplePoints % 100) || 50)}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/pair')}
            className="mb-6 p-3.5 rounded-2xl bg-togetherly-rose/10 border border-togetherly-rose/30 cursor-pointer hover:bg-togetherly-rose/15 transition-all text-xs"
          >
            <div className="flex items-center gap-2 text-togetherly-rose font-medium mb-1">
              <HeartHandshake className="w-4 h-4" />
              <span>Connect Partner</span>
            </div>
            <p className="text-togetherly-textMuted text-[11px]">
              Pair your spaces to unlock daily shared magic.
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-togetherly-card text-togetherly-rose border border-togetherly-rose/20 shadow-sm'
                      : 'text-togetherly-textMuted hover:text-togetherly-text hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-togetherly-rose' : ''}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-togetherly-rose/20 text-togetherly-roseLight">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer & Logout */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={user?.firstName}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-togetherly-text truncate">
                {user?.firstName} {user?.lastName || ''}
              </p>
              <p className="text-[11px] text-togetherly-textMuted truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-togetherly-textMuted hover:text-togetherly-rose hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};


import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import {
  CalendarHeart,
  Camera,
  Heart,
  Palette,
  MessageCircle,
  Award,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const MemoriesPage: React.FC = () => {
  const { user, partner, relationship } = useAuth();

  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [memories, setMemories] = useState<any[]>([]);
  const [daysTogether, setDaysTogether] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // New Milestone Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    mediaUrl: '',
    type: 'MILESTONE',
  });

  // Calendar State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await api.memories.getAll(filterType === 'ALL' ? undefined : filterType);
      setMemories(data.memories || []);
      setDaysTogether(data.daysTogether || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async (y: number, m: number) => {
    try {
      const res = await api.memories.getCalendar(y, m);
      setCalendarData(res.calendar || {});
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (viewMode === 'timeline') {
      loadMemories();
    } else {
      loadCalendar(currentYear, currentMonth);
    }
  }, [viewMode, filterType, currentYear, currentMonth]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.memories.createMilestone(newMilestone);
      setShowAddModal(false);
      setNewMilestone({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        mediaUrl: '',
        type: 'MILESTONE',
      });
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#E8A0A8', '#D9B77E'],
      });
      await loadMemories();
    } catch (err) {
      console.error(err);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Helper to build month days grid
  const renderCalendarGrid = () => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-16 md:h-20 bg-transparent" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData[dateStr];
      const hasActivities = Boolean(dayData && (dayData.memories?.length || dayData.photos?.length || dayData.activities?.length));

      cells.push(
        <div
          key={dateStr}
          onClick={() => {
            if (hasActivities) setSelectedCalendarDate(dateStr);
          }}
          className={`h-16 md:h-20 p-1.5 rounded-xl border transition-all flex flex-col justify-between ${
            hasActivities
              ? 'bg-togetherly-rose/10 border-togetherly-rose/30 cursor-pointer hover:border-togetherly-rose hover:scale-[1.02]'
              : 'bg-white/[0.02] border-white/5 opacity-80'
          }`}
        >
          <span className="text-xs font-medium text-togetherly-text">{day}</span>
          {hasActivities && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-togetherly-rose animate-pulse shadow-glow-rose" />
              <span className="text-[10px] text-togetherly-roseLight truncate hidden sm:inline">
                {dayData.memories?.length || dayData.photos?.length} moments
              </span>
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="relative rounded-3xl glass-panel-accent p-6 md:p-8 overflow-hidden border border-togetherly-rose/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-togetherly-gold font-medium">
              Sanctuary History & Milestones
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-togetherly-text mt-1">
              Memories & Timeline
            </h2>
            <p className="text-xs md:text-sm text-togetherly-textMuted mt-1">
              You and {partner?.firstName || 'your partner'} have created{' '}
              <strong className="text-togetherly-roseLight font-medium">
                {daysTogether} beautiful days
              </strong>{' '}
              together.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose hover:opacity-95 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Milestone</span>
          </button>
        </div>
      </section>

      {/* View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        {/* Timeline vs Calendar Toggle */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 self-start">
          <button
            onClick={() => setViewMode('timeline')}
            className={`py-1.5 px-4 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'timeline'
                ? 'bg-togetherly-card text-togetherly-rose border border-togetherly-rose/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Chronological Timeline
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`py-1.5 px-4 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-togetherly-card text-togetherly-gold border border-togetherly-gold/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Monthly Calendar
          </button>
        </div>

        {/* Timeline Category Filters (only in timeline view) */}
        {viewMode === 'timeline' && (
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'PHOTO', 'QUESTION', 'MILESTONE', 'DRAWING', 'GAME', 'LOVE_NOTE'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filterType === t
                    ? 'bg-togetherly-rose/20 text-togetherly-rose border border-togetherly-rose/30'
                    : 'bg-white/5 text-togetherly-textMuted hover:text-white border border-white/5'
                }`}
              >
                {t === 'ALL' ? 'All Moments' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TIMELINE VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="space-y-4 animate-fade-in">
          {memories.length === 0 ? (
            <div className="text-center py-16 text-togetherly-textMuted text-xs">
              <CalendarHeart className="w-8 h-8 mx-auto mb-2 opacity-30 text-togetherly-rose" />
              No memories recorded in this filter yet. Capture your moments to see them flourish here!
            </div>
          ) : (
            <div className="relative pl-6 md:pl-8 border-l border-white/10 space-y-6">
              {memories.map((mem) => (
                <div key={mem.id} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <span className="absolute -left-[31px] md:-left-[39px] top-4 w-4 h-4 rounded-full bg-togetherly-bg border-2 border-togetherly-rose flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-togetherly-rose" />
                  </span>

                  <GlassCard className="p-5 md:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-togetherly-gold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                        {mem.type}
                      </span>
                      <span className="text-xs text-togetherly-textMuted font-mono">
                        {new Date(mem.date).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-semibold text-togetherly-text">
                      {mem.title}
                    </h4>

                    {mem.description && (
                      <p className="text-xs text-togetherly-textMuted leading-relaxed">
                        {mem.description}
                      </p>
                    )}

                    {mem.mediaUrl && (
                      <div className="rounded-2xl overflow-hidden aspect-video max-h-72 bg-black/40 border border-white/10 mt-2">
                        <img
                          src={mem.mediaUrl}
                          alt={mem.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </GlassCard>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MONTHLY CALENDAR VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
          {/* Calendar Header Controls */}
          <GlassCard className="p-4 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-white/10 text-togetherly-textMuted hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-xl font-medium text-togetherly-text">
              {monthNames[currentMonth - 1]} {currentYear}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-white/10 text-togetherly-textMuted hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </GlassCard>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-togetherly-textMuted font-medium py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendarGrid()}
          </div>
        </div>
      )}

      {/* ADD CUSTOM MILESTONE MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Special Relationship Milestone"
      >
        <form onSubmit={handleCreateMilestone} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Milestone Title *
            </label>
            <input
              type="text"
              required
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              placeholder="e.g. Our First Trip to the Coast"
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              required
              value={newMilestone.date}
              onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none text-togetherly-text"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Photo URL (Optional)
            </label>
            <input
              type="url"
              value={newMilestone.mediaUrl}
              onChange={(e) => setNewMilestone({ ...newMilestone, mediaUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Story / Description
            </label>
            <textarea
              rows={3}
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              placeholder="What made this moment unforgettable?"
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all"
          >
            Save Milestone to Timeline
          </button>
        </form>
      </Modal>

      {/* CALENDAR DAY DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedCalendarDate)}
        onClose={() => setSelectedCalendarDate(null)}
        title={selectedCalendarDate ? `Moments on ${selectedCalendarDate}` : 'Day Activities'}
      >
        {selectedCalendarDate && calendarData[selectedCalendarDate] && (
          <div className="space-y-4">
            {calendarData[selectedCalendarDate].memories?.map((m: any) => (
              <div key={m.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] text-togetherly-gold font-bold uppercase tracking-wider">
                  {m.type}
                </span>
                <h5 className="font-serif text-sm font-semibold text-togetherly-text">{m.title}</h5>
                {m.description && <p className="text-xs text-togetherly-textMuted">{m.description}</p>}
              </div>
            ))}

            {calendarData[selectedCalendarDate].photos?.map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <img src={p.photoUrl} alt="Photo" className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <span className="text-xs font-semibold text-togetherly-roseLight">{p.user?.firstName}</span>
                  <p className="text-xs text-togetherly-textMuted">{p.caption || 'Daily photo snapshot'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};


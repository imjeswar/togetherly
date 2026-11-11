import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import {
  Compass,
  Heart,
  X,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORIES = [
  { id: 'ALL', label: 'All Dates' },
  { id: 'AT_HOME', label: 'At-Home' },
  { id: 'OUTDOORS', label: 'Outdoors' },
  { id: 'ROMANTIC', label: 'Romantic' },
  { id: 'BUDGET', label: 'Budget-Friendly' },
  { id: 'FOOD', label: 'Food Dates' },
  { id: 'MOVIE', label: 'Movie Nights' },
  { id: 'TRAVEL', label: 'Travel & Trips' },
  { id: 'LONG_DISTANCE', label: 'Long-Distance' },
];

export const DateIdeasPage: React.FC = () => {
  const { user, partner, relationship } = useAuth();

  const [dateIdeas, setDateIdeas] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'swipe' | 'matches'>('swipe');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedDates, setMatchedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Match Celebration Modal
  const [celebrationMatch, setCelebrationMatch] = useState<any | null>(null);

  // AI Date Generator Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAiForm] = useState({
    budget: '$$',
    locationType: 'AT_HOME',
    duration: '2 hours',
    interests: ['Cooking', 'Music'],
  });
  const [aiGeneratedDate, setAiGeneratedDate] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Scheduling Modal
  const [scheduleModalDate, setScheduleModalDate] = useState<any | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const loadDateIdeas = async () => {
    setLoading(true);
    try {
      const [ideasRes, matchesRes] = await Promise.all([
        api.dateIdeas.getAll(selectedCategory === 'ALL' ? undefined : selectedCategory),
        api.dateIdeas.getMatches(),
      ]);
      setDateIdeas(ideasRes.dateIdeas || []);
      setMatchedDates(matchesRes.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDateIdeas();
    setCurrentIndex(0);
  }, [selectedCategory]);

  const handleSwipe = async (action: 'LIKE' | 'PASS') => {
    const currentIdea = dateIdeas[currentIndex];
    if (!currentIdea) return;

    try {
      const res = await api.dateIdeas.swipe(currentIdea.id, action);
      if (res.isMutualMatch) {
        setCelebrationMatch(currentIdea);
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
        });
        await loadDateIdeas();
      }

      if (currentIndex + 1 < dateIdeas.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalDate) return;
    try {
      await api.dateIdeas.schedule(scheduleModalDate.dateIdeaId, scheduleDateTime, scheduleNotes);
      setScheduleModalDate(null);
      await loadDateIdeas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteDate = async (dateIdeaId: string) => {
    try {
      await api.dateIdeas.complete(dateIdeaId);
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#E8A0A8', '#D9B77E'],
      });
      await loadDateIdeas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAIDate = async () => {
    setAiLoading(true);
    try {
      const res = await api.ai.generateDate(aiForm);
      setAiGeneratedDate(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const currentIdea = dateIdeas[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest text-togetherly-rose font-medium">
            Romantic Adventures
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-togetherly-text">
            Date Ideas
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-togetherly-gold/20 text-togetherly-gold text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Date Architect</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher & Category Filters */}
      <div className="space-y-3">
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 max-w-sm">
          <button
            onClick={() => setViewMode('swipe')}
            className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'swipe'
                ? 'bg-togetherly-card text-togetherly-rose border border-togetherly-rose/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Discover & Swipe
          </button>
          <button
            onClick={() => setViewMode('matches')}
            className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'matches'
                ? 'bg-togetherly-card text-togetherly-gold border border-togetherly-gold/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            <span>Mutual Matches</span>
            {matchedDates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-togetherly-gold/20 text-togetherly-gold text-[10px] font-bold">
                {matchedDates.length}
              </span>
            )}
          </button>
        </div>

        {/* Categories Pills */}
        <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-togetherly-rose text-black font-semibold shadow-glow-rose/40'
                  : 'bg-white/5 text-togetherly-textMuted hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SWIPE / DISCOVER VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'swipe' && (
        <div className="max-w-md mx-auto space-y-6 animate-fade-in pt-4">
          {currentIdea ? (
            <div className="relative">
              {/* Main Swipe Card */}
              <GlassCard className="p-7 md:p-8 relative min-h-[360px] flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-togetherly-rose/10 rounded-full blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-togetherly-gold px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                      {currentIdea.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-togetherly-textMuted">
                      <span className="flex items-center gap-0.5 text-togetherly-roseLight font-medium">
                        {currentIdea.budget}
                      </span>
                      {currentIdea.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {currentIdea.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-serif text-2xl font-semibold text-togetherly-text mb-3 leading-tight">
                    {currentIdea.title}
                  </h3>

                  <p className="text-sm text-togetherly-textMuted leading-relaxed">
                    {currentIdea.description}
                  </p>
                </div>

                {/* Partner liking status indicator */}
                {currentIdea.partnerLiked && (
                  <div className="p-3 rounded-xl bg-togetherly-rose/10 border border-togetherly-rose/25 text-xs text-togetherly-roseLight flex items-center gap-2 mt-4">
                    <Heart className="w-3.5 h-3.5 fill-togetherly-rose text-togetherly-rose" />
                    <span>{partner?.firstName || 'Partner'} already liked this idea! Swipe right to match!</span>
                  </div>
                )}

                <div className="pt-4 text-center text-[11px] text-togetherly-textMuted">
                  Idea {currentIndex + 1} of {dateIdeas.length}
                </div>
              </GlassCard>

              {/* Action Buttons: Pass & Like */}
              <div className="flex items-center justify-center gap-6 mt-6">
                <button
                  onClick={() => handleSwipe('PASS')}
                  className="w-14 h-14 rounded-full glass-panel hover:bg-white/10 text-togetherly-textMuted hover:text-white flex items-center justify-center border border-white/10 shadow-lg active:scale-95 transition-all"
                  aria-label="Pass on date"
                >
                  <X className="w-6 h-6" />
                </button>

                <button
                  onClick={() => handleSwipe('LIKE')}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-togetherly-roseDark to-togetherly-rose text-white flex items-center justify-center shadow-glow-rose active:scale-95 transition-all"
                  aria-label="Like date"
                >
                  <Heart className="w-7 h-7 fill-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-togetherly-textMuted text-xs">
              <Compass className="w-8 h-8 mx-auto mb-2 opacity-30 text-togetherly-rose" />
              You've explored all date ideas in this category! Check your mutual matches or pick another category.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MUTUAL MATCHES VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'matches' && (
        <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
          {matchedDates.length === 0 ? (
            <div className="text-center py-16 text-togetherly-textMuted text-xs">
              <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-30 text-togetherly-gold" />
              No mutual date matches yet. Keep swiping with your partner until both of you like the same date!
            </div>
          ) : (
            matchedDates.map((match) => (
              <GlassCard key={match.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-togetherly-roseLight">
                      {match.dateIdea.category.replace('_', ' ')}
                    </span>
                    <h4 className="font-serif text-xl font-semibold text-togetherly-text mt-0.5">
                      {match.dateIdea.title}
                    </h4>
                    <p className="text-xs text-togetherly-textMuted mt-1 leading-relaxed max-w-xl">
                      {match.dateIdea.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!match.isCompleted ? (
                      <>
                        <button
                          onClick={() => setScheduleModalDate(match)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-togetherly-gold font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{match.scheduledFor ? 'Reschedule' : 'Plan Date'}</span>
                        </button>
                        <button
                          onClick={() => handleCompleteDate(match.dateIdeaId)}
                          className="px-3.5 py-2 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose hover:opacity-95 transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>

                {match.scheduledFor && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-togetherly-gold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Scheduled for: {new Date(match.scheduledFor).toLocaleDateString()}</span>
                    {match.notes && <span className="text-togetherly-textMuted">• {match.notes}</span>}
                  </div>
                )}
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* MUTUAL MATCH CELEBRATION MODAL */}
      <Modal
        isOpen={Boolean(celebrationMatch)}
        onClose={() => setCelebrationMatch(null)}
        title="It's a Date Match! 💖"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-togetherly-rose/20 text-togetherly-rose flex items-center justify-center mx-auto shadow-glow-rose">
            <HeartHandshake className="w-8 h-8 fill-togetherly-rose text-togetherly-rose" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-togetherly-text">
            You both loved this date!
          </h3>
          <p className="font-serif text-lg text-togetherly-gold font-medium">
            "{celebrationMatch?.title}"
          </p>
          <p className="text-xs text-togetherly-textMuted leading-relaxed max-w-sm mx-auto">
            Both of you swiped right! It has been saved into your Mutual Matches so you can schedule it on your shared calendar.
          </p>
          <button
            onClick={() => {
              setCelebrationMatch(null);
              setViewMode('matches');
            }}
            className="w-full py-3 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all"
          >
            View Mutual Matches
          </button>
        </div>
      </Modal>

      {/* SCHEDULE DATE MODAL */}
      <Modal
        isOpen={Boolean(scheduleModalDate)}
        onClose={() => setScheduleModalDate(null)}
        title="Plan & Schedule Date"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose text-togetherly-text"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Notes / Preparations
            </label>
            <input
              type="text"
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              placeholder="e.g. Bring fairy lights and cozy blanket"
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose text-togetherly-text"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-togetherly-gold text-black font-semibold text-xs shadow-glow-gold hover:opacity-95 transition-all"
          >
            Add to Shared Calendar
          </button>
        </form>
      </Modal>

      {/* AI DATE ARCHITECT MODAL */}
      <Modal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="Togetherly AI Date Architect"
      >
        <div className="space-y-4">
          <p className="text-xs text-togetherly-textMuted leading-relaxed">
            Generate a personalized date plan based on your preferred atmosphere, budget, and shared interests.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                Atmosphere
              </label>
              <select
                value={aiForm.locationType}
                onChange={(e) => setAiForm({ ...aiForm, locationType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
              >
                <option value="AT_HOME">At-Home Cozy</option>
                <option value="OUTDOORS">Outdoors Scenic</option>
                <option value="ROMANTIC">Intimate Dinner</option>
                <option value="LONG_DISTANCE">Virtual Together</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                Budget
              </label>
              <select
                value={aiForm.budget}
                onChange={(e) => setAiForm({ ...aiForm, budget: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
              >
                <option value="$">$ - Budget Friendly</option>
                <option value="$$">$$ - Moderate</option>
                <option value="$$$">$$$ - Special Splurge</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateAIDate}
            disabled={aiLoading}
            className="w-full py-2.5 rounded-xl bg-togetherly-gold text-black font-semibold text-xs shadow-glow-gold hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Architecting Date...' : 'Design Custom Date'}</span>
          </button>

          {aiGeneratedDate && (
            <div className="p-4 rounded-2xl bg-togetherly-rose/10 border border-togetherly-rose/30 space-y-2 animate-fade-in">
              <h4 className="font-serif text-base font-semibold text-togetherly-text">
                {aiGeneratedDate.title}
              </h4>
              <p className="text-xs text-togetherly-textMuted leading-relaxed">
                {aiGeneratedDate.description}
              </p>
              {aiGeneratedDate.tips && (
                <ul className="text-[11px] text-togetherly-roseLight list-disc list-inside pt-1">
                  {aiGeneratedDate.tips.map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

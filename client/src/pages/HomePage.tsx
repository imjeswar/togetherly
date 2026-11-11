import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { CandleFlame } from '../components/ui/CandleFlame';
import {
  Heart,
  Sparkles,
  Camera,
  Gamepad2,
  Calendar,
  MessageCircle,
  Palette,
  Send,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Flame,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, partner, relationship, isPaired } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickAnswerText, setQuickAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await api.dashboard.get();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard?.dailyQuestion || !quickAnswerText.trim()) return;

    setSubmittingAnswer(true);
    try {
      await api.questions.answer(dashboard.dailyQuestion.id, quickAnswerText.trim());
      setQuickAnswerText('');
      await loadDashboard();
    } catch (err) {
      console.error('Failed to answer question:', err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <CandleFlame size="md" showCandleBody={false} />
        <p className="text-xs text-togetherly-textMuted tracking-wider uppercase animate-pulse">
          Kindling your moments...
        </p>
      </div>
    );
  }

  const daysTogether = dashboard?.relationship?.daysTogether || 1;
  const streakCount = dashboard?.relationship?.streakCount || 1;
  const couplePoints = dashboard?.relationship?.couplePoints || 50;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* TOP HERO BANNER: "Little moments make a big love." */}
      <section className="relative rounded-3xl glass-panel-accent p-6 md:p-8 overflow-hidden border border-togetherly-rose/20 shadow-glass">
        {/* Ambient glow in corner */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-togetherly-rose/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-togetherly-gold font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daily Connection</span>
            </div>

            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-togetherly-text mb-2 leading-tight">
              Little moments make a big love.
            </h2>

            <p className="text-xs md:text-sm text-togetherly-textMuted font-light">
              You and {partner?.firstName || 'your partner'} have created{' '}
              <strong className="text-togetherly-roseLight font-medium">
                {daysTogether} beautiful {daysTogether === 1 ? 'day' : 'days'}
              </strong>{' '}
              together.
            </p>

            {dashboard?.relationship?.nextAnniversaryDays !== undefined &&
              dashboard.relationship.nextAnniversaryDays !== null && (
                <div className="inline-flex items-center gap-1.5 text-xs text-togetherly-gold mt-2 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {dashboard.relationship.nextAnniversaryDays} days until your next anniversary
                  </span>
                </div>
              )}
          </div>

          {/* Animated Candle Flame & Streak Counter */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl glass-panel-subtle border border-white/10 self-center md:self-auto min-w-[140px]">
            <CandleFlame size="md" showCandleBody={true} />
            <div className="mt-3 text-center">
              <span className="text-xs font-semibold text-togetherly-gold tracking-wide uppercase">
                {streakCount} Day Streak
              </span>
              <p className="text-[10px] text-togetherly-textMuted">
                {couplePoints} Couple Points
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS ROW */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard
          variant="interactive"
          onClick={() => navigate('/connect?tab=questions')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-togetherly-rose/15 text-togetherly-rose flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-togetherly-text">Daily Question</h4>
            <p className="text-[10px] text-togetherly-textMuted">Share your thoughts</p>
          </div>
        </GlassCard>

        <GlassCard
          variant="interactive"
          onClick={() => navigate('/connect?tab=photos')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-togetherly-gold/15 text-togetherly-gold flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-togetherly-text">Photo Prompt</h4>
            <p className="text-[10px] text-togetherly-textMuted">Snap today's view</p>
          </div>
        </GlassCard>

        <GlassCard
          variant="interactive"
          onClick={() => navigate('/connect?tab=canvas')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-togetherly-text">Shared Canvas</h4>
            <p className="text-[10px] text-togetherly-textMuted">Draw together live</p>
          </div>
        </GlassCard>

        <GlassCard
          variant="interactive"
          onClick={() => navigate('/connect?tab=notes')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-500/15 text-pink-300 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-togetherly-text">Love Note</h4>
            <p className="text-[10px] text-togetherly-textMuted">Seal a surprise</p>
          </div>
        </GlassCard>
      </section>

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 Cols): Daily Question & Moment Together */}
        <div className="lg:col-span-2 space-y-6">
          {/* DAILY QUESTION CARD */}
          {dashboard?.dailyQuestion && (
            <GlassCard className="p-6 md:p-7 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-togetherly-rose inline-block" />
                  <span className="text-xs font-medium text-togetherly-rose uppercase tracking-wider">
                    Today's Question — {dashboard.dailyQuestion.category}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/connect?tab=questions')}
                  className="text-xs text-togetherly-textMuted hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Decks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="font-serif text-lg md:text-xl font-medium text-togetherly-text mb-5 leading-relaxed">
                "{dashboard.dailyQuestion.text}"
              </h3>

              {/* Status & Answers Container */}
              {dashboard.dailyQuestion.bothAnswered ? (
                /* BOTH ANSWERED: REVEALED TOGETHER! */
                <div className="space-y-4 pt-4 border-t border-white/5 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-togetherly-bg/80 border border-togetherly-rose/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={user?.firstName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-togetherly-roseLight">You</span>
                      </div>
                      {dashboard.dailyQuestion.userAnswer?.reaction && (
                        <span className="text-base">{dashboard.dailyQuestion.userAnswer.reaction}</span>
                      )}
                    </div>
                    <p className="text-sm text-togetherly-text pl-8 leading-relaxed">
                      {dashboard.dailyQuestion.userAnswer?.answer}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-togetherly-bg/80 border border-togetherly-gold/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50'}
                          alt={partner?.firstName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-togetherly-gold">
                          {partner?.firstName || 'Partner'}
                        </span>
                      </div>
                      {dashboard.dailyQuestion.partnerAnswer &&
                        'reaction' in dashboard.dailyQuestion.partnerAnswer &&
                        dashboard.dailyQuestion.partnerAnswer.reaction && (
                          <span className="text-base">
                            {dashboard.dailyQuestion.partnerAnswer.reaction}
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-togetherly-text pl-8 leading-relaxed">
                      {dashboard.dailyQuestion.partnerAnswer &&
                      'answer' in dashboard.dailyQuestion.partnerAnswer
                        ? dashboard.dailyQuestion.partnerAnswer.answer
                        : ''}
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => navigate('/connect?tab=questions')}
                      className="text-xs text-togetherly-rose hover:text-togetherly-roseLight font-medium flex items-center gap-1"
                    >
                      <span>Add reaction & discussion</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : dashboard.dailyQuestion.userAnswer ? (
                /* USER ANSWERED, WAITING FOR PARTNER */
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-togetherly-roseLight font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>You have answered this question</span>
                  </div>
                  <p className="text-xs text-togetherly-textMuted italic pl-6">
                    "{dashboard.dailyQuestion.userAnswer.answer}"
                  </p>
                  <div className="flex items-center gap-2 text-xs text-togetherly-gold pl-6 pt-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      Waiting for {partner?.firstName || 'your partner'} to submit their answer to reveal both!
                    </span>
                  </div>
                </div>
              ) : (
                /* USER HAS NOT ANSWERED YET: INLINE SUBMISSION */
                <form onSubmit={handleQuickAnswerSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={quickAnswerText}
                      onChange={(e) => setQuickAnswerText(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full px-4 py-3 rounded-xl bg-togetherly-bg border border-white/10 text-sm text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose pr-24"
                    />
                    <button
                      type="submit"
                      disabled={submittingAnswer || !quickAnswerText.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-togetherly-rose text-black font-semibold text-xs hover:opacity-95 transition-all disabled:opacity-40"
                    >
                      {submittingAnswer ? 'Saving...' : 'Submit'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-togetherly-textMuted px-1">
                    <span className="flex items-center gap-1 text-togetherly-gold">
                      <Lock className="w-3 h-3" />
                      Hidden from {partner?.firstName || 'partner'} until both answer
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/connect?tab=questions')}
                      className="hover:underline"
                    >
                      Explore other questions
                    </button>
                  </div>
                </form>
              )}
            </GlassCard>
          )}

          {/* TODAY'S PHOTO CHALLENGE CARD */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-togetherly-gold" />
                <span className="text-xs font-medium text-togetherly-gold uppercase tracking-wider">
                  Today's Photo Prompt
                </span>
              </div>
              <button
                onClick={() => navigate('/connect?tab=photos')}
                className="text-xs text-togetherly-rose hover:underline"
              >
                View Feed
              </button>
            </div>

            <p className="font-serif text-lg font-medium text-togetherly-text mb-4">
              "{dashboard?.photoChallenge.prompt}"
            </p>

            {dashboard?.photoChallenge.photos && dashboard.photoChallenge.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {dashboard.photoChallenge.photos.map((photo) => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden aspect-video bg-black/40">
                    <img
                      src={photo.photoUrl}
                      alt={photo.caption || 'Couple photo'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                      <p className="text-[11px] text-white truncate">
                        <strong className="text-togetherly-roseLight">{photo.user.firstName}:</strong>{' '}
                        {photo.caption || 'Daily moment'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-xs text-togetherly-textMuted mb-3">
                  Neither partner has shared today's snapshot yet.
                </p>
                <button
                  onClick={() => navigate('/connect?tab=photos')}
                  className="px-4 py-2 rounded-xl bg-togetherly-rose/15 text-togetherly-rose hover:bg-togetherly-rose/25 text-xs font-medium transition-colors"
                >
                  Snap Today's Photo
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* RIGHT COLUMN (1 Col): Today's Checklist & Recent Memories */}
        <div className="space-y-6">
          {/* TODAY'S MOMENTS CHECKLIST */}
          <GlassCard className="p-6">
            <h3 className="font-serif text-base font-medium text-togetherly-text mb-4 flex items-center justify-between">
              <span>Your Moments Together</span>
              <span className="text-xs font-sans text-togetherly-gold">
                {dashboard?.dailyActivities.filter((a) => a.isCompleted).length} / {dashboard?.dailyActivities.length} Done
              </span>
            </h3>

            <div className="space-y-2.5">
              {dashboard?.dailyActivities.map((act) => (
                <div
                  key={act.type}
                  onClick={() => navigate(act.actionUrl)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    act.isCompleted
                      ? 'bg-togetherly-rose/5 border-togetherly-rose/20 text-togetherly-text'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-togetherly-textMuted hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        act.isCompleted ? 'bg-togetherly-rose text-black' : 'border border-white/20'
                      }`}
                    >
                      {act.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-togetherly-text">{act.title}</p>
                      <p className="text-[10px] text-togetherly-textMuted line-clamp-1">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* RECENT MEMORIES PREVIEW */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-medium text-togetherly-text">
                Recent Memories
              </h3>
              <button
                onClick={() => navigate('/memories')}
                className="text-xs text-togetherly-rose hover:underline"
              >
                All
              </button>
            </div>

            {dashboard?.recentMemories && dashboard.recentMemories.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentMemories.map((mem) => (
                  <div
                    key={mem.id}
                    onClick={() => navigate('/memories')}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer transition-all flex items-center gap-3"
                  >
                    {mem.mediaUrl ? (
                      <img
                        src={mem.mediaUrl}
                        alt={mem.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-togetherly-card flex items-center justify-center shrink-0 text-togetherly-rose">
                        <Heart className="w-4 h-4" />
                      </div>
                    )}
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-medium text-togetherly-text truncate">{mem.title}</p>
                      <p className="text-[10px] text-togetherly-textMuted">
                        {new Date(mem.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-togetherly-textMuted text-center py-4">
                No memories saved yet. Answer questions and take photos to build your timeline!
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

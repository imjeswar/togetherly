import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CandleFlame } from '../components/ui/CandleFlame';
import { GlassCard } from '../components/ui/GlassCard';
import { Heart, Sparkles, MessageSquareHeart, Camera, Gamepad2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { quickLogin } = useAuth();

  const handleQuickLogin = async (userType: 'alex' | 'sarah') => {
    try {
      await quickLogin(userType);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-togetherly-bg text-togetherly-text flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-togetherly-rose/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-togetherly-gold/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-togetherly-rose flex items-center justify-center shadow-glow-rose/30">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <span className="font-serif text-xl font-bold tracking-wide text-togetherly-text">Togetherly</span>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="text-xs md:text-sm font-medium text-togetherly-rose hover:text-togetherly-roseLight transition-colors px-4 py-2 rounded-full border border-togetherly-rose/30 hover:border-togetherly-rose"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-3xl mx-auto w-full text-center py-10 md:py-16 z-10 flex flex-col items-center">
        {/* Animated Candle Flame */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <CandleFlame size="xl" showCandleBody={true} />
        </motion.div>

        {/* Tagline & Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-togetherly-gold mb-6 font-medium tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Sanctuary for Two</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-togetherly-text leading-[1.15] mb-6">
            A little moment. <br />
            <span className="text-glow-rose text-togetherly-roseLight">A stronger connection.</span>
          </h1>

          <p className="text-base sm:text-lg text-togetherly-textMuted max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Designed exclusively for two consenting adults to deepen intimacy, spark daily laughter, and build a lasting shared sanctuary through daily activities, games, photos, and secret love notes.
          </p>
        </motion.div>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto mb-12"
        >
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-togetherly-rose to-togetherly-roseDark text-black font-semibold text-sm shadow-glow-rose hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Begin Your Journey</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full glass-panel hover:bg-white/10 text-togetherly-text font-medium text-sm transition-all"
          >
            I Have an Account
          </button>
        </motion.div>
      </main>

      {/* Feature Highlights Grid */}
      <footer className="max-w-5xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 z-10 pt-8 border-t border-white/5">
        <GlassCard variant="subtle" className="p-4 text-center">
          <MessageSquareHeart className="w-5 h-5 mx-auto mb-2 text-togetherly-rose" />
          <h4 className="text-xs font-medium text-togetherly-text mb-1">Daily Questions</h4>
          <p className="text-[11px] text-togetherly-textMuted">Hidden answers revealed simultaneously</p>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 text-center">
          <Camera className="w-5 h-5 mx-auto mb-2 text-togetherly-gold" />
          <h4 className="text-xs font-medium text-togetherly-text mb-1">Photo Challenges</h4>
          <p className="text-[11px] text-togetherly-textMuted">Private daily snapshots side-by-side</p>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 text-center">
          <Gamepad2 className="w-5 h-5 mx-auto mb-2 text-togetherly-rose" />
          <h4 className="text-xs font-medium text-togetherly-text mb-1">Couple Games</h4>
          <p className="text-[11px] text-togetherly-textMuted">7 interactive games with real game logic</p>
        </GlassCard>

        <GlassCard variant="subtle" className="p-4 text-center">
          <Sparkles className="w-5 h-5 mx-auto mb-2 text-togetherly-gold" />
          <h4 className="text-xs font-medium text-togetherly-text mb-1">Shared Canvas</h4>
          <p className="text-[11px] text-togetherly-textMuted">Live synchronized drawings and notes</p>
        </GlassCard>
      </footer>
    </div>
  );
};


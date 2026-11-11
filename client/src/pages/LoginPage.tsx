import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/api';
import { Heart, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, quickLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const res = await api.auth.forgotPassword(forgotEmail);
      setForgotMessage(res.message || 'Reset instructions have been sent.');
    } catch (err: any) {
      setForgotMessage(err.message || 'Error requesting reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-togetherly-bg text-togetherly-text flex items-center justify-center p-6 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-togetherly-rose/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link to="/welcome" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-togetherly-rose flex items-center justify-center shadow-glow-rose/30">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-wide">Togetherly</span>
          </Link>
          <h2 className="font-serif text-3xl font-semibold mb-2">Welcome Back</h2>
          <p className="text-sm text-togetherly-textMuted">
            Enter your private sanctuary with your partner.
          </p>
        </div>

        {/* Login Card */}
        <GlassCard className="p-8">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-togetherly-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@togetherly.app"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-togetherly-bg border border-white/10 text-sm text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-togetherly-textMuted uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-togetherly-rose hover:text-togetherly-roseLight transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-togetherly-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-togetherly-bg border border-white/10 text-sm text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-togetherly-rose to-togetherly-roseDark text-black font-semibold text-sm shadow-glow-rose hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-[11px] text-togetherly-textMuted text-center mb-3 uppercase tracking-wider font-medium">
              Demo Couple Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('alex@togetherly.app');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-togetherly-text transition-colors text-center"
              >
                Fill <span className="text-togetherly-rose font-medium">Alex</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('sarah@togetherly.app');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-togetherly-text transition-colors text-center"
              >
                Fill <span className="text-togetherly-gold font-medium">Sarah</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-xs text-togetherly-textMuted mt-6">
          Don't have a space yet?{' '}
          <Link to="/register" className="text-togetherly-rose font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal isOpen={showForgot} onClose={() => setShowForgot(false)} title="Reset Your Password">
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-xs text-togetherly-textMuted leading-relaxed">
            Enter the email address associated with your Togetherly account. We will send you instructions to regain access.
          </p>
          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose"
            />
          </div>
          {forgotMessage && (
            <p className="text-xs text-togetherly-roseLight bg-togetherly-rose/10 p-3 rounded-xl border border-togetherly-rose/20">
              {forgotMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={forgotLoading}
            className="w-full py-2.5 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all"
          >
            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

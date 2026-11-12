import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { GlassCard } from '../components/ui/GlassCard';
import { CandleFlame } from '../components/ui/CandleFlame';
import {
  Heart,
  Sparkles,
  Copy,
  Check,
  Share2,
  Users,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PairingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isPaired, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Join mode state
  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '');
  const [previewPartner, setPreviewPartner] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // If already paired, redirect home
  useEffect(() => {
    if (isPaired) {
      navigate('/');
    }
  }, [isPaired, navigate]);

  // If code in query params, switch to join tab automatically
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setActiveTab('join');
      setJoinCode(codeParam.toUpperCase());
      handlePreview(codeParam.toUpperCase());
    }
  }, [searchParams]);

  // Fetch existing space code if available
  useEffect(() => {
    if (!isPaired) {
      api.pairing.getCode().then((data: any) => {
        if (data?.code) {
          setCreatedCode(data.code);
          if (data.inviteUrl) setInviteUrl(data.inviteUrl);
        }
      }).catch(() => {
        // No active space code yet
      });
    }
  }, [isPaired]);

  // Listen to Socket.IO real-time partner pairing event
  useEffect(() => {
    const socket = getSocket();
    const handlePartnerPaired = async (data: any) => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E8A0A8', '#D9B77E', '#FFFFFF'],
      });
      await refreshUser();
      navigate('/');
    };

    socket.on('partner_paired', handlePartnerPaired);
    return () => {
      socket.off('partner_paired', handlePartnerPaired);
    };
  }, [navigate, refreshUser]);

  // CREATE SPACE
  const handleCreateSpace = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.pairing.createSpace();
      setCreatedCode(data.code);
      setInviteUrl(data.inviteUrl);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to create couple space');
    } finally {
      setLoading(false);
    }
  };

  // PREVIEW PARTNER SPACE
  const handlePreview = async (codeToPreview?: string) => {
    const code = (codeToPreview || joinCode).trim().toUpperCase();
    if (!code) {
      setError('Please enter a 6-character code');
      return;
    }
    setError('');
    setPreviewLoading(true);
    try {
      const data = await api.pairing.preview(code);
      setPreviewPartner(data.partner);
    } catch (err: any) {
      setPreviewPartner(null);
      setError(err.message || 'Couple space not found or already full.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // JOIN PARTNER SPACE
  const handleJoinSpace = async () => {
    setError('');
    setLoading(true);
    try {
      await api.pairing.joinSpace(joinCode.trim().toUpperCase());
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
      });
      setJoinSuccess(true);
      await refreshUser();
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to connect with partner');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-togetherly-bg text-togetherly-text flex items-center justify-center p-4 md:p-8 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-togetherly-rose/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Banner quote */}
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <CandleFlame size="md" showCandleBody={false} />
          </div>
          <span className="text-xs uppercase tracking-widest text-togetherly-gold font-medium">
            Partner Pairing
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1 mb-2">
            Your relationship deserves little moments of magic.
          </h2>
          <p className="text-xs sm:text-sm text-togetherly-textMuted max-w-sm mx-auto">
            Connect exclusively with your partner to unlock your shared workspace, daily challenges, and private memories.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 mb-6">
          <button
            onClick={() => {
              setActiveTab('create');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-togetherly-card text-togetherly-rose shadow-sm border border-togetherly-rose/20'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Create Couple Space
          </button>
          <button
            onClick={() => {
              setActiveTab('join');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'join'
                ? 'bg-togetherly-card text-togetherly-rose shadow-sm border border-togetherly-rose/20'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Join Partner's Space
          </button>
        </div>

        {/* Card Container */}
        <GlassCard className="p-6 md:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CREATE COUPLE SPACE */}
          {activeTab === 'create' && (
            <div>
              {!createdCode ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-togetherly-rose/10 border border-togetherly-rose/30 flex items-center justify-center mx-auto mb-4 text-togetherly-rose">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-lg font-medium mb-1">
                    Ready to invite your partner?
                  </h3>
                  <p className="text-xs text-togetherly-textMuted leading-relaxed mb-6">
                    Click below to generate a unique, secure invitation code and link. Your partner will enter this code to join your private sanctuary.
                  </p>

                  <button
                    onClick={handleCreateSpace}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-togetherly-rose to-togetherly-roseDark text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Generate Partner Invite</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-5">
                  <div className="p-4 rounded-2xl bg-togetherly-bg border border-togetherly-rose/30 shadow-glow-rose/20">
                    <span className="text-[11px] text-togetherly-textMuted uppercase tracking-widest font-medium">
                      Your Unique Pairing Code
                    </span>
                    <div className="font-mono text-3xl font-bold tracking-widest text-togetherly-gold mt-1 mb-2">
                      {createdCode}
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-togetherly-rose transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Share Link Button */}
                  {inviteUrl && (
                    <button
                      onClick={() => copyToClipboard(inviteUrl)}
                      className="w-full py-2.5 rounded-xl glass-panel hover:bg-white/10 border border-white/10 text-xs text-togetherly-text font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-togetherly-rose" />
                      <span>Copy Full Invitation Link</span>
                    </button>
                  )}

                  {/* Animated Waiting indicator */}
                  <div className="pt-2 flex items-center justify-center gap-2 text-xs text-togetherly-textMuted">
                    <RefreshCw className="w-3.5 h-3.5 text-togetherly-gold animate-spin" />
                    <span>Waiting for your partner to join...</span>
                  </div>

                  <p className="text-[11px] text-togetherly-textMuted italic">
                    This screen will automatically update the moment your partner enters your code!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: JOIN PARTNER'S SPACE */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-1.5 uppercase tracking-wider">
                  Partner's Invitation Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setPreviewPartner(null);
                    }}
                    placeholder="e.g. TOGETH"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-base font-mono tracking-widest text-center text-togetherly-gold focus:border-togetherly-rose focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handlePreview()}
                    disabled={previewLoading || !joinCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-togetherly-text font-medium transition-colors disabled:opacity-40"
                  >
                    {previewLoading ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Preview Partner Card */}
              {previewPartner && (
                <div className="p-4 rounded-2xl glass-panel-accent border border-togetherly-rose/30 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <img
                      src={previewPartner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={previewPartner.firstName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-togetherly-rose"
                    />
                    <div>
                      <h4 className="font-serif text-base font-medium text-togetherly-text">
                        Connect with {previewPartner.firstName} {previewPartner.lastName || ''}
                      </h4>
                      {previewPartner.bio && (
                        <p className="text-xs text-togetherly-textMuted italic line-clamp-2">
                          "{previewPartner.bio}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-togetherly-gold pt-1 border-t border-white/5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Private Space for Two</span>
                  </div>

                  <button
                    onClick={handleJoinSpace}
                    disabled={loading || joinSuccess}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-togetherly-rose to-togetherly-roseDark text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : joinSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Connected! Opening Sanctuary...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Enter Couple Space</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Demo Accounts Tip */}
        <div className="text-center mt-6">
          <p className="text-xs text-togetherly-textMuted">
            Want to test pre-paired couple?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-togetherly-rose hover:underline font-medium"
            >
              Log in as Alex or Sarah
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};


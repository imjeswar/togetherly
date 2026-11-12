import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import { CandleFlame } from '../components/ui/CandleFlame';
import {
  User as UserIcon,
  Heart,
  Award,
  Settings as SettingsIcon,
  ShieldAlert,
  Download,
  Lock,
  Flame,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Bell,
  Volume2,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, partner, relationship, isPaired, logout, refreshUser, quickLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'achievements' | 'settings'>('profile');
  const [achievements, setAchievements] = useState<any[]>([]);
  const [couplePoints, setCouplePoints] = useState(relationship?.couplePoints || 50);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    avatarUrl: user?.avatarUrl || '',
    bio: user?.profile?.bio || '',
    nickname: user?.profile?.nickname || '',
    loveLanguage: user?.profile?.loveLanguage || 'Quality Time',
    anniversaryDate: relationship?.anniversaryDate ? relationship.anniversaryDate.split('T')[0] : '',
  });

  // Settings State
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    soundEffects: true,
    theme: 'dark',
    privacyMode: false,
  });

  // Unpair Modal State
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [unpairConfirmation, setUnpairConfirmation] = useState(false);
  const [unpairing, setUnpairing] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Load Achievements
    api.achievements.getAll().then((data) => {
      setAchievements(data.achievements || []);
      if (data.couplePoints) setCouplePoints(data.couplePoints);
    });

    // Load Settings
    api.settings.get().then((data) => {
      if (data?.settings) setSettings(data.settings);
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.updateProfile(profileForm);
      setIsEditingProfile(false);
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await api.settings.update(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/settings/export', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('togetherly_token') || ''}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `togetherly-couple-archive-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleUnpair = async () => {
    if (!unpairConfirmation) return;
    setUnpairing(true);
    try {
      await api.pairing.unpair();
      setShowUnpairModal(false);
      await refreshUser();
      navigate('/pair');
    } catch (err) {
      console.error(err);
    } finally {
      setUnpairing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest text-togetherly-rose font-medium">
            Account & Relationship Space
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-togetherly-text">
            Profile & Settings
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-togetherly-card text-togetherly-rose border border-togetherly-rose/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'achievements'
                ? 'bg-togetherly-card text-togetherly-gold border border-togetherly-gold/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Achievements
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-togetherly-card text-white border border-white/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILES & RELATIONSHIP SPACE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-fade-in">
          {/* Couple Connection Overview Card */}
          <GlassCard className="p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <img
                  src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user?.firstName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-togetherly-rose/50"
                />

                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 fill-togetherly-rose text-togetherly-rose animate-pulse" />
                </div>

                {/* Partner Avatar */}
                {isPaired && partner ? (
                  <img
                    src={partner.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'}
                    alt={partner.firstName}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-togetherly-gold/50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-togetherly-textMuted text-xs">
                    Unpaired
                  </div>
                )}

                <div>
                  <h3 className="font-serif text-xl font-semibold text-togetherly-text">
                    {user?.firstName} {partner ? `& ${partner.firstName}` : ''}
                  </h3>
                  <p className="text-xs text-togetherly-textMuted">
                    {relationship?.relationshipType || 'Dating'} •{' '}
                    {relationship?.isLongDistance ? 'Long Distance' : 'Living Close / Cohabiting'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* User Details & Edit Form */}
          <GlassCard className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h4 className="font-serif text-lg font-medium text-togetherly-text">
                Your Personal Details
              </h4>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-xs text-togetherly-rose hover:underline font-medium"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {!isEditingProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-togetherly-textMuted uppercase tracking-wider block mb-1">
                    Full Name
                  </span>
                  <p className="text-sm font-medium text-togetherly-text">
                    {user?.firstName} {user?.lastName || ''}
                  </p>
                </div>

                <div>
                  <span className="text-togetherly-textMuted uppercase tracking-wider block mb-1">
                    Email
                  </span>
                  <p className="text-sm font-medium text-togetherly-text">{user?.email}</p>
                </div>

                <div>
                  <span className="text-togetherly-textMuted uppercase tracking-wider block mb-1">
                    Nickname for Partner
                  </span>
                  <p className="text-sm font-medium text-togetherly-text">
                    {user?.profile?.nickname || 'None specified'}
                  </p>
                </div>

                <div>
                  <span className="text-togetherly-textMuted uppercase tracking-wider block mb-1">
                    Primary Love Language
                  </span>
                  <p className="text-sm font-medium text-togetherly-roseLight">
                    {user?.profile?.loveLanguage || 'Quality Time'}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-togetherly-textMuted uppercase tracking-wider block mb-1">
                    About / Bio
                  </span>
                  <p className="text-sm text-togetherly-text leading-relaxed">
                    {user?.profile?.bio || 'No bio provided.'}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                      Partner's Nickname for You
                    </label>
                    <input
                      type="text"
                      value={profileForm.nickname}
                      onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                      Love Language
                    </label>
                    <input
                      type="text"
                      value={profileForm.loveLanguage}
                      onChange={(e) => setProfileForm({ ...profileForm, loveLanguage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                    Bio
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-togetherly-textMuted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose hover:opacity-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACHIEVEMENTS & GAMIFICATION */}
      {/* ========================================================================= */}
      {activeTab === 'achievements' && (
        <div className="space-y-6 animate-fade-in">
          {/* Couple Points Banner */}
          <GlassCard className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-togetherly-gold/25">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-togetherly-gold/15 text-togetherly-gold flex items-center justify-center">
                <Flame className="w-7 h-7 fill-togetherly-gold" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-togetherly-gold font-bold">
                  Couples Gamification
                </span>
                <h3 className="font-serif text-2xl font-bold text-togetherly-text">
                  {couplePoints} Couple Points
                </h3>
                <p className="text-xs text-togetherly-textMuted">
                  Rank: <strong className="text-togetherly-roseLight">Everlasting Bond</strong> (Level 4)
                </p>
              </div>
            </div>

            <div className="text-right sm:self-auto self-start">
              <span className="text-xs font-semibold text-togetherly-text font-mono">
                {achievements.filter((a) => a.isUnlocked).length} / {achievements.length} Badges Unlocked
              </span>
            </div>
          </GlassCard>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <GlassCard
                key={ach.id}
                className={`p-5 flex flex-col justify-between transition-all ${
                  ach.isUnlocked
                    ? 'border-togetherly-gold/30 bg-togetherly-card/90 shadow-glow-gold/10'
                    : 'opacity-50 grayscale bg-white/[0.02]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-togetherly-gold/15 text-togetherly-gold flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-togetherly-gold px-2 py-0.5 rounded-full bg-white/5">
                      +{ach.pointsReward} pts
                    </span>
                  </div>

                  <h4 className="font-serif text-base font-semibold text-togetherly-text mb-1">
                    {ach.title}
                  </h4>
                  <p className="text-xs text-togetherly-textMuted leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 text-[10px] text-togetherly-textMuted flex items-center justify-between">
                  <span>{ach.category}</span>
                  {ach.isUnlocked ? (
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-neutral-500">Locked</span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SETTINGS, PRIVACY & UNPAIR */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          {/* Notification Preferences */}
          <GlassCard className="p-6 md:p-8 space-y-4">
            <h4 className="font-serif text-lg font-medium text-togetherly-text mb-2">
              Notification Preferences
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-togetherly-rose" />
                  <div>
                    <p className="text-xs font-medium text-togetherly-text">In-App & Push Notifications</p>
                    <p className="text-[11px] text-togetherly-textMuted">Receive alerts when your partner answers or takes a photo</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleUpdateSetting('pushNotifications', e.target.checked)}
                  className="w-4 h-4 rounded text-togetherly-rose"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-togetherly-gold" />
                  <div>
                    <p className="text-xs font-medium text-togetherly-text">Sound Effects & Celebrations</p>
                    <p className="text-[11px] text-togetherly-textMuted">Play subtle intimate chime upon mutual reveals</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => handleUpdateSetting('soundEffects', e.target.checked)}
                  className="w-4 h-4 rounded text-togetherly-gold"
                />
              </div>
            </div>
          </GlassCard>

          {/* Data Archive & Export */}
          <GlassCard className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-serif text-lg font-medium text-togetherly-text mb-1">
                Export Couple Memory Archive
              </h4>
              <p className="text-xs text-togetherly-textMuted max-w-md leading-relaxed">
                Download a complete, formatted JSON backup of all your shared photos, questions, answers, love letters, and drawings.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-togetherly-text font-medium border border-white/10 flex items-center gap-2 transition-colors shrink-0"
            >
              <Download className="w-4 h-4 text-togetherly-rose" />
              <span>{exporting ? 'Preparing...' : 'Download Archive'}</span>
            </button>
          </GlassCard>

          {/* Danger Zone: Unpair */}
          <GlassCard className="p-6 md:p-8 border-red-500/20 bg-red-950/10 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-serif text-lg font-semibold">Danger Zone: Unpair Partner</h4>
            </div>
            <p className="text-xs text-togetherly-textMuted leading-relaxed max-w-xl">
              Unpairing will disconnect your shared relationship space. Both partners will no longer have synchronized access to this workspace unless re-paired. Your personal account and history will be safely preserved.
            </p>
            <button
              onClick={() => setShowUnpairModal(true)}
              className="px-5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold transition-colors"
            >
              Unpair from Partner Space
            </button>
          </GlassCard>
        </div>
      )}

      {/* UNPAIR CONFIRMATION MODAL */}
      <Modal
        isOpen={showUnpairModal}
        onClose={() => setShowUnpairModal(false)}
        title="Confirm Partner Unpairing"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 leading-relaxed space-y-2">
            <p className="font-semibold text-red-300">Are you completely sure?</p>
            <p>
              By proceeding, your active connection with {partner?.firstName || 'your partner'} will be dissolved. You will be able to create a new space or pair again at any time.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-togetherly-text cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={unpairConfirmation}
              onChange={(e) => setUnpairConfirmation(e.target.checked)}
              className="w-4 h-4 rounded text-red-500"
            />
            <span>I understand the consequences and confirm unpairing</span>
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowUnpairModal(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-xs text-togetherly-textMuted"
            >
              Cancel
            </button>
            <button
              onClick={handleUnpair}
              disabled={!unpairConfirmation || unpairing}
              className="px-5 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-lg hover:bg-red-700 transition-all disabled:opacity-40"
            >
              {unpairing ? 'Unpairing...' : 'Confirm & Unpair'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


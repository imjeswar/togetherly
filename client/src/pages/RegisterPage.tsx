import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Heart, Sparkles, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
];

const INTEREST_OPTIONS = [
  'Cooking',
  'Stargazing',
  'Travel & Roadtrips',
  'Photography',
  'Reading Books',
  'Live Music & Concerts',
  'Hiking & Outdoors',
  'Gaming Together',
  'Movie Marathons',
  'Coffee & Cafes',
  'Art & Drawing',
  'Fitness & Yoga',
];

const LOVE_LANGUAGES = [
  'Quality Time',
  'Words of Affirmation',
  'Physical Touch',
  'Acts of Service',
  'Receiving Gifts',
];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    avatarUrl: AVATAR_PRESETS[0],
    nickname: '',
    bio: '',
    loveLanguage: 'Quality Time',
    relationshipType: 'DATING',
    anniversaryDate: '',
    isLongDistance: false,
    interests: ['Cooking', 'Travel & Roadtrips', 'Movie Marathons'],
  });

  const toggleInterest = (interest: string) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (!formData.dateOfBirth) return 'Date of birth is required';

    const dob = new Date(formData.dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      return 'You must be at least 18 years old to use Togetherly';
    }

    return null;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/pair');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-togetherly-bg text-togetherly-text flex items-center justify-center p-4 md:p-8 relative">
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-togetherly-rose/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/welcome" className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-togetherly-rose flex items-center justify-center shadow-glow-rose/30">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-serif text-xl font-bold tracking-wide">Togetherly</span>
          </Link>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-1">
            Create Your Space
          </h2>
          <p className="text-xs text-togetherly-textMuted">
            Step {step} of 3 —{' '}
            {step === 1 && 'Personal Credentials'}
            {step === 2 && 'Profile & Expression'}
            {step === 3 && 'Relationship Context'}
          </p>

          {/* Step Progress Indicators */}
          <div className="flex items-center justify-center gap-2 mt-4 max-w-xs mx-auto">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 1 ? 'bg-togetherly-rose shadow-glow-rose' : 'bg-white/10'
              }`}
            />
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 2 ? 'bg-togetherly-rose shadow-glow-rose' : 'bg-white/10'
              }`}
            />
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 3 ? 'bg-togetherly-rose shadow-glow-rose' : 'bg-white/10'
              }`}
            />
          </div>
        </div>

        {/* Form Container */}
        <GlassCard className="p-6 md:p-8">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CREDENTIALS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Rivers"
                    className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                  Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                  Date of Birth * (Must be 18+)
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none text-togetherly-text"
                />
                <p className="text-[11px] text-togetherly-textMuted mt-1">
                  Togetherly is strictly for two consenting adults (18+).
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE & AVATAR */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-2 uppercase tracking-wider">
                  Choose Your Profile Avatar
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatarUrl: url })}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                        formData.avatarUrl === url
                          ? 'border-togetherly-rose scale-105 shadow-glow-rose'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    Partner's Nickname for You
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="e.g. Honey, Al, Spark"
                    className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    Primary Love Language
                  </label>
                  <select
                    value={formData.loveLanguage}
                    onChange={(e) => setFormData({ ...formData, loveLanguage: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none text-togetherly-text"
                  >
                    {LOVE_LANGUAGES.map((ll) => (
                      <option key={ll} value={ll}>
                        {ll}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                  Bio / Sweet Note About Yourself
                </label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="What makes you smile? What are your favorite couple rhythms?"
                  className="w-full px-4 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs text-togetherly-textMuted hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  <span>Next: Couple Context</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RELATIONSHIP ONBOARDING */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    Relationship Type
                  </label>
                  <select
                    value={formData.relationshipType}
                    onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none text-togetherly-text"
                  >
                    <option value="DATING">Dating</option>
                    <option value="ENGAGED">Engaged</option>
                    <option value="MARRIED">Married</option>
                    <option value="PARTNERS">Life Partners</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                    Anniversary Date
                  </label>
                  <input
                    type="date"
                    value={formData.anniversaryDate}
                    onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none text-togetherly-text"
                  />
                </div>
              </div>

              {/* Living Situation */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-togetherly-text">Are you in a long-distance relationship?</p>
                  <p className="text-[11px] text-togetherly-textMuted">We'll tailor distance-friendly dates and questions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isLongDistance: !formData.isLongDistance })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formData.isLongDistance ? 'bg-togetherly-rose' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      formData.isLongDistance ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Shared Interests */}
              <div>
                <label className="block text-xs font-medium text-togetherly-textMuted mb-2 uppercase tracking-wider">
                  Select Shared Interests (for tailored date ideas & questions)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_OPTIONS.map((item) => {
                    const selected = formData.interests.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? 'bg-togetherly-rose text-black shadow-glow-rose/40 font-semibold'
                            : 'bg-white/5 text-togetherly-textMuted hover:text-white border border-white/5'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs text-togetherly-textMuted hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-togetherly-rose to-togetherly-roseDark text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </GlassCard>

        <p className="text-center text-xs text-togetherly-textMuted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-togetherly-rose font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

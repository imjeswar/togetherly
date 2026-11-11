import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import {
  Sparkles,
  MessageCircle,
  Camera,
  Palette,
  Send,
  Lock,
  CheckCircle2,
  Heart,
  Smile,
  Flame,
  Undo2,
  Trash2,
  Save,
  Plus,
  Compass,
  ArrowRight,
  BookOpen,
  Mail,
  LockKeyhole,
  Check,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PHOTO_PRESETS = [
  { label: 'Morning Coffee', url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sunset Stroll', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cozy Book & Tea', url: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Homemade Dinner', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' },
];

export const ConnectPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'questions';
  const [tab, setTab] = useState<'questions' | 'photos' | 'canvas' | 'notes'>(initialTab);

  const { user, partner, relationship } = useAuth();

  // Sync tab with URL searchParams
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['questions', 'photos', 'canvas', 'notes'].includes(tabParam)) {
      setTab(tabParam as any);
    }
  }, [searchParams]);

  const switchTab = (newTab: 'questions' | 'photos' | 'canvas' | 'notes') => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // -------------------------------------------------------------
  // TAB 1: DAILY QUESTIONS & DECKS STATE
  // -------------------------------------------------------------
  const [questionSubTab, setQuestionSubTab] = useState<'today' | 'categories' | 'history'>('today');
  const [dailyQuestion, setDailyQuestion] = useState<any | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [categoryQuestions, setCategoryQuestions] = useState<any[]>([]);
  const [questionHistory, setQuestionHistory] = useState<any[]>([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [showAIQuestionModal, setShowAIQuestionModal] = useState(false);
  const [aiQuestionPrompt, setAiQuestionPrompt] = useState({ category: 'Deep Conversations', intimacyLevel: 2, mood: 'romantic' });
  const [aiGeneratedQuestion, setAiGeneratedQuestion] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: PHOTO CHALLENGE STATE
  // -------------------------------------------------------------
  const [photoChallenge, setPhotoChallenge] = useState<any | null>(null);
  const [photoFeed, setPhotoFeed] = useState<any[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [selectedPhotoPreset, setSelectedPhotoPreset] = useState(PHOTO_PRESETS[0].url);
  const [customPhotoFile, setCustomPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: SHARED CANVAS STATE
  // -------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#E8A0A8');
  const [strokeSize, setStrokeSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [stickyNotes, setStickyNotes] = useState<Array<{ id: string; text: string; color: string; x: number; y: number }>>([]);
  const [newStickyText, setNewStickyText] = useState('');
  const [canvasSavedNotice, setCanvasSavedNotice] = useState(false);

  // -------------------------------------------------------------
  // TAB 4: LOVE NOTES CAPSULE STATE
  // -------------------------------------------------------------
  const [loveNotes, setLoveNotes] = useState<any[]>([]);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    unlockCondition: 'MISS_YOU',
    theme: 'romantic',
    unlockDate: '',
  });
  const [openedNoteModal, setOpenedNoteModal] = useState<any | null>(null);
  const [unsealLoading, setUnsealLoading] = useState(false);
  const [showAILetterModal, setShowAILetterModal] = useState(false);
  const [aiLetterLoading, setAiLetterLoading] = useState(false);

  // -------------------------------------------------------------
  // LOAD DATA FOR ACTIVE TAB
  // -------------------------------------------------------------
  const loadQuestions = async () => {
    try {
      setQuestionLoading(true);
      const [dailyRes, catRes] = await Promise.all([
        api.questions.getDaily(),
        api.questions.getCategories(),
      ]);
      setDailyQuestion(dailyRes.question);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const [dailyRes, feedRes] = await Promise.all([
        api.photos.getDaily(),
        api.photos.getFeed(),
      ]);
      setPhotoChallenge(dailyRes);
      setPhotoFeed(feedRes.photos || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLoveNotes = async () => {
    try {
      const data = await api.chat.getLoveNotes();
      setLoveNotes(data.notes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (tab === 'questions') loadQuestions();
    if (tab === 'photos') loadPhotos();
    if (tab === 'notes') loadLoveNotes();
  }, [tab]);

  // Load question category items when a category is selected
  const handleSelectCategory = async (cat: any) => {
    setSelectedCategory(cat);
    try {
      const res = await api.questions.getByCategory(cat.id);
      setCategoryQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadQuestionHistory = async () => {
    setQuestionSubTab('history');
    try {
      const res = await api.questions.getHistory();
      setQuestionHistory(res.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Answer for Daily Question
  const handleAnswerDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyQuestion || !answerInput.trim()) return;

    try {
      const res = await api.questions.answer(dailyQuestion.id, answerInput.trim());
      setAnswerInput('');
      if (res.bothAnswered) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
        });
      }
      await loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  // React with Emoji to Question Answer
  const handleReactToAnswer = async (responseId: string, emoji: string) => {
    try {
      await api.questions.react(responseId, emoji);
      await loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  // AI Question Generator
  const handleGenerateAIQuestion = async () => {
    setAiLoading(true);
    try {
      const res = await api.ai.generateQuestion(aiQuestionPrompt);
      setAiGeneratedQuestion(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Photo Upload Handler
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoUploading(true);
    try {
      if (customPhotoFile) {
        const formData = new FormData();
        formData.append('photo', customPhotoFile);
        formData.append('caption', photoCaption);
        formData.append('prompt', photoChallenge?.prompt || 'Daily Photo');
        await api.photos.upload(formData);
      } else {
        await api.photos.upload({
          photoUrl: selectedPhotoPreset,
          caption: photoCaption,
          prompt: photoChallenge?.prompt || 'Daily Photo',
        });
      }
      setPhotoCaption('');
      setCustomPhotoFile(null);
      confetti({
        particleCount: 90,
        spread: 60,
        colors: ['#E8A0A8', '#D9B77E'],
      });
      await loadPhotos();
    } catch (err) {
      console.error(err);
    } finally {
      setPhotoUploading(false);
    }
  };

  // -------------------------------------------------------------
  // CANVAS REAL-TIME DRAWING & SYNCHRONIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (tab !== 'canvas') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load canvas initial state from backend
    api.canvas.get().then((data) => {
      if (data?.latestDrawing?.canvasData) {
        try {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = data.latestDrawing.canvasData;
        } catch (e) {
          // ignore
        }
      }
      if (data?.latestDrawing?.stickyNotes) {
        try {
          setStickyNotes(JSON.parse(data.latestDrawing.stickyNotes));
        } catch (e) {
          // ignore
        }
      }
    });

    // Socket.io Real-Time Stroke Receiver
    const socket = getSocket();
    const handlePartnerStroke = (stroke: any) => {
      ctx.beginPath();
      ctx.moveTo(stroke.x0, stroke.y0);
      ctx.lineTo(stroke.x1, stroke.y1);
      ctx.strokeStyle = stroke.isEraser ? '#0D0B10' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    const handlePartnerClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handlePartnerSticky = (note: any) => {
      setStickyNotes((prev) => [...prev, note]);
    };

    socket.on('partner_canvas_stroke', handlePartnerStroke);
    socket.on('partner_canvas_clear', handlePartnerClear);
    socket.on('partner_canvas_sticky_note', handlePartnerSticky);

    return () => {
      socket.off('partner_canvas_stroke', handlePartnerStroke);
      socket.off('partner_canvas_clear', handlePartnerClear);
      socket.off('partner_canvas_sticky_note', handlePartnerSticky);
    };
  }, [tab]);

  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPos.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = isEraser ? '#0D0B10' : strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Broadcast stroke to partner via Socket.IO
    if (relationship?.id) {
      getSocket().emit('canvas_stroke', {
        relationshipId: relationship.id,
        stroke: {
          x0: lastPos.current.x,
          y0: lastPos.current.y,
          x1: currentX,
          y1: currentY,
          color: strokeColor,
          size: strokeSize,
          isEraser,
        },
      });
    }

    lastPos.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (relationship?.id) {
      getSocket().emit('canvas_clear', { relationshipId: relationship.id });
    }
  };

  const handleSaveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    try {
      await api.canvas.save({
        title: 'Our Romantic Shared Canvas',
        canvasData: dataUrl,
        previewUrl: dataUrl,
        stickyNotes,
      });
      setCanvasSavedNotice(true);
      setTimeout(() => setCanvasSavedNotice(false), 3000);
      confetti({
        particleCount: 80,
        spread: 60,
        colors: ['#E8A0A8', '#D9B77E'],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStickyNote = () => {
    if (!newStickyText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: newStickyText.trim(),
      color: '#E8A0A8',
      x: Math.floor(Math.random() * 200) + 40,
      y: Math.floor(Math.random() * 150) + 40,
    };
    setStickyNotes((prev) => [...prev, newNote]);
    setNewStickyText('');

    if (relationship?.id) {
      getSocket().emit('canvas_sticky_note', {
        relationshipId: relationship.id,
        note: newNote,
      });
    }
  };

  // -------------------------------------------------------------
  // TAB 4: LOVE NOTE CAPSULE HANDLERS
  // -------------------------------------------------------------
  const handleCreateLoveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.chat.createLoveNote(noteForm);
      setShowCreateNoteModal(false);
      setNoteForm({
        title: '',
        content: '',
        unlockCondition: 'MISS_YOU',
        theme: 'romantic',
        unlockDate: '',
      });
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
      });
      await loadLoveNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLoveNote = async (note: any) => {
    if (note.isOpened && note.content) {
      setOpenedNoteModal(note);
      return;
    }

    setUnsealLoading(true);
    try {
      const res = await api.chat.openLoveNote(note.id);
      setOpenedNoteModal(res.note);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
      });
      await loadLoveNotes();
    } catch (err: any) {
      alert(err.message || 'Cannot open this note yet.');
    } finally {
      setUnsealLoading(false);
    }
  };

  const handleGenerateAILetter = async () => {
    setAiLetterLoading(true);
    try {
      const res = await api.ai.generateAnniversary({
        partnerName: partner?.firstName || 'My Darling',
        yearsOrDays: 'every shared moment',
        tone: 'romantic',
        sharedMemory: 'the night under the stars',
      });
      setNoteForm((prev) => ({
        ...prev,
        title: res.title || prev.title,
        content: res.letter || prev.content,
      }));
      setShowAILetterModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLetterLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & TAB NAV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest text-togetherly-rose font-medium">
            Daily Intimacy & Activities
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-togetherly-text">
            Connect
          </h2>
        </div>

        {/* 4 Connect Sub-Tabs */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 max-w-md">
          <button
            onClick={() => switchTab('questions')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'questions'
                ? 'bg-togetherly-card text-togetherly-rose border border-togetherly-rose/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Questions</span>
          </button>

          <button
            onClick={() => switchTab('photos')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'photos'
                ? 'bg-togetherly-card text-togetherly-gold border border-togetherly-gold/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photos</span>
          </button>

          <button
            onClick={() => switchTab('canvas')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'canvas'
                ? 'bg-togetherly-card text-purple-300 border border-purple-400/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Canvas</span>
          </button>

          <button
            onClick={() => switchTab('notes')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'notes'
                ? 'bg-togetherly-card text-pink-300 border border-pink-400/20 shadow-sm'
                : 'text-togetherly-textMuted hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Love Notes</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY QUESTIONS & CONNECTION DECKS */}
      {/* ========================================================================= */}
      {tab === 'questions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-navigation inside questions */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuestionSubTab('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  questionSubTab === 'today'
                    ? 'bg-togetherly-rose/15 text-togetherly-rose font-semibold'
                    : 'text-togetherly-textMuted hover:text-white'
                }`}
              >
                Today's Question
              </button>
              <button
                onClick={() => setQuestionSubTab('categories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  questionSubTab === 'categories'
                    ? 'bg-togetherly-rose/15 text-togetherly-rose font-semibold'
                    : 'text-togetherly-textMuted hover:text-white'
                }`}
              >
                10 Connection Decks
              </button>
              <button
                onClick={loadQuestionHistory}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  questionSubTab === 'history'
                    ? 'bg-togetherly-rose/15 text-togetherly-rose font-semibold'
                    : 'text-togetherly-textMuted hover:text-white'
                }`}
              >
                Saved History
              </button>
            </div>

            <button
              onClick={() => setShowAIQuestionModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-togetherly-gold/20 text-togetherly-gold text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Companion</span>
            </button>
          </div>

          {/* 1A. TODAY'S QUESTION VIEW */}
          {questionSubTab === 'today' && dailyQuestion && (
            <GlassCard className="p-7 md:p-9 max-w-2xl mx-auto text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-togetherly-rose/10 border border-togetherly-rose/25 text-xs text-togetherly-roseLight mb-4 font-medium uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{dailyQuestion.category}</span>
              </div>

              <h3 className="font-serif text-2xl md:text-3xl font-medium text-togetherly-text mb-6 leading-relaxed">
                "{dailyQuestion.text}"
              </h3>

              {dailyQuestion.bothAnswered ? (
                /* SIMULTANEOUS REVEAL */
                <div className="text-left space-y-4 pt-6 border-t border-white/5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-togetherly-gold pb-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Both Answers Unlocked!
                    </span>
                    <span>Shared Intimacy</span>
                  </div>

                  {/* Current User Response */}
                  <div className="p-4 rounded-2xl bg-togetherly-bg/80 border border-togetherly-rose/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={user?.firstName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-togetherly-roseLight">
                          {user?.firstName} (You)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {['❤️', '🥰', '😂', '🥺'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReactToAnswer(dailyQuestion.userAnswer.id, emoji)}
                            className={`text-sm p-1 rounded-full hover:bg-white/10 transition-colors ${
                              dailyQuestion.userAnswer?.reaction === emoji ? 'bg-white/15 scale-110' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-togetherly-text pl-9 leading-relaxed">
                      {dailyQuestion.userAnswer?.answer}
                    </p>
                  </div>

                  {/* Partner Response */}
                  <div className="p-4 rounded-2xl bg-togetherly-bg/80 border border-togetherly-gold/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50'}
                          alt={partner?.firstName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-togetherly-gold">
                          {partner?.firstName || 'Partner'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {['❤️', '🥰', '😂', '🥺'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() =>
                              dailyQuestion.partnerAnswer?.id &&
                              handleReactToAnswer(dailyQuestion.partnerAnswer.id, emoji)
                            }
                            className={`text-sm p-1 rounded-full hover:bg-white/10 transition-colors ${
                              dailyQuestion.partnerAnswer?.reaction === emoji ? 'bg-white/15 scale-110' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-togetherly-text pl-9 leading-relaxed">
                      {dailyQuestion.partnerAnswer?.answer}
                    </p>
                  </div>
                </div>
              ) : dailyQuestion.userAnswer ? (
                /* WAITING FOR PARTNER */
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs text-togetherly-roseLight font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>Your answer is submitted and sealed safely</span>
                  </div>
                  <p className="text-sm text-togetherly-textMuted italic max-w-md mx-auto">
                    "{dailyQuestion.userAnswer.answer}"
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2 text-xs text-togetherly-gold">
                    <Lock className="w-4 h-4" />
                    <span>Waiting for {partner?.firstName || 'your partner'} to submit their answer</span>
                  </div>
                </div>
              ) : (
                /* SUBMIT ANSWER FORM */
                <form onSubmit={handleAnswerDaily} className="space-y-4 max-w-lg mx-auto">
                  <textarea
                    rows={3}
                    required
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Write your honest, heartfelt answer here..."
                    className="w-full px-4 py-3 rounded-2xl bg-togetherly-bg border border-white/10 text-sm text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-togetherly-gold">
                      <Lock className="w-3.5 h-3.5" />
                      Hidden until both submit
                    </span>
                    <button
                      type="submit"
                      disabled={!answerInput.trim()}
                      className="px-6 py-2.5 rounded-xl bg-togetherly-rose text-black font-semibold shadow-glow-rose hover:opacity-95 transition-all disabled:opacity-40"
                    >
                      Submit Answer
                    </button>
                  </div>
                </form>
              )}
            </GlassCard>
          )}

          {/* 1B. 10 CONNECTION DECKS VIEW */}
          {questionSubTab === 'categories' && (
            <div className="space-y-6">
              {!selectedCategory ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {categories.map((cat) => (
                    <GlassCard
                      key={cat.id}
                      variant="interactive"
                      onClick={() => handleSelectCategory(cat)}
                      className="p-5 text-center flex flex-col items-center justify-between min-h-[140px]"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-togetherly-rose/15 text-togetherly-rose flex items-center justify-center mb-2">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-semibold text-togetherly-text leading-tight mb-1">
                        {cat.name}
                      </h4>
                      <span className="text-[10px] text-togetherly-gold font-medium">
                        {cat._count?.questions || 10} Questions
                      </span>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-togetherly-rose hover:underline flex items-center gap-1"
                    >
                      ← Back to All Decks
                    </button>
                    <span className="text-xs text-togetherly-gold font-medium">
                      {selectedCategory.name} Deck
                    </span>
                  </div>

                  <div className="space-y-3">
                    {categoryQuestions.map((q, idx) => (
                      <GlassCard key={q.id} className="p-5 flex items-center justify-between gap-4">
                        <div className="max-w-xl">
                          <span className="text-[10px] text-togetherly-textMuted uppercase tracking-wider block mb-1">
                            Card #{idx + 1}
                          </span>
                          <p className="font-serif text-base text-togetherly-text font-medium leading-relaxed">
                            "{q.text}"
                          </p>
                          {q.bothAnswered && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-400 mt-2 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Both Answered
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setDailyQuestion(q);
                            setQuestionSubTab('today');
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-togetherly-rose font-medium border border-white/5 shrink-0"
                        >
                          {q.bothAnswered ? 'View Answers' : q.userAnswer ? 'Waiting' : 'Answer'}
                        </button>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1C. SAVED HISTORY VIEW */}
          {questionSubTab === 'history' && (
            <div className="space-y-4">
              {questionHistory.length === 0 ? (
                <div className="text-center py-12 text-togetherly-textMuted text-xs">
                  <Heart className="w-6 h-6 mx-auto mb-2 opacity-30 text-togetherly-rose" />
                  No completed question conversations yet. Answer questions together to fill this diary!
                </div>
              ) : (
                questionHistory.map((item, idx) => (
                  <GlassCard key={idx} className="p-6 space-y-4">
                    <div>
                      <span className="text-[10px] text-togetherly-roseLight uppercase tracking-wider font-medium">
                        {item.category}
                      </span>
                      <h4 className="font-serif text-lg font-medium text-togetherly-text mt-1">
                        "{item.question.text}"
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      {item.responses.map((r: any) => (
                        <div key={r.id} className="p-3.5 rounded-xl bg-black/20 border border-white/5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-togetherly-roseLight">
                              {r.user.firstName}
                            </span>
                            {r.reaction && <span className="text-sm">{r.reaction}</span>}
                          </div>
                          <p className="text-xs text-togetherly-text leading-relaxed">{r.answer}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY PHOTO CHALLENGES */}
      {/* ========================================================================= */}
      {tab === 'photos' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Today's Prompt Banner */}
          <GlassCard className="p-6 md:p-8 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-togetherly-gold uppercase tracking-wider mb-2">
              <Camera className="w-4 h-4" />
              <span>Today's Daily Photo Challenge</span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-medium text-togetherly-text mb-6">
              "{photoChallenge?.prompt || 'Show something that reminds you of me'}"
            </h3>

            {/* Split Dual Display if photos exist */}
            {photoChallenge?.photos && photoChallenge.photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photoChallenge.photos.map((p: any) => (
                  <div key={p.id} className="relative rounded-2xl overflow-hidden aspect-square bg-black/40 border border-white/10 group">
                    <img src={p.photoUrl} alt="Challenge" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={p.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={p.user.firstName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-white">{p.user.firstName}</span>
                      </div>
                      {p.caption && (
                        <p className="text-xs text-togetherly-textMuted italic">{p.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-togetherly-textMuted italic mb-6">
                Neither partner has shared today's view yet. Upload a photo below!
              </p>
            )}

            {/* Upload Area */}
            <form onSubmit={handleUploadPhoto} className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <h4 className="text-xs font-semibold text-togetherly-text uppercase tracking-wider">
                Share Your Snapshot
              </h4>

              {/* Presets or custom file */}
              <div>
                <label className="block text-[11px] text-togetherly-textMuted mb-2">
                  Select a Photo Preset or Upload from Device:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PHOTO_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setSelectedPhotoPreset(preset.url);
                        setCustomPhotoFile(null);
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                        selectedPhotoPreset === preset.url && !customPhotoFile
                          ? 'border-togetherly-rose scale-105 shadow-glow-rose'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1 rounded text-white truncate max-w-[90%]">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-togetherly-text transition-colors flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-togetherly-rose" />
                    <span>Upload Custom Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setCustomPhotoFile(e.target.files[0]);
                      }}
                    />
                  </label>
                  {customPhotoFile && (
                    <span className="text-xs text-togetherly-gold font-medium truncate max-w-xs">
                      Selected: {customPhotoFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Caption */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Add an intimate caption or thought..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-xs text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose"
                />
                <button
                  type="submit"
                  disabled={photoUploading}
                  className="px-6 py-2.5 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all disabled:opacity-40"
                >
                  {photoUploading ? 'Posting...' : 'Post Photo'}
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Couple Photo Feed */}
          <div>
            <h4 className="font-serif text-lg font-medium text-togetherly-text mb-4">
              Shared Photo Gallery
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photoFeed.map((photo) => (
                <div key={photo.id} className="relative rounded-2xl overflow-hidden aspect-square bg-black/30 border border-white/5 group">
                  <img src={photo.photoUrl} alt="Feed" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 opacity-90">
                    <p className="text-[11px] text-togetherly-text font-medium truncate">
                      {photo.user.firstName}: {photo.caption || photo.prompt}
                    </p>
                    <span className="text-[9px] text-togetherly-textMuted">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SHARED CANVAS (REAL-TIME DRAWING & STICKY NOTES) */}
      {/* ========================================================================= */}
      {tab === 'canvas' && (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel">
            {/* Color Palette */}
            <div className="flex items-center gap-1.5">
              {['#E8A0A8', '#D9B77E', '#FFF8F5', '#C4B5FD', '#6EE7B7', '#F43F5E'].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setStrokeColor(color);
                    setIsEraser(false);
                  }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    strokeColor === color && !isEraser ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ml-2 transition-colors ${
                  isEraser ? 'bg-white text-black' : 'bg-white/10 text-togetherly-textMuted'
                }`}
              >
                Eraser
              </button>
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2 text-xs text-togetherly-textMuted">
              <span>Size:</span>
              {[2, 5, 10, 18].map((size) => (
                <button
                  key={size}
                  onClick={() => setStrokeSize(size)}
                  className={`w-6 h-6 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                    strokeSize === size ? 'bg-togetherly-rose text-black font-bold' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearCanvas}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-togetherly-textMuted hover:text-red-400 transition-colors"
                title="Clear canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveCanvas}
                className="px-4 py-1.5 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose flex items-center gap-1.5 hover:opacity-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Drawing</span>
              </button>
            </div>
          </div>

          {canvasSavedNotice && (
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs text-center font-medium animate-fade-in">
              Drawing saved to your relationship memories!
            </div>
          )}

          {/* Interactive Canvas Canvas Card */}
          <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl bg-[#0D0B10]">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[400px] md:h-[500px] cursor-crosshair touch-none"
            />

            {/* Sticky Notes Floating Over Canvas */}
            {stickyNotes.map((note) => (
              <div
                key={note.id}
                className="absolute p-3 rounded-xl shadow-lg border border-white/20 text-xs text-black font-medium max-w-[160px] animate-fade-in cursor-move select-none"
                style={{
                  top: `${note.y}px`,
                  left: `${note.x}px`,
                  backgroundColor: note.color,
                }}
              >
                {note.text}
              </div>
            ))}
          </div>

          {/* Add Sticky Note Bar */}
          <div className="p-3 rounded-2xl glass-panel flex gap-2">
            <input
              type="text"
              value={newStickyText}
              onChange={(e) => setNewStickyText(e.target.value)}
              placeholder="Leave a sweet sticky note on the canvas..."
              className="flex-1 px-4 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs text-togetherly-text placeholder:text-neutral-600 focus:outline-none focus:border-togetherly-rose"
            />
            <button
              onClick={handleAddStickyNote}
              disabled={!newStickyText.trim()}
              className="px-4 py-2 rounded-xl bg-togetherly-gold text-black font-semibold text-xs shadow-glow-gold hover:opacity-95 transition-all disabled:opacity-40 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stick Note</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOVE NOTES CAPSULE */}
      {/* ========================================================================= */}
      {tab === 'notes' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Header Action */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-medium text-togetherly-text">
                Love Capsule Vault
              </h3>
              <p className="text-xs text-togetherly-textMuted">
                Sealed surprise letters for your partner to open in special moments.
              </p>
            </div>
            <button
              onClick={() => setShowCreateNoteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose flex items-center gap-1.5 hover:opacity-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Seal New Capsule</span>
            </button>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loveNotes.map((note) => {
              const isReceiver = note.receiver.id === user?.id;
              const isLocked = isReceiver && !note.isOpened;

              return (
                <GlassCard
                  key={note.id}
                  variant="interactive"
                  onClick={() => handleOpenLoveNote(note)}
                  className="p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-togetherly-gold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                        {note.unlockCondition.replace('_', ' ')}
                      </span>
                      {isLocked ? (
                        <div className="w-6 h-6 rounded-full bg-togetherly-rose/20 text-togetherly-rose flex items-center justify-center">
                          <LockKeyhole className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <h4 className="font-serif text-base font-semibold text-togetherly-text mb-1 group-hover:text-togetherly-roseLight transition-colors">
                      {note.title}
                    </h4>

                    {isLocked ? (
                      <p className="text-xs text-togetherly-textMuted italic flex items-center gap-1.5 mt-2">
                        <span>Tap to unseal envelope</span>
                      </p>
                    ) : (
                      <p className="text-xs text-togetherly-textMuted line-clamp-3 leading-relaxed mt-2">
                        {note.content}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-togetherly-textMuted">
                    <span>From {note.sender.firstName}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE LOVE NOTE MODAL */}
      <Modal
        isOpen={showCreateNoteModal}
        onClose={() => setShowCreateNoteModal(false)}
        title="Seal a Surprise Love Capsule"
      >
        <form onSubmit={handleCreateLoveNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
              Envelope Title / Condition
            </label>
            <input
              type="text"
              required
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="e.g. Open when you miss my hugs"
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                Unlock Condition
              </label>
              <select
                value={noteForm.unlockCondition}
                onChange={(e) => setNoteForm({ ...noteForm, unlockCondition: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose focus:outline-none text-togetherly-text"
              >
                <option value="MISS_YOU">When you miss me</option>
                <option value="SAD">When you're sad</option>
                <option value="MOTIVATION">When you need motivation</option>
                <option value="SMILE">When you want to smile</option>
                <option value="ANNIVERSARY">On our anniversary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1 uppercase tracking-wider">
                Capsule Theme
              </label>
              <select
                value={noteForm.theme}
                onChange={(e) => setNoteForm({ ...noteForm, theme: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose focus:outline-none text-togetherly-text"
              >
                <option value="romantic">Romantic Rose</option>
                <option value="starlight">Midnight Starlight</option>
                <option value="golden">Golden Hearth</option>
                <option value="whisper">Gentle Whisper</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-togetherly-textMuted uppercase tracking-wider">
                Heartfelt Message
              </label>
              <button
                type="button"
                onClick={handleGenerateAILetter}
                disabled={aiLetterLoading}
                className="text-xs text-togetherly-gold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{aiLetterLoading ? 'Writing...' : 'AI Love Letter Draft'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              required
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              placeholder="Speak straight from your heart. This message will stay sealed until your partner opens it."
              className="w-full px-4 py-2.5 rounded-xl bg-togetherly-bg border border-white/10 text-sm focus:border-togetherly-rose focus:outline-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all"
          >
            Wax Seal & Deliver Capsule
          </button>
        </form>
      </Modal>

      {/* UNSEALED NOTE READING MODAL */}
      <Modal
        isOpen={Boolean(openedNoteModal)}
        onClose={() => setOpenedNoteModal(null)}
        title={openedNoteModal?.title || 'Love Capsule'}
      >
        {openedNoteModal && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-togetherly-rose/15 text-togetherly-rose flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 fill-togetherly-rose text-togetherly-rose animate-pulse" />
            </div>

            <p className="font-serif text-lg text-togetherly-text leading-relaxed whitespace-pre-line text-left px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
              {openedNoteModal.content}
            </p>

            <div className="text-xs text-togetherly-gold italic pt-2">
              Written with devotion by {openedNoteModal.sender.firstName}
            </div>
          </div>
        )}
      </Modal>

      {/* AI QUESTION ASSISTANT MODAL */}
      <Modal
        isOpen={showAIQuestionModal}
        onClose={() => setShowAIQuestionModal(false)}
        title="Togetherly AI Prompt Companion"
      >
        <div className="space-y-4">
          <p className="text-xs text-togetherly-textMuted leading-relaxed">
            Generate original, customized conversation questions tailored to your relationship atmosphere.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                Category
              </label>
              <select
                value={aiQuestionPrompt.category}
                onChange={(e) => setAiQuestionPrompt({ ...aiQuestionPrompt, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
              >
                <option value="Deep Conversations">Deep Conversations</option>
                <option value="Love & Affection">Love & Affection</option>
                <option value="Dreams & Future">Dreams & Future</option>
                <option value="Funny Questions">Funny Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-togetherly-textMuted mb-1">
                Intimacy Level
              </label>
              <select
                value={aiQuestionPrompt.intimacyLevel}
                onChange={(e) => setAiQuestionPrompt({ ...aiQuestionPrompt, intimacyLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-togetherly-bg border border-white/10 text-xs focus:border-togetherly-rose"
              >
                <option value={1}>1 - Casual & Fun</option>
                <option value={2}>2 - Thoughtful</option>
                <option value={3}>3 - Deep & Vulnerable</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateAIQuestion}
            disabled={aiLoading}
            className="w-full py-2.5 rounded-xl bg-togetherly-gold text-black font-semibold text-xs shadow-glow-gold hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Crafting question...' : 'Generate Original Prompt'}</span>
          </button>

          {aiGeneratedQuestion && (
            <div className="p-4 rounded-2xl bg-togetherly-rose/10 border border-togetherly-rose/30 space-y-3 animate-fade-in">
              <p className="font-serif text-base text-togetherly-text font-medium leading-relaxed">
                "{aiGeneratedQuestion.question}"
              </p>
              <button
                onClick={() => {
                  setDailyQuestion({
                    id: 'ai-custom-' + Date.now(),
                    text: aiGeneratedQuestion.question,
                    category: aiGeneratedQuestion.category,
                    bothAnswered: false,
                  });
                  setShowAIQuestionModal(false);
                  setQuestionSubTab('today');
                }}
                className="w-full py-2 rounded-xl bg-togetherly-rose text-black text-xs font-semibold hover:opacity-95"
              >
                Use as Today's Question
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

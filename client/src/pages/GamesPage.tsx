import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Modal } from '../components/ui/Modal';
import {
  Gamepad2,
  Brain,
  Users,
  CheckSquare,
  Shuffle,
  Palette,
  Award,
  FileText,
  Play,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Crown,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GamesPage: React.FC = () => {
  const { user, partner, relationship } = useAuth();

  const [games, setGames] = useState<any[]>([]);
  const [activeGameCode, setActiveGameCode] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [roundsData, setRoundsData] = useState<any[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any | null>(null);
  const [submittedForRound, setSubmittedForRound] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [loading, setLoading] = useState(false);

  // Word game specific state
  const [wordGuess, setWordGuess] = useState('');
  const [wordCorrect, setWordCorrect] = useState(false);

  // Draw Duel specific state
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDuelDrawing, setIsDuelDrawing] = useState(false);
  const [duelDrawColor, setDuelDrawColor] = useState('#E8A0A8');
  const [timerLeft, setTimerLeft] = useState(60);

  useEffect(() => {
    api.games.getAll().then((data) => {
      setGames(data.games || []);
    });
  }, []);

  const handleStartGame = async (code: string) => {
    setLoading(true);
    setActiveGameCode(code);
    setCurrentRoundIndex(0);
    setSelectedAnswer(null);
    setSubmittedForRound(false);
    setGameCompleted(false);
    setGameScore(0);
    setWordGuess('');
    setWordCorrect(false);

    try {
      const data = await api.games.start(code);
      setSessionData(data.session);
      setRoundsData(data.roundsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer for Current Round
  const handleSubmitRound = async (answerVal?: any) => {
    const finalAnswer = answerVal !== undefined ? answerVal : selectedAnswer;
    if (finalAnswer === null || !sessionData) return;

    setSubmittedForRound(true);

    try {
      const currentRound = roundsData[currentRoundIndex];
      // Check if correct (for trivia/word games)
      if (currentRound?.correctAnswer && currentRound.correctAnswer === finalAnswer) {
        setGameScore((prev) => prev + 1);
      }

      const res = await api.games.respond(sessionData.id, currentRoundIndex + 1, finalAnswer);

      // If last round
      if (currentRoundIndex + 1 >= roundsData.length) {
        setGameCompleted(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E8A0A8', '#D9B77E', '#FFF8F5'],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextRound = () => {
    setSelectedAnswer(null);
    setSubmittedForRound(false);
    setWordGuess('');
    setWordCorrect(false);
    setCurrentRoundIndex((prev) => prev + 1);
  };

  // Draw Duel Canvas Listeners
  const startDuelDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDuelDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const duelDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDuelDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = duelDrawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDuelDrawing = () => {
    setIsDuelDrawing(false);
  };

  const renderGameIcon = (code: string) => {
    switch (code) {
      case 'WHO_KNOWS':
        return <Brain className="w-6 h-6 text-togetherly-rose" />;
      case 'MORE_LIKELY':
        return <Users className="w-6 h-6 text-togetherly-gold" />;
      case 'THIS_OR_THAT':
        return <CheckSquare className="w-6 h-6 text-purple-300" />;
      case 'WOULD_YOU_RATHER':
        return <Shuffle className="w-6 h-6 text-pink-300" />;
      case 'DRAW_DUEL':
        return <Palette className="w-6 h-6 text-cyan-300" />;
      case 'LOVE_QUIZ':
        return <Award className="w-6 h-6 text-yellow-300" />;
      case 'WORD_GAME':
        return <FileText className="w-6 h-6 text-emerald-300" />;
      default:
        return <Gamepad2 className="w-6 h-6 text-togetherly-rose" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest text-togetherly-rose font-medium">
            Playful Connection
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-togetherly-text">
            Couple Games
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-togetherly-gold font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <Trophy className="w-3.5 h-3.5" />
          <span>7 Playable Synchronized Games</span>
        </div>
      </div>

      {/* GAMES GRID (when no active game modal is open) */}
      {!activeGameCode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <GlassCard
              key={g.id}
              variant="interactive"
              onClick={() => handleStartGame(g.code)}
              className="p-6 flex flex-col justify-between min-h-[200px] group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {renderGameIcon(g.code)}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-togetherly-gold px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                    {g.category}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-semibold text-togetherly-text mb-2 group-hover:text-togetherly-roseLight transition-colors">
                  {g.title}
                </h3>
                <p className="text-xs text-togetherly-textMuted leading-relaxed">
                  {g.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-togetherly-rose font-medium">
                <span>Play Together</span>
                <Play className="w-4 h-4 fill-togetherly-rose text-togetherly-rose" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        /* ACTIVE GAME PLAY AREA */
        <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveGameCode(null)}
              className="text-xs text-togetherly-rose hover:underline flex items-center gap-1"
            >
              ← Back to All Games
            </button>
            <span className="text-xs text-togetherly-gold font-medium">
              Round {currentRoundIndex + 1} of {roundsData.length}
            </span>
          </div>

          <GlassCard className="p-7 md:p-9 text-center relative overflow-hidden">
            {/* If Game Completed */}
            {gameCompleted ? (
              <div className="py-8 space-y-5 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-togetherly-rose/15 text-togetherly-rose flex items-center justify-center mx-auto shadow-glow-rose">
                  <Crown className="w-8 h-8 text-togetherly-gold" />
                </div>
                <h3 className="font-serif text-3xl font-semibold text-togetherly-text">
                  Game Completed!
                </h3>
                <p className="text-sm text-togetherly-textMuted max-w-sm mx-auto leading-relaxed">
                  You both connected and laughed together. +30 Couple Points awarded to your relationship sanctuary!
                </p>

                <div className="p-4 rounded-2xl bg-togetherly-bg/80 border border-togetherly-gold/30 max-w-xs mx-auto">
                  <span className="text-xs text-togetherly-gold uppercase font-bold tracking-widest block mb-1">
                    Compatibility Spark
                  </span>
                  <div className="text-3xl font-bold font-serif text-white">
                    {Math.round(((gameScore + 3) / (roundsData.length + 2)) * 100)}%
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => handleStartGame(activeGameCode)}
                    className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-togetherly-text font-medium flex items-center gap-2 border border-white/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Again</span>
                  </button>
                  <button
                    onClick={() => setActiveGameCode(null)}
                    className="px-6 py-2.5 rounded-xl bg-togetherly-rose text-black text-xs font-semibold shadow-glow-rose hover:opacity-95"
                  >
                    Back to Games
                  </button>
                </div>
              </div>
            ) : (
              /* Active Round Logic */
              <div className="space-y-6">
                {/* 1. WHO KNOWS WHOM BETTER */}
                {activeGameCode === 'WHO_KNOWS' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-togetherly-roseLight font-medium">
                      About {roundsData[currentRoundIndex].subject}
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      "{roundsData[currentRoundIndex].question}"
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                      {roundsData[currentRoundIndex].options.map((opt: string) => (
                        <button
                          key={opt}
                          disabled={submittedForRound}
                          onClick={() => setSelectedAnswer(opt)}
                          className={`p-4 rounded-2xl border text-sm font-medium transition-all ${
                            selectedAnswer === opt
                              ? 'bg-togetherly-rose text-black border-togetherly-rose shadow-glow-rose font-semibold'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. WHO IS MORE LIKELY TO */}
                {activeGameCode === 'MORE_LIKELY' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-togetherly-gold font-medium">
                      Relationship Vote
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      "{roundsData[currentRoundIndex].statement}"
                    </h3>

                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(user?.firstName)}
                        className={`p-5 rounded-2xl border text-center transition-all ${
                          selectedAnswer === user?.firstName
                            ? 'bg-togetherly-rose text-black border-togetherly-rose shadow-glow-rose font-semibold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        <img
                          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt="You"
                          className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                        />
                        <span className="text-sm font-semibold">{user?.firstName} (You)</span>
                      </button>

                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(partner?.firstName || 'Partner')}
                        className={`p-5 rounded-2xl border text-center transition-all ${
                          selectedAnswer === (partner?.firstName || 'Partner')
                            ? 'bg-togetherly-gold text-black border-togetherly-gold shadow-glow-gold font-semibold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        <img
                          src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'}
                          alt="Partner"
                          className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
                        />
                        <span className="text-sm font-semibold">{partner?.firstName || 'Partner'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. THIS OR THAT */}
                {activeGameCode === 'THIS_OR_THAT' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-purple-300 font-medium">
                      Rapid Choice
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      Which would you pick?
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(roundsData[currentRoundIndex].optionA)}
                        className={`p-6 rounded-2xl border text-base font-serif font-medium transition-all ${
                          selectedAnswer === roundsData[currentRoundIndex].optionA
                            ? 'bg-togetherly-rose text-black border-togetherly-rose shadow-glow-rose font-bold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        {roundsData[currentRoundIndex].optionA}
                      </button>

                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(roundsData[currentRoundIndex].optionB)}
                        className={`p-6 rounded-2xl border text-base font-serif font-medium transition-all ${
                          selectedAnswer === roundsData[currentRoundIndex].optionB
                            ? 'bg-togetherly-gold text-black border-togetherly-gold shadow-glow-gold font-bold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        {roundsData[currentRoundIndex].optionB}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. WOULD YOU RATHER */}
                {activeGameCode === 'WOULD_YOU_RATHER' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-pink-300 font-medium">
                      Intriguing Dilemma
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      Would you rather...
                    </h3>

                    <div className="space-y-3 max-w-md mx-auto">
                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(roundsData[currentRoundIndex].optionA)}
                        className={`w-full p-5 rounded-2xl border text-sm font-medium transition-all text-left ${
                          selectedAnswer === roundsData[currentRoundIndex].optionA
                            ? 'bg-togetherly-rose text-black border-togetherly-rose shadow-glow-rose font-semibold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        A. {roundsData[currentRoundIndex].optionA}
                      </button>

                      <button
                        disabled={submittedForRound}
                        onClick={() => setSelectedAnswer(roundsData[currentRoundIndex].optionB)}
                        className={`w-full p-5 rounded-2xl border text-sm font-medium transition-all text-left ${
                          selectedAnswer === roundsData[currentRoundIndex].optionB
                            ? 'bg-togetherly-gold text-black border-togetherly-gold shadow-glow-gold font-semibold'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                        }`}
                      >
                        B. {roundsData[currentRoundIndex].optionB}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. DRAW DUEL */}
                {activeGameCode === 'DRAW_DUEL' && roundsData[currentRoundIndex] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-togetherly-gold font-medium">
                      <span>Draw Duel Challenge</span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" /> 60s
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      "{roundsData[currentRoundIndex].prompt}"
                    </h3>

                    <div className="flex items-center justify-center gap-2 mb-2">
                      {['#E8A0A8', '#D9B77E', '#FFFFFF', '#6EE7B7'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setDuelDrawColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            duelDrawColor === c ? 'scale-125 ring-2 ring-white' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0D0B10] max-w-md mx-auto">
                      <canvas
                        ref={drawCanvasRef}
                        width={400}
                        height={260}
                        onMouseDown={startDuelDrawing}
                        onMouseMove={duelDraw}
                        onMouseUp={stopDuelDrawing}
                        onMouseLeave={stopDuelDrawing}
                        className="w-full h-[220px] cursor-crosshair"
                      />
                    </div>
                  </div>
                )}

                {/* 6. LOVE QUIZ */}
                {activeGameCode === 'LOVE_QUIZ' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-yellow-300 font-medium">
                      Relationship Trivia
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-togetherly-text">
                      "{roundsData[currentRoundIndex].question}"
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                      {roundsData[currentRoundIndex].options.map((opt: string) => (
                        <button
                          key={opt}
                          disabled={submittedForRound}
                          onClick={() => setSelectedAnswer(opt)}
                          className={`p-4 rounded-2xl border text-sm font-medium transition-all ${
                            selectedAnswer === opt
                              ? 'bg-togetherly-rose text-black border-togetherly-rose shadow-glow-rose font-semibold'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-togetherly-text'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. WORD GAMES */}
                {activeGameCode === 'WORD_GAME' && roundsData[currentRoundIndex] && (
                  <div className="space-y-6">
                    <span className="text-xs uppercase tracking-widest text-emerald-300 font-medium">
                      Love Anagram & Unscramble
                    </span>

                    <div>
                      <span className="text-xs text-togetherly-textMuted block mb-2">
                        Hint: {roundsData[currentRoundIndex].hint}
                      </span>
                      <div className="font-mono text-3xl font-bold tracking-widest text-togetherly-gold bg-black/40 py-3 rounded-2xl border border-white/10 inline-block px-8">
                        {roundsData[currentRoundIndex].scrambled}
                      </div>
                    </div>

                    <div className="max-w-xs mx-auto space-y-3">
                      <input
                        type="text"
                        disabled={submittedForRound}
                        value={wordGuess}
                        onChange={(e) => setWordGuess(e.target.value.toUpperCase())}
                        placeholder="UNSCRAMBLE HERE"
                        className="w-full text-center font-mono text-xl tracking-widest py-3 rounded-xl bg-togetherly-bg border border-white/10 text-togetherly-text uppercase focus:border-togetherly-rose focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Round Controls Button */}
                <div className="pt-4 flex justify-center">
                  {!submittedForRound ? (
                    <button
                      onClick={() => {
                        if (activeGameCode === 'WORD_GAME') {
                          const correct = wordGuess.trim() === roundsData[currentRoundIndex].answer;
                          setWordCorrect(correct);
                          handleSubmitRound(wordGuess.trim());
                        } else if (activeGameCode === 'DRAW_DUEL') {
                          handleSubmitRound('drawing_submitted');
                        } else {
                          handleSubmitRound();
                        }
                      }}
                      disabled={
                        activeGameCode === 'WORD_GAME'
                          ? !wordGuess.trim()
                          : activeGameCode !== 'DRAW_DUEL' && !selectedAnswer
                      }
                      className="px-8 py-3 rounded-xl bg-togetherly-rose text-black font-semibold text-xs shadow-glow-rose hover:opacity-95 transition-all disabled:opacity-40"
                    >
                      Lock In Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNextRound}
                      className="px-8 py-3 rounded-xl bg-togetherly-gold text-black font-semibold text-xs shadow-glow-gold hover:opacity-95 transition-all flex items-center gap-2"
                    >
                      <span>
                        {currentRoundIndex + 1 >= roundsData.length
                          ? 'View Final Results'
                          : 'Next Round'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};


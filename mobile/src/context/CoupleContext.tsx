import React, { createContext, useContext, useEffect, useState } from 'react';
import { DashboardData, Partner, Question, Relationship, Memory, LoveNote, Drawing } from '../types';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';
import { useSync } from './SyncContext';

interface CoupleContextType {
  dashboard: DashboardData | null;
  partner: Partner | null;
  relationship: Relationship | null;
  dailyQuestion: Question | null;
  memories: Memory[];
  loveNotes: LoveNote[];
  drawings: Drawing[];
  isLoading: boolean;
  refreshDashboard: () => Promise<void>;
  answerDailyQuestion: (answer: string) => Promise<void>;
}

const CoupleContext = createContext<CoupleContextType>({} as any);

export const CoupleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isOnline } = useSync();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [dailyQuestion, setDailyQuestion] = useState<Question | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user?.relationshipId) {
      loadData();
      setupSocketListeners();
    }
  }, [user?.relationshipId, isOnline]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        // Fetch fresh online dashboard
        const data = await api.getDashboard();
        setDashboard(data);
        if (data.partner) setPartner(data.partner);
        if (data.relationship) setRelationship(data.relationship);
        if (data.dailyQuestion) {
          setDailyQuestion(data.dailyQuestion);
          await offlineStorage.saveDailyQuestion(data.dailyQuestion);
        }
        if (data.recentMemories) {
          setMemories(data.recentMemories);
          await offlineStorage.saveMemories(data.recentMemories);
        }
      } else {
        // Offline load from SQLite
        const cachedQ = await offlineStorage.getCachedQuestions();
        if (cachedQ.length > 0) {
          setDailyQuestion(cachedQ[0]);
        }
        const cachedM = await offlineStorage.getCachedMemories();
        if (cachedM.length > 0) {
          setMemories(cachedM as any);
        }
        const cachedN = await offlineStorage.getCachedLoveNotes();
        if (cachedN.length > 0) {
          setLoveNotes(cachedN as any);
        }
        const cachedD = await offlineStorage.getCachedDrawings();
        if (cachedD.length > 0) {
          setDrawings(cachedD as any);
        }
      }
    } catch {
      // Fallback to SQLite cached data
      const cachedQ = await offlineStorage.getCachedQuestions();
      if (cachedQ.length > 0) setDailyQuestion(cachedQ[0]);
      const cachedM = await offlineStorage.getCachedMemories();
      if (cachedM.length > 0) setMemories(cachedM as any);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('question:answered', () => {
      refreshDashboard();
    });
    socketService.on('partner:joined', () => {
      refreshDashboard();
    });
    socketService.on('photo:uploaded', () => {
      refreshDashboard();
    });
    socketService.on('love-note:sent', () => {
      refreshDashboard();
    });
  };

  const refreshDashboard = async () => {
    if (!isOnline) return;
    try {
      const data = await api.getDashboard();
      setDashboard(data);
      if (data.partner) setPartner(data.partner);
      if (data.relationship) setRelationship(data.relationship);
      if (data.dailyQuestion) {
        setDailyQuestion(data.dailyQuestion);
        await offlineStorage.saveDailyQuestion(data.dailyQuestion);
      }
      if (data.recentMemories) {
        setMemories(data.recentMemories);
      }
    } catch {}
  };

  const answerDailyQuestion = async (answer: string) => {
    if (!dailyQuestion) return;

    // Optimistically update local dailyQuestion state
    const optimisticAnswer = {
      id: `local_${Date.now()}`,
      answer,
      user: { id: user?.id || 'me', firstName: user?.firstName || 'Me' },
    };

    setDailyQuestion((prev) =>
      prev
        ? {
            ...prev,
            userAnswer: optimisticAnswer as any,
          }
        : null
    );

    // Save offline & queue or execute
    await api.answerQuestion(dailyQuestion.id, answer);
    await offlineStorage.saveDailyQuestion({
      ...dailyQuestion,
      userAnswer: optimisticAnswer,
    });
  };

  return (
    <CoupleContext.Provider
      value={{
        dashboard,
        partner,
        relationship,
        dailyQuestion,
        memories,
        loveNotes,
        drawings,
        isLoading,
        refreshDashboard,
        answerDailyQuestion,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
};

export const useCouple = () => useContext(CoupleContext);


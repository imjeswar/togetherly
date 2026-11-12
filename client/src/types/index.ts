export interface UserProfile {
  bio?: string;
  nickname?: string;
  loveLanguage?: string;
  favoriteMemory?: string;
  interests?: string[];
  timezone?: string;
}

export interface UserSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEffects: boolean;
  theme: string;
  privacyMode: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  profile?: UserProfile;
  settings?: UserSettings;
  relationshipId?: string | null;
}

export interface Partner {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  profile?: UserProfile;
}

export interface Relationship {
  id: string;
  code: string;
  status: 'ACTIVE' | 'PAUSED' | 'UNPAIRED';
  relationshipType: string;
  isLongDistance: boolean;
  anniversaryDate?: string;
  streakCount: number;
  couplePoints: number;
  daysTogether?: number;
  nextAnniversaryDays?: number;
}

export interface QuestionAnswer {
  id: string;
  answer: string;
  reaction?: string;
  partnerComment?: string;
  user?: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
}

export interface Question {
  id: string;
  text: string;
  category: string;
  intimacyLevel: number;
  bothAnswered: boolean;
  userAnswer?: QuestionAnswer | null;
  partnerAnswer?: (QuestionAnswer & { hasAnswered?: boolean }) | { hasAnswered: boolean } | null;
}

export interface QuestionCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  _count?: {
    questions: number;
  };
}

export interface Photo {
  id: string;
  photoUrl: string;
  prompt?: string;
  caption?: string;
  challengeDate?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
}

export interface Game {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

export interface GameSession {
  id: string;
  gameId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  currentRound: number;
  totalRounds: number;
  gameState: string;
  game: Game;
  responses: Array<{
    id: string;
    roundNumber: number;
    answer: string;
    score: number;
    user: {
      id: string;
      firstName: string;
      avatarUrl?: string;
    };
  }>;
}

export interface Drawing {
  id: string;
  title: string;
  canvasData: string;
  previewUrl?: string;
  stickyNotes: string;
  createdBy?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  mediaUrl?: string;
  reactions: string; // JSON
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
}

export interface LoveNote {
  id: string;
  title: string;
  content?: string | null;
  unlockCondition: string;
  theme: string;
  unlockDate?: string | null;
  isOpened: boolean;
  openedAt?: string | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
  receiver: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
}

export interface Memory {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'PHOTO' | 'MILESTONE' | 'DRAWING' | 'QUESTION' | 'LOVE_NOTE' | 'GAME';
  mediaUrl?: string;
  metadata?: string;
  createdAt: string;
}

export interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  duration?: string;
  userLiked?: boolean;
  partnerLiked?: boolean;
  isMutualMatch?: boolean;
  isCompleted?: boolean;
  scheduledFor?: string | null;
  notes?: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  pointsReward: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  user: User;
  partner?: Partner | null;
  relationship: Relationship;
  dailyQuestion?: Question | null;
  photoChallenge: {
    prompt: string;
    photos: Photo[];
    hasUserUploaded: boolean;
    hasPartnerUploaded: boolean;
  };
  dailyActivities: Array<{
    type: string;
    title: string;
    description: string;
    actionText: string;
    actionUrl: string;
    isCompleted: boolean;
  }>;
  completedActivities: string[];
  recentMemories: Memory[];
  pendingLoveNotesCount: number;
  unreadNotificationsCount: number;
}


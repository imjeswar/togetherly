# Togetherly — A little moment. A stronger connection.

> An intimate, private relationship platform designed exclusively for two consenting adults to cultivate daily connection, playful discovery, and lasting memories. Inspired by Apple-level simplicity, editorial warmth, and premium glassmorphic dark design.

---

## 🌟 Key Features

### 1. Authentication & Relationship Onboarding
- **Strict 18+ Age Restriction**: Enforced at schema, API validation (Zod), and frontend date picker levels.
- **Relationship Context Onboarding**: Captures anniversary date, relationship status, relationship type (Dating, Engaged, Married, Life Partners), living arrangement (Living Together vs. Long Distance), and shared interest tags.
- **Secure Authentication**: Password hashing with bcrypt, JWT token authentication via HTTP-only cookies and Authorization headers.
- **One-Click Demo Evaluator Switcher**: Instant evaluation switch between pre-seeded couple **Alex** (`alex@togetherly.app`) and **Sarah** (`sarah@togetherly.app`), password `password123`.

### 2. Private Partner Pairing System
- **Unique Invitation Codes**: Generates 6-character uppercase codes (e.g., `TOGETH`, `UFYK9Z`) and shareable invitation URLs.
- **Partner Preview Card**: Prospective partners preview avatar, name, bio, and love language before confirming connection.
- **Explicit Mutual Consent**: Exactly 2 partners per private couple workspace.
- **Real-Time Pairing Event**: Socket.IO triggers instant celebratory confetti and unlocks the workspace the millisecond the partner connects.
- **Safe Unpairing Flow**: Confirmation modal with explicit data retention explanations.

### 3. Home Dashboard
- **Personalized Header**: Time-of-day greeting ("Good morning / afternoon / evening") with linked couple avatars connected by an animated glowing heart spark.
- **Main Heading**: *"Little moments make a big love."*
- **Relationship Counter**: Dynamic days-together counter (*"You have created 879 beautiful days together."*) and upcoming anniversary countdown.
- **Animated Candle Flame**: Real-time flickering SVG flame with gradient glow reflecting relationship streak and activity level.
- **"Your Moment Together" Checklist**: Daily activity recommendations (Daily Question, Photo Prompt, Couple Game, Love Capsule).
- **Quick Action Shortcuts**: Instant access to Ask a Question, Snap Today's Photo, Draw Live, or Plan a Date Night.
- **Recent Memories Polaroid Strip**: Quick access to recent milestone memories and photos.

### 4. Daily Questions & 10 Connection Decks
- **Simultaneous Reveal Logic**: Both partners receive the same question. Answers are hidden until both submit, preventing anchoring bias and creating an exciting mutual reveal moment!
- **Interactive Reactions**: Emoji reactions (❤️, 🥰, 😂, 🥺, 🔥) and partner comment threads on unlocked answers.
- **100+ Seeded Questions across 10 Categories**:
  1. *Getting to Know You*
  2. *Love & Affection*
  3. *Childhood Memories*
  4. *Dreams & Future*
  5. *Deep Conversations*
  6. *Funny Questions*
  7. *Relationship Reflections*
  8. *Romance & Intimacy*
  9. *Long Distance*
  10. *Random Questions*
- **Togetherly AI Prompt Companion**: Generates personalized questions based on intimacy level (1–3) and relationship mood.

### 5. Daily Photo Challenges
- **Daily Photo Prompt**: Fresh inspiration every day (*"Show something that reminds you of me"*, *"Your current view right now"*, *"Something that made you smile today"*).
- **BeReal-Style Dual View**: Displays both partners' perspectives side-by-side with romantic framing and timestamps.
- **Fast Testing Presets & File Uploads**: Pick preset aesthetic photos for fast demo or upload real pictures from camera/device.

### 6. 7 Playable Couple Games (with working game logic)
1. **Who Knows Whom Better?**: 5 multiple-choice rounds testing intimate knowledge of each other's habits, comfort foods, and travel dreams with score tracking and winner badges.
2. **Who Is More Likely To?**: Humorous relationship statements with simultaneous secret voting and live agreement reveal.
3. **This Or That**: 8 rapid-fire dilemma cards calculating compatibility percentage.
4. **Would You Rather?**: Thought-provoking and romantic dilemma choices.
5. **Draw Duel**: Real-time canvas with 60-second timer and side-by-side drawing reveals.
6. **Love Quiz**: Relationship milestones and trivia with achievement unlocks.
7. **Word Games & Anagrams**: Love anagram unscrambles (*LOVE*, *ROMANCE*, *SOULMATE*, *FOREVER*) with hints and live validation.

### 7. Interactive Shared Canvas
- **HTML5 Real-Time Collaborative Canvas**: Powered by Socket.IO stroke broadcasting so Partner A's strokes appear immediately on Partner B's screen.
- **Tools**: Soft Rose, Gold Candlelight, Lavender, Mint, Crimson, Cream White, and Eraser modes with multiple brush sizes.
- **Romantic Sticky Notes**: Create and place colorful love notes directly onto the canvas.
- **Save to Memories**: Captures canvas snapshots and preserves them in the relationship timeline.

### 8. Private Chat & Sealed Love Capsules
- **Real-Time Messaging**: Socket.IO instant messaging with timestamps, read receipts, and typing indicators.
- **Love Notes Vault**: Sealed envelope capsules with wax seal aesthetics:
  - *Open when you miss me*
  - *Open when you're sad*
  - *Open when you need motivation*
  - *Open when you want to smile*
  - *Open on our anniversary*
- **Surprise Seal Preservation**: Unopened notes hide content until the recipient clicks to unseal with an animated letter-unfolding modal.
- **AI Love Letter Assistant**: Helps compose heartfelt tributes.

### 9. Memories & Relationship Timeline
- **Chronological Timeline**: Filterable by Photos, Questions, Milestones, Drawings, Games, and Love Notes.
- **Interactive Monthly Calendar**: Glowing dots on memorable days; click any date to view all memories and photos from that day.
- **Add Milestone Memory**: Record anniversaries, trips, and firsts with custom dates and photos.

### 10. Date Ideas & Tinder-Style Matching
- **Curated Date Library**: 40+ ideas across *At-Home*, *Outdoors*, *Romantic*, *Budget-Friendly*, *Food Dates*, *Movie Nights*, *Travel*, and *Long-Distance*.
- **Swipe to Discover**: Swipe Right / Love It, Swipe Left / Pass.
- **Mutual Match Celebration**: When both partners swipe right on the same idea, confetti explodes and an *"It's a Match!"* celebration occurs!
- **Scheduling**: Add matched ideas to the shared relationship calendar and mark them completed.
- **AI Date Architect**: Generates custom tailored date itineraries based on budget, duration, and shared hobbies.

### 11. Gamification, Streaks & Achievements
- **Daily Connection Streaks**: Calculates continuous activity streaks with flame animations.
- **Couple Points**: Earn +15 to +30 points for questions, photos, games, and date nights.
- **10 Unlockable Achievements**:
  - *First Spark* (First shared activity)
  - *First 7 Days* (7-day streak)
  - *Conversation Starters* (10 questions answered)
  - *Memory Makers* (5 photos shared)
  - *Perfect Match* (First mutual date match)
  - *Canvas Artists* (Collaborative drawing saved)
  - *Love Capsule* (First sealed love note sent)
  - *Playful Hearts* (5 games completed)
  - *30 Days of Connection* (30-day streak)
  - *Soulmates* (500 couple points reached)

### 12. Security & Data Sovereignty
- Complete isolation: A user or couple can never access another couple's data (IDOR protection on all routes).
- Server-side verification of `relationshipId` and user identity on every request.
- Zod schema validation on input payloads.
- **Full Data Export**: Export entire couple workspace, memories, photos, and messages as a downloadable JSON file.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18+, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React, React Router v7, TanStack Query |
| **Backend** | Node.js, Express.js, TypeScript, Socket.IO, Multer, Zod, JWT, bcryptjs |
| **Database** | SQLite (zero-config local dev) / PostgreSQL (production-ready) via Prisma ORM |
| **Real-Time** | Socket.IO WebSockets |
| **AI Integration** | OpenAI-compatible endpoint architecture with intelligent built-in fallback engines |

---

## 🎨 Design System

| Element | Specification |
|---|---|
| **Primary Background** | `#0D0B10` |
| **Secondary Background** | `#17131C` |
| **Card Background** | `#211B27` |
| **Primary Accent** | `#E8A0A8` (Soft Romantic Rose) |
| **Secondary Accent** | `#D9B77E` (Warm Candlelight Gold) |
| **Text Primary** | `#FFF8F5` (Soft Cream White) |
| **Text Secondary** | `#B9AEB9` (Muted Rose Slate) |
| **Border Glass** | `rgba(255, 255, 255, 0.08)` |
| **Typography** | *Playfair Display* (Editorial Serif) & *Plus Jakarta Sans* |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v10+

### 1. Installation
Clone the repository and install root and package dependencies:
```bash
# In the project root
npm run dev
```

Or install packages individually:
```bash
# Install server packages
npm --prefix server install

# Install client packages
npm --prefix client install
```

### 2. Database Setup & Seeding
Generate the Prisma client, push database tables, and run the seed script:
```bash
# Generate Prisma Client
npm --prefix server run prisma:generate

# Sync database schema (SQLite dev.db or PostgreSQL)
npm --prefix server run prisma:push

# Seed 100+ questions, 7 games, 40+ date ideas, achievements, and demo couple
npm --prefix server run prisma:seed
```

### 3. Running the Application
Start both server and client concurrently:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Frontend Client**: `http://localhost:3000` (proxied to server)

---

## 👥 Demo Couple Accounts

The database comes pre-seeded with an active, paired couple:

| Partner | Email | Password | Role |
|---|---|---|---|
| **Alex Rivers** | `alex@togetherly.app` | `password123` | Partner A |
| **Sarah Miller** | `sarah@togetherly.app` | `password123` | Partner B |
| **Pairing Code** | `TOGETH` | — | Active Shared Space |

You can also create completely fresh accounts using the registration flow to test the invite code generation and partner pairing process from scratch!

---

## 📁 Project Architecture

```
Togetherly/
├── client/                     # Vite + React 18 + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Header, Sidebar, BottomNav, AppLayout
│   │   │   └── ui/             # CandleFlame, GlassCard, Modal
│   │   ├── context/            # AuthContext (state, login, register, quickLogin)
│   │   ├── pages/              # Welcome, Login, Register, Pairing, Home, Connect, Games, Memories, DateIdeas, Profile
│   │   ├── services/           # Centralized API service & Socket.IO client
│   │   ├── types/              # Comprehensive TypeScript interfaces
│   │   ├── App.tsx             # React Router routing & ProtectedRoute
│   │   ├── index.css           # Tailwind CSS & custom glassmorphism
│   │   └── main.tsx            # Application entrypoint
│   ├── tailwind.config.js      # Togetherly color palette & animations
│   ├── tsconfig.json
│   └── vite.config.ts          # Port 3000 & API reverse proxy
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma       # 23 normalized database models
│   │   └── seed.ts             # Rich seed script (100+ questions, games, dates, demo accounts)
│   ├── src/
│   │   ├── middleware/         # authMiddleware (JWT, cookies), requireRelationship
│   │   ├── routes/             # auth, pairing, dashboard, questions, photos, games, canvas, chat, memories, date-ideas, ai, notifications, settings, achievements
│   │   ├── services/           # streakService, achievementService, aiService
│   │   ├── prisma.ts           # Shared PrismaClient instance
│   │   ├── socket.ts           # Socket.IO real-time event handlers
│   │   └── index.ts            # Server bootstrap & middleware
│   ├── .env                    # Environment variables
│   └── tsconfig.json
│
└── package.json                # Root package with concurrent dev scripts
```

---

## 🔒 Security Measures
- **IDOR Protection**: All queries filter by `relationshipId` verified against the authenticated user's session.
- **Strict Verification**: Answers to daily questions remain confidential until both partners have submitted.
- **Password Security**: Strong bcrypt hashing with salt rounds.
- **File Upload Security**: Restricted file types and 10MB limits via Multer.
- **Cookie Security**: HTTP-only tokens prevent cross-site scripting (XSS) credential leaks.

---

## 📜 License
Created for Togetherly — *"A little moment. A stronger connection."*
All rights reserved.

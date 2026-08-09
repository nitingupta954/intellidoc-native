# 📄 IntelliDoc — Intelligent Document Management Platform

IntelliDoc is a full-stack, AI-powered document management and chat platform. It lets users upload documents, ask natural-language questions against them, manage knowledge bases, and get answers using a Corrective RAG (CRAG) pipeline — complete with web-search fallback and RAGAS-based quality evaluation.

---

## 🏗️ Monorepo Structure

```
intellidoc-application/
├── intellidoc-backend/        # Next.js 14 web app + REST API (deployed on Vercel)
│   └── ai_service/            # FastAPI AI microservice (deployed on Render)
└── intellidoc-mobile/         # Expo React Native mobile app (deployed via EAS)
```

---

## 🌐 Live Deployments

| Service | URL | Platform |
|---|---|---|
| Web App (Frontend + API) | https://doc-management-native.vercel.app | Vercel |
| AI Microservice | https://doc-management-native.onrender.com | Render |
| Mobile App | EAS Preview Build | Expo Application Services |

---

## 📦 Sub-Projects

### 1. `intellidoc-backend` — Next.js Web App

The primary web application and REST API layer built with **Next.js 14 (App Router)**.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Auth:** Auth.js v5 (NextAuth) with credentials + Google OAuth
- **Database:** PostgreSQL via Prisma ORM
- **Storage:** S3-compatible object storage (MinIO / AWS S3 / Cloudflare R2)
- **Queue:** RabbitMQ (for dispatching document processing jobs to AI service)
- **Cache:** Redis (Upstash) for sessions and OTP tokens
- **Payments:** Razorpay integration with credit-based wallet system
- **Email:** Nodemailer with SMTP (OTP verification, invite emails)
- **Styling:** Tailwind CSS + shadcn/ui

**Key Features:**
- 🔐 Email/Password + Google OAuth sign-in with OTP email verification
- 📁 Workspace and folder management with collaborative invites
- 📄 Document upload to S3 with background AI processing via RabbitMQ
- 💬 AI-powered chat with documents and knowledge bases
- 🧠 Knowledge base management (group documents for RAG)
- 📊 Analytics dashboard (RAGAS quality metrics, usage trends)
- 💳 Credit wallet with Razorpay top-up and usage billing
- 🔗 Shareable public document links
- 📱 Mobile-safe login endpoints (CSRF-free JWT session for React Native)
- 📧 Blog, landing page, privacy policy, and terms pages

**Directory Structure:**
```
intellidoc-backend/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, register pages
│   │   ├── (dashboard)/      # Protected app pages
│   │   │   ├── dashboard/    # Overview & activity
│   │   │   ├── documents/    # Document list & viewer
│   │   │   ├── knowledge-bases/ # KB management
│   │   │   ├── chat/         # AI chat interface
│   │   │   ├── analytics/    # RAGAS metrics & charts
│   │   │   ├── billing/      # Credit wallet & payments
│   │   │   └── settings/     # Workspace & account settings
│   │   ├── api/              # REST API routes
│   │   │   ├── auth/         # NextAuth + mobile login/OTP
│   │   │   ├── documents/    # CRUD + upload orchestration
│   │   │   ├── upload/       # Presigned S3 URL generation
│   │   │   ├── conversations/ # Chat session management
│   │   │   ├── knowledge-bases/ # KB CRUD
│   │   │   ├── workspaces/   # Workspace CRUD
│   │   │   ├── analytics/    # Stats & RAGAS data
│   │   │   ├── payments/     # Razorpay webhooks & top-up
│   │   │   └── user/         # Profile & API key management
│   │   └── page.client.tsx   # Marketing landing page
│   ├── components/           # Shared UI components
│   ├── lib/                  # Shared utilities (db, email, redis, storage, etc.)
│   └── auth.ts               # NextAuth configuration
├── prisma/
│   └── schema.prisma         # Database schema
└── ai_service/               # Python AI microservice (see below)
```

**Environment Variables (`.env`):**
```env
DATABASE_URL=postgresql://...
AUTH_SECRET=<32-byte-random-secret>
AUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
REDIS_URL=rediss://...
RABBITMQ_URL=amqps://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=intellidoc-documents
S3_ENDPOINT=https://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_API_URL=https://your-domain.com
```

---

### 2. `intellidoc-backend/ai_service` — FastAPI AI Microservice

The Python-based AI engine handling all document intelligence, embedding, retrieval, and generation.

**Tech Stack:**
- **Framework:** FastAPI + Uvicorn
- **LLMs:** Google Gemini (`gemini-1.5-flash/pro`) + OpenAI GPT-4 (fallback)
- **Embeddings:** OpenAI `text-embedding-3-small` via LangChain
- **Vector Store:** Qdrant (for semantic document retrieval)
- **Queue Consumer:** RabbitMQ (aio-pika) for async document processing
- **Cache:** Redis (for CRAG state and session management)
- **Storage:** AWS S3 / MinIO via boto3
- **Parsing:** PyMuPDF (PDF), python-docx, pytesseract (OCR), pdf2image
- **Web Search:** Tavily AI for CRAG web-fallback queries
- **Evaluation:** RAGAS metrics via scikit-learn (faithfulness, relevancy, precision, recall)

**Key Features:**
- 📥 Async document ingestion pipeline (triggered from RabbitMQ)
- ✂️ Intelligent text chunking with LangChain text splitters
- 🔍 Semantic vector search via Qdrant
- 🤖 **CRAG (Corrective RAG):** Blended confidence scoring (vector + LLM topic judge) to route queries to: direct answer → web-search augmentation → insufficient fallback
- 🌐 Tavily web-search integration for knowledge gaps
- 📈 RAGAS automatic evaluation (faithfulness, answer relevancy, context precision, context recall)
- 🔒 Internal service authentication via shared secret

**API Routers:**
```
/health          # Health check
/chat            # Streaming chat with document context (CRAG pipeline)
/documents       # Document embed / delete from vector store
/retrieval       # Raw chunk retrieval endpoint
/evaluation      # RAGAS score submission
```

**Environment Variables (`ai_service/.env`):**
```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
TAVILY_API_KEY=...
QDRANT_URL=https://...
QDRANT_API_KEY=...
REDIS_URL=rediss://...
RABBITMQ_URL=amqps://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=intellidoc-documents
S3_ENDPOINT=https://...
ALLOWED_ORIGIN=https://your-next-js-domain.com
INTERNAL_SERVICE_SECRET=...
```

---

### 3. `intellidoc-mobile` — Expo React Native App

The cross-platform mobile client for iOS and Android built with **Expo SDK 54**.

**Tech Stack:**
- **Framework:** Expo SDK 54 + Expo Router v6 (file-based routing)
- **Language:** TypeScript
- **State Management:** Zustand
- **Server State:** TanStack Query v5 (React Query)
- **HTTP Client:** Axios with cookie-based session management
- **Storage:** `expo-secure-store` (Keychain/Keystore) for session tokens
- **UI:** Custom component system + `@expo/vector-icons` + `react-native-safe-area-context`
- **Lists:** `@shopify/flash-list` v2 (high-performance)
- **Charts:** `react-native-chart-kit` + `react-native-svg`
- **Markdown:** `react-native-markdown-display`
- **Gestures:** `react-native-gesture-handler` + `react-native-reanimated`
- **Fonts:** `@expo-google-fonts/manrope`

**App Screens:**
```
app/
├── index.tsx              # Root redirect (onboarding or home)
├── onboarding.tsx         # Welcome & feature walkthrough
├── (auth)/
│   ├── login.tsx          # Email/password login
│   ├── register.tsx       # Sign up + OTP trigger
│   ├── verify-otp.tsx     # Email OTP verification
│   ├── forgot-password.tsx
│   └── reset-password.tsx
└── (app)/                 # Protected routes (requires session)
    ├── home.tsx           # Dashboard: recent docs, activity, quick actions
    ├── stats.tsx          # Analytics: RAGAS metrics, charts, score history
    ├── billing.tsx        # Credit wallet, top-up, transaction history
    ├── documents/
    │   ├── index.tsx      # Document list with search
    │   ├── upload.tsx     # 3-step presigned S3 upload
    │   └── [id].tsx       # Document viewer + quick-chat
    ├── knowledge-bases/
    │   ├── index.tsx      # Knowledge base list
    │   └── [id].tsx       # KB detail + manage documents
    ├── chat/
    │   ├── index.tsx      # Chat with AI (streaming, CRAG)
    │   └── history.tsx    # Past conversations list
    └── profile/
        ├── index.tsx      # Profile overview
        ├── workspaces.tsx # Switch / manage workspaces
        ├── api-keys.tsx   # API key management
        └── security.tsx   # Change password
```

**Key Architecture Decisions:**
- **Mobile-safe Auth:** Uses `/api/auth/mobile-login` and `/api/auth/mobile-verify-otp` endpoints that bypass NextAuth CSRF (which fails in native networking stacks). Returns a signed JWT stored in `expo-secure-store`.
- **Cookie Rehydration:** On cold start, the session cookie is reloaded from `SecureStore` and injected into the `@react-native-cookies/cookies` jar so Axios automatically sends the `authjs.session-token` with every request.
- **File Upload:** Uses `expo-file-system/legacy` `uploadAsync` to PUT raw bytes directly to the presigned S3 URL (bypassing the Next.js server for large files).

**Environment Variables (`intellidoc-mobile/.env`):**
```env
EXPO_PUBLIC_API_URL=https://doc-management-native.vercel.app
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- pnpm or npm
- Expo CLI (`npx expo`)
- EAS CLI (`npx eas-cli`) — for mobile builds
- Docker (for local RabbitMQ, Qdrant, MinIO)

---

### Running Locally

#### 1. Backend (Next.js)

```bash
cd intellidoc-backend
npm install
npx prisma generate
npx prisma db push
npm run dev
# Runs on http://localhost:3000
```

#### 2. AI Service (FastAPI)

```bash
cd intellidoc-backend/ai_service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
# Runs on http://localhost:8001
```

#### 3. Mobile App (Expo)

```bash
cd intellidoc-mobile
npm install
# Edit .env → EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000
npx expo start -c
# Scan QR code with Expo Go app
```

---

### Building for Production (Mobile)

```bash
cd intellidoc-mobile
npx eas-cli login
npx eas-cli build --profile preview --platform android
# Outputs a downloadable APK link + QR code
```

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile App                          │
│           (Expo React Native / EAS)                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS REST API
                         ▼
┌─────────────────────────────────────────────────────────┐
│              intellidoc-backend                         │
│              (Next.js 14 on Vercel)                     │
│                                                         │
│  Auth.js  │  Prisma/PostgreSQL  │  S3  │  Razorpay      │
│                    │                                    │
│              RabbitMQ Producer                          │
└────────────────────┬────────────────────────────────────┘
                     │ Message Queue
                     ▼
┌─────────────────────────────────────────────────────────┐
│               ai_service                                │
│           (FastAPI on Render)                           │
│                                                         │
│  Qdrant Vector DB  │  LangChain  │  Gemini / OpenAI    │
│  CRAG Pipeline     │  Tavily     │  RAGAS Evaluation    │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

```bash
# AI service tests (pytest)
cd intellidoc-backend/ai_service
pytest
```

---

## 📄 License

MIT License — see [LICENSE](./intellidoc-mobile/LICENSE) for details.

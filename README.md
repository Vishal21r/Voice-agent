# 🛡️ Fortifex — Autonomous AI Sales Voice Agent

> **MVP built for hackathon/demo purposes — covers the full end-to-end sales workflow**

---

## 🚀 What This Does

ARIA (Automated Revenue Intelligence Agent) is an AI-powered voice sales agent that:

- 🎙️ **Talks to customers** using real-time Speech-to-Text (STT) and Text-to-Speech (TTS)
- 🧠 **Understands context** using GPT-4o-mini with conversation memory
- 🌐 **Speaks multiple languages** — English, Hindi, Tamil, Telugu
- 🔍 **Qualifies leads** automatically by asking smart questions
- 😊 **Detects sentiment** (positive/negative/neutral) in real time
- 📚 **Retrieves product knowledge** from a built-in knowledge base (RAG pattern)
- 📅 **Books appointments** with confirmation IDs
- 📊 **CRM Dashboard** to track all leads and appointments
- 📋 **Generates call summaries** with next-action recommendations

---

## 🏃 Quick Start (Run in 2 Minutes)

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Set up environment
```bash
# Copy the example file
copy .env.example .env

# Open .env and add your OpenAI key (optional — works in Demo Mode without it)
```

### Step 3: Start the server
```bash
npm start
```

### Step 4: Open in browser
- 🎙️ **Voice Agent**: http://localhost:3000
- 📊 **CRM Dashboard**: http://localhost:3000/crm.html

> **No OpenAI key?** That's fine! The app runs in **Demo Mode** with pre-built intelligent responses.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FORTIFEX PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   CUSTOMER                                                    │
│      │                                                        │
│      ▼                                                        │
│  ┌─────────────────┐                                         │
│  │  Browser (UI)   │  ← Real-time voice interface           │
│  │  Web Speech API │  ← STT: SpeechRecognition              │
│  │  TTS: SpeechSyn │  ← TTS: speechSynthesis                │
│  └────────┬────────┘                                         │
│           │ HTTP REST                                         │
│           ▼                                                   │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │  Node.js/Express│───▶│  OpenAI GPT-4o   │                │
│  │  Backend Server │    │  (AI Brain)       │                │
│  └────────┬────────┘    └──────────────────┘                │
│           │                                                   │
│    ┌──────┼──────────┐                                       │
│    ▼      ▼          ▼                                       │
│  ┌────┐ ┌────┐  ┌──────────┐                                │
│  │RAG │ │CRM │  │Appoint-  │                                │
│  │KB  │ │DB  │  │ment DB   │                                │
│  └────┘ └────┘  └──────────┘                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Fortifex/
├── server.js          ← Main backend (Node.js + Express)
├── package.json       ← Dependencies
├── .env.example       ← Environment config template
└── public/
    ├── index.html     ← Voice Agent UI
    └── crm.html       ← CRM Dashboard
```

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML/CSS/JS | Voice agent UI |
| STT | Web Speech API | Browser-native speech recognition |
| TTS | SpeechSynthesis API | Browser-native text-to-speech |
| Backend | Node.js + Express | REST API server |
| AI Brain | OpenAI GPT-4o-mini | Conversational intelligence |
| Knowledge Base | JSON (RAG pattern) | Product information retrieval |
| Data Store | In-memory (Array/Map) | Sessions, leads, appointments |
| CRM | Custom HTML dashboard | Lead & appointment management |

---

## 🎯 End-to-End Business Workflow

```
Customer calls → ARIA greets → Qualifies lead → Recommends product
     → Handles objections → Books demo → Summary generated → CRM updated
```

### Demo Script (say these in order):
1. "Hello, I need help with cybersecurity"
2. "We have around 25 employees"
3. "We've had some phishing attacks recently"
4. "What's the price?"
5. "I'd like a free trial"
6. → Click **Book Demo** button
7. → Click **Summary** to see the call analysis

---

## 📈 Scalability Strategy (100,000 Users)

| Component | Current (MVP) | At Scale |
|-----------|--------------|----------|
| Server | Single Node.js | Kubernetes cluster + load balancer |
| AI | OpenAI API | Fine-tuned model on own infra |
| Database | In-memory | PostgreSQL + Redis cache |
| STT/TTS | Browser API | Deepgram + ElevenLabs APIs |
| Deployment | Local | AWS/GCP with auto-scaling |
| Calls | Sequential | WebRTC for real phone calls |
| Cost (est.) | \$0 MVP | ~\$5–15 per 1000 calls |

---

## 🔒 Security & Compliance

- **Data Encryption**: AES-256 for data at rest, TLS 1.3 in transit
- **Data Residency**: Indian data centers (compliance with DPDP Act 2023)
- **PII Handling**: Email/phone masked in logs
- **Auth**: JWT tokens for production API (not in MVP)
- **GDPR/DPDP**: Consent flow before data collection

---

## 💰 Business Model & Commercial Feasibility

| Tier | Price | Target |
|------|-------|--------|
| Starter | ₹4,999/month | 1 AI agent, 500 calls/month |
| Growth | ₹14,999/month | 5 agents, 2,000 calls/month |
| Enterprise | Custom | Unlimited agents + custom AI |

**Unit Economics:**
- OpenAI GPT-4o-mini: ~\$0.003 per call
- ElevenLabs TTS: ~\$0.01 per call  
- Infra cost: ~\$0.005 per call
- **Total COGS per call: ~\$0.02 (~₹1.60)**
- Selling at ₹4,999/month → 500 calls = **₹10/call → 6x margin**

---

## 🗺️ Roadmap

- [x] Voice interaction (STT + TTS)
- [x] AI conversational agent
- [x] Multilingual support (4 languages)
- [x] Lead qualification & scoring
- [x] Sentiment analysis
- [x] RAG knowledge base
- [x] Appointment booking
- [x] CRM dashboard
- [x] Call summary & insights
- [ ] WebRTC for real phone calls
- [ ] WhatsApp/telephony integration (Twilio)
- [ ] ElevenLabs for realistic voice
- [ ] PostgreSQL persistent storage
- [ ] Email notifications
- [ ] Multi-tenant SaaS

---

## 👨‍💻 Built By

Fortifex Team — Built as MVP/prototype for evaluation  
*Framework: Node.js | AI: OpenAI GPT-4o-mini | Interface: Web Speech API*

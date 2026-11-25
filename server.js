// =====================================================
// FORTIFEX - Autonomous AI Sales Voice Agent
// Backend Server (Node.js + Express)
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ─── AI Provider Config ───────────────────────────────
// Priority: Groq (free) → OpenAI → Demo Mode
const GROQ_API_KEY   = process.env.GROQ_API_KEY   || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY  || '';

function getAIMode() {
  if (GROQ_API_KEY   && GROQ_API_KEY   !== 'your-groq-key-here')   return 'groq';
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-your-openai-key-here') return 'openai';
  return 'demo';
}

console.log(`\n🤖 AI Mode: ${getAIMode().toUpperCase()}`);

// ─── In-Memory Data Stores (simulates DB) ─────────────
const conversations = {};  // { sessionId: session object }
const leads         = [];
const appointments  = [];

// ─── RAG Knowledge Base ────────────────────────────────
const knowledgeBase = {
  products: [
    {
      name: "Fortifex Shield Pro",
      price: "₹2,999/month",
      description: "Complete cybersecurity suite for SMBs with real-time threat detection, firewall, and 24/7 monitoring.",
      features: ["Real-time threat detection", "AI-powered firewall", "24/7 SOC monitoring", "Compliance reports", "5 user licenses"],
      ideal_for: "Small to medium businesses with 10-50 employees"
    },
    {
      name: "Fortifex Enterprise",
      price: "₹12,999/month",
      description: "Enterprise-grade security with dedicated support, unlimited users, and advanced analytics.",
      features: ["Everything in Shield Pro", "Unlimited users", "Dedicated account manager", "Custom threat intelligence", "API integrations", "SLA 99.99%"],
      ideal_for: "Large enterprises with 50+ employees"
    },
    {
      name: "Fortifex Starter",
      price: "₹999/month",
      description: "Essential security for freelancers and micro-businesses.",
      features: ["Basic firewall", "Malware scanning", "Email protection", "2 user licenses"],
      ideal_for: "Freelancers and startups with less than 10 employees"
    }
  ],
  company: {
    name: "Fortifex",
    tagline: "Securing India's Digital Future",
    founded: "2022",
    hq: "Bangalore, India",
    support: "24/7 via chat, email, phone",
    trial: "14-day free trial available on all plans",
    certifications: "ISO 27001, SOC 2 Type II, DPDP Act Compliant"
  },
  faqs: [
    { q: "Free trial?", a: "Yes! 14-day free trial, no credit card needed." },
    { q: "Data security?", a: "AES-256 encryption, Indian data centers, ISO 27001 certified." },
    { q: "Cancel anytime?", a: "Yes. Monthly plans cancel anytime. Annual plans have 30-day refund." },
    { q: "Languages?", a: "Hindi, English, Tamil, Telugu, and 10+ regional languages." },
    { q: "Setup time?", a: "Live in under 15 minutes. No IT team required." }
  ]
};

// ─── System Prompt Builder ─────────────────────────────
function buildSystemPrompt(language = 'en') {
  const kbText = JSON.stringify(knowledgeBase, null, 2);
  const langNote = {
    'en': 'Respond in English.',
    'hi': 'Respond in Hindi or Hinglish (mix of Hindi and English).',
    'ta': 'Respond in Tamil.',
    'te': 'Respond in Telugu.'
  }[language] || 'Respond in English.';

  return `You are ARIA (Automated Revenue Intelligence Agent), an AI sales voice agent for Fortifex — an Indian cybersecurity company.

PERSONALITY: Warm, confident, helpful. Never robotic. Sound like a knowledgeable human sales rep.

YOUR GOALS (in order):
1. Understand the prospect's business and pain points
2. Qualify the lead by collecting: company name, team size, current security setup, budget range, timeline
3. Recommend the right Fortifex product based on what you learn
4. Handle any objections naturally and confidently
5. Offer a free trial or demo appointment
6. Collect their email/phone before ending

KNOWLEDGE BASE — USE THIS to answer all product questions:
${kbText}

RESPONSE RULES:
- Keep responses SHORT: 1-3 sentences max (this is voice, not email)
- Always end with ONE follow-up question to keep the conversation moving
- Be conversational and natural — not scripted
- If you don't know something, say "Let me connect you with our specialist"
- When you have name + company + pain point, offer to book a demo
- Mention the 14-day free trial when appropriate

LANGUAGE RULE: ${langNote}`;
}

// ─── GROQ API Call ─────────────────────────────────────
async function callGroq(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama3-8b-8192',   // Free, fast, smart
      messages,
      max_tokens: 150,
      temperature: 0.75,
      stream: false
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content.trim());
          } else {
            reject(new Error(parsed.error?.message || 'Groq returned no choices'));
          }
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── OPENAI API Call ───────────────────────────────────
async function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 150,
      temperature: 0.75
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content.trim());
          } else {
            reject(new Error(parsed.error?.message || 'OpenAI error'));
          }
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Smart Demo Mode (no API key) ─────────────────────
// Simulates a real AI by being context-aware and varied
function getDemoResponse(message, session) {
  const lower = message.toLowerCase();
  const history = session.messages;
  const ld = session.leadData;
  const turn = Math.floor(history.length / 2); // which exchange we're on

  // --- Specific intent detection ---

  if (/hello|hi |hey|namaste|start/i.test(lower)) {
    return "Hi there! I'm ARIA from Fortifex. We help Indian businesses stay protected from cyber threats. Quick question — what kind of business do you run?";
  }

  if (/price|cost|how much|₹|rupee|plan|package|pricing/i.test(lower)) {
    return "We have three plans: Starter at ₹999/month for small teams, Shield Pro at ₹2,999/month for growing businesses, and Enterprise at ₹12,999/month. All come with a 14-day free trial. How large is your team?";
  }

  if (/feature|what do|what can|offer|include|benefit/i.test(lower)) {
    return "Fortifex gives you real-time threat detection, an AI-powered firewall, 24/7 SOC monitoring, and compliance reports. Most clients see zero security incidents within the first 30 days. Which of these matters most to your business?";
  }

  if (/trial|free|try|demo|test/i.test(lower)) {
    return "Absolutely! All plans include a 14-day free trial — no credit card required. You'll be fully protected from day one. Can I grab your email to set it up?";
  }

  if (/hack|breach|attack|ransomware|phish|malware|virus|threat|secur/i.test(lower)) {
    const incident = lower.includes('hack') || lower.includes('breach') || lower.includes('attack');
    return incident
      ? "I'm sorry to hear that — unfortunately it's very common. Fortifex would have blocked that before it happened. How many employees does your company have so I can recommend the right protection level?"
      : "Security threats are increasing every day in India. The good news is Fortifex's AI detects and stops threats before they cause damage. What specific security risks are you most worried about?";
  }

  if (/employee|team|staff|people|member|size/i.test(lower)) {
    const num = message.match(/\d+/);
    if (num) {
      const n = parseInt(num[0]);
      if (n < 10)  return `For a team of ${n}, our Starter plan at ₹999/month is perfect — full protection without the enterprise price tag. Want me to set up a free trial right now?`;
      if (n < 50)  return `With ${n} people, I'd recommend Fortifex Shield Pro at ₹2,999/month. It covers up to 50 users with real-time monitoring and compliance reports. Want to see a quick demo?`;
      return `For a team of ${n}, our Enterprise plan at ₹12,999/month gives you unlimited users, a dedicated account manager, and 99.99% SLA. Shall I book a personalized demo with our enterprise team?`;
    }
    return "To recommend the right plan, I need to know your team size. Roughly how many employees are in your organization?";
  }

  if (/expensive|costly|budget|afford|cheap|discount|negotiate/i.test(lower)) {
    return "I completely understand — budget is a real concern. But consider this: the average cost of a data breach in India is ₹14 crore. Fortifex Shield Pro is ₹2,999/month. That's literally less than a data breach every hour. Want to see our ROI calculator?";
  }

  if (/competitor|other|alternative|vs|compare|already have/i.test(lower)) {
    return "Great question! Unlike most competitors, Fortifex is built specifically for Indian businesses — with local data centers, regional language support, and India-based 24/7 support. What solution are you currently using?";
  }

  if (/no|not interest|busy|later|maybe|call back/i.test(lower)) {
    return "No worries at all! Before I let you go — would it be okay if I sent you a quick 2-page overview by email? Many of our best clients said no the first time too. What's your email?";
  }

  if (/yes|sure|okay|ok |great|sounds good|interested|tell me more/i.test(lower)) {
    if (!ld.email) return "Wonderful! To get you started, could I get your email address? I'll send you the details and set up your free trial.";
    if (!ld.company) return "Great! What's the name of your company?";
    return "Perfect! Based on what you've told me, I'd love to set up a personalized demo for you. Would tomorrow work, or do you prefer later this week?";
  }

  if (/@/.test(message)) {
    return `Got it, I've noted your email as ${message.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]}. What's the best phone number to reach you on?`;
  }

  if (/\d{10}/.test(message.replace(/\s/g,''))) {
    return "Noted your number, thank you! One last thing — when would be a good time for our product specialist to give you a 20-minute demo? We have slots tomorrow morning and afternoon.";
  }

  if (/book|appointment|schedule|meet|call|when/i.test(lower)) {
    return "I'd be happy to book that for you! Click the 'Book Demo' button above and pick a time that works for you. Our specialist will join right on time. Shall I do that now?";
  }

  if (/thank|bye|goodbye|that.s all|done/i.test(lower)) {
    return "Thank you so much for your time! You'll receive a confirmation email shortly. Looking forward to showing you how Fortifex can protect your business. Have a great day!";
  }

  // Context-aware fallbacks based on what we know
  if (!ld.company && turn >= 2) {
    return "To make sure I'm giving you the most relevant information — what industry is your business in?";
  }
  if (!ld.teamSize && turn >= 3) {
    return "Just to point you to the right plan — roughly how many people are on your team?";
  }
  if (!ld.painPoint && turn >= 4) {
    return "What's the biggest security challenge you're facing right now — is it threats, compliance, or just getting started with security?";
  }
  if (!ld.email && turn >= 5) {
    return "I'd love to send you a personalized proposal. What email address should I use?";
  }

  // Final generic fallback (varied)
  const fallbacks = [
    "That's really helpful to know. Can I ask — do you currently have any cybersecurity tools in place?",
    "Interesting! Many businesses in your situation choose Fortifex Shield Pro. Would you like to hear why?",
    "Absolutely. And just to understand your situation better — has your business ever experienced any kind of security incident?",
    "Got it. I want to make sure I recommend exactly the right plan for you. What's most important — cost, features, or ease of use?"
  ];
  return fallbacks[turn % fallbacks.length];
}

// ─── ROUTES ────────────────────────────────────────────

// Start a new session
app.post('/api/session/start', (req, res) => {
  const sessionId = uuidv4();
  const { language = 'en' } = req.body;

  conversations[sessionId] = {
    messages: [],
    language,
    leadData: { name: '', email: '', phone: '', company: '', teamSize: '', painPoint: '', budget: '' },
    startTime: new Date().toISOString(),
    sentiment: 'neutral',
    qualificationScore: 0
  };

  res.json({ sessionId, aiMode: getAIMode() });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { sessionId, message, language = 'en' } = req.body;

  if (!conversations[sessionId]) {
    return res.status(400).json({ error: 'Invalid session' });
  }

  const session = conversations[sessionId];
  session.messages.push({ role: 'user', content: message });

  extractLeadInfo(message, session);
  session.sentiment = analyzeSentiment(message);

  // Build messages array for AI
  const aiMessages = [
    { role: 'system', content: buildSystemPrompt(language) },
    ...session.messages.slice(-12)  // last 12 messages = 6 exchanges of context
  ];

  let aiResponse = '';
  const mode = getAIMode();

  try {
    if (mode === 'groq') {
      console.log('→ Calling Groq (llama3-8b-8192)...');
      aiResponse = await callGroq(aiMessages);
      console.log('← Groq OK:', aiResponse.slice(0, 60));
    } else if (mode === 'openai') {
      console.log('→ Calling OpenAI (gpt-4o-mini)...');
      aiResponse = await callOpenAI(aiMessages);
      console.log('← OpenAI OK:', aiResponse.slice(0, 60));
    } else {
      console.log('→ Demo mode response');
      aiResponse = getDemoResponse(message, session);
    }
  } catch (err) {
    console.error(`✗ ${mode} API error:`, err.message);
    // Graceful fallback: use smart demo response
    aiResponse = getDemoResponse(message, session);
  }

  session.messages.push({ role: 'assistant', content: aiResponse });
  session.qualificationScore = calculateQualificationScore(session);

  res.json({
    response: aiResponse,
    sentiment: session.sentiment,
    qualificationScore: session.qualificationScore,
    leadData: session.leadData,
    aiMode: mode,
    sessionId
  });
});

// Save lead to CRM
app.post('/api/lead/save', (req, res) => {
  const { sessionId } = req.body;
  const session = conversations[sessionId];
  if (!session) return res.status(400).json({ error: 'Invalid session' });

  const lead = {
    id: uuidv4(),
    ...session.leadData,
    sentiment: session.sentiment,
    qualificationScore: session.qualificationScore,
    conversationLength: session.messages.length,
    createdAt: new Date().toISOString(),
    status: session.qualificationScore >= 60 ? 'Hot' : session.qualificationScore >= 30 ? 'Warm' : 'Cold'
  };

  leads.push(lead);
  res.json({ success: true, lead });
});

// Book appointment
app.post('/api/appointment/book', (req, res) => {
  const { sessionId, name, email, date, time, type } = req.body;

  const appointment = {
    id: uuidv4(),
    sessionId,
    name,
    email,
    date,
    time,
    type: type || 'Product Demo',
    status: 'confirmed',
    bookedAt: new Date().toISOString()
  };

  appointments.push(appointment);

  const session = conversations[sessionId];
  if (session) {
    if (name)  session.leadData.name  = name;
    if (email) session.leadData.email = email;
  }

  res.json({ success: true, appointment, confirmationId: appointment.id.slice(0, 8).toUpperCase() });
});

// Call summary
app.post('/api/summary', (req, res) => {
  const { sessionId } = req.body;
  const session = conversations[sessionId];
  if (!session) return res.status(400).json({ error: 'Invalid session' });

  const duration = Math.floor((new Date() - new Date(session.startTime)) / 1000);

  const summary = {
    sessionId,
    duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
    totalExchanges: Math.floor(session.messages.length / 2),
    leadData: session.leadData,
    sentiment: session.sentiment,
    qualificationScore: session.qualificationScore,
    leadStatus: session.qualificationScore >= 60 ? '🔥 Hot Lead' : session.qualificationScore >= 30 ? '🌡️ Warm Lead' : '❄️ Cold Lead',
    keyTopics: extractTopics(session.messages),
    nextAction: getNextAction(session.qualificationScore),
    transcript: session.messages.map(m => ({ speaker: m.role === 'user' ? 'Customer' : 'ARIA', text: m.content })),
    generatedAt: new Date().toISOString()
  };

  res.json(summary);
});

// CRM endpoints
app.get('/api/crm/leads',    (req, res) => res.json({ leads, total: leads.length }));
app.get('/api/appointments', (req, res) => res.json({ appointments, total: appointments.length }));
app.get('/api/dashboard/stats', (req, res) => {
  const totalSessions = Object.keys(conversations).length;
  const hotLeads  = leads.filter(l => l.status === 'Hot').length;
  const warmLeads = leads.filter(l => l.status === 'Warm').length;
  res.json({ totalSessions, totalLeads: leads.length, hotLeads, warmLeads, totalAppointments: appointments.length, conversionRate: leads.length ? Math.round((hotLeads / leads.length) * 100) : 0 });
});

// Status / health check
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', aiMode: getAIMode(), groqConfigured: !!GROQ_API_KEY, openaiConfigured: !!OPENAI_API_KEY });
});

// ─── Helper Functions ──────────────────────────────────

function extractLeadInfo(message, session) {
  const lower = message.toLowerCase();

  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch && !session.leadData.email) session.leadData.email = emailMatch[0];

  const phoneMatch = message.match(/(\+91|0)?[6-9]\d{9}/);
  if (phoneMatch && !session.leadData.phone) session.leadData.phone = phoneMatch[0];

  const sizeMatch = message.match(/(\d+)\s*(employees?|people|team\s*members?|staff|person|users?)/i);
  if (sizeMatch && !session.leadData.teamSize) session.leadData.teamSize = sizeMatch[1];

  const companyPatterns = [
    /(?:company|firm|startup|business|organization|work(?:ing)?\s+(?:at|for))\s+(?:is\s+|called\s+)?([A-Z][A-Za-z\s&.]{1,30})/i,
    /(?:i'?m?\s+from|at|work\s+at)\s+([A-Z][A-Za-z\s&.]{1,30})/i
  ];
  for (const p of companyPatterns) {
    const m = message.match(p);
    if (m && !session.leadData.company) { session.leadData.company = m[1].trim(); break; }
  }

  const budgetMatch = message.match(/₹[\d,]+|[\d,]+\s*(?:rupees?|lakh|k\b)/i);
  if (budgetMatch && !session.leadData.budget) session.leadData.budget = budgetMatch[0];

  const pains = { hack: 'Hacking', breach: 'Data Breach', phish: 'Phishing', malware: 'Malware', ransomware: 'Ransomware', compliance: 'Compliance', gdpr: 'GDPR/Compliance', virus: 'Virus/Malware' };
  for (const [kw, label] of Object.entries(pains)) {
    if (lower.includes(kw) && !session.leadData.painPoint) { session.leadData.painPoint = label; break; }
  }
}

function analyzeSentiment(message) {
  const lower = message.toLowerCase();
  let score = 0;
  ['great','good','interested','yes','sure','definitely','love','perfect','excellent','awesome','want','need','ok','sounds','happy'].forEach(w => { if (lower.includes(w)) score++; });
  ['no','not','expensive','costly','busy','later','maybe','doubt','cancel','stop','bad','hate','boring','useless'].forEach(w => { if (lower.includes(w)) score--; });
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

function calculateQualificationScore(session) {
  const ld = session.leadData;
  let s = 0;
  if (ld.name)      s += 10;
  if (ld.email)     s += 20;
  if (ld.phone)     s += 15;
  if (ld.company)   s += 15;
  if (ld.teamSize)  s += 10;
  if (ld.painPoint) s += 15;
  if (ld.budget)    s += 10;
  if (session.sentiment === 'positive') s += 10;
  if (session.messages.length >= 6) s += 5;
  return Math.min(s, 100);
}

function extractTopics(messages) {
  const topics = new Set();
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  const topicMap = {
    'price|cost|budget|₹': 'Pricing Discussion',
    'feature|include|offer|benefit': 'Product Features',
    'trial|demo|test': 'Demo / Trial Request',
    'security|protect|threat|hack|breach': 'Security Concerns',
    'compan|employee|team|staff': 'Company / Team Size',
    'compet|vs|alternative|other': 'Competitive Comparison',
    'integrat|api|connect': 'Integration Requirements',
    'compli|gdpr|audit|certif': 'Compliance'
  };
  for (const [pattern, topic] of Object.entries(topicMap)) {
    if (new RegExp(pattern).test(allText)) topics.add(topic);
  }
  return Array.from(topics);
}

function getNextAction(score) {
  if (score >= 70) return 'Schedule product demo immediately — high intent buyer';
  if (score >= 50) return 'Send pricing proposal and follow up within 24 hours';
  if (score >= 30) return 'Send nurture email with case study, follow up in 3 days';
  return 'Add to email drip campaign — needs more education';
}

// ─── Start Server ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const mode = getAIMode();
  console.log(`\n🚀 Fortifex Voice Agent → http://localhost:${PORT}`);
  console.log(`📊 CRM Dashboard       → http://localhost:${PORT}/crm.html`);
  console.log(`\n🤖 AI Mode: ${mode.toUpperCase()}`);
  if (mode === 'demo') {
    console.log(`\n⚠️  Running in Demo Mode.`);
    console.log(`   For real AI: get a FREE key at https://console.groq.com`);
    console.log(`   Then add  GROQ_API_KEY=gsk_... to your .env file\n`);
  }
});

module.exports = app;

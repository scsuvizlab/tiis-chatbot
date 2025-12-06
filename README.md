# TIIS - TrueNorth Intelligent Intake System

**Virtual Job Shadow Platform for Workflow Analysis & Automation Discovery**

---

## Quick Overview

TIIS is an AI-powered platform that helps organizations discover automation opportunities by capturing detailed employee workflows through conversational AI. Instead of traditional time-tracking or surveys, TIIS uses multimodal conversations to understand the *how* and *why* of work.

**Current Project:** Greater St. Cloud Development Corporation (6 employees, 2-week pilot)

---

## Key Features

- 🤖 **AI-Powered Conversations** - Natural dialogue with Claude Sonnet 4.5
- 📸 **Multimodal Input** - Screenshots, PDFs, photos (mobile camera support)
- 📱 **Mobile-First Design** - Optimized for phones, tablets, and desktop
- 💾 **Auto-Save Everything** - Never lose work, resume anytime
- 📊 **Intelligent Analysis** - AI-generated insights and automation recommendations
- 🔐 **Secure by Default** - JWT auth, encrypted passwords, HTTPS

---

## Tech Stack

- **Backend:** Node.js + Express
- **AI:** Anthropic Claude Sonnet 4.5 (multimodal)
- **Auth:** JWT + bcrypt
- **Storage:** File system (JSON + attachments) → AWS migration planned
- **Frontend:** Vanilla JS (no frameworks)
- **Hosting:** Render.com

---

## Project Structure

```
tiis/
├── server/               # Backend API
│   ├── server.js        # Main Express app
│   ├── auth.js          # Authentication logic
│   ├── claude-service.js # AI integration
│   ├── user-manager.js   # User operations
│   ├── conversation-manager.js
│   └── config.js        # Configuration
│
├── public/              # Frontend
│   ├── login.html
│   ├── dashboard.html
│   ├── admin.html
│   └── styles.css
│
├── data/                # Storage (gitignored)
│   ├── users/
│   └── conversations/
│
├── TIIS-DOCUMENTATION.md  # Full technical docs
├── package.json
└── README.md (this file)
```

---

## Quick Start

### Prerequisites

- Node.js v18+
- Anthropic API key
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/truenorth-ai/tiis.git
cd tiis

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start server
npm start
```

Visit `http://localhost:3000` in your browser.

---

## Environment Variables

Create a `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
JWT_SECRET=your-secure-random-string
ADMIN_PASSWORD=your-admin-password
PORT=3000
NODE_ENV=development
```

---

## User Flow

### First-Time User
1. Receive credentials from admin
2. Login → Change password
3. Complete onboarding conversation (10-15 min structured interview)
4. Start logging tasks

### Ongoing Use
1. Auto-login (remember me)
2. Dashboard shows all conversations
3. Continue existing task or start new one
4. Upload screenshots/docs to illustrate workflows
5. Auto-saves every exchange
6. Repeat throughout 2-week period

### Admin Analysis
1. View all employee conversations
2. Run AI analysis (corporation-wide + individual reports)
3. Export reports (PDF + JSON)
4. Deliver insights to client

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/verify` - Verify JWT token

### Conversations
- `POST /api/conversations/onboarding/start` - Start onboarding
- `POST /api/conversations/onboarding/message` - Send message
- `POST /api/conversations/task/new` - New task conversation
- `POST /api/conversations/task/message` - Send task message
- `GET /api/conversations/list` - List all conversations
- `GET /api/conversations/:id` - Load conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List all users
- `POST /api/admin/analyze/corporation` - Corporation-wide analysis
- `POST /api/admin/analyze/user/:id` - Individual analysis
- `GET /api/admin/export/all` - Export all data

See `TIIS-DOCUMENTATION.md` for complete API reference.

---

## Development

```bash
# Install dev dependencies
npm install

# Run with auto-reload
npm run dev

# Run tests (when implemented)
npm test
```

---

## Deployment (Render.com)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect to GitHub repository
4. Configure environment variables
5. Add persistent disk (1GB) at `/opt/render/project/src/data`
6. Deploy

See `DEPLOYMENT.md` for detailed instructions.

---

## Documentation

- **TIIS-DOCUMENTATION.md** - Complete technical specification
- **API.md** - API endpoint reference (TBD)
- **DEPLOYMENT.md** - Deployment guide (TBD)

---

## Support & Contact

**TrueNorth AI Services LLC**  
Mark Gill - Founder  
Email: mark@truenorth.ai

---

## License

Proprietary - TrueNorth AI Services LLC  
Not for redistribution without permission

---

## Version

Current: 1.0.0 (MVP)  
Status: Active Development  
Last Updated: December 2024

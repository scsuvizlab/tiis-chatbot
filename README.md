# TIIS - TrueNorth Intelligent Intake System

**Virtual Job Shadow Platform for Workflow Analysis & Automation Discovery**

---

## Quick Overview

TIIS is an AI-powered platform that helps organizations discover automation opportunities by capturing detailed employee workflows through conversational AI. Instead of traditional time-tracking or surveys, TIIS uses multimodal conversations with voice interaction to understand the *how* and *why* of work.

**Current Project:** Greater St. Cloud Development Corporation (6 employees pilot)

---

## Key Features

### Core Capabilities
- 🤖 **AI-Powered Conversations** - Natural dialogue with Claude Sonnet 4.5
- 🎤 **Voice Interface** - Speech-to-text (Whisper) and text-to-speech (Eleven Labs)
- 📸 **Multimodal Input** - Screenshots, PDFs, Word/Excel docs, photos (mobile camera support)
- 📱 **Mobile-First Design** - Optimized for phones, tablets, and desktop
- 💾 **Auto-Save Everything** - Never lose work, resume anytime
- 📊 **Intelligent Analysis** - AI-generated insights and automation recommendations
- 🔒 **Secure by Default** - JWT auth, httpOnly cookies, bcrypt passwords, HTTPS

### Advanced Features
- 📚 **Knowledge Modules** - Pre-loaded organizational context for personalized conversations
- 🔧 **Automatic Tools Tracking** - Detects and analyzes business software usage patterns
- 🎨 **Theme Support** - Light/dark mode with smooth transitions
- 🎯 **Smart Admin Panel** - User management, conversation viewing, voice configuration
- 🎭 **Multi-User Voice Profiles** - Configurable TTS voices per user
- 📝 **Multiple Document Formats** - Word (docx), Excel (xlsx), PDF, Markdown, text, images

---

## Tech Stack

### Backend
- **Runtime:** Node.js + Express
- **AI Core:** Anthropic Claude Sonnet 4.5 (multimodal conversations)
- **Voice:** OpenAI Whisper (STT) + Eleven Labs (TTS)
- **Auth:** JWT + bcrypt (httpOnly cookies)
- **Storage:** File system (JSON + attachments)
- **Document Processing:** Mammoth (docx), xlsx, PDF parsing

### Frontend
- **Framework:** Vanilla JavaScript (no dependencies)
- **UI Components:** Custom-built responsive design
- **Themes:** CSS variables with smooth transitions
- **Audio:** Web Audio API for voice playback

### Infrastructure
- **Hosting:** Render.com
- **Deployment:** GitHub Desktop → Auto-deploy on commit
- **Persistence:** Mounted disk storage for production

---

## Project Structure

```
tiis-chatbot/
├── server/                     # Backend services
│   ├── server.js              # Main Express app
│   ├── auth.js                # JWT authentication & password management
│   ├── admin.js               # Admin API endpoints
│   ├── claude-service.js      # Claude API integration
│   ├── conversation-manager.js # Conversation state management
│   ├── user-manager.js        # User CRUD operations
│   ├── knowledge-manager.js   # Knowledge module system
│   ├── tools-manager.js       # Tools detection & tracking
│   ├── voice-routes.js        # Voice API endpoints
│   ├── voice-service.js       # Whisper/Eleven Labs integration
│   ├── tools-routes.js        # Tools tracking endpoints
│   ├── document-parser.js     # Multi-format document parsing
│   └── config.js              # Configuration
│
├── public/                    # Frontend (served statically)
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   ├── login.js              # Authentication logic
│   ├── dashboard.html        # Main user interface
│   ├── dashboard.js          # Dashboard functionality
│   ├── admin.html            # Admin panel
│   ├── admin-dashboard.js    # Admin functionality
│   ├── admin-knowledge-manager.js  # Knowledge module UI
│   ├── admin-voice-manager.js      # Voice configuration UI
│   ├── admin-tools-manager.js      # Tools tracking UI
│   ├── user-voice-interface.js     # User voice recording
│   ├── theme-switcher.js     # Light/dark theme logic
│   ├── styles.css            # Main styles
│   ├── user-voice-styles.css # Voice UI styles
│   └── voice-management-styles.css
│
├── data/                      # Persistent storage (gitignored)
│   ├── users/                # User profiles (JSON)
│   ├── conversations/        # Conversation history
│   └── uploads/              # File attachments
│
├── knowledge/                 # Knowledge modules
│   ├── netiabauman.json      # Example: NeTia's module
│   └── markgill.json         # Example: Mark's module
│
├── .env                       # Environment variables
├── package.json
├── README.md                  # This file
└── CHANGELOG.md
```

---

## Quick Start

### Prerequisites

- Node.js v18+
- Anthropic API key
- OpenAI API key (for Whisper STT)
- Eleven Labs API key (for TTS)
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/tiis-chatbot.git
cd tiis-chatbot

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Create data directories
mkdir -p data/users data/conversations data/uploads knowledge

# Start server
npm start
```

Visit `http://localhost:3000` in your browser.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
JWT_SECRET=your-secure-random-string-min-32-chars
ADMIN_PASSWORD=your-admin-password

# Optional Voice Features
OPENAI_API_KEY=sk-your-openai-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# Production (Render.com)
# NODE_ENV=production
# (Cookies will use secure:true, sameSite:strict)
```

---

## User Flow

### First-Time User
1. Admin creates account via admin panel
2. Receive credentials (email + temp password)
3. Login → Automatic password change prompt
4. Set permanent password
5. Complete onboarding conversation (10-15 min AI interview)
6. Dashboard access unlocked

### Daily Use
1. Auto-login via httpOnly cookie (7-day expiration)
2. Dashboard shows all conversations
3. Start new task conversation or continue existing
4. Upload files (screenshots, docs, photos)
5. Use voice recording for hands-free input
6. Auto-saves after every message
7. Mark conversations complete

### Admin Workflow
1. Login to admin panel (`/admin.html`)
2. Create/manage user accounts
3. Assign knowledge modules to users
4. Configure voice profiles
5. View all user conversations
6. Track software tools usage
7. Run AI analysis (future feature)
8. Export data for reporting

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login (returns JWT or temp_token)
- `POST /change-password` - Change password (temp or regular)
- `POST /verify` - Verify JWT token validity
- `POST /logout` - Clear authentication cookie

### Conversations (`/api/conversations`)
- `POST /onboarding/start` - Start onboarding conversation
- `POST /onboarding/message` - Send onboarding message
- `POST /task/new` - Create new task conversation
- `POST /task/message` - Send task message
- `GET /list` - List all user conversations
- `GET /:id` - Load specific conversation
- `DELETE /:id` - Delete conversation
- `POST /:id/complete` - Mark conversation complete

### Admin (`/api/admin`)
- `POST /login` - Admin authentication
- `GET /users` - List all users with stats
- `POST /users` - Create new user
- `DELETE /users/:email` - Delete user
- `POST /users/reset-password` - Reset user password
- `GET /users/:email/conversations` - View user conversations
- `GET /users/:email/conversations/:id` - View conversation details
- `GET /export` - Export all data (JSON)

### Knowledge Modules (`/api/admin/knowledge`)
- `GET /modules` - List available knowledge modules
- `GET /modules/:id` - Get module details
- `POST /assign` - Assign module to user

### Voice (`/api/voice`)
- `POST /transcribe` - Speech-to-text (Whisper)
- `POST /synthesize` - Text-to-speech (Eleven Labs)
- `GET /voices` - List available TTS voices
- `GET /user-voice` - Get user's assigned voice
- `POST /user-voice` - Set user's voice preference

### Tools Tracking (`/api/tools`)
- `GET /detected` - Get all detected tools usage
- `POST /log` - Log tool usage event

---

## Features Deep Dive

### Knowledge Modules
Pre-loaded context about your organization that Claude uses to ask better questions:

```json
{
  "module_id": "netiabauman",
  "name": "NeTia Bauman",
  "description": "Vice President knowledge module",
  "gsdc_context": {
    "organization_overview": "...",
    "strategic_imperatives": [...],
    "service_areas": [...]
  },
  "user_role_context": {
    "role": "Vice President",
    "responsibilities": [...],
    "typical_processes": [...]
  }
}
```

### Voice Interface
- **Recording:** Click microphone button, speak naturally
- **Transcription:** Automatic via OpenAI Whisper
- **Playback:** Text responses converted to natural speech (Eleven Labs)
- **Auto-play:** Toggle for hands-free conversation
- **Voice Profiles:** Admin assigns different voices per user

### Tools Tracking
Automatically detects business software mentioned in conversations:
- Recognizes 50+ common business tools
- Tracks frequency and context
- Identifies integration opportunities
- Generates usage insights

### Theme Support
- Light/dark mode toggle
- Persists preference in localStorage
- Smooth CSS transitions
- Respects system preferences

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm start

# Run with nodemon for auto-reload (if installed)
npx nodemon server/server.js

# Test specific components
node server/create-user.js  # Create user from command line
```

### Development Workflow
1. Make changes to files
2. Commit to GitHub via GitHub Desktop
3. Render auto-deploys on push (production)
4. Test locally before committing

---

## Deployment (Render.com)

### Initial Setup
1. Push code to GitHub repository
2. Create new Web Service on Render
3. Connect to your GitHub repo
4. Configure build settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables (all from `.env`)
6. Add persistent disk:
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** 1GB
7. Deploy

### Updates
1. Commit changes via GitHub Desktop
2. Push to GitHub
3. Render auto-deploys on detect
4. Monitor deployment logs
5. Verify changes in production

### Production Checklist
- ✅ HTTPS enabled (automatic on Render)
- ✅ httpOnly cookies with secure flag
- ✅ JWT_SECRET is strong (32+ random chars)
- ✅ All API keys in environment variables
- ✅ Persistent disk mounted for data/
- ✅ NODE_ENV=production

---

## Security Features

- **JWT Authentication:** 7-day expiration tokens
- **httpOnly Cookies:** Prevents XSS token theft
- **bcrypt Passwords:** Salted hashing (10 rounds)
- **Temp Passwords:** Force change on first login
- **HTTPS Only:** Production cookies require secure connection
- **CORS Protection:** Configurable allowed origins
- **File Upload Limits:** 50MB max per request
- **Path Sanitization:** Prevents directory traversal
- **Input Validation:** Email format, password strength

---

## Known Issues & Limitations

### Current
- Voice features require API keys (optional)
- File storage is local (AWS S3 migration planned)
- No real-time collaboration features
- Analysis features are placeholders (coming soon)

### Planned Improvements
- AWS S3 for scalable file storage
- Real-time conversation analysis
- Automated workflow diagrams
- Advanced admin analytics dashboard
- Multi-organization support
- SSO integration

---

## Troubleshooting

### Login Issues
**Problem:** "Invalid password" error
**Solution:**
1. Check server console for logs
2. Verify user file exists in `data/users/`
3. Reset password via admin panel
4. Clear browser cookies and cache

### Voice Not Working
**Problem:** Recording/playback fails
**Solution:**
1. Verify API keys in `.env`
2. Check browser microphone permissions
3. Ensure HTTPS in production (required for getUserMedia)
4. Check server logs for API errors

### File Upload Fails
**Problem:** Upload returns 413 or 500
**Solution:**
1. Check file size (<50MB)
2. Verify `data/uploads/` directory exists
3. Check disk space on server
4. Review server logs for errors

### Deployment Issues
**Problem:** Render deployment fails
**Solution:**
1. Check build logs on Render dashboard
2. Verify all environment variables set
3. Ensure persistent disk is mounted
4. Check Node.js version compatibility

---

## Support & Contact

**TrueNorth AI Services LLC**  
Mark Gill - Founder  
Email: mcgill@stcloudstate.edu

For bugs or feature requests:
1. Check existing issues
2. Create detailed issue report
3. Include server logs and screenshots
4. Specify environment (dev/production)

---

## License

Proprietary - TrueNorth AI Services LLC  
© 2024-2025 All Rights Reserved  
Not for redistribution without permission

---

## Version History

**Current:** 2.0.0 (Production)

### 2.0.0 (December 2025)
- ✨ Voice interface (Whisper + Eleven Labs)
- ✨ Knowledge modules system
- ✨ Automatic tools tracking
- ✨ Theme switcher (light/dark)
- ✨ Multi-format document support
- ✨ Enhanced admin panel
- ✨ httpOnly cookie authentication
- 🐛 Fixed user creation authentication bugs
- 🐛 Fixed circular dependency issues
- 🐛 Fixed temp password token handling

### 1.0.0 (November 2024)
- 🎉 Initial MVP release
- 🤖 Claude AI integration
- 👤 User authentication
- 💬 Conversation management
- 📸 File upload support
- 👨‍💼 Basic admin panel

---

## Acknowledgments

Built with:
- [Anthropic Claude](https://www.anthropic.com/) - AI conversation engine
- [OpenAI Whisper](https://openai.com/research/whisper) - Speech recognition
- [Eleven Labs](https://elevenlabs.io/) - Text-to-speech
- [Express.js](https://expressjs.com/) - Web framework
- [Render](https://render.com/) - Hosting platform

Special thanks to Greater St. Cloud Development Corporation for piloting the platform.

---

**Last Updated:** December 20, 2025  
**Status:** Production Ready ✅

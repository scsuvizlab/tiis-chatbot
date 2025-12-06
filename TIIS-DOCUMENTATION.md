# TIIS - TrueNorth Intelligent Intake System
## Virtual Job Shadow Platform - Technical Documentation

---

## Executive Summary

**Purpose:** TIIS is an AI-powered virtual job shadowing platform that helps organizations discover automation opportunities by capturing detailed employee workflows through conversational AI.

**Client:** Greater St. Cloud Development Corporation (6 employees, 2-week pilot)

**Core Value:** Unlike traditional time-tracking or survey tools, TIIS uses multimodal conversational AI to capture the *how* and *why* of work, not just the *what*. Employees document tasks naturally by describing workflows, uploading screenshots, and sharing documents - enabling TrueNorth to identify high-impact automation opportunities.

**Key Innovation:** Always-on, friction-free task logging with multimodal support. Employees leave TIIS open while working and quickly log tasks as they happen, creating a living documentation of organizational workflows.

---

## Project Goals

### Primary Objectives
1. **Capture comprehensive job workflows** across all 6 GSCDC employees over 2 weeks
2. **Identify automation opportunities** through AI analysis of documented tasks
3. **Generate actionable reports** for organizational and individual efficiency improvements
4. **Prove TIIS methodology** for future client engagements

### Success Metrics
- All 6 employees complete onboarding
- Average 8+ task conversations per employee
- 60%+ of tasks include visual documentation (screenshots/PDFs)
- Final report identifies 10+ concrete automation opportunities
- Client satisfaction enables expansion to additional organizations

---

## Technology Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **AI Model:** Anthropic Claude Sonnet 4.5 (multimodal support)
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing
- **Storage:** File system (JSON + attachments) for MVP
  - Future: AWS migration to PostgreSQL + S3

### Frontend
- **Architecture:** Vanilla JavaScript (no framework)
- **Styling:** Custom CSS (mobile-first, responsive)
- **Key Features:** 
  - Single-page application structure
  - Real-time chat interface
  - Drag-and-drop file uploads
  - Camera/photo library access (mobile)
  - Progressive image loading

### Infrastructure (MVP)
- **Hosting:** Render.com web service
- **Storage:** 1GB persistent disk (can scale to 5GB)
- **Deployment:** GitHub integration (auto-deploy on push)
- **Environment:** HTTPS, CORS-enabled

### File Support (Multimodal)
- **Images:** JPG, PNG, GIF, WEBP (via Claude's vision API)
- **Documents:** PDF (via Claude's document API)
- **Max file size:** 10MB per file
- **Storage per user:** 25MB limit (150MB total for 6 users)
- **Display:** Inline thumbnails with click-to-expand

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FIRST LOGIN (One-time)                                     │
│  1. User receives credentials from admin                    │
│  2. Login → Forced password change                          │
│  3. Onboarding conversation (structured survey)             │
│  4. Review & confirm onboarding summary                     │
│  5. ✓ Onboarding complete → Dashboard unlocks               │
│                                                              │
│  ONGOING USE (Daily/as-needed for 2 weeks)                  │
│  1. Auto-login (remember me)                                │
│  2. Dashboard shows task list + active chat window          │
│  3. Continue existing task OR start new task                │
│  4. Describe task, upload screenshots/docs                  │
│  5. Auto-save every exchange                                │
│  6. Switch tasks instantly, repeat throughout day           │
│                                                              │
│  ADMIN ANALYSIS (After 2 weeks)                             │
│  1. Admin logs in to analysis dashboard                     │
│  2. Views all user conversations                            │
│  3. Runs AI analysis (corporation-wide + individual)        │
│  4. Exports reports (PDF + JSON)                            │
│  5. Delivers insights to client                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (public/)          Backend (server/)              │
│  ├── login.html              ├── server.js                  │
│  ├── dashboard.html          ├── auth.js                    │
│  ├── chat.html               ├── claude-service.js          │
│  ├── admin.html              ├── user-manager.js            │
│  ├── login.js                ├── conversation-manager.js    │
│  ├── dashboard.js            └── config.js                  │
│  ├── chat.js                                                │
│  └── styles.css                                             │
│                                                              │
│  User Interface       ←→     Express API     ←→   Claude API│
│  (Browser)                   (Node.js)           (Anthropic)│
│                                                              │
│                              ↓                               │
│                                                              │
│                    File System Storage                       │
│                    (data/)                                   │
│                    ├── users/                                │
│                    └── conversations/                        │
│                        └── attachments/                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Architecture

### File Structure
```
tiis/
├── server/
│   ├── server.js                 # Main Express app, routing
│   ├── auth.js                   # JWT auth, login, signup
│   ├── claude-service.js         # Claude API integration
│   ├── user-manager.js           # User CRUD operations
│   ├── conversation-manager.js   # Conversation CRUD + resume
│   └── config.js                 # TIIS prompts, branding
│
├── public/
│   ├── login.html                # Landing + login + signup
│   ├── dashboard.html            # Task list + chat window
│   ├── admin.html                # Admin analysis interface
│   ├── styles.css                # TIIS branding (mobile-first)
│   ├── login.js                  # Auth frontend logic
│   ├── dashboard.js              # Dashboard + chat logic
│   └── admin.js                  # Admin frontend logic
│
├── data/
│   ├── users/
│   │   └── user_[email_sanitized].json
│   │       {
│   │         user_id: uuid,
│   │         email: string,
│   │         password_hash: string (bcrypt),
│   │         name: string,
│   │         role: string,
│   │         created_at: timestamp,
│   │         onboarding_complete: boolean,
│   │         storage_used_mb: number,
│   │         last_login: timestamp
│   │       }
│   │
│   └── conversations/
│       └── user_[email_sanitized]/
│           ├── onboarding.json
│           │   {
│           │     conversation_id: uuid,
│           │     user_id: uuid,
│           │     type: "onboarding",
│           │     status: "in-progress" | "complete",
│           │     created_at: timestamp,
│           │     last_updated: timestamp,
│           │     completed_at: timestamp | null,
│           │     messages: [
│           │       {
│           │         message_id: uuid,
│           │         role: "user" | "assistant",
│           │         content: [
│           │           { type: "text", text: string },
│           │           { 
│           │             type: "image",
│           │             source: { media_type, file_path, size_kb }
│           │           },
│           │           {
│           │             type: "document",
│           │             source: { media_type, file_path, size_kb }
│           │           }
│           │         ],
│           │         timestamp: timestamp
│           │       }
│           │     ],
│           │     summary: string | null
│           │   }
│           │
│           ├── task_[uuid].json
│           │   {
│           │     conversation_id: uuid,
│           │     user_id: uuid,
│           │     type: "task",
│           │     title: string (auto-generated),
│           │     status: "active",
│           │     created_at: timestamp,
│           │     last_updated: timestamp,
│           │     messages: [ ... ],
│           │     summary: string | null
│           │   }
│           │
│           └── attachments/
│               ├── onboarding/
│               │   ├── [message_id]_screenshot.png
│               │   └── [message_id]_workflow.pdf
│               └── task_[uuid]/
│                   ├── [message_id]_crm.jpg
│                   └── [message_id]_report.pdf
```

### Data Relationships
```
User (1) ──────────────── (many) Conversations
                                     │
                                     ├── (1) Onboarding
                                     └── (many) Tasks
                                            │
                                            └── (many) Messages
                                                   │
                                                   └── (many) Attachments
```

---

## API Endpoints

### Authentication Routes

#### `POST /api/auth/login`
**Purpose:** Authenticate user and issue JWT token

**Request:**
```json
{
  "email": "sarah@gscdc.org",
  "password": "newPassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "uuid",
    "email": "sarah@gscdc.org",
    "name": "Sarah Johnson",
    "onboarding_complete": false
  },
  "redirect": "/dashboard.html" | "/onboarding"
}
```

**Response (First Login - Temp Password):**
```json
{
  "success": false,
  "requires_password_change": true,
  "temp_token": "short-lived-token"
}
```

#### `POST /api/auth/change-password`
**Purpose:** Change password (forced on first login, optional thereafter)

**Headers:** `Authorization: Bearer [token]`

**Request:**
```json
{
  "old_password": "GSCDC2024!",
  "new_password": "mySecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "new-jwt-token",
  "message": "Password updated successfully"
}
```

#### `POST /api/auth/verify`
**Purpose:** Validate JWT token (check if user is logged in)

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "valid": true,
  "user": { /* user object */ }
}
```

---

### Conversation Routes

#### `POST /api/conversations/onboarding/start`
**Purpose:** Initialize onboarding conversation

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "conversation_id": "uuid",
  "greeting": "Welcome to TIIS, Sarah! Let's start by understanding your role at Greater St. Cloud Development Corp. What's your job title?"
}
```

#### `POST /api/conversations/onboarding/message`
**Purpose:** Send message in onboarding conversation

**Headers:** `Authorization: Bearer [token]`

**Request:**
```json
{
  "conversation_id": "uuid",
  "message": "Director of Community Engagement",
  "attachments": [
    {
      "type": "image/png",
      "name": "org_chart.png",
      "data": "base64-encoded-data",
      "size": 245123
    }
  ]
}
```

**Response:**
```json
{
  "message_id": "uuid",
  "bot_response": "Great! On a typical day, what are your main responsibilities?",
  "conversation_updated": true
}
```

#### `POST /api/conversations/onboarding/complete`
**Purpose:** Mark onboarding as complete

**Headers:** `Authorization: Bearer [token]`

**Request:**
```json
{
  "conversation_id": "uuid",
  "user_confirmed": true
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Sarah Johnson - Director of Community Engagement...",
  "onboarding_complete": true
}
```

#### `GET /api/conversations/list`
**Purpose:** Get all conversations for logged-in user

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "conversations": [
    {
      "conversation_id": "uuid",
      "type": "onboarding",
      "status": "complete",
      "title": "Onboarding",
      "last_updated": "2024-12-06T10:30:00Z",
      "message_count": 15,
      "has_attachments": true
    },
    {
      "conversation_id": "uuid",
      "type": "task",
      "status": "active",
      "title": "Processing Monthly Grant Reports",
      "last_updated": "2024-12-06T14:22:00Z",
      "message_count": 8,
      "has_attachments": true
    }
  ]
}
```

#### `POST /api/conversations/task/new`
**Purpose:** Start a new task conversation

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "conversation_id": "uuid",
  "greeting": "What task or aspect of your job would you like to describe?"
}
```

#### `POST /api/conversations/task/message`
**Purpose:** Send message in task conversation

**Headers:** `Authorization: Bearer [token]`

**Request:**
```json
{
  "conversation_id": "uuid",
  "message": "I'm documenting our invoice reconciliation process",
  "attachments": [ /* optional */ ]
}
```

**Response:**
```json
{
  "message_id": "uuid",
  "bot_response": "Tell me more about that process. How often do you reconcile invoices?",
  "title_generated": "Invoice Reconciliation Process" // if first message
}
```

#### `GET /api/conversations/:conversation_id`
**Purpose:** Load full conversation history (for resuming)

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "conversation": {
    "conversation_id": "uuid",
    "type": "task",
    "title": "Invoice Reconciliation Process",
    "status": "active",
    "created_at": "2024-12-05T09:00:00Z",
    "last_updated": "2024-12-06T11:45:00Z",
    "messages": [
      {
        "role": "assistant",
        "content": [
          { "type": "text", "text": "What task would you like to describe?" }
        ],
        "timestamp": "2024-12-05T09:00:00Z"
      },
      {
        "role": "user",
        "content": [
          { "type": "text", "text": "Invoice reconciliation" },
          { 
            "type": "image", 
            "source": { 
              "url": "/api/files/attachments/task_uuid/msg_uuid_invoice.png",
              "media_type": "image/png",
              "size_kb": 234
            }
          }
        ],
        "timestamp": "2024-12-05T09:02:00Z"
      }
      // ... more messages
    ]
  }
}
```

#### `DELETE /api/conversations/:conversation_id`
**Purpose:** Delete a task conversation (onboarding cannot be deleted)

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted",
  "freed_storage_mb": 12.4
}
```

#### `DELETE /api/conversations/task/abandon/:conversation_id`
**Purpose:** Delete unsaved task conversation (no messages sent yet)

**Headers:** `Authorization: Bearer [token]`

**Response:**
```json
{
  "success": true,
  "message": "Draft task abandoned"
}
```

---

### Admin Routes

#### `POST /api/admin/login`
**Purpose:** Admin authentication (separate from user auth)

**Request:**
```json
{
  "username": "admin",
  "password": "admin_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "admin-jwt-token"
}
```

#### `GET /api/admin/users`
**Purpose:** List all users and their activity

**Headers:** `Authorization: Bearer [admin-token]`

**Response:**
```json
{
  "users": [
    {
      "user_id": "uuid",
      "name": "Sarah Johnson",
      "email": "sarah@gscdc.org",
      "role": "Director of Community Engagement",
      "onboarding_complete": true,
      "task_count": 12,
      "total_messages": 87,
      "storage_used_mb": 18.4,
      "last_active": "2024-12-06T15:30:00Z"
    }
    // ... 5 more users
  ],
  "stats": {
    "total_users": 6,
    "onboarding_complete": 6,
    "total_tasks": 52,
    "total_messages": 423,
    "total_storage_mb": 87.6
  }
}
```

#### `GET /api/admin/conversations/:user_id`
**Purpose:** Get all conversations for a specific user

**Headers:** `Authorization: Bearer [admin-token]`

**Response:**
```json
{
  "user": { /* user details */ },
  "conversations": [ /* array of conversations */ ]
}
```

#### `POST /api/admin/analyze/corporation`
**Purpose:** Run AI analysis across all users

**Headers:** `Authorization: Bearer [admin-token]`

**Request:**
```json
{
  "include_in_progress": false  // only analyze complete conversations
}
```

**Response:**
```json
{
  "analysis": "# Corporation-Wide Workflow Analysis\n\n## Executive Summary\n...",
  "generated_at": "2024-12-20T10:00:00Z",
  "conversations_analyzed": 58,
  "users_included": 6
}
```

#### `POST /api/admin/analyze/user/:user_id`
**Purpose:** Run AI analysis for individual user

**Headers:** `Authorization: Bearer [admin-token]`

**Response:**
```json
{
  "analysis": "# Sarah Johnson - Individual Workflow Analysis\n\n...",
  "user": { /* user details */ },
  "tasks_analyzed": 12
}
```

#### `GET /api/admin/export/all`
**Purpose:** Download all data (JSON export)

**Headers:** `Authorization: Bearer [admin-token]`

**Response:** File download
```json
{
  "export_date": "2024-12-20T10:00:00Z",
  "users": [ /* all user data */ ],
  "conversations": [ /* all conversations */ ],
  "metadata": {
    "total_users": 6,
    "total_conversations": 58,
    "date_range": { "start": "...", "end": "..." }
  }
}
```

---

### File Routes

#### `GET /api/files/attachments/:user_id/:conversation_id/:filename`
**Purpose:** Retrieve attachment file

**Headers:** `Authorization: Bearer [token]`

**Response:** Binary file stream

**Access Control:**
- Users can only access their own attachments
- Admin can access all attachments

---

## Core Features Specification

### 1. Authentication System

**Account Creation (Admin-Generated):**
```javascript
// Admin creates user account
{
  email: "sarah@gscdc.org",
  temp_password: "GSCDC2024!",
  name: "Sarah Johnson",
  role: "Director of Community Engagement"
}

// User receives email:
"Welcome to TIIS! Login at: https://tiis.truenorth.ai
Email: sarah@gscdc.org
Temporary Password: GSCDC2024!
You'll be prompted to create a new password on first login."
```

**First Login Flow:**
1. User enters email + temp password
2. System detects temp password flag
3. Redirect to password change screen
4. User creates new password (min 8 chars, 1 number, 1 special char)
5. Password stored as bcrypt hash
6. JWT token issued (7-day expiration)
7. "Remember me" checkbox (checked by default)
8. Redirect to onboarding

**Remember Me:**
- JWT stored in browser cookie
- 7-day expiration (refreshed on activity)
- Auto-login on return visits
- No session timeout during active use

**Security:**
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT signed with secret key (in .env)
- HTTPS required in production
- Rate limiting on login attempts (5 tries, 15min lockout)

---

### 2. Onboarding Conversation

**Purpose:** Establish baseline understanding of employee's role before task logging

**Structure:** Guided survey (10-15 questions)

**Key Questions:**
1. Job title and primary role
2. Daily/weekly recurring responsibilities
3. Tools, systems, and software used
4. Team collaboration and dependencies
5. Time allocation (admin vs. strategic work)
6. Current pain points or frustrations
7. Tasks that feel inefficient or repetitive

**System Prompt:**
```
You are conducting an onboarding interview for TIIS at Greater St. Cloud 
Development Corporation.

GOAL: Build comprehensive understanding of the employee's job role, daily 
tasks, tools used, and pain points. This baseline will inform all future 
task conversations.

STRUCTURE: 
- Ask 10-15 guided questions
- One question at a time
- Encourage screenshots/documents showing their tools
- Build on previous answers
- Conversational, not interrogational

QUESTIONS TO COVER:
1. Job title and primary responsibilities
2. Typical daily/weekly tasks
3. Tools and systems used (request screenshots)
4. Team collaboration and dependencies
5. Time-consuming aspects of work
6. Repetitive or frustrating tasks
7. Areas where they feel inefficient

COMPLETION:
After core questions, generate structured summary:
"Here's what I understand about your role: [summary]

Does this accurately capture your job? Anything to add or clarify?"

Wait for confirmation, then mark onboarding complete.
```

**Completion Flow:**
1. Bot asks all core questions
2. User provides detailed responses (text + attachments)
3. Bot generates summary
4. User reviews summary
5. User confirms → Onboarding marked complete
6. Dashboard unlocks (task creation enabled)

**UI State:**
- Onboarding conversation pinned at top of task list
- Shows "✓ Complete" badge
- Can be re-opened to view (read-only)
- Cannot be deleted

---

### 3. Task Conversation System

**Purpose:** Capture detailed workflows for specific tasks/processes

**Characteristics:**
- Freeform, user-directed conversations
- No predefined structure (unlike onboarding)
- Can be as brief or detailed as user wants
- Never "complete" - always resumable
- Multiple tasks can be created per session

**System Prompt:**
```
You are helping an employee document a specific work task or process at
Greater St. Cloud Development Corporation.

CONTEXT: You have access to their onboarding profile:
[User's role, tools, known pain points from onboarding summary]

GOAL: Understand this specific task in detail, focusing on:
- What the task involves
- How long it typically takes
- Tools/systems used
- Manual vs. automated steps
- Pain points or inefficiencies
- How often they do this task

CONVERSATION STYLE:
- Follow their lead - let them describe naturally
- Ask clarifying questions about workflow details
- Request screenshots/documents: "Could you show me that screen?"
- Probe gently: "What makes that step take so long?"
- Look for automation signals (repetition, manual data entry, waiting)
- DO NOT prescribe solutions - just understand and explore

IMPORTANT: This conversation is ongoing. There's no "completion" state.
They may return tomorrow to add more detail. Keep context fluid.
```

**Task Title Generation:**
- Auto-generated from first user message
- Claude extracts task name: "I'm documenting invoice processing" → "Invoice Processing"
- User can rename anytime
- Falls back to "Task - [timestamp]" if extraction fails

**Auto-Save Behavior:**
- Every message exchange saves to JSON
- No "save" button needed
- User can close browser/switch tasks anytime
- Conversation resumes from exact point

**Task Switching:**
- Click any task in sidebar → Chat content swaps
- Previous task auto-saved
- New task history loads
- Input field ready immediately

**Task Deletion:**
- Right-click task → "Delete conversation"
- Confirmation modal: "Permanently delete 'Invoice Processing'? This cannot be undone."
- Deletes JSON file + all attachments
- Updates user's storage_used_mb

**Abandon New Task (Before First Save):**
- Creating new task but haven't sent message yet
- "Abandon" button in UI
- Confirmation: "This task will not be saved. Continue?"
- Removes empty conversation, no trace

---

### 4. Multimodal Support

**File Upload Methods:**

**Desktop:**
- Drag-and-drop onto chat window
- Click 📎 attachment button → File picker
- Paste from clipboard (images only)

**Mobile:**
- Tap 📎 button → Options:
  - 📷 Take Photo
  - 🖼️ Choose from Library
  - 📄 Choose File
- Native camera/photo picker

**Supported File Types:**
```javascript
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg, .jpeg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};
```

**File Validation:**
- Max file size: 10MB
- Max total per user: 25MB
- Blocked if user over quota
- File type checking (MIME + extension)

**Storage Management:**
```
File saved to: 
data/conversations/user_[email]/attachments/[conversation_type]_[id]/[message_id]_[filename]

Example:
data/conversations/user_sarah_gscdc/attachments/task_abc123/msg_xyz789_crm_screenshot.png
```

**Claude Integration:**
```javascript
// Send message with attachments to Claude
const content = [];

// Add images
for (const img of imageAttachments) {
  content.push({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.type,
      data: img.base64Data
    }
  });
}

// Add PDFs
for (const pdf of pdfAttachments) {
  content.push({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: pdf.base64Data
    }
  });
}

// Add text
content.push({
  type: 'text',
  text: userMessage
});

// Send to Claude
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 3000,
  messages: [...history, { role: 'user', content }]
});
```

**Display in Chat:**
```html
<!-- User message with attachments -->
<div class="message user-message">
  <div class="message-attachments">
    <div class="attachment-thumbnail" data-url="/api/files/...">
      <img src="thumbnail.png" alt="CRM Screenshot">
      <span class="attachment-name">crm_screenshot.png</span>
      <span class="attachment-size">234 KB</span>
    </div>
  </div>
  <div class="message-text">
    Here's the CRM I use for tracking business contacts
  </div>
  <div class="message-timestamp">2:45 PM</div>
</div>
```

**Click to Expand:**
- Click thumbnail → Full-size modal
- Download button
- Close to return to chat

---

### 5. Dashboard Interface

**Layout (Desktop):**
```
┌────────────────────────────────────────────────────────────┐
│  TIIS - TrueNorth Intelligent Intake System     [👤 Sarah] │
├─────────────────┬──────────────────────────────────────────┤
│                 │                                          │
│  CONVERSATIONS  │         ACTIVE CHAT                      │
│                 │                                          │
│  🎯 Onboarding  │  [Conversation messages display here]   │
│     ✓ Complete  │                                          │
│                 │                                          │
│  📋 Invoice     │                                          │
│     Processing  │                                          │
│     • Updated   │                                          │
│       2h ago    │                                          │
│                 │  ─────────────────────────────────────  │
│  📊 Grant       │                                          │
│     Reports     │  [📎] [Message input here...  ] [Send]  │
│     • Updated   │                                          │
│       1d ago    │                                          │
│                 │                                          │
│  [+ New Task]   │                                          │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

**Layout (Mobile):**
```
┌────────────────────────────┐
│  TIIS            [≡] [👤] │
├────────────────────────────┤
│                            │
│  [Active chat takes full   │
│   screen - conversation    │
│   list accessible via      │
│   hamburger menu]          │
│                            │
│  [Messages...]             │
│                            │
│  ──────────────────────    │
│  [📷] [📎] [Message...] [→]│
│                            │
└────────────────────────────┘
```

**Conversation List (Sidebar):**
- Onboarding always at top (pinned)
- Tasks sorted by last_updated (most recent first)
- Visual indicators:
  - ✓ Complete (onboarding only)
  - 📎 Has attachments
  - 🟢 Active (currently viewing)
  - Updated timestamp

**Active Chat Window:**
- Message history (scrollable)
- Attachment thumbnails inline
- Typing indicator when bot is responding
- Input bar fixed at bottom

**New Task Button:**
- Prominent "+ New Task" button at bottom of list
- Click → Creates empty conversation
- Chat switches to new task
- Input ready immediately
- First message generates title

**User Menu (Top Right):**
- 👤 Sarah
  - Change Password
  - Log Out

---

### 6. Mobile Responsiveness

**Design Principles:**
- Mobile-first CSS architecture
- Touch targets ≥ 44px
- Optimized for one-handed use
- Progressive image loading

**Breakpoints:**
```css
/* Mobile (default) */
@media (max-width: 767px) {
  /* Single column layout */
  /* Hamburger menu for conversation list */
  /* Full-screen chat */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Side-by-side with narrow sidebar */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Full layout with comfortable spacing */
}
```

**Mobile-Specific Features:**
- Swipe to open/close conversation list
- Pull-to-refresh (reload conversation)
- Camera quick-access button
- Optimized file picker
- Sticky input bar (doesn't hide on scroll)

**Performance Optimizations:**
- Lazy load message history (paginate old messages)
- Compress images before upload (client-side)
- Progressive image display (blur-up technique)
- Minimize re-renders (efficient state management)

---

## User Interface Specifications

### Login Page

**File:** `public/login.html`

**Elements:**
- TIIS logo/branding
- Email input
- Password input
- "Remember me" checkbox (checked by default)
- Login button
- Error message display area

**First Login (Temp Password Detected):**
- Modal overlay: "Create Your Password"
- Old password field (pre-filled with temp password)
- New password field
- Confirm password field
- Password requirements display
- Submit button

**States:**
- Default (ready for login)
- Loading (authenticating...)
- Error (invalid credentials, show message)
- Success (redirect to dashboard or onboarding)

---

### Dashboard Page

**File:** `public/dashboard.html`

**Conversation Sidebar:**
```html
<div class="conversation-list">
  <div class="conversation-item pinned complete">
    <div class="icon">🎯</div>
    <div class="details">
      <h3>Onboarding</h3>
      <span class="status">✓ Complete</span>
    </div>
  </div>
  
  <div class="conversation-item active">
    <div class="icon">📋</div>
    <div class="details">
      <h3>Invoice Processing</h3>
      <span class="meta">
        <span class="attachment-badge">📎 3</span>
        <span class="timestamp">Updated 2h ago</span>
      </span>
    </div>
  </div>
  
  <!-- More tasks... -->
  
  <button class="new-task-btn">+ New Task</button>
</div>
```

**Chat Window:**
```html
<div class="chat-container">
  <div class="chat-header">
    <h2>Invoice Processing</h2>
    <div class="chat-actions">
      <button class="delete-conversation">🗑️</button>
    </div>
  </div>
  
  <div class="messages" id="messages">
    <!-- Messages rendered here -->
  </div>
  
  <div class="typing-indicator hidden">
    <span class="dots">•••</span>
  </div>
  
  <div class="input-bar">
    <button class="attach-btn">📎</button>
    <textarea 
      id="message-input" 
      placeholder="Describe this task..."
      rows="1"
    ></textarea>
    <button class="send-btn">Send</button>
  </div>
</div>
```

**Message Structure:**
```html
<!-- Bot message -->
<div class="message bot-message">
  <div class="avatar">🤖</div>
  <div class="message-content">
    <div class="message-text">
      Tell me more about the invoice processing workflow.
    </div>
    <div class="message-timestamp">2:30 PM</div>
  </div>
</div>

<!-- User message with attachment -->
<div class="message user-message">
  <div class="message-content">
    <div class="message-attachments">
      <div class="attachment" data-url="/api/files/...">
        <img src="/api/files/.../thumbnail" alt="Screenshot">
        <span class="filename">invoice_system.png</span>
      </div>
    </div>
    <div class="message-text">
      Here's our current invoice tracking system
    </div>
    <div class="message-timestamp">2:32 PM</div>
  </div>
  <div class="avatar">SJ</div>
</div>
```

---

### Admin Dashboard

**File:** `public/admin.html`

**Sections:**

1. **User Overview**
```
┌─────────────────────────────────────────────┐
│  GSCDC Employee Activity Summary            │
├─────────────────────────────────────────────┤
│  Total Users: 6                             │
│  Onboarding Complete: 6/6 (100%)            │
│  Total Tasks: 52                            │
│  Total Messages: 423                        │
│  Storage Used: 87.6 MB / 150 MB             │
└─────────────────────────────────────────────┘
```

2. **User List**
```
Name              Role                 Tasks  Messages  Last Active
────────────────────────────────────────────────────────────────────
Sarah Johnson     Director of Comm.    12     87        2h ago
Mike Chen         Grant Manager        9      71        4h ago
...
```

3. **Analysis Tools**
```
┌─────────────────────────────────────────────┐
│  Run Analysis                               │
├─────────────────────────────────────────────┤
│  [Corporation-Wide Analysis]                │
│  Analyzes all 6 employees, identifies       │
│  automation opportunities across org        │
│                                             │
│  [Individual Reports]                       │
│  ▼ Select Employee...                       │
│     Sarah Johnson                           │
│     Mike Chen                               │
│     ...                                     │
│  [Generate Report]                          │
└─────────────────────────────────────────────┘
```

4. **Export Options**
```
┌─────────────────────────────────────────────┐
│  Data Export                                │
├─────────────────────────────────────────────┤
│  [Download All Data (JSON)]                 │
│  Complete export of users, conversations,   │
│  and metadata                               │
│                                             │
│  [Export Analysis Reports (PDF)]            │
│  Corporation report + 6 individual reports  │
└─────────────────────────────────────────────┘
```

5. **Conversation Viewer**
```
Click any user → View all their conversations
Click any conversation → Full message history with attachments
```

---

## Analysis & Reporting

### Corporation-Wide Analysis

**Trigger:** Admin clicks "Corporation-Wide Analysis"

**Claude Analysis Prompt:**
```
You are analyzing 2 weeks of virtual job shadowing data from Greater St. Cloud 
Development Corporation. You have access to detailed task conversations from 
6 employees covering their daily workflows, tools, and pain points.

DATA PROVIDED:
[All 52+ task conversations + 6 onboarding summaries]

YOUR TASK: Generate a comprehensive workflow analysis report for TrueNorth AI 
Services to deliver to the client.

REPORT STRUCTURE:

1. EXECUTIVE SUMMARY
   - Overall findings (2-3 paragraphs)
   - Key automation opportunities (top 5)
   - Expected impact (time savings, efficiency gains)

2. CROSS-ORGANIZATIONAL PATTERNS
   - Tasks performed by multiple employees
   - Shared tools and systems
   - Common pain points
   - Redundant workflows

3. TASK CATEGORIZATION
   Break down all documented tasks into:
   - Administrative/Data Entry
   - Communication/Coordination
   - Analysis/Reporting
   - Strategic/Creative
   Show percentage breakdown and time estimates

4. AUTOMATION OPPORTUNITIES (Ranked by Impact)
   For each opportunity:
   - Task description
   - Current time investment
   - Automation approach (high-level)
   - Estimated time savings
   - Implementation complexity (Low/Medium/High)
   - Employees affected
   
   Example:
   "OPPORTUNITY #1: Invoice Reconciliation Automation
   Current State: 3 employees manually reconcile vendor invoices 
   weekly, copying data from email to Excel (avg 45min each = 2.25hr/week)
   
   Solution: Automated email parser + Excel integration
   Time Savings: ~2 hours/week (104 hours/year)
   Complexity: Medium (requires email API + script)
   ROI: High"

5. TOOL CONSOLIDATION OPPORTUNITIES
   - Overlapping or redundant tools
   - Integration opportunities
   - Gaps in current tooling

6. INDIVIDUAL EFFICIENCY GAINS
   Quick wins for each employee (1-2 per person)

7. IMPLEMENTATION ROADMAP
   - Phase 1: Quick wins (0-1 months)
   - Phase 2: Medium complexity (1-3 months)
   - Phase 3: Strategic initiatives (3-6 months)

8. APPENDIX: TASK INVENTORY
   Comprehensive list of all documented tasks by employee

FORMAT: Professional report, data-driven, specific examples from conversations.
Use actual numbers (time estimates, frequency). Include representative quotes
where they illustrate key points.
```

**Output Format:** Markdown text, converted to PDF for client delivery

---

### Individual Employee Reports

**Trigger:** Admin selects employee and clicks "Generate Report"

**Claude Analysis Prompt:**
```
You are analyzing task conversations from [Employee Name], [Role] at Greater 
St. Cloud Development Corporation.

DATA PROVIDED:
[Employee's onboarding summary + all task conversations]

YOUR TASK: Generate an individual workflow analysis and efficiency report.

REPORT STRUCTURE:

1. EMPLOYEE PROFILE
   - Role and responsibilities (from onboarding)
   - Tools and systems used
   - Self-identified pain points

2. DOCUMENTED TASKS (Summary)
   List all [N] tasks documented:
   - Task name
   - Frequency
   - Estimated time
   - Complexity

3. TIME ALLOCATION ANALYSIS
   Based on documented tasks, estimate:
   - Administrative work: X%
   - Strategic/creative work: Y%
   - Communication/meetings: Z%
   
   Compare to ideal allocation (from onboarding if mentioned)

4. AUTOMATION OPPORTUNITIES (Specific to This Employee)
   Rank opportunities by:
   - Time savings potential
   - Implementation difficulty
   - Impact on job satisfaction
   
   For each:
   - Current manual process
   - Proposed automation
   - Expected time savings
   - Skill development needed (if any)

5. WORKFLOW OPTIMIZATION SUGGESTIONS
   Beyond automation:
   - Process improvements
   - Tool recommendations
   - Training opportunities

6. QUICK WINS
   3-5 immediate actions they could take

7. SKILL DEVELOPMENT RECOMMENDATIONS
   Based on automation opportunities, what skills would:
   - Make them more efficient
   - Position them for higher-value work
   - Align with their interests (if mentioned)

FORMAT: Professional but personalized. Use their actual words from 
conversations. Make it actionable.
```

**Output Format:** Markdown text, converted to PDF

---

## Technical Implementation Details

### Authentication Flow

**JWT Token Structure:**
```javascript
{
  user_id: "uuid",
  email: "sarah@gscdc.org",
  role: "user", // or "admin"
  iat: 1701878400,  // issued at
  exp: 1702483200   // expires (7 days)
}
```

**Password Requirements:**
```javascript
const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
// Minimum 8 characters
// At least 1 number
// At least 1 special character
```

**Bcrypt Hashing:**
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Hash password
const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Verify password
const match = await bcrypt.compare(plainPassword, storedHash);
```

**JWT Verification Middleware:**
```javascript
function requireAuth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

### Conversation State Management

**Loading Conversation:**
```javascript
async function loadConversation(conversation_id, user_id) {
  // 1. Verify ownership
  const conv = await getConversation(conversation_id);
  if (conv.user_id !== user_id) {
    throw new Error('Unauthorized');
  }
  
  // 2. Load message history
  const messages = conv.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  }));
  
  // 3. Prepare for Claude
  const claudeHistory = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: formatContentForClaude(msg.content)
  }));
  
  return { conversation: conv, claudeHistory };
}
```

**Resuming Conversation:**
```javascript
async function sendMessage(conversation_id, user_message, attachments) {
  // 1. Load existing conversation
  const { conversation, claudeHistory } = await loadConversation(conversation_id);
  
  // 2. Format new message
  const newUserMessage = {
    role: 'user',
    content: await formatWithAttachments(user_message, attachments)
  };
  
  // 3. Send to Claude with full history
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: getSystemPrompt(conversation.type),
    messages: [...claudeHistory, newUserMessage]
  });
  
  // 4. Save both messages
  await appendMessage(conversation_id, newUserMessage);
  await appendMessage(conversation_id, {
    role: 'assistant',
    content: response.content
  });
  
  return response.content[0].text;
}
```

---

### File Upload Handling

**Client-Side (JavaScript):**
```javascript
async function handleFileUpload(files) {
  const attachments = [];
  
  for (const file of files) {
    // Validate
    if (file.size > 10 * 1024 * 1024) {
      alert(`File too large: ${file.name}`);
      continue;
    }
    
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Store metadata
    attachments.push({
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64
    });
    
    // Show preview
    displayAttachmentPreview(file);
  }
  
  return attachments;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

**Server-Side (Node.js):**
```javascript
async function saveAttachment(user_id, conversation_id, message_id, attachment) {
  // 1. Generate file path
  const sanitizedEmail = user_id.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const extension = attachment.name.split('.').pop();
  const filename = `${message_id}_${Date.now()}.${extension}`;
  
  const dir = path.join(
    __dirname,
    '../data/conversations',
    `user_${sanitizedEmail}`,
    'attachments',
    conversation_id
  );
  
  // 2. Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  // 3. Save file
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(attachment.data, 'base64');
  await fs.writeFile(filepath, buffer);
  
  // 4. Update user storage
  const sizeKB = buffer.length / 1024;
  await updateUserStorage(user_id, sizeKB);
  
  // 5. Return reference
  return {
    file_path: filepath,
    url: `/api/files/attachments/${user_id}/${conversation_id}/${filename}`,
    size_kb: sizeKB
  };
}
```

---

### Multi-Device Handling (Last-Write-Wins)

**Simple Approach:**
- Each message has timestamp
- Each device polls for updates (every 30 seconds when inactive)
- On activity, fetch latest messages since last known timestamp
- Display new messages if any

**Frontend:**
```javascript
let lastMessageTimestamp = null;
let updateCheckInterval = null;

function startUpdateChecker() {
  updateCheckInterval = setInterval(async () => {
    const newMessages = await fetchNewMessages(
      conversationId, 
      lastMessageTimestamp
    );
    
    if (newMessages.length > 0) {
      appendMessagesToUI(newMessages);
      lastMessageTimestamp = newMessages[newMessages.length - 1].timestamp;
    }
  }, 30000); // 30 seconds
}

function stopUpdateChecker() {
  clearInterval(updateCheckInterval);
}

// Start when viewing conversation
// Stop when switching away
```

**Backend:**
```javascript
app.get('/api/conversations/:id/updates', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { since } = req.query;
  
  const conversation = await loadConversation(id, req.user.user_id);
  
  // Filter messages newer than 'since' timestamp
  const newMessages = conversation.messages.filter(msg => 
    new Date(msg.timestamp) > new Date(since)
  );
  
  res.json({ messages: newMessages });
});
```

---

## Deployment

### Environment Variables

**File:** `.env` (not committed to repo)
```env
# API Keys
ANTHROPIC_API_KEY=sk-ant-...

# Server Config
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-very-secure-random-string-here
ADMIN_PASSWORD=secure-admin-password-here

# Optional: Email (for password reset - Phase 2)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=tiis@truenorth.ai
# SMTP_PASS=...
```

### Render.com Deployment

**render.yaml:**
```yaml
services:
  - type: web
    name: tiis
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_PASSWORD
        sync: false
    disk:
      name: tiis-data
      mountPath: /opt/render/project/src/data
      sizeGB: 1
```

**Deployment Steps:**
1. Push code to GitHub repository
2. Connect Render.com to GitHub repo
3. Configure environment variables in Render dashboard
4. Set disk mount for persistent storage
5. Deploy → Render builds and launches

**URL:** `https://tiis.onrender.com` (or custom domain)

---

## Security Considerations

### Data Protection
- Passwords stored as bcrypt hashes (never plaintext)
- JWT tokens for stateless authentication
- HTTPS required in production (Render provides)
- CORS configured to restrict origins
- Rate limiting on auth endpoints (prevent brute force)

### Access Control
- Users can only access their own conversations
- Admin has read-only access to all conversations
- File downloads verified against user ownership
- No cross-user data leakage

### File Upload Security
- File type validation (MIME + extension)
- Size limits enforced (10MB per file, 25MB per user)
- Sanitized filenames (prevent directory traversal)
- No executable files allowed

### API Security
- JWT verification on all protected routes
- Input validation on all endpoints
- Error messages don't leak sensitive info
- SQL injection N/A (using JSON, not database)

---

## Testing Strategy

### Unit Tests
- Authentication functions (login, password change, JWT)
- File upload validation
- Conversation CRUD operations
- Claude API integration

### Integration Tests
- Full user flows (signup → onboarding → tasks)
- Multi-device scenarios
- File upload → storage → retrieval
- Analysis report generation

### Manual Testing
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS Safari, Android Chrome)
- Tablet layouts
- File upload from all sources
- Conversation switching performance
- Admin dashboard functionality

### User Acceptance Testing
- Walk GSCDC employees through signup
- Monitor first week usage
- Gather feedback on UX pain points
- Iterate based on real usage

---

## Cost Estimates

### Development
- Initial build: ~40-60 hours (AI-assisted)
- Testing & refinement: ~10-15 hours
- Documentation: ~5 hours
- **Total:** ~55-80 hours

### Operational (Monthly)

**Claude API:**
- Onboarding conversations: 6 users × 2,000 tokens = 12,000 tokens
- Task conversations: 50 tasks × 1,500 tokens avg = 75,000 tokens
- Message attachments: ~30 images × 1,000 tokens = 30,000 tokens
- Analysis reports: 7 reports × 4,000 tokens = 28,000 tokens
- **Total tokens:** ~145,000 tokens/month
- **Cost:** ~$0.50/month (Sonnet 4.5 pricing)

**Hosting (Render.com):**
- Free tier: 750 hours/month, 1GB disk
- **Cost:** $0/month for MVP
- Upgrade if needed: $7/month (always-on + 5GB disk)

**Total Monthly Cost:** $0.50 - $7.50

**Per-Project Revenue Potential:**
- 2-week engagement for 6-employee company
- Analysis + recommendations report
- Expected value: $2,000 - $5,000
- **ROI:** Excellent (minimal operational cost)

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Voice input** (Web Speech API or Whisper)
2. **Email notifications** (password reset, activity reminders)
3. **Real-time sync** (WebSockets for multi-device)
4. **Session resumption** (recover from browser crash)
5. **Conversation search** (find specific tasks/keywords)

### Phase 3 Features
6. **Mobile app** (React Native or native iOS/Android)
7. **Advanced analytics** (interactive dashboards)
8. **Comparison reports** (compare this client to benchmarks)
9. **Video support** (screen recordings, process walkthroughs)
10. **API for integrations** (export to project management tools)

### AWS Migration (Phase 4)
- **Database:** PostgreSQL (RDS)
  - Users table
  - Conversations table
  - Messages table
  - Attachments table (metadata, files in S3)
- **File storage:** S3 buckets
- **Compute:** ECS or Lambda
- **Benefits:** Better scalability, backups, multi-tenancy

---

## Documentation & Support

### For Developers
- **README.md** - Setup instructions
- **API.md** - Endpoint documentation
- **DEPLOYMENT.md** - Render setup guide
- **CHANGELOG.md** - Version history

### For Users
- **In-app help** - Context-sensitive guidance
- **Video walkthrough** - Screen recording of signup → first task
- **FAQ** - Common questions

### For Admin
- **Admin guide** - How to create users, run analysis
- **Troubleshooting** - Common issues and fixes

---

## Success Metrics

### For GSCDC Pilot
- [ ] 6/6 employees complete onboarding (100%)
- [ ] Average 10+ task conversations per employee
- [ ] 70%+ task conversations include visual documentation
- [ ] Reports delivered on time (end of 2 weeks + 2 days analysis)
- [ ] Client satisfaction: Identifies actionable automation opportunities
- [ ] Follow-up engagement: GSCDC requests Phase 2 or expansion

### For TrueNorth Business
- [ ] TIIS methodology proven effective
- [ ] Replicable for other clients
- [ ] Case study created from GSCDC results
- [ ] 3+ additional clients signed within 3 months

---

## Project Timeline

### Week 1: Foundation
- Days 1-2: Project setup, authentication system
- Days 3-4: Onboarding conversation + dashboard
- Day 5: Testing and refinement

### Week 2: Core Features
- Days 6-7: Task conversation system
- Days 8-9: Multimodal support (file uploads)
- Day 10: Mobile responsiveness

### Week 3: Admin & Polish
- Days 11-12: Admin dashboard + analysis
- Days 13-14: Testing, bug fixes, documentation
- Day 15: Deploy to Render, final checks

### Week 4: Launch
- Day 16-17: Create GSCDC user accounts
- Day 18: Training session with employees
- Days 19-32: 2-week pilot period
- Days 33-34: Analysis and report generation
- Day 35: Deliver reports to client

---

## Appendix: Sample Conversations

### Sample Onboarding Conversation

```
Bot: Welcome to TIIS, Sarah! Let's start by understanding your role at 
     Greater St. Cloud Development Corp. What's your job title?

Sarah: Director of Community Engagement

Bot: Great! On a typical day, what are your main responsibilities?

Sarah: I coordinate with local businesses, manage our grant partnership 
       programs, organize networking events, and help connect businesses 
       with resources they need to grow.

Bot: That's a diverse role! What tools or systems do you use most often 
     in your work?

Sarah: [uploads screenshot] Here's our main CRM where I track all business 
       relationships. I also use Excel a lot for grant reporting, and we 
       have a FileMaker database for tracking economic development projects.

Bot: I can see the CRM has contact information and interaction history. 
     How much time would you say you spend on administrative tasks versus 
     more strategic or relationship-building work?

Sarah: Probably 60% admin, 40% strategic. I wish it were reversed. A lot 
       of my time goes to data entry and generating reports.

Bot: What parts of your administrative work feel most time-consuming or 
     repetitive?

Sarah: Definitely the monthly grant reports. I have to pull data from three 
       different systems, compile it in Excel, and format it for different 
       funding agencies. Each report takes 3-4 hours and I do about 6 per month.

Bot: That's a significant time investment. Are there other tasks that feel 
     inefficient or frustrating?

Sarah: Following up with businesses after events. I manually enter their info 
       from business cards into the CRM, then send personalized follow-up 
       emails. It's important work but very tedious.

[Conversation continues for 8-10 more exchanges covering team collaboration, 
pain points, and ideal workflow]

Bot: Thanks for sharing all of that detail! Let me summarize what I understand 
     about your role:

     Sarah Johnson - Director of Community Engagement
     
     PRIMARY RESPONSIBILITIES:
     • Coordinate with local businesses and manage relationships
     • Administer grant partnership programs
     • Organize networking events and business development activities
     • Connect businesses with growth resources
     
     TOOLS & SYSTEMS:
     • CRM (business relationship tracking)
     • Excel (grant reporting and analysis)
     • FileMaker (economic development project database)
     • Email and calendar management
     
     TIME ALLOCATION:
     • 60% administrative tasks (data entry, reporting)
     • 40% strategic/relationship work
     • Desires to reverse this ratio
     
     KEY PAIN POINTS:
     • Monthly grant reports: 6 reports × 3-4 hours each (18-24 hours/month)
       - Requires pulling data from 3 systems and manual compilation
     • Post-event follow-up: Manual CRM data entry from business cards
       - Time-consuming but important for relationship building
     • Data exists in silos across multiple systems
     
     Does this accurately capture your role and priorities? Anything to add 
     or clarify?

Sarah: Yes, that's spot on! Really captures the challenges I face.

Bot: ✓ Onboarding complete! You can now start documenting specific tasks 
     and workflows. Just describe what you're working on whenever you'd like 
     to log it.
```

---

### Sample Task Conversation

```
[Sarah clicks "+ New Task"]

Sarah: I'm going to document our monthly grant report process since we just 
       talked about how time-consuming it is.

Bot: Perfect! Walk me through it. What's the first step in creating these 
     grant reports?

Sarah: [uploads screenshot of Excel template] Each funding agency has their 
       own report format, but this is our master template. I start by opening 
       last month's report as a starting point.

Bot: I can see the template has sections for business metrics, job creation, 
     and funding disbursement. Where does the data for these sections come from?

Sarah: That's the annoying part. Business metrics come from our CRM, job 
       numbers come from our FileMaker database, and financial data comes 
       from our accounting system.

Bot: Three different systems. Do you have to log into each one separately?

Sarah: Yes. And they all export data in different formats. The CRM gives me 
       a CSV, FileMaker gives me a weird text file, and accounting is a PDF 
       that I have to copy-paste from.

Sarah: [uploads screenshots of each system's export screens]

Bot: I can see each interface. How long does it take to pull data from all 
     three systems?

Sarah: Maybe 30 minutes just to export everything. Then another hour to clean 
       it up and format it correctly for the Excel template.

Bot: What do you mean by "clean it up"?

Sarah: The CRM data has duplicate entries I need to remove. The FileMaker 
       export includes historical data I don't need, so I have to filter by 
       date range manually. And the accounting PDF... ugh, I literally retype 
       numbers because copy-paste breaks the formatting.

Bot: After you have all the data formatted, what happens next?

Sarah: I populate the template, add narrative descriptions for each section, 
       create charts, and then save different versions for each funding agency 
       since they want slightly different information.

Bot: How many different versions do you create?

Sarah: Usually 3-4 per month. State grants want certain metrics, federal grants 
       want different ones, and foundation funders want more narrative.

Sarah: [uploads sample finished reports] Here are examples of what different 
       funders receive.

Bot: I can see the differences. The federal version emphasizes job creation 
     numbers, while the foundation version has more storytelling. Do you ever 
     make mistakes transferring data between systems?

Sarah: More often than I'd like to admit. Last month I caught an error right 
       before submitting a report - I had copied Q3 data instead of Q4 from 
       one of the exports. Had to redo the whole thing.

Bot: That must have been stressful. Is there a review process to catch errors?

Sarah: My boss spot-checks them, but we don't have a formal process. It's mostly 
       on me to be careful.

[Conversation continues as Sarah adds more details over several days, uploading 
additional screenshots and describing variations in the process]
```

---

## Document Version

**Version:** 1.0  
**Last Updated:** December 2024  
**Author:** Mark Gill with Claude (Anthropic)  
**Status:** Active Development

---

## Contact & Support

**Project Lead:** Mark Gill  
**Organization:** TrueNorth AI Services LLC  
**Email:** mark@truenorth.ai (update with actual)  
**GitHub:** github.com/truenorth-ai/tiis (update with actual)

For technical issues, feature requests, or questions about TIIS methodology, 
please contact the project team.

---

**End of Documentation**

# 🚀 PostMaster AI &bull; Dynamic Bulk Email Studio

A production-ready web application for crafting, personalizing, and dispatching bulk email campaigns with **Google / Gmail Authentication**, dynamic placeholder interpolation (e.g. `{{name}}`, `{{company}}`, `{{first_name}}`), document attachments, and real-time live dispatch monitoring.

---

## ✨ Features

- **Google Account Authentication**:
  - **Google App Password (Instant Connect)**: Connect your Gmail account in 30 seconds with 2-Step Verification and a 16-character Google App Password (`myaccount.google.com/apppasswords`).
  - **Google Cloud OAuth 2.0**: Official Google OAuth flow with Gmail API (`https://www.googleapis.com/auth/gmail.send`).
- **Dynamic Variable Personalization**:
  - Auto-infers first names from email usernames (e.g., `alex.smith@company.com` &rarr; `Alex`).
  - Supports fallback default expressions (e.g., `{{company || "your team"}}` or `{{first_name || "there"}}`).
  - Automatically detects all column headers from uploaded spreadsheets as usable dynamic placeholder tags.
  - Interactive variable insertion pills &mdash; click any variable pill to insert it directly into your subject line or email body.
- **Audience & Spreadsheet Management**:
  - Drag-and-drop support for `.csv`, `.xlsx`, `.xls`, and `.txt` files.
  - Paste email addresses directly in multiple formats (e.g. `John <john@acme.com>` or line-by-line).
  - Search & filter recipient grid with duplicate detection & one-click deduplication.
  - Download pre-formatted sample CSV template.
- **Rich Email Studio & Composer**:
  - Visual WYSIWYG editor with Bold, Italic, Underline, Headings, Lists, Blockquotes, Links, and Code formatting.
  - Clean HTML source code toggle for power users.
  - Preloaded Template Library (B2B Outreach, Job Applications & Portfolios, VIP Event Invitations, Invoice Dispatches).
- **Document & Attachment Manager**:
  - Drag-and-drop multiple file attachments (PDFs, DOCX, XLSX, Images, ZIPs).
  - Total file size tracker with Gmail's 25MB limit alerts.
- **Per-Recipient Live Preview Carousel**:
  - Step through each contact in your recipient list with `< Prev` and `Next >` to see the exact email body and subject they will receive before dispatching.
  - Send a sample test preview directly to your own inbox.
- **Real-Time Live Dispatch Monitor**:
  - Animated progress bar and 4 real-time stat cards (Total, Sent, Failed, In Queue).
  - **Smart Anti-Spam Throttling**: Configurable delay (e.g., 2s &plusmn; 1s jitter) between emails to prevent Google rate-limits and preserve sender reputation.
  - Pause, Resume, and Emergency Stop controls.
  - Color-coded live stream terminal log feed with auto-scroll.
- **Campaign History & Audit Reports**:
  - Detailed recipient-by-recipient delivery audit logs with timestamps and Message IDs.
  - One-click **Export Report (.CSV)**.
  - Re-use / clone past campaigns back into the composer.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS Design System (Custom properties, Glassmorphism, Responsive Grid, Dark/Light Themes), Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Nodemailer, Google APIs (`googleapis`), Multer (Attachment handling), SheetJS (`xlsx`), PapaParse (CSV).
- **Real-Time Streaming**: Server-Sent Events (SSE).

---

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm run install:all
\`\`\`

### 2. Start Application (Server + Frontend)
\`\`\`bash
npm start
\`\`\`

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 How to Connect Google / Gmail

1. Click **"Connect Google"** in the top navigation bar.
2. Select **Google App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
   - Generate an App Password named `PostMaster`.
   - Enter your Gmail and paste the 16-character code.
   - Click **"Connect & Save"**.
3. Alternatively, enter your **Google Cloud OAuth 2.0** Client ID and Secret to use one-click Google OAuth login.

# Die Tracker — Mould Production Tracking System

Real-time die/mould production pipeline tracker for a mobile cover manufacturing plant.

## Features
- 6-stage pipeline: Design → Programming → VMC → Wirecut → Tool Room → Moulding
- Part-level tracking (Pocket, Cavity, Insert — each tracked independently)
- Role-based logins — each operator sees only their stage
- VMC minimum 14h time guard (prevents fake completion)
- 36-hour budget tracking with WhatsApp alerts to 2 numbers
- Issue reporting with instant WhatsApp notification
- Moulding department view — see all dies currently there
- Mobile-first responsive design

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express + JWT + Helmet + Rate limiting
- **Database:** MongoDB Atlas
- **Alerts:** Meta WhatsApp Cloud API

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and WhatsApp tokens
npm install
npm run dev
```

**Seed default users:**
```bash
node src/config/seeder.js
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm install
npm run dev
```

## Default Login Credentials (after seeding)

| Role | Username | Password |
|------|----------|----------|
| Owner | owner | owner123 |
| Admin | admin | admin123 |
| Designer | designer1 | pass123 |
| Programmer | programmer1 | pass123 |
| VMC M-01 | vmc_m01 | pass123 |
| VMC M-05 | vmc_m05 | pass123 |
| Wirecut | wirecut1 | pass123 |
| Tool Room | toolroom1 | pass123 |

**Change all passwords after first login via Admin panel.**

## WhatsApp Setup (one-time, 10 minutes)

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a free app → Add WhatsApp product
3. Get your Phone Number ID and Token
4. Add to backend `.env`:
   ```
   WHATSAPP_TOKEN=your_token_here
   WHATSAPP_PHONE_ID=your_phone_id
   WHATSAPP_PRIMARY_NUMBER=91XXXXXXXXXX
   WHATSAPP_SECONDARY_NUMBER=91XXXXXXXXXX
   ```

## Deployment

### Backend (Render)
1. Push to GitHub
2. Create Web Service on Render → point to `/backend`
3. Set all .env variables in Render dashboard
4. Start command: `npm start`

### Frontend (Vercel)
1. Push to GitHub
2. Import to Vercel → set root to `/frontend`
3. Set `VITE_API_URL` to your Render backend URL
4. Deploy

## Stage Flow

```
Designer creates die → Parts enter Programming queue
→ Programmer marks received (36h CLOCK STARTS)
→ VMC Operator machines (min 14h, button locked before that)
→ Wirecut Operator
→ Tool Room (marks each part done)
→ All parts done → "Send to Moulding" button appears
→ Tool Room Head sends → Die appears in Moulding Department view
→ WhatsApp sent to both numbers
```

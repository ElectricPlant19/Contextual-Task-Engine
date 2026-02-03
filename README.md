# Contextual Task Engine (CTE)

> **Do the right task at the right energy.**

A calm, intelligent productivity app that recommends tasks based on your current context—not just deadlines.

![CTE Screenshot](https://via.placeholder.com/800x400/0d9488/ffffff?text=Contextual+Task+Engine)

## 🌿 Philosophy

Traditional task managers fail because they:
- Treat all tasks as equal
- Ignore mental energy
- Encourage overwhelm and guilt

**CTE is different.** It respects human limits and helps you act now, not plan endlessly.

### How Context-Based Tasking Works

Instead of showing you a guilt-inducing list of everything you need to do, CTE asks:

1. **How much time do you have?** (15 min, 30 min, 1 hour, etc.)
2. **What's your current energy level?** (Low 🌙, Medium ☀️, High ⚡)

Then it recommends the **single best task** for your current context, with a clear explanation:

> *"Recommended because it matches your low energy, takes 25 minutes, and has a deadline tomorrow."*

This explanation is key—it helps you trust the recommendation and take action without second-guessing.

---

## ✨ Features

- **Context-aware recommendations** — Tasks matched to your energy + time
- **Explainable algorithm** — Every recommendation tells you *why*
- **Calm, minimal UI** — No aggressive animations, no guilt
- **Full task management** — Create, edit, delete, complete tasks
- **Energy levels** — Low, Medium, High for each task
- **Time estimates** — Know how long each task takes
- **Optional deadlines** — Urgency factored into scoring
- **Dark mode support** — Easy on the eyes

---

## 🛠 Tech Stack

### Frontend
- **React** (Vite) — Fast, modern build tooling
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling
- **React Router** — Client-side routing

### Backend
- **Node.js** — JavaScript runtime
- **Express** — Web framework
- **MongoDB** (Mongoose) — Document database
- **JWT** — Secure authentication

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally (or MongoDB Atlas account)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd contextual-task-engine
```

### 2. Set up the backend

```bash
cd server
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings:
# MONGODB_URI=mongodb://localhost:27017/contextual-task-engine
# JWT_SECRET=your-super-secret-key-change-this
# JWT_EXPIRES_IN=7d
# PORT=5000
```

### 3. Set up the frontend

```bash
cd ../client
npm install
```

### 4. Start the development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

### 5. Open the app

Navigate to [http://localhost:5173](http://localhost:5173)

---

## 📊 Recommendation Algorithm

The algorithm is **deterministic and explainable**—no AI/ML black boxes.

### Filtering

Tasks are excluded if they:
- Are already completed
- Require more time than you have available
- Require more energy than you currently have

### Scoring

Each eligible task receives a score (0-100) based on:

| Factor | Points | Logic |
|--------|--------|-------|
| **Deadline Proximity** | 0-40 | Overdue = 40, Due today = 38, This week = 24 |
| **Energy Match** | 0-30 | Exact match = 30, Lower energy = 20 |
| **Time Efficiency** | 0-30 | Good fit = 30, Quick task = 25, Tight fit = 15 |

### Output

- **Top recommendation** — Highest scoring task
- **2 alternatives** — Next best options
- **Explanation** — Human-readable "why" for each

---

## 📁 Project Structure

```
contextual-task-engine/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service layer
│   │   ├── context/            # React context (auth)
│   │   └── types/              # TypeScript definitions
│   └── package.json
├── server/                     # Express backend
│   ├── src/
│   │   ├── models/             # Mongoose models
│   │   ├── routes/             # Express routes
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Business logic
│   │   └── middleware/         # Auth middleware
│   └── package.json
└── README.md
```

---

## 🎨 Design Principles

1. **Calm over urgent** — Neutral colors, gentle animations
2. **Clarity over features** — One clear recommendation at a time
3. **Honest over motivational** — No "hustle" language or guilt
4. **Supportive copy** — "Based on what you can handle right now..."

---

## 🔮 Future Roadmap

These are stretch goals, only if the MVP is stable:

- [ ] Task energy auto-suggestions based on keywords
- [ ] "I don't feel like it" skip tracking
- [ ] Weekly insight summary
- [ ] Recurring tasks
- [ ] Calendar integration
- [ ] Mobile app (React Native)

---

## 📝 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all user tasks |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/complete` | Mark complete |
| POST | `/api/tasks/recommend` | Get recommendation |

---

## 🤝 Contributing

This is an MVP focused on simplicity. Before adding features, ask:

1. Does this make the core experience calmer?
2. Does this help users act now (not plan more)?
3. Is this truly necessary for the MVP?

---

## 📄 License

MIT License — Use freely, just don't add guilt-inducing features 🙂

---

Built with ☕ and a calm state of mind.

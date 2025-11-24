# 🃏 Poker Platform with AI Coach

A full-stack poker application featuring real-time multiplayer gameplay and an AI-powered poker coach that analyzes your hands and provides strategic insights.

![Poker Platform](./docs/screenshot.png)

## ✨ Features

- 🎮 **Real-time Multiplayer Poker** - Play Texas Hold'em with other players
- 🤖 **AI Poker Coach** - Get detailed hand analysis powered by GPT-4
- 📊 **Player Statistics** - Track your performance across all games
- 📜 **Hand History** - Review every hand you've played with detailed action logs
- 💬 **Interactive Chat** - Ask the AI coach follow-up questions about specific hands
- 🎨 **Modern UI** - Clean, responsive interface built with React and Tailwind CSS

## 🚀 Quick Start with Docker

The easiest way to run this project is using Docker. No need to manually install PostgreSQL or configure databases!

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [OpenAI API Key](https://platform.openai.com/api-keys) (for AI coach feature)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/poker-platform.git
   cd poker-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Start the application**
   ```bash
   docker-compose up
   ```

   That's it! Docker will:
   - Download and set up PostgreSQL
   - Initialize the database schema
   - Start the backend server
   - Start the frontend React app

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Default Test Account

You can log in with:
- **Username:** `testuser`
- **Email:** `test@example.com`
- **Password:** `password123`

Or create a new account through the registration form.

## 🛠️ Development

### Running Individual Services

If you want to run services separately for development:

```bash
# Start only the database
docker-compose up postgres

# Start only the backend
docker-compose up backend

# Start only the frontend
docker-compose up frontend
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f
```

## 📁 Project Structure

```
poker-platform/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/          # API services
│   └── ...
├── server/                # Backend Node.js application
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── database/         # Database initialization
│   └── ...
├── docker-compose.yml    # Docker services configuration
├── Dockerfile.frontend   # Frontend container setup
└── .env.example         # Environment variables template
```

## 🎯 Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- WebSocket for real-time updates

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- OpenAI GPT-4 integration

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15

## 🤖 AI Poker Coach

The AI coach analyzes your hands and provides:
- Preflop strategy recommendations
- Position-based decision analysis
- Bet sizing evaluation
- Range considerations
- Alternative lines of play
- Specific improvement suggestions

Simply click "AI Analysis" on any hand in your history to get started!

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `user_stats` - Player statistics and performance metrics
- `hands` - Individual poker hands with board cards and pot size
- `hand_participants` - Player involvement in each hand
- `hand_actions` - Detailed action log (bets, raises, folds, etc.)

The schema is automatically initialized when you first run `docker-compose up`.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Reset the database
docker-compose down -v
docker-compose up
```

### Port Already in Use
If ports 3000, 3001, or 5432 are already in use, you can change them in `docker-compose.yml`.

### AI Coach Not Working
Make sure your `OPENAI_API_KEY` is set correctly in the `.env` file and restart the containers:
```bash
docker-compose restart backend
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Fatih** - Frontend, Game Logic, AI Integration
- **George** - Backend, Authentication, Game Mechanics
- **Mark** - Deployment, Infrastructure, Database

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- The poker community for strategic insights
- All contributors and testers

---

**Happy Playing! May the cards be in your favor! 🎰**
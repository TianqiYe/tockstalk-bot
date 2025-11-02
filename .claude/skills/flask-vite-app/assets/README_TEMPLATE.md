# [Project Name]

A lightweight web application built with Flask (Python backend) and Vite (frontend build tool).

## Tech Stack

- **Backend**: Flask (Python) - Lightweight, easy to extend
- **Frontend**: Vite + Vanilla JS/CSS - Fast, no heavy frameworks
- **Future-ready**: Easy to add three.js, databases, authentication

## Project Structure

```
project-name/
├── backend/
│   ├── app.py              # Flask server
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Python virtual environment
├── frontend/
│   ├── index.html         # Main HTML
│   ├── main.js            # JavaScript
│   ├── styles.css         # Styles
│   ├── package.json       # Node dependencies
│   ├── vite.config.js     # Vite configuration
│   └── dist/              # Build output (generated)
└── README.md
```

## Setup Instructions

### Backend Setup

1. **Create and activate virtual environment:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Flask server:**
   ```bash
   python app.py
   ```

   Backend will run on http://localhost:5000

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

   Frontend will run on http://localhost:3000

3. **Build for production:**
   ```bash
   npm run build
   ```

   Builds to `dist/` folder, served by Flask in production

## Development Workflow

1. **Development**: Run both servers simultaneously
   - Terminal 1: `cd backend && source venv/bin/activate && python app.py`
   - Terminal 2: `cd frontend && npm run dev`
   - Access app at http://localhost:3000

2. **Production**: Build frontend, then run Flask
   ```bash
   cd frontend && npm run build
   cd ../backend && source venv/bin/activate && python app.py
   ```
   - Access app at http://localhost:5000

## API Endpoints

- `GET /` - Serve frontend
- `GET /api/health` - Health check
- `GET /api/items` - Get all items
- `POST /api/items` - Create item
- `GET /api/items/<id>` - Get specific item
- `DELETE /api/items/<id>` - Delete item

## Features

[List your app's features here]

## Future Enhancements

- **Three.js**: Add 3D visualizations (`npm install three`)
- **Database**: SQLite for dev, PostgreSQL for production
- **Authentication**: Flask-Login or JWT tokens
- **Real-time**: Flask-SocketIO for WebSockets
- **Styling**: Tailwind CSS, Bootstrap, or custom framework

## License

MIT

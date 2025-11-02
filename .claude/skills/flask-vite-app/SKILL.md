---
name: flask-vite-app
description: This skill should be used when users want to create a lightweight web application using Flask (Python backend) and Vite (frontend build tool). Perfect for beginners to mid-level developers who want a simple, fast, and scalable web stack without heavy frameworks like React or Next.js. Use this when the user asks to "create a web app", "build a simple site", "set up Flask + Vite", or needs a starter template for modern web development with minimal dependencies.
---

# Flask + Vite Web App Builder

Create lightweight, beginner-friendly web applications using Flask (Python) for the backend and Vite for the frontend build process. This stack provides modern development experience without framework complexity.

## Overview

This skill scaffolds a complete web application with:
- Flask backend (Python) - Lightweight API server
- Vite frontend - Fast build tool with hot reload
- Vanilla JS/CSS - No framework bloat
- Production-ready structure
- Easy extensibility (three.js, databases, etc.)

## When to Use This Skill

Use this skill when the user:
- Asks to "create a web app" or "build a website"
- Wants "Flask + Vite" or "lightweight web stack"
- Needs simple API backend with modern frontend
- Prefers Python over Node.js for backend
- Is a beginner to mid-level developer
- Targets low-power devices or budget hosting

## Quick Start Workflow

### Step 1: Create Project Structure

```
project-name/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

### Step 2: Set Up Backend

1. **Copy backend templates** from `assets/backend/`:
   - `app.py` - Flask server with API endpoints
   - `requirements.txt` - Minimal dependencies

2. **Create virtual environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Step 3: Set Up Frontend

1. **Copy frontend templates** from `assets/frontend/`:
   - `package.json` - Vite configuration
   - `vite.config.js` - Build settings

2. **Create user's specific content**:
   - `index.html` - Based on user requirements
   - `main.js` - JavaScript functionality
   - `styles.css` - Styling

3. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

### Step 4: Generate README

Use template from `assets/README_TEMPLATE.md` to create comprehensive setup instructions including:
- Tech stack overview
- Development workflow
- API documentation
- Extension guide

## Development Modes

### Dev Mode (Recommended for active development)
- Run Flask: `python app.py` (port 5000)
- Run Vite: `npm run dev` (port 3000)
- Vite proxies API requests to Flask
- Hot reload enabled

### Simple Mode (No build step)
- Flask serves frontend files directly
- No Vite dev server needed
- Good for simple projects
- Modify `app.py` static_folder to point to frontend/

## Flask Backend Template (`app.py`)

Always include these features:

1. **CORS support** - Enable cross-origin requests
2. **Frontend serving** - Serve static files or built dist/
3. **Health endpoint** - `/api/health` for monitoring
4. **Example CRUD endpoints** - GET/POST/DELETE patterns
5. **Clear comments** - Explain each section
6. **Error handling** - Proper HTTP status codes

Example structure:
```python
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

# API endpoints
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

# User-specific endpoints here...

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

## Vite Configuration (`vite.config.js`)

Always include:

1. **Dev server port** - Default 3000
2. **Network access** - `host: '0.0.0.0'` for remote/IoT access
3. **Proxy configuration** - Forward `/api` to Flask
4. **Build output** - `dist/` directory
5. **Comments** - Explain configuration

Example:
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Allow network access (for remote dev, Raspberry Pi, etc.)
    port: 3000,
    strictPort: false, // Try next port if 3000 is taken
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
```

### Network Access Configuration

When developing on remote machines (Raspberry Pi, cloud VMs, etc.):
- `host: '0.0.0.0'` - Bind to all network interfaces
- Access via: `http://<device-ip>:3000`
- Keep HMR config simple - only add custom WebSocket settings if proxying through nginx/cloudflare

## Extension Guidance

Always document in README how to extend:

**Add three.js** (3D visualizations):
```bash
npm install three
```

**Add database**:
- SQLite for simple projects
- PostgreSQL for production

**Add authentication**:
- Flask-Login for session-based
- JWT for token-based

**Add real-time features**:
- Flask-SocketIO for WebSockets

**Add CSS framework**:
- Tailwind CSS, Bootstrap, or custom

## Best Practices

1. **Minimal dependencies** - Keep it lightweight
2. **Clear documentation** - Comprehensive README
3. **Beginner-friendly** - Comments and examples
4. **Separate dev/prod** - Different configs
5. **Extensible design** - Easy to add features

## Common Use Cases

Ideal for:
- Internal tools and dashboards
- Proof-of-concept applications
- Educational projects
- IoT/embedded web interfaces (Raspberry Pi, etc.)
- API-first applications
- Portfolio projects

## Performance Profile

- Backend RAM: ~20-50MB (Flask)
- Frontend dev: ~100MB (Vite)
- Frontend prod: Negligible (static)
- Build time: <10 seconds
- Suitable for: Low-power devices, shared hosting, edge

## Troubleshooting Common Vite Issues

### Issue: "Outdated Optimize Dep" or stale cache errors
**Solution**: Clear Vite cache and force rebuild
```bash
rm -rf node_modules/.vite
npx vite --force
```

### Issue: 404 on dev server / "Cannot GET /"
**Causes**:
- Missing `index.html` in project root (Vite needs it as entry point)
- Old bundled HTML files interfering with dev server

**Solution**:
1. Ensure `index.html` exists in root directory
2. Remove any old build artifacts: `bundle.html`, `dist/index.html` copies
3. Add to `.gitignore`:
   ```
   *.html
   !index.html
   dist/
   ```

### Issue: WebSocket connection failed / HMR not working
**Solution**: Keep Vite config simple - don't add custom HMR settings unless needed
```javascript
// ❌ DON'T add complex HMR config unless proxying
server: {
  hmr: {
    protocol: 'wss',
    clientPort: 443,
    // ... complex proxy settings
  }
}

// ✅ DO keep it simple
server: {
  host: '0.0.0.0',
  port: 3000,
}
```

### Issue: Can't access from other devices on network
**Solution**: Add `host: '0.0.0.0'` to vite.config.js server options

### Starting fresh after errors
```bash
# Full clean restart
rm -rf node_modules/.vite dist/
npx vite --host --force
```

## Resources

### assets/
Template files used when scaffolding new applications.

**backend/** - Flask server templates
- `app.py` - Complete Flask application with API examples
- `requirements.txt` - Python dependencies

**frontend/** - Vite configuration and templates
- `package.json` - Node dependencies
- `vite.config.js` - Build configuration

**README_TEMPLATE.md** - Documentation template for generated projects

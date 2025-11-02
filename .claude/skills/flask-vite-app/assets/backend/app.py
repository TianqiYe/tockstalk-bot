from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime

# Point to frontend folder (development) or dist folder (production)
# Development: static_folder='../frontend'
# Production: static_folder='../frontend/dist'
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
CORS(app)

# In-memory storage (replace with database later)
# For production, use SQLite, PostgreSQL, or other database
data_store = []

# Serve frontend
@app.route('/')
def serve_frontend():
    """Serve the main HTML file"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (JS, CSS, images, etc.)"""
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # Fall back to index.html for client-side routing
    return send_from_directory(app.static_folder, 'index.html')

# API Endpoints
@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'API is running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/items', methods=['GET'])
def get_items():
    """Get all items"""
    return jsonify({'items': data_store, 'count': len(data_store)})

@app.route('/api/items', methods=['POST'])
def create_item():
    """Create a new item"""
    data = request.get_json()
    item = {
        'id': len(data_store) + 1,
        'data': data,
        'created_at': datetime.now().isoformat()
    }
    data_store.append(item)
    return jsonify({'success': True, 'item': item}), 201

@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Get a specific item"""
    item = next((item for item in data_store if item['id'] == item_id), None)
    if item:
        return jsonify(item)
    return jsonify({'error': 'Item not found'}), 404

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item"""
    global data_store
    data_store = [item for item in data_store if item['id'] != item_id]
    return jsonify({'success': True, 'deleted': item_id})

# Add your custom endpoints here
# Example:
# @app.route('/api/custom')
# def custom_endpoint():
#     return jsonify({'message': 'Custom endpoint'})

if __name__ == '__main__':
    print("=" * 60)
    print("Flask + Vite Application")
    print("=" * 60)
    print("Backend: Flask (Python)")
    print("Frontend: Vite + Vanilla JS")
    print("=" * 60)
    print("API Running on: http://localhost:5000")
    print("Health Check: http://localhost:5000/api/health")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)

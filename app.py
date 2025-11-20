from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "Server is running!", "version": "1.0"})

@app.route('/api/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    if not url.startswith('http://') and not url.startswith('https://'):
        return jsonify({"error": "Invalid URL format"}), 400
    
    try:
        # Run yt-dlp command
        command = ['yt-dlp', '-f', 'best', '-j', url]
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return jsonify({"error": "Could not download this video. Try another URL or platform."}), 400
        
        video_data = json.loads(result.stdout)
        
        # Extract download URL
        download_url = video_data.get('url') or (video_data.get('formats', [{}])[0].get('url') if video_data.get('formats') else None)
        
        if not download_url:
            return jsonify({"error": "Could not extract download link"}), 400
        
        return jsonify({
            "success": True,
            "title": video_data.get('title', 'Video'),
            "url": download_url,
            "duration": video_data.get('duration', 0),
            "thumbnail": video_data.get('thumbnail', None)
        })
    
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Request timed out. Video might be too large."}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "Error processing video data"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)

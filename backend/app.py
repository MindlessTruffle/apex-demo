"""Simple Flask backend for apex-demo

Routes:
- POST /api/generate_key -> returns JSON { key: <random_key> }

Run:
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt
  python backend/app.py

This listens on localhost:5000 and enables CORS so the frontend can call it during development.
"""
from flask import Flask, jsonify, request, session
from flask_cors import CORS
import secrets
import os
import json
import threading

app = Flask(__name__)
# Secret key used to sign the session cookie for demo purposes only
app.secret_key = secrets.token_urlsafe(16)
# Enable CORS for development (restrict origins in production)
CORS(app)

DATA_STORE = {}
STORE_PATH = os.path.join(os.path.dirname(__file__), 'data_store.json')
_store_lock = threading.Lock()


def load_store():
    if not os.path.exists(STORE_PATH):
        return {}
    try:
        with open(STORE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_store(store):
    tmp = STORE_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(store, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STORE_PATH)


with _store_lock:
    DATA_STORE = load_store()
# DATA_STORE = {}


@app.route('/api/generate_key', methods=['POST'])
def generate_key():
  """Generate or return an API key tied to a project for this session.

  Expected JSON body: { "project": "project-name" }
  If a key already exists for the project in the user's session, return it.
  Otherwise generate one, store it in the session and return it.
  """
  body = request.get_json(silent=True) or {}
  project = body.get('project') or 'default'

  # Keep a simple mapping in the session: { projectName: key }
  project_keys = session.get('project_keys', {})
  if project in project_keys:
    key = project_keys[project]
  else:
    key = secrets.token_urlsafe(16)
    project_keys[project] = key
    session['project_keys'] = project_keys
    # Ensure server-side store is initialized so anyone with the key can use it
    with _store_lock:
      DATA_STORE.setdefault(key, [])
      save_store(DATA_STORE)

  return jsonify({'key': key})


@app.route('/api/sum_digits', methods=['POST'])
def sum_digits():
  """Return the sum of all numeric digits found in the provided key.

  Expected JSON body: { "key": "..." }
  Response: { "sum": <int> }
  """
  body = request.get_json(silent=True) or {}
  key = body.get('key', '')
  total = sum(int(ch) for ch in key if ch.isdigit())
  return jsonify({'sum': total})


def _get_key_from_auth():
  auth = request.headers.get('Authorization', '')
  if not auth:
    return None
  parts = auth.split()
  if len(parts) == 2 and parts[0].lower() == 'bearer':
    return parts[1]
  return None


@app.route('/api/submit_sentence', methods=['POST'])
def submit_sentence():
  """Store a sentence under the API key provided in the Authorization Bearer header.

  Body: { "sentence": "..." }
  Header: Authorization: Bearer <api_key>
  """
  key = _get_key_from_auth()
  if not key:
    return jsonify({'error': 'Missing Authorization Bearer token'}), 401

  if key not in DATA_STORE:
    return jsonify({'error': 'Invalid API key'}), 403

  body = request.get_json(silent=True) or {}
  sentence = body.get('sentence', '')
  if not isinstance(sentence, str) or not sentence.strip():
    return jsonify({'error': 'Sentence is required'}), 400
  sentence = sentence.strip()
  if len(sentence) > 1000:
    return jsonify({'error': 'Sentence too long'}), 400

  entry = {'sentence': sentence, 'ts': int(__import__('time').time())}
  with _store_lock:
    DATA_STORE.setdefault(key, []).append(entry)
    try:
      save_store(DATA_STORE)
    except Exception:
      # If saving fails, still return success but log server-side
      app.logger.exception('Failed to save DATA_STORE')
  return jsonify({'ok': True, 'entry': entry}), 201


@app.route('/api/sentences', methods=['GET'])
def get_sentences():
  """Return the list of sentences stored for the provided API key.

  Header: Authorization: Bearer <api_key>
  """
  key = _get_key_from_auth()
  if not key:
    return jsonify({'error': 'Missing Authorization Bearer token'}), 401
  if key not in DATA_STORE:
    return jsonify({'error': 'Invalid API key'}), 403
  with _store_lock:
    return jsonify({'sentences': DATA_STORE.get(key, [])})


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)

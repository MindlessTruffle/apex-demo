"""Simple Flask backend for apex-demo

Routes:
- POST /api/generate_key -> returns JSON { key: <random_key> }

Run:
  python -m venv .venv
  .venv\Scripts\Activate.ps1; pip install -r requirements.txt
  python backend/app.py

This listens on localhost:5000 and enables CORS so the frontend can call it during development.
"""
from flask import Flask, jsonify, request, session
from flask_cors import CORS
import secrets
import os
import json
import threading
import time

# Helper: make objects JSON serializable (convert numpy/torch types, arrays, etc.)
def _make_json_serializable(obj):
  # Local imports to avoid adding hard deps at module import time
  try:
    import numpy as _np
  except Exception:
    _np = None
  try:
    import torch as _torch
  except Exception:
    _torch = None

  # Primitive types
  if obj is None:
    return None
  if isinstance(obj, (str, int, float, bool)):
    return obj

  # numpy scalar
  if _np is not None and isinstance(obj, _np.generic):
    try:
      return obj.item()
    except Exception:
      return str(obj)

  # numpy array
  if _np is not None and isinstance(obj, _np.ndarray):
    try:
      return obj.tolist()
    except Exception:
      return [ _make_json_serializable(x) for x in obj ]

  # torch tensor
  if _torch is not None and isinstance(obj, _torch.Tensor):
    try:
      return obj.detach().cpu().numpy().tolist()
    except Exception:
      try:
        return obj.tolist()
      except Exception:
        return str(obj)

  # dict / list / tuple
  if isinstance(obj, dict):
    return { str(k): _make_json_serializable(v) for k,v in obj.items() }
  if isinstance(obj, (list, tuple)):
    return [ _make_json_serializable(v) for v in obj ]

  # Fallback: try to convert via tolist() if present
  if hasattr(obj, 'tolist') and not isinstance(obj, (str, bytes)):
    try:
      return obj.tolist()
    except Exception:
      pass

  # As a last resort return string representation
  try:
    return str(obj)
  except Exception:
    return None

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
  # Deprecated: endpoint replaced by /api/run_inference. Keep for compatibility returning 410.
  return jsonify({'error': 'submit_sentence deprecated, use /api/run_inference'}), 410


@app.route('/api/sentences', methods=['GET'])
def get_sentences():
  """Return the list of sentences stored for the provided API key.

  Header: Authorization: Bearer <api_key>
  """
  # Deprecated: use /api/results to retrieve inference results.
  return jsonify({'error': 'sentences endpoint deprecated, use /api/results'}), 410


@app.route('/api/run_inference', methods=['POST'])
def run_inference():
  """Run the predator detection algorithm on submitted chat data and store the result under the API key.

  Body should include either a `messages` array or be the messages array itself.
  Header: Authorization: Bearer <api_key>
  """
  key = _get_key_from_auth()
  if not key:
    return jsonify({'error': 'Missing Authorization Bearer token'}), 401

  if key not in DATA_STORE:
    return jsonify({'error': 'Invalid API key'}), 403

  body = request.get_json(silent=True)
  if body is None:
    return jsonify({'error': 'JSON body required'}), 400

  # Accept { messages: [...] } or { chat_data: [...] } or raw array
  chat_data = None
  if isinstance(body, list):
    chat_data = body
  else:
    chat_data = body.get('messages') or body.get('chat_data') or body.get('conversation')

  if not chat_data or not isinstance(chat_data, list):
    return jsonify({'error': 'Invalid chat data. Expecting a list of message objects under `messages` or raw array.'}), 400

  # Normalize incoming messages to the format expected by algorithm.runInference
  def _normalize_messages(msgs):
    norm = []
    for i, m in enumerate(msgs):
      # m may be a dict with various keys: prefer 'text', then 'content'
      text = None
      if isinstance(m, dict):
        text = m.get('text') or m.get('content') or m.get('message') or m.get('body')
        author = m.get('author') or m.get('user') or m.get('sender') or m.get('role')
        time_str = m.get('time')
      else:
        # not a dict, coerce to string
        text = str(m)
        author = None
        time_str = None

      if not author:
        # map common roles to simple author labels
        if isinstance(m, dict) and m.get('role'):
          author = m.get('role')
        else:
          author = f'user_{i%4}'

      if not time_str:
        # synthesize an increasing time string (HH:MM) starting at 00:00
        mins = i
        hh = mins // 60
        mm = mins % 60
        time_str = f"{hh:02d}:{mm:02d}"

      norm.append({'author': author, 'time': time_str, 'text': text or ''})
    return norm

  try:
    from algorithm import runInference
    normalized = _normalize_messages(chat_data)
    result = runInference(normalized)
  except Exception as e:
    app.logger.exception('Inference failed')
    return jsonify({'error': 'inference_failed', 'detail': str(e)}), 500

  # Sanitize result so it can be JSON serialized (numpy/scalars, tensors, etc.)
  try:
    sanitized = _make_json_serializable(result)
  except Exception:
    app.logger.exception('Failed to sanitize inference result')
    sanitized = str(result)

  entry = {'result': sanitized, 'ts': int(time.time())}
  with _store_lock:
    DATA_STORE.setdefault(key, []).append(entry)
    try:
      save_store(DATA_STORE)
    except Exception:
      app.logger.exception('Failed to save DATA_STORE')

  return jsonify({'ok': True, 'entry': entry}), 201


@app.route('/api/results', methods=['GET'])
def get_results():
  """Return stored inference results for the provided API key."""
  key = _get_key_from_auth()
  if not key:
    return jsonify({'error': 'Missing Authorization Bearer token'}), 401
  if key not in DATA_STORE:
    return jsonify({'error': 'Invalid API key'}), 403
  with _store_lock:
    return jsonify({'results': DATA_STORE.get(key, [])})


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)

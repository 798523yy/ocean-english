import json
import os
import random
import time
from datetime import datetime, date
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

# In-memory verification codes (phone -> {code, expiry})
verify_codes = {}

LEVELS = [
    {'min': 0, 'title': '探险新手', 'title_en': 'Explorer Newbie', 'emoji': '🐠'},
    {'min': 5, 'title': '见习水手', 'title_en': 'Junior Sailor', 'emoji': '⚓'},
    {'min': 12, 'title': '海洋探险家', 'title_en': 'Ocean Explorer', 'emoji': '🐬'},
    {'min': 22, 'title': '深海冒险家', 'title_en': 'Deep Sea Adventurer', 'emoji': '🦈'},
    {'min': 35, 'title': '海洋大师', 'title_en': 'Ocean Master', 'emoji': '🐋'},
    {'min': 50, 'title': '海洋传说', 'title_en': 'Ocean Legend', 'emoji': '🧜'},
]


def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return {'users': {}} if 'users' in filename else {}
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(filename, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_user(uid):
    users = load_json('users.json')
    return users['users'].get(uid)


def save_user(uid, user_data):
    users = load_json('users.json')
    users['users'][uid] = user_data
    save_json('users.json', users)


def create_new_user(uid, name):
    return {
        'id': uid,
        'phone': uid if uid != 'default' else '',
        'name': name,
        'shells': 100,
        'pearls': 3,
        'creatures': [],
        'aquarium_layout': [],
        'streak': 0,
        'last_checkin': None,
        'today_tasks': {},
        'total_tasks_completed': 0,
        'created_at': datetime.now().isoformat()
    }


def get_level_info(total_tasks):
    info = LEVELS[0]
    for lv in LEVELS:
        if total_tasks >= lv['min']:
            info = lv
    return info


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


# === Auth ===

@app.route('/api/auth/send-code', methods=['POST'])
def api_send_code():
    data = request.json
    phone = data.get('phone', '').strip()
    if not phone or len(phone) != 11 or not phone.isdigit():
        return jsonify({'error': '请输入正确的11位手机号'}), 400

    code = str(random.randint(100000, 999999))
    verify_codes[phone] = {
        'code': code,
        'expiry': time.time() + 300
    }
    # In production, send SMS here. For demo, return code in response.
    print(f"[DEMO] Verification code for {phone}: {code}")
    return jsonify({'success': True, 'demo_code': code})


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json
    phone = data.get('phone', '').strip()
    code = data.get('code', '').strip()

    if not phone or not code:
        return jsonify({'error': '手机号和验证码不能为空'}), 400

    stored = verify_codes.get(phone)
    if not stored:
        return jsonify({'error': '请先获取验证码'}), 400
    if time.time() > stored['expiry']:
        verify_codes.pop(phone, None)
        return jsonify({'error': '验证码已过期，请重新获取'}), 400
    if code != stored['code']:
        return jsonify({'error': '验证码错误'}), 400

    verify_codes.pop(phone, None)

    user = get_user(phone)
    if not user:
        user = create_new_user(phone, '探险家')
        save_user(phone, user)

    level = get_level_info(user.get('total_tasks_completed', 0))
    return jsonify({
        'success': True,
        'user': user,
        'level': level
    })


# === User ===

@app.route('/api/user', methods=['GET'])
def api_get_user():
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    if not user:
        user = create_new_user(uid, '探险家')
        save_user(uid, user)
    level = get_level_info(user.get('total_tasks_completed', 0))
    return jsonify({'user': user, 'level': level})


@app.route('/api/user', methods=['POST'])
def api_update_user():
    data = request.json
    uid = data.get('uid', 'default')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if 'name' in data:
        user['name'] = data['name']
    save_user(uid, user)
    return jsonify(user)


# === Tasks ===

@app.route('/api/tasks', methods=['GET'])
def api_get_tasks():
    tasks_data = load_json('tasks.json')
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    if not user:
        user = create_new_user(uid, '探险家')
        save_user(uid, user)
    completed = user.get('today_tasks', {})
    return jsonify({
        'tasks': tasks_data['tasks'],
        'completed': completed
    })


@app.route('/api/task/complete', methods=['POST'])
def api_complete_task():
    data = request.json
    uid = data.get('uid', 'default')
    task_id = data.get('task_id')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    tasks_data = load_json('tasks.json')
    task = next((t for t in tasks_data['tasks'] if t['id'] == task_id), None)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    if 'today_tasks' not in user:
        user['today_tasks'] = {}
    if task_id in user['today_tasks']:
        return jsonify({'error': 'Task already completed today', 'already_completed': True}), 400

    user['today_tasks'][task_id] = datetime.now().isoformat()
    user['shells'] = user.get('shells', 0) + task.get('reward_shells', 0)
    user['pearls'] = user.get('pearls', 0) + task.get('reward_pearls', 0)
    user['total_tasks_completed'] = user.get('total_tasks_completed', 0) + 1

    save_user(uid, user)
    level = get_level_info(user.get('total_tasks_completed', 0))
    return jsonify({
        'success': True,
        'reward': {
            'shells': task.get('reward_shells', 0),
            'pearls': task.get('reward_pearls', 0)
        },
        'user': user,
        'level': level
    })


# === Checkin ===

@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    data = request.json
    uid = data.get('uid', 'default')
    user = get_user(uid)
    if not user:
        user = create_new_user(uid, '探险家')
        save_user(uid, user)

    today = date.today().isoformat()
    if user.get('last_checkin') == today:
        return jsonify({'error': 'Already checked in today', 'already_checked_in': True}), 400

    yesterday = date.today()
    try:
        last_date = date.fromisoformat(user.get('last_checkin', '')) if user.get('last_checkin') else None
        if last_date:
            diff = (yesterday - last_date).days
            if diff == 1:
                user['streak'] = user.get('streak', 0) + 1
            elif diff > 1:
                user['streak'] = 1
            else:
                user['streak'] = user.get('streak', 0)
        else:
            user['streak'] = 1
    except (ValueError, TypeError):
        user['streak'] = 1

    user['last_checkin'] = today
    bonus_pearls = 1 if user['streak'] % 7 == 0 else 0
    bonus_shells = 10 + (user['streak'] * 2)
    user['shells'] = user.get('shells', 0) + bonus_shells
    user['pearls'] = user.get('pearls', 0) + bonus_pearls

    if 'today_tasks' not in user:
        user['today_tasks'] = {}
    user['today_tasks']['checkin'] = datetime.now().isoformat()

    save_user(uid, user)
    level = get_level_info(user.get('total_tasks_completed', 0))
    return jsonify({
        'success': True,
        'streak': user['streak'],
        'reward': {'shells': bonus_shells, 'pearls': bonus_pearls},
        'is_weekly_bonus': bonus_pearls > 0,
        'user': user,
        'level': level
    })


# === Blindbox ===

@app.route('/api/blindbox/open', methods=['POST'])
def api_open_blindbox():
    data = request.json
    uid = data.get('uid', 'default')
    box_type = data.get('box_type', 'normal')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    box_config = {
        'normal': {'cost_shells': 50, 'cost_pearls': 0, 'weights': [60, 25, 10, 5]},
        'rare': {'cost_shells': 200, 'cost_pearls': 0, 'weights': [10, 50, 30, 10]},
        'legendary': {'cost_shells': 0, 'cost_pearls': 5, 'weights': [0, 0, 60, 40]}
    }
    config = box_config.get(box_type)
    if not config:
        return jsonify({'error': 'Invalid box type'}), 400

    if config['cost_shells'] > user.get('shells', 0):
        return jsonify({'error': '贝壳不足'}), 400
    if config['cost_pearls'] > user.get('pearls', 0):
        return jsonify({'error': '珍珠不足'}), 400

    user['shells'] -= config['cost_shells']
    user['pearls'] -= config['cost_pearls']

    creatures_data = load_json('creatures.json')
    rarities = ['common', 'rare', 'epic', 'legendary']
    rarity = random.choices(rarities, weights=config['weights'], k=1)[0]
    pool = [c for c in creatures_data['creatures'] if c['rarity'] == rarity]
    creature = random.choice(pool)

    is_duplicate = creature['id'] in user.get('creatures', [])
    if not is_duplicate:
        user.setdefault('creatures', []).append(creature['id'])
        if 'aquarium_layout' not in user:
            user['aquarium_layout'] = []
        user['aquarium_layout'].append({
            'creature_id': creature['id'],
            'x': random.randint(10, 80),
            'y': random.randint(10, 70)
        })
    else:
        dup_shells = {'common': 15, 'rare': 40, 'epic': 80, 'legendary': 150}.get(rarity, 10)
        user['shells'] += dup_shells

    save_user(uid, user)
    return jsonify({
        'success': True,
        'creature': creature,
        'is_duplicate': is_duplicate,
        'duplicate_reward': dup_shells if is_duplicate else 0,
        'user': user
    })


# === Aquarium ===

@app.route('/api/aquarium', methods=['GET'])
def api_get_aquarium():
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    if not user:
        user = create_new_user(uid, '探险家')
        save_user(uid, user)

    creatures_data = load_json('creatures.json')
    user_creatures = []
    for cid in user.get('creatures', []):
        c = next((x for x in creatures_data['creatures'] if x['id'] == cid), None)
        if c:
            user_creatures.append(c)

    return jsonify({
        'creatures': user_creatures,
        'layout': user.get('aquarium_layout', []),
        'total_collected': len(user.get('creatures', [])),
        'total_all': len(creatures_data['creatures'])
    })


@app.route('/api/aquarium/layout', methods=['POST'])
def api_save_layout():
    data = request.json
    uid = data.get('uid', 'default')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user['aquarium_layout'] = data.get('layout', [])
    save_user(uid, user)
    return jsonify({'success': True})


@app.route('/api/creatures', methods=['GET'])
def api_get_creatures():
    creatures_data = load_json('creatures.json')
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    owned = set(user.get('creatures', [])) if user else set()
    result = []
    for c in creatures_data['creatures']:
        result.append({**c, 'owned': c['id'] in owned})
    return jsonify({'creatures': result, 'total': len(result), 'owned_count': len(owned)})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

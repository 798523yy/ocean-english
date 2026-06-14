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
        'avatar': '🐠',
        'shells': 100,
        'pearls': 3,
        'creatures': [],
        'aquarium_layout': [],
        'streak': 0,
        'last_checkin': None,
        'today_tasks': {},
        'total_tasks_completed': 0,
        'created_at': datetime.now().isoformat(),
        'friends': [],
        'incoming_requests': [],
        'outgoing_requests': []
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
    if 'avatar' in data:
        user['avatar'] = data['avatar']
    save_user(uid, user)
    return jsonify(user)


@app.route('/api/user/profile', methods=['POST'])
def api_update_profile():
    """Update user profile: name and/or avatar"""
    data = request.json
    uid = data.get('uid', 'default')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    changed = False
    new_name = data.get('name', '').strip()
    new_avatar = data.get('avatar', '').strip()

    if new_name and len(new_name) > 0 and len(new_name) <= 20:
        user['name'] = new_name
        changed = True
    elif new_name and len(new_name) > 20:
        return jsonify({'error': '名字不能超过20个字符'}), 400

    if new_avatar and len(new_avatar) > 0 and len(new_avatar) <= 4:
        user['avatar'] = new_avatar
        changed = True
    elif new_avatar and len(new_avatar) > 4:
        return jsonify({'error': '头像格式不正确'}), 400

    if not changed:
        return jsonify({'error': '没有要更新的内容'}), 400

    save_user(uid, user)
    level = get_level_info(user.get('total_tasks_completed', 0))
    return jsonify({'user': user, 'level': level})


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


# === Events ===

def get_active_event():
    """检测当前是否有节日活动"""
    today = date.today()
    events = [
        # (start_month, start_day, end_month, end_day, name, emoji, legend_bonus)
        (1, 1, 1, 3, '元旦', '🎉', True),       # New Year
        (2, 10, 2, 15, '春节', '🧧', True),      # Chinese New Year (approx)
        (5, 31, 6, 2, '儿童节', '🎈', False),     # Children's Day
        (6, 7, 6, 9, '世界海洋日', '🌊', True),   # World Ocean Day
        (9, 10, 9, 12, '中秋节', '🥮', True),     # Mid-Autumn (approx)
        (10, 1, 10, 7, '国庆节', '🇨🇳', True),    # National Day
        (10, 28, 11, 1, '万圣节', '🎃', False),   # Halloween
        (12, 24, 12, 26, '圣诞节', '🎄', True),    # Christmas
    ]
    for sm, sd, em, ed, name, emoji, legend_bonus in events:
        start = date(today.year, sm, sd)
        end = date(today.year, em, ed)
        if start <= today <= end:
            return {
                'active': True,
                'name': name,
                'emoji': emoji,
                'legendary_bonus': legend_bonus,
                'end_date': end.isoformat()
            }
    return {'active': False}


@app.route('/api/event', methods=['GET'])
def api_get_event():
    return jsonify(get_active_event())


# === Blindbox ===

@app.route('/api/blindbox/open', methods=['POST'])
def api_open_blindbox():
    data = request.json
    uid = data.get('uid', 'default')
    box_type = data.get('box_type', 'normal')
    force_creature_id = data.get('force_creature_id')  # 大转盘指定的具体生物
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    event = get_active_event()
    legend_boost = event['active'] and event.get('legendary_bonus')

    box_config = {
        'normal': {'cost_shells': 50, 'cost_pearls': 0, 'weights': [60, 25, 10, 5]},
        'rare': {'cost_shells': 200, 'cost_pearls': 0, 'weights': [10, 50, 30, 10]},
        'legendary': {
            'cost_shells': 0, 'cost_pearls': 5,
            'weights': [0, 0, 40, 60] if legend_boost else [0, 0, 60, 40]
        }
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

    # 大转盘指定具体生物（抽中什么得什么）
    if force_creature_id:
        creature = next((c for c in creatures_data['creatures'] if c['id'] == force_creature_id), None)
        if not creature:
            return jsonify({'error': 'Creature not found'}), 404
    else:
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
        dup_shells = 50  # 已有生物统一补偿50贝壳
        user['shells'] += dup_shells

    save_user(uid, user)
    return jsonify({
        'success': True,
        'creature': creature,
        'is_duplicate': is_duplicate,
        'duplicate_reward': dup_shells if is_duplicate else 0,
        'user': user
    })


# === Spin Reward (大转盘贝壳/珍珠奖励) ===

@app.route('/api/blindbox/spin-reward', methods=['POST'])
def api_spin_reward():
    data = request.json
    uid = data.get('uid', 'default')
    box_type = data.get('box_type', 'normal')
    reward_type = data.get('reward_type', 'shells')  # 'shells' or 'pearls'
    amount = data.get('amount', 0)
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    box_config = {
        'normal': {'cost_shells': 50, 'cost_pearls': 0},
        'rare': {'cost_shells': 200, 'cost_pearls': 0},
        'legendary': {'cost_shells': 0, 'cost_pearls': 5}
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

    if reward_type == 'shells':
        user['shells'] = user.get('shells', 0) + amount
    elif reward_type == 'pearls':
        user['pearls'] = user.get('pearls', 0) + amount

    save_user(uid, user)
    return jsonify({
        'success': True,
        'reward_type': reward_type,
        'amount': amount,
        'user': user
    })


# === Redeem Code ===

REDEEM_CODES = {
    '0923': {
        'type': 'cheat',
        'shells': 999999,
        'pearls': 9999,
        'description': '🎮 作弊码：无限资源',
        'used': set()  # 已使用的uid集合（作弊码可无限次使用）
    }
}


@app.route('/api/redeem', methods=['POST'])
def api_redeem():
    data = request.json
    uid = data.get('uid', 'default')
    code = data.get('code', '').strip()
    user = get_user(uid)
    if not user:
        user = create_new_user(uid, '探险家')
        save_user(uid, user)

    if not code:
        return jsonify({'error': '请输入兑换码'}), 400

    code_info = REDEEM_CODES.get(code)
    if not code_info:
        return jsonify({'error': '兑换码无效'}), 400

    if code_info['type'] != 'cheat' and uid in code_info.get('used', set()):
        return jsonify({'error': '该兑换码已被使用'}), 400

    # Award
    shells = code_info.get('shells', 0)
    pearls = code_info.get('pearls', 0)
    user['shells'] = user.get('shells', 0) + shells
    user['pearls'] = user.get('pearls', 0) + pearls

    if code_info['type'] != 'cheat':
        code_info.setdefault('used', set()).add(uid)

    save_user(uid, user)

    return jsonify({
        'success': True,
        'message': code_info.get('description', '兑换成功！'),
        'reward': {'shells': shells, 'pearls': pearls},
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


# === Friend System ===

@app.route('/api/friend/search', methods=['POST'])
def api_friend_search():
    data = request.json
    uid = data.get('uid', 'default')
    keyword = data.get('keyword', '').strip().lower()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not keyword or len(keyword) < 1:
        return jsonify({'results': []})

    users = load_json('users.json')
    results = []
    friends = set(user.get('friends', []))
    incoming = {r['from'] for r in user.get('incoming_requests', [])}
    outgoing = {r['to'] for r in user.get('outgoing_requests', [])}

    for other_uid, other in users['users'].items():
        if other_uid == uid:
            continue
        if keyword in other_uid.lower() or keyword in other.get('name', '').lower():
            level = get_level_info(other.get('total_tasks_completed', 0))
            if other_uid in friends:
                relation = 'friend'
            elif other_uid in incoming:
                relation = 'incoming_request'
            elif other_uid in outgoing:
                relation = 'outgoing_request'
            else:
                relation = 'none'
            results.append({
                'id': other_uid,
                'name': other.get('name', ''),
                'avatar': other.get('avatar', '🐠'),
                'creature_count': len(other.get('creatures', [])),
                'shells': other.get('shells', 0),
                'streak': other.get('streak', 0),
                'level': level,
                'relation': relation
            })
        if len(results) >= 20:
            break

    return jsonify({'results': results})


@app.route('/api/friend/request', methods=['POST'])
def api_friend_request():
    data = request.json
    uid = data.get('uid', 'default')
    target_uid = data.get('target_uid', '').strip()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if target_uid == uid:
        return jsonify({'error': '不能添加自己为好友'}), 400

    target = get_user(target_uid)
    if not target:
        return jsonify({'error': '目标用户不存在'}), 404

    if target_uid in user.get('friends', []):
        return jsonify({'error': '已经是好友了'}), 400

    if len(user.get('friends', [])) >= 50:
        return jsonify({'error': '你的好友已达上限(50)'}), 400
    if len(target.get('friends', [])) >= 50:
        return jsonify({'error': '对方好友已达上限(50)'}), 400

    existing_incoming = [r for r in user.get('incoming_requests', []) if r['from'] == target_uid]
    if existing_incoming:
        return jsonify({'error': '对方已向你发送了好友请求，请直接接受'}), 400

    existing_outgoing = [r for r in user.get('outgoing_requests', []) if r['to'] == target_uid]
    if existing_outgoing:
        return jsonify({'error': '你已向对方发送过请求'}), 400

    now = datetime.now().isoformat()
    user.setdefault('outgoing_requests', []).append({'to': target_uid, 'timestamp': now})
    target.setdefault('incoming_requests', []).append({'from': uid, 'timestamp': now})

    save_user(uid, user)
    save_user(target_uid, target)
    return jsonify({'success': True})


@app.route('/api/friend/accept', methods=['POST'])
def api_friend_accept():
    data = request.json
    uid = data.get('uid', 'default')
    requester_uid = data.get('requester_uid', '').strip()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    requester = get_user(requester_uid)
    if not requester:
        return jsonify({'error': '请求者不存在'}), 404

    # 验证请求存在
    req_match = [r for r in user.get('incoming_requests', []) if r['from'] == requester_uid]
    if not req_match:
        return jsonify({'error': '没有找到该好友请求'}), 400

    if len(user.get('friends', [])) >= 50:
        return jsonify({'error': '你的好友已达上限(50)'}), 400
    if len(requester.get('friends', [])) >= 50:
        return jsonify({'error': '对方好友已达上限(50)'}), 400

    # 互相加好友
    user.setdefault('friends', []).append(requester_uid)
    requester.setdefault('friends', []).append(uid)

    # 清理请求
    user['incoming_requests'] = [r for r in user.get('incoming_requests', []) if r['from'] != requester_uid]
    requester['outgoing_requests'] = [r for r in requester.get('outgoing_requests', []) if r['to'] != uid]

    save_user(uid, user)
    save_user(requester_uid, requester)
    return jsonify({'success': True})


@app.route('/api/friend/reject', methods=['POST'])
def api_friend_reject():
    data = request.json
    uid = data.get('uid', 'default')
    requester_uid = data.get('requester_uid', '').strip()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    requester = get_user(requester_uid)
    if not requester:
        return jsonify({'error': '请求者不存在'}), 404

    user['incoming_requests'] = [r for r in user.get('incoming_requests', []) if r['from'] != requester_uid]
    requester['outgoing_requests'] = [r for r in requester.get('outgoing_requests', []) if r['to'] != uid]

    save_user(uid, user)
    save_user(requester_uid, requester)
    return jsonify({'success': True})


@app.route('/api/friend/cancel', methods=['POST'])
def api_friend_cancel():
    data = request.json
    uid = data.get('uid', 'default')
    target_uid = data.get('target_uid', '').strip()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    target = get_user(target_uid)
    if not target:
        return jsonify({'error': '目标用户不存在'}), 404

    user['outgoing_requests'] = [r for r in user.get('outgoing_requests', []) if r['to'] != target_uid]
    target['incoming_requests'] = [r for r in target.get('incoming_requests', []) if r['from'] != uid]

    save_user(uid, user)
    save_user(target_uid, target)
    return jsonify({'success': True})


@app.route('/api/friend/remove', methods=['POST'])
def api_friend_remove():
    data = request.json
    uid = data.get('uid', 'default')
    friend_uid = data.get('friend_uid', '').strip()
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    friend = get_user(friend_uid)
    if not friend:
        return jsonify({'error': '好友不存在'}), 404

    user['friends'] = [f for f in user.get('friends', []) if f != friend_uid]
    friend['friends'] = [f for f in friend.get('friends', []) if f != uid]

    save_user(uid, user)
    save_user(friend_uid, friend)
    return jsonify({'success': True})


@app.route('/api/friend/list', methods=['GET'])
def api_friend_list():
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    users = load_json('users.json')
    result = []
    for fuid in user.get('friends', []):
        fuser = users['users'].get(fuid)
        if fuser:
            level = get_level_info(fuser.get('total_tasks_completed', 0))
            result.append({
                'id': fuid,
                'name': fuser.get('name', ''),
                'avatar': fuser.get('avatar', '🐠'),
                'creature_count': len(fuser.get('creatures', [])),
                'shells': fuser.get('shells', 0),
                'streak': fuser.get('streak', 0),
                'total_tasks': fuser.get('total_tasks_completed', 0),
                'level': level
            })
    return jsonify({'friends': result, 'count': len(result)})


@app.route('/api/friend/requests', methods=['GET'])
def api_friend_requests():
    uid = request.args.get('uid', 'default')
    user = get_user(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    users = load_json('users.json')
    incoming = []
    for r in user.get('incoming_requests', []):
        fuser = users['users'].get(r['from'])
        if fuser:
            level = get_level_info(fuser.get('total_tasks_completed', 0))
            incoming.append({
                'from': r['from'],
                'name': fuser.get('name', ''),
                'avatar': fuser.get('avatar', '🐠'),
                'creature_count': len(fuser.get('creatures', [])),
                'level': level,
                'timestamp': r.get('timestamp', '')
            })

    outgoing = []
    for r in user.get('outgoing_requests', []):
        fuser = users['users'].get(r['to'])
        if fuser:
            outgoing.append({
                'to': r['to'],
                'name': fuser.get('name', ''),
                'timestamp': r.get('timestamp', '')
            })

    return jsonify({'incoming': incoming, 'outgoing': outgoing})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(debug=debug, host='0.0.0.0', port=port)

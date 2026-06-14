const API = {
    base: '/api',
    uid: 'default',

    async request(method, path, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(`${this.base}${path}`, opts);
        const data = await resp.json();
        if (!resp.ok) throw data;
        return data;
    },

    async getUser() {
        return this.request('GET', `/user?uid=${this.uid}`);
    },

    async updateUser(updates) {
        return this.request('POST', '/user', { uid: this.uid, ...updates });
    },

    async getTasks() {
        return this.request('GET', `/tasks?uid=${this.uid}`);
    },

    async completeTask(taskId) {
        return this.request('POST', '/task/complete', { uid: this.uid, task_id: taskId });
    },

    async checkin() {
        return this.request('POST', '/checkin', { uid: this.uid });
    },

    async openBlindbox(boxType) {
        return this.request('POST', '/blindbox/open', { uid: this.uid, box_type: boxType });
    },

    async getAquarium() {
        return this.request('GET', `/aquarium?uid=${this.uid}`);
    },

    async saveLayout(layout) {
        return this.request('POST', '/aquarium/layout', { uid: this.uid, layout });
    },

    async getCreatures() {
        return this.request('GET', `/creatures?uid=${this.uid}`);
    },

    // === Friend ===

    async friendSearch(keyword) {
        return this.request('POST', '/friend/search', { uid: this.uid, keyword });
    },

    async friendSendRequest(targetUid) {
        return this.request('POST', '/friend/request', { uid: this.uid, target_uid: targetUid });
    },

    async friendAcceptRequest(requesterUid) {
        return this.request('POST', '/friend/accept', { uid: this.uid, requester_uid: requesterUid });
    },

    async friendRejectRequest(requesterUid) {
        return this.request('POST', '/friend/reject', { uid: this.uid, requester_uid: requesterUid });
    },

    async friendCancelRequest(targetUid) {
        return this.request('POST', '/friend/cancel', { uid: this.uid, target_uid: targetUid });
    },

    async friendRemoveFriend(friendUid) {
        return this.request('POST', '/friend/remove', { uid: this.uid, friend_uid: friendUid });
    },

    async getFriendList() {
        return this.request('GET', `/friend/list?uid=${this.uid}`);
    },

    async getFriendRequests() {
        return this.request('GET', `/friend/requests?uid=${this.uid}`);
    },

    async updateProfile(name, avatar) {
        return this.request('POST', '/user/profile', { uid: this.uid, name, avatar });
    }
};

let socket;
let currentUser = null;
let currentChat = null; 
let serverUrl = localStorage.getItem('serverUrl') || '';
let sidebarChats = []; 
let localStream = null;
let currentPeer = null;
let incomingCallData = null;
let editingMessageId = null;
let selectedMessageId = null;
let currentGroupDetails = null;

// Call settings
let currentAudioDevice = null;
let currentVideoDevice = null;
let isScreenSharing = false;

const EC = elliptic.ec;
const ec = new EC('secp256k1');
let myKeyPair = null;
let sharedKeys = {};

const emojiData = {
    "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
    "Body": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸"],
    "Love": ["❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️"],
    "Objects": ["💣","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪒","🧽","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🛍","🛍️","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","📇","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"],
    "18+": ["🍆","🍑","🍌","🍒","🌮","🍩","🌭","💦","🛏️","🚿","🔥","👅","💋","👙","👠","💄","🔞"]
};

const keywordMap = {
    "привет": ["👋","🙂","✋"], "пока": ["👋","🚶"], "любовь": ["❤️","😍","🥰"], "сердце": ["❤️","💔","💖"],
    "смешно": ["😂","🤣","😆"], "лол": ["😂","🤣"], "ого": ["😮","😲","🤯"], "ок": ["👌","👍","✅"],
    "да": ["👍","✅"], "нет": ["👎","❌"], "грустно": ["😢","😭","😔"], "злой": ["😡","🤬","😤"],
    "деньги": ["💰","🤑","💵"], "праздник": ["🎉","🥳","🎂"], "пиво": ["🍺","🍻"], "еда": ["🍕","🍔","🍟"],
    "спать": ["😴","🛏️"], "работа": ["💼","💻"], "дом": ["🏠","🏡"], "огонь": ["🔥","💥"],
    "секс": ["👉👌","🍆🍑","🛏️","💦","🔞"], "интим": ["🔞","💋","👙"], "вечеринка": ["🎉🍺","💃🕺","🥳🍾"],
    "люблю": ["❤️🔥","😍","🥰"], "поцелуй": ["😘","💋"], "задница": ["🍑","💩"], "член": ["🍆","🍌"]
};

document.addEventListener('DOMContentLoaded', () => {
    if(serverUrl) document.getElementById('server-url').value = serverUrl;
    const savedUser = localStorage.getItem('user');
    const savedKey = localStorage.getItem('priv_key_seed');
    
    if (serverUrl && savedUser && savedKey) {
        const userObj = JSON.parse(savedUser);
        fetch(`${serverUrl}/api/validate_user`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: userObj.id, sessionToken: userObj.sessionToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) { currentUser = userObj; initCrypto(savedKey); connectToServer(); } else window.logout();
        })
        .catch(err => { currentUser = userObj; initCrypto(savedKey); connectToServer(); });
    }
    initEmojiPicker();
});

function initCrypto(fileHashHex) { myKeyPair = ec.keyFromPrivate(fileHashHex); }
function getSharedSecret(otherPubKeyHex) {
    if(!otherPubKeyHex) return null;
    if(sharedKeys[otherPubKeyHex]) return sharedKeys[otherPubKeyHex];
    try {
        const key = ec.keyFromPublic(otherPubKeyHex, 'hex');
        const shared = myKeyPair.derive(key.getPublic());
        return sharedKeys[otherPubKeyHex] = shared.toString(16).substring(0, 64);
    } catch(e) { return null; }
}
function encryptText(text, secret) { return secret ? CryptoJS.AES.encrypt(text, secret).toString() : text; }
function decryptText(ciphertext, secret) {
    if(!secret) return ciphertext;
    try { return CryptoJS.AES.decrypt(ciphertext, secret).toString(CryptoJS.enc.Utf8) || ciphertext; } 
    catch(e) { return "Ошибка расшифровки"; }
}

window.switchTab = (tab) => { document.querySelectorAll('form').forEach(f => f.style.display = 'none'); document.getElementById(tab === 'login' ? 'login-form' : 'register-form').style.display = 'block'; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); };
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.handleFileSelect = (e) => { const file = e.target.files[0]; if(file) { document.getElementById('file-preview-area').style.display = 'flex'; document.getElementById('preview-filename').textContent = file.name; } else document.getElementById('file-preview-area').style.display = 'none'; };
window.clearFileSelection = () => { document.getElementById('file-input').value = ''; document.getElementById('file-preview-area').style.display = 'none'; };

function initEmojiPicker() {
    const tabsContainer = document.getElementById('emoji-tabs');
    let first = true;
    for (const cat in emojiData) {
        const tab = document.createElement('div'); tab.className = 'emoji-tab' + (first ? ' active' : ''); tab.textContent = cat; tab.onclick = () => switchEmojiTab(cat, tab); tabsContainer.appendChild(tab); if(first) { switchEmojiTab(cat, tab); first = false; }
    }
}
function switchEmojiTab(cat, tabEl) { document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active')); tabEl.classList.add('active'); renderEmojis(emojiData[cat]); }
function renderEmojis(list) { const cont = document.getElementById('emoji-list'); cont.innerHTML = list.map(e => `<span onclick="addEmoji('${e}')">${e}</span>`).join(''); }
window.filterEmojis = (val) => { if(!val) return switchEmojiTab("Smileys", document.querySelector('.emoji-tab')); };
window.toggleEmoji = () => { const el = document.getElementById('emoji-picker'); el.style.display = el.style.display === 'none' ? 'flex' : 'none'; };
window.addEmoji = (e) => { const input = document.getElementById('message-input'); input.value += e; input.focus(); document.getElementById('emoji-suggestions').style.display = 'none'; };
window.handleInput = (e) => {
    const val = e.target.value;
    const words = val.split(' ');
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]/g, "");
    const sugg = document.getElementById('emoji-suggestions');
    if (keywordMap[lastWord]) {
        sugg.innerHTML = keywordMap[lastWord].map(em => `<span onclick="addSuggestion('${em}')">${em}</span>`).join('');
        sugg.style.display = 'flex';
    } else sugg.style.display = 'none';
};
window.addSuggestion = (em) => { const input = document.getElementById('message-input'); input.value += em + " "; document.getElementById('emoji-suggestions').style.display = 'none'; input.focus(); };

window.handleKeyFileSelect = (e) => { const file = e.target.files[0]; if(file) { document.getElementById('key-file-name').textContent = "Ключ: " + file.name; document.getElementById('btn-login').style.display = 'block'; } };
window.loginWithKey = async () => {
    let rawUrl = document.getElementById('server-url').value.trim().replace(/\/$/, "");
    if (!rawUrl.startsWith('http')) rawUrl = 'http://' + rawUrl;
    serverUrl = rawUrl;
    const file = document.getElementById('auth-key-file').files[0];
    if (!file) return alert("Файл не выбран");
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        initCrypto(hashHex);
        const myPubKey = myKeyPair.getPublic('hex');
        const res = await fetch(`${serverUrl}/api/login_by_file`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileHash: hashHex, publicKey: myPubKey }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('serverUrl', serverUrl); localStorage.setItem('user', JSON.stringify(data)); localStorage.setItem('priv_key_seed', hashHex);
        currentUser = data; connectToServer();
    } catch (e) { alert("Ошибка входа: " + e.message); }
};
window.logout = () => { localStorage.clear(); location.reload(); };

window.previewEditAvatar = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = ev => document.getElementById('profile-big-avatar').src = ev.target.result; reader.readAsDataURL(file); } };
window.saveProfile = async () => {
    const newNick = document.getElementById('edit-nickname').value;
    const file = document.getElementById('edit-avatar-input').files[0];
    if(!newNick) return alert("Имя не может быть пустым");
    const fd = new FormData();
    fd.append('userId', currentUser.id); fd.append('nickname', newNick);
    if(file) fd.append('avatar', file);
    try {
        const res = await fetch(`${serverUrl}/api/profile/update`, { method: 'POST', body: fd });
        const updatedUser = await res.json();
        if(updatedUser) { currentUser.nickname = updatedUser.nickname; currentUser.avatar = updatedUser.avatar; localStorage.setItem('user', JSON.stringify(currentUser)); document.getElementById('my-name').textContent = currentUser.nickname; document.getElementById('my-avatar').src = serverUrl + currentUser.avatar; closeModal('profile-modal'); alert("Профиль обновлен"); }
    } catch(e) { alert("Ошибка обновления"); }
};

function connectToServer() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('my-avatar').src = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/50';
    document.getElementById('my-name').textContent = currentUser.nickname;
    document.getElementById('my-username-small').textContent = '@' + currentUser.username;

    socket = io(serverUrl);
    socket.on('connect', () => socket.emit('authenticate', currentUser.id));
    socket.on('sidebar_update', (chats) => { sidebarChats = chats; renderSidebar(); });
    socket.on('search_results', (users) => renderSidebar(users, true));
    socket.on('force_logout', () => window.logout());
    
    socket.on('user_deleted_status', (data) => {
        if(currentChat && currentChat.id === data.id && currentChat.type === 'user') {
            document.getElementById('chat-status').textContent = 'Удален';
            const ava = document.getElementById('chat-avatar');
            if(!ava.parentNode.querySelector('.header-deleted-icon')) {
                ava.src = 'https://placehold.co/50?text=X';
                const icon = document.createElement('div'); icon.className = 'header-deleted-icon'; icon.innerHTML = '<i class="fas fa-skull"></i>'; ava.parentNode.appendChild(icon);
            }
        }
        socket.emit('authenticate', currentUser.id);
    });
    
    socket.on('user_revived', () => socket.emit('authenticate', currentUser.id));
    
    socket.on('new_message', (msg) => {
        const isCurrentGroup = msg.group_id && currentChat?.type === 'group' && currentChat.id === msg.group_id;
        const isCurrentDM = !msg.group_id && currentChat?.type === 'user' && (msg.sender_id === currentChat.id || msg.sender_id === currentUser.id);

        if (isCurrentGroup || isCurrentDM) {
            renderMessage(msg);
            if(msg.sender_id !== currentUser.id) {
                const groupId = msg.group_id || msg.groupId;
                socket.emit('mark_read', { messageId: msg.id, userId: currentUser.id, groupId: groupId, senderId: msg.sender_id });
            }
        }
        socket.emit('authenticate', currentUser.id);
    });

    socket.on('message_read_update', (data) => {
        const el = document.querySelector(`.message[data-id="${data.id}"]`);
        if(el) {
            const icon = el.closest('.msg-row').querySelector('.status-icon');
            if(icon) icon.className = 'status-icon fas fa-check-double read';
        }
    });

    socket.on('reaction_update', (data) => {
        const el = document.querySelector(`.message[data-id="${data.id}"]`);
        if(el) renderReactions(el, data.reactions);
    });

    socket.on('message_updated', (data) => { document.querySelectorAll('.message').forEach(el => { if(el.dataset.id == data.id) el.querySelector('p').innerHTML = data.content.replace(/\n/g, '<br>') + ' <span class="msg-edited">(изм.)</span>'; }); });
    socket.on('message_deleted', (data) => { document.querySelectorAll('.message').forEach(el => { if(el.dataset.id == data.id) el.closest('.msg-row').remove(); }); });
    socket.on('history_loaded', (msgs) => { 
        document.getElementById('messages-container').innerHTML = ''; 
        msgs.forEach(renderMessage); 
        msgs.forEach(m => {
            const readBy = typeof m.read_by === 'string' ? JSON.parse(m.read_by) : m.read_by;
            if(m.sender_id !== currentUser.id && !readBy.includes(currentUser.id)) {
                socket.emit('mark_read', { messageId: m.id, userId: currentUser.id, groupId: m.group_id, senderId: m.sender_id });
            }
        });
        scrollToBottom(); 
    });
    socket.on('call_incoming', (data) => { if(currentPeer || incomingCallData) { socket.emit('call_busy'); return; } incomingCallData = data; document.getElementById('incoming-call-modal').style.display = 'flex'; document.getElementById('caller-name').textContent = data.name; });
    socket.on('call_accepted', (signal) => { if(currentPeer) currentPeer.signal(signal); });
    socket.on('call_busy', () => { alert("Абонент занят"); endCallUI(); });
    socket.on('call_ended', () => { endCallUI(); });

    socket.on('contacts_list', (users) => {
        const list = document.getElementById('group-candidates-list');
        list.innerHTML = '';
        users.forEach(u => {
            if(u.id === currentUser.id) return;
            const div = document.createElement('div');
            const avatar = u.avatar ? serverUrl + u.avatar : 'https://placehold.co/40';
            div.className = 'user-list-item';
            div.innerHTML = `<input type="checkbox" id="user-${u.id}" value="${u.id}" style="margin-right:10px;"><img src="${avatar}"><div class="info"><div class="name">${u.nickname}</div><div class="status">@${u.username}</div></div>`;
            div.onclick = (e) => { if(e.target.tagName !== 'INPUT') { const cb = div.querySelector('input'); cb.checked = !cb.checked; } };
            list.appendChild(div);
        });
        const select = document.getElementById('group-add-select');
        select.innerHTML = '';
        users.forEach(u => { const opt = document.createElement('option'); opt.value = u.id; opt.text = u.nickname; select.appendChild(opt); });
    });

    socket.on('group_created', (group) => { closeModal('create-group-modal'); openChat({ id: group.id, name: group.name, avatar: group.avatar, creator_id: group.creator_id }, 'group'); });

    socket.on('group_details_loaded', ({ group, members }) => {
        currentGroupDetails = { group, members };
        document.getElementById('group-info-name').textContent = group.name;
        document.getElementById('group-info-avatar').src = group.avatar ? serverUrl + group.avatar : 'https://placehold.co/100';
        const isAdmin = group.creator_id === currentUser.id;
        document.getElementById('group-admin-tools').style.display = isAdmin ? 'block' : 'none';
        
        if(isAdmin) {
            document.getElementById('group-info-name').style.display = 'none';
            const nameInput = document.getElementById('group-info-name-input'); nameInput.style.display = 'block'; nameInput.value = group.name;
            document.getElementById('group-edit-btn').style.display = 'flex'; document.getElementById('save-group-btn').style.display = 'block';
        } else {
            document.getElementById('group-info-name').style.display = 'block'; document.getElementById('group-info-name-input').style.display = 'none';
            document.getElementById('group-edit-btn').style.display = 'none'; document.getElementById('save-group-btn').style.display = 'none';
        }

        const list = document.getElementById('group-members-list'); list.innerHTML = '';
        members.forEach(m => {
            const div = document.createElement('div');
            const avatar = m.avatar ? serverUrl + m.avatar : 'https://placehold.co/40';
            div.className = 'user-list-item'; div.style.cursor = 'default';
            let kickBtn = ''; if(isAdmin && m.id !== currentUser.id) kickBtn = `<button class="kick-btn" onclick="removeMember(${group.id}, ${m.id})"><i class="fas fa-times"></i></button>`;
            div.innerHTML = `<img src="${avatar}"><div class="info"><div class="name">${m.nickname}</div><div class="status">@${m.username}</div></div>${kickBtn}`;
            if(m.id !== currentUser.id) { div.onclick = (e) => { if(!e.target.closest('.kick-btn')) openUserProfile(m); }; div.style.cursor = 'pointer'; }
            list.appendChild(div);
        });
        document.getElementById('group-info-modal').style.display = 'flex';
    });

    socket.on('group_updated', ({ groupId }) => { if(currentChat && currentChat.id === groupId && currentChat.type === 'group') socket.emit('get_group_details', groupId); socket.emit('authenticate', currentUser.id); });
    socket.on('message_readers_list', (users) => {
        const list = document.getElementById('readers-list'); list.innerHTML = '';
        users.forEach(u => { const div = document.createElement('div'); div.className = 'user-list-item'; div.innerHTML = `<img src="${u.avatar ? serverUrl + u.avatar : 'https://placehold.co/40'}"><div class="name">${u.nickname}</div>`; list.appendChild(div); });
        document.getElementById('readers-modal').style.display = 'flex';
    });
}

function renderSidebar(list = null, isSearch = false) {
    const container = document.getElementById('chats-list');
    container.innerHTML = '';
    const data = list || sidebarChats;
    data.forEach(item => {
        if(item.id === currentUser.id && item.type !== 'group') return;
        const el = document.createElement('div');
        el.className = 'chat-item';
        if(currentChat && currentChat.id === item.id && currentChat.type === (item.type || 'user')) el.classList.add('active');
        const avatar = item.avatar ? serverUrl + item.avatar : 'https://placehold.co/50';
        let deletedBadge = item.is_deleted ? '<div class="deleted-overlay"><i class="fas fa-skull"></i></div>' : '';
        el.innerHTML = `<div style="position:relative"><img src="${avatar}">${deletedBadge}</div><div><div style="font-weight:bold">${item.nickname || item.name}</div><div style="font-size:12px; color:#aaa">${item.type === 'group' ? 'Группа' : ''}</div></div>`;
        el.onclick = () => openChat(item, isSearch ? 'user' : item.type);
        container.appendChild(el);
    });
}

window.handleSearchKey = (e) => {
    if(e.key === 'Enter') {
        const val = e.target.value;
        if(val) socket.emit('search_users', val);
        else socket.emit('authenticate', currentUser.id);
    }
};

window.handleHeaderClick = () => {
    if(!currentChat) return;
    if(currentChat.type === 'group') {
        socket.emit('get_contacts_for_group', currentUser.id); 
        socket.emit('get_group_details', currentChat.id);
    }
};

window.previewGroupAvatar = (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = ev => document.getElementById('new-group-avatar-preview').src = ev.target.result; reader.readAsDataURL(file); } };
window.createGroup = async () => {
    const name = document.getElementById('new-group-name').value;
    const checks = document.querySelectorAll('#group-candidates-list input:checked');
    if(!name) return alert("Введите имя группы");
    const fileInput = document.getElementById('new-group-avatar-input');
    let avatarUrl = null;
    if(fileInput.files[0]) { const fd = new FormData(); fd.append('file', fileInput.files[0]); try { const res = await fetch(`${serverUrl}/api/upload`, { method: 'POST', body: fd }); const data = await res.json(); avatarUrl = data.url; } catch(e) {} }
    const memberIds = Array.from(checks).map(c => parseInt(c.value));
    socket.emit('create_group', { name, memberIds, creatorId: currentUser.id, avatar: avatarUrl });
};
window.updateGroupAvatar = (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = ev => document.getElementById('group-info-avatar').src = ev.target.result; reader.readAsDataURL(file); } };
window.saveGroupSettings = async () => {
    const name = document.getElementById('group-info-name-input').value;
    const fileInput = document.getElementById('edit-group-avatar-input');
    const fd = new FormData();
    fd.append('groupId', currentGroupDetails.group.id); fd.append('name', name);
    if(fileInput.files[0]) fd.append('avatar', fileInput.files[0]);
    await fetch(`${serverUrl}/api/group/update`, { method: 'POST', body: fd });
    socket.emit('notify_group_update', currentGroupDetails.group.id);
    socket.emit('get_group_details', currentGroupDetails.group.id);
};
window.openCreateGroupModal = () => { document.getElementById('create-group-modal').style.display = 'flex'; socket.emit('get_contacts_for_group', currentUser.id); };
window.addMemberToGroup = () => { const select = document.getElementById('group-add-select'); const userId = parseInt(select.value); if(currentGroupDetails && userId) socket.emit('add_group_member', { groupId: currentGroupDetails.group.id, userId }); };
window.removeMember = (groupId, userId) => { if(confirm("Удалить участника?")) socket.emit('remove_group_member', { groupId, userId }); };

function openChat(obj, type) {
    if(!type) type = obj.name ? 'group' : 'user';
    currentChat = { id: obj.id, type: type, ...obj };
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';
    document.getElementById('chat-name').textContent = obj.nickname || obj.name;
    const ava = document.getElementById('chat-avatar');
    ava.src = obj.avatar ? serverUrl + obj.avatar : 'https://placehold.co/50';
    const oldIcon = ava.parentNode.querySelector('.header-deleted-icon'); if(oldIcon) oldIcon.remove();
    if(obj.is_deleted) { const icon = document.createElement('div'); icon.className = 'header-deleted-icon'; icon.innerHTML = '<i class="fas fa-skull"></i>'; ava.parentNode.appendChild(icon); }
    if(type === 'user') document.getElementById('enc-status').style.display = obj.public_key ? 'block' : 'none';
    else document.getElementById('enc-status').style.display = 'none';
    document.getElementById('chat-status').textContent = '';
    renderSidebar(); 
    const params = type === 'group' ? { groupId: obj.id } : { userId: currentUser.id, partnerId: obj.id };
    socket.emit('get_history', params);
    window.clearFileSelection();
    cancelEdit();
}
window.closeChat = (e) => { if(e) e.stopPropagation(); currentChat = null; document.getElementById('chat-interface').style.display = 'none'; document.getElementById('chat-placeholder').style.display = 'flex'; renderSidebar(); };

function renderMessage(msg) {
    let contentToShow = msg.content;
    const isEncrypted = (msg.is_encrypted === 1 || msg.is_encrypted === true);

    if (isEncrypted && currentChat.type === 'user') { 
        const secret = getSharedSecret(currentChat.public_key); 
        contentToShow = decryptText(msg.content, secret); 
    }
    else if (isEncrypted) { 
        contentToShow = "🔒 Сообщение зашифровано (Ключ недоступен)"; 
    }

    let statusIcon = '<i class="far fa-clock status-icon"></i>';
    const readBy = typeof msg.read_by === 'string' ? JSON.parse(msg.read_by) : (msg.read_by || []);
    if (readBy.length > 1) statusIcon = '<i class="fas fa-check-double status-icon read"></i>';
    else if (msg.id) statusIcon = '<i class="fas fa-check status-icon"></i>';

    const isMe = msg.sender_id === currentUser.id;
    const container = document.getElementById('messages-container');
    const lastRow = container.lastElementChild;
    let isConsecutive = false;
    if (lastRow && lastRow.dataset.senderId == msg.sender_id) isConsecutive = true;

    const row = document.createElement('div'); 
    row.className = `msg-row ${isMe ? 'sent' : 'received'} ${isConsecutive ? 'consecutive' : ''}`;
    row.dataset.senderId = msg.sender_id;

    if (!isMe) {
        const img = document.createElement('img'); img.className = 'msg-avatar';
        // FIX: Ensure URL is constructed properly
        img.src = msg.senderAvatar ? serverUrl + msg.senderAvatar : 'https://placehold.co/40';
        img.onclick = () => openUserProfile({ id: msg.sender_id, nickname: msg.senderName || 'User', avatar: msg.senderAvatar, username: '?' });
        row.appendChild(img);
    }

    const bubble = document.createElement('div'); bubble.className = 'message'; bubble.dataset.id = msg.id; bubble.dataset.content = contentToShow;
    bubble.oncontextmenu = (e) => { 
        e.preventDefault(); selectedMessageId = msg.id; const menu = document.getElementById('context-menu'); 
        const readersBtn = document.getElementById('show-readers-btn'); readersBtn.style.display = (currentChat.type === 'group') ? 'block' : 'none'; 
        
        // FIX: Prevent menu overflow
        const menuWidth = 150; const menuHeight = 150; let x = e.pageX; let y = e.pageY;
        
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 20;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 20;
        
        menu.style.display = 'block'; menu.style.left = x + 'px'; menu.style.top = y + 'px'; 
    };

    let html = '';
    // Show name only if group, not me, and not consecutive
    if (currentChat.type === 'group' && !isMe && !isConsecutive) html += `<span class="msg-name">${msg.senderName || 'User'}</span>`;
    
    if(msg.type === 'text') {
        html += `<p>${contentToShow.replace(/\n/g, '<br>')}${msg.is_edited ? ' <span class="msg-edited">(изм.)</span>' : ''}</p>`;
    } else if(msg.type === 'image') {
        html += `<img src="${serverUrl + msg.file_url}" onclick="window.open('${serverUrl + msg.file_url}')">`;
    } else {
        const fileName = msg.file_name || 'Файл';
        const fileSize = msg.file_size ? formatBytes(msg.file_size) : '';
        html += `
            <div class="file-card-box">
                <div class="file-icon"><i class="fas fa-file"></i></div>
                <div class="file-info">
                    <span class="file-name">${fileName}</span>
                    <span class="file-meta">${fileSize}</span>
                </div>
                <a href="${serverUrl + msg.file_url}" target="_blank" class="file-download-btn"><i class="fas fa-download"></i></a>
            </div>`;
    }

    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    html += `<div class="msg-meta">${time} ${isMe ? statusIcon : ''}</div><div class="reactions-container"></div>`;
    bubble.innerHTML = html;
    
    // Реакции
    const reactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {});
    renderReactions(bubble, reactions);

    row.appendChild(bubble);
    container.appendChild(row);
    scrollToBottom();
}

function renderReactions(msgElement, reactions) {
    const container = msgElement.querySelector('.reactions-container'); container.innerHTML = '';
    for (const [emoji, userIds] of Object.entries(reactions)) {
        const tag = document.createElement('div'); tag.className = 'reaction-tag';
        if (userIds.includes(currentUser.id)) tag.classList.add('active');
        tag.innerHTML = `${emoji} ${userIds.length}`;
        tag.onclick = () => sendReaction(emoji);
        tag.title = "Users: " + userIds.join(', ');
        container.appendChild(tag);
    }
}

window.sendReaction = (emoji) => {
    const msgId = selectedMessageId; if(!msgId) return;
    document.getElementById('context-menu').style.display = 'none';
    socket.emit('add_reaction', { messageId: msgId, emoji, userId: currentUser.id, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null });
};
window.showReaders = () => { document.getElementById('context-menu').style.display = 'none'; socket.emit('get_message_readers', selectedMessageId); };
window.openUserProfile = (user) => {
    document.getElementById('view-profile-avatar').src = user.avatar ? serverUrl + user.avatar : 'https://placehold.co/100';
    document.getElementById('view-profile-nickname').textContent = user.nickname;
    document.getElementById('btn-write-msg').onclick = () => {
        closeModal('view-profile-modal');
        openChat({ id: user.id, name: user.nickname, avatar: user.avatar, type: 'user' }, 'user');
    };
    document.getElementById('view-profile-modal').style.display = 'flex';
};

window.copyUsername = () => { const fullId = "@" + currentUser.username; navigator.clipboard.writeText(fullId).then(() => { showToast("Ваш ID скопирован в буфер обмена"); }).catch(err => { console.error('Ошибка копирования: ', err); }); };
function showToast(message) { const oldToast = document.querySelector('.discord-toast'); if (oldToast) oldToast.remove(); const toast = document.createElement('div'); toast.className = 'discord-toast'; toast.textContent = message; document.body.appendChild(toast); void toast.offsetWidth; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000); }

function scrollToBottom() { const c = document.getElementById('messages-container'); c.scrollTop = c.scrollHeight; }
document.onclick = () => document.getElementById('context-menu').style.display = 'none';
window.initEditMessage = () => { const el = document.querySelector(`.message[data-id="${selectedMessageId}"]`); if(!el) return; editingMessageId = selectedMessageId; document.getElementById('message-input').value = el.dataset.content; document.getElementById('edit-mode-bar').style.display = 'flex'; document.getElementById('message-input').focus(); };
window.cancelEdit = () => { editingMessageId = null; document.getElementById('message-input').value = ''; document.getElementById('edit-mode-bar').style.display = 'none'; };
window.initDeleteMessage = () => { document.getElementById('delete-modal').style.display = 'flex'; };
window.confirmDelete = (mode) => { socket.emit('delete_message', { messageId: selectedMessageId, mode: mode, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null, userId: currentUser.id }); closeModal('delete-modal'); };
window.handleInputKey = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
window.sendMessage = async () => {
    const input = document.getElementById('message-input'); const txt = input.value.trim(); const fileInput = document.getElementById('file-input');
    if(editingMessageId) { if(txt) { socket.emit('edit_message', { messageId: editingMessageId, newContent: txt, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null }); cancelEdit(); } return; }
    if(!txt && !fileInput.files.length) return;
    let encryptedText = txt; let isEncrypted = false;
    if (currentChat.type === 'user' && txt) { const secret = getSharedSecret(currentChat.public_key); if (secret) { encryptedText = encryptText(txt, secret); isEncrypted = true; } }
    if(fileInput.files.length) { const fd = new FormData(); fd.append('file', fileInput.files[0]); try { const res = await fetch(`${serverUrl}/api/upload`, { method:'POST', body:fd }); const fileData = await res.json(); const type = fileInput.files[0].type.startsWith('image/') ? 'image' : 'file'; emitMsg(null, type, fileData.url, fileData.originalName, fileData.size, false); window.clearFileSelection(); } catch(e) {} }
    if(txt) { emitMsg(encryptedText, 'text', null, null, null, isEncrypted); input.value = ''; }
    document.getElementById('emoji-picker').style.display = 'none'; document.getElementById('emoji-suggestions').style.display = 'none';
};
function emitMsg(content, type, url, fileName, fileSize, isEncrypted) { 
    // Исправлено: передаем и group_id, и groupId для совместимости
    const groupId = currentChat.type === 'group' ? currentChat.id : null;
    socket.emit('send_message', { senderId: currentUser.id, receiverId: currentChat.type === 'user' ? currentChat.id : null, groupId: groupId, group_id: groupId, content, type, fileUrl: url, fileName, fileSize, isEncrypted: isEncrypted, senderName: currentUser.nickname }); 
}

// --- CALL LOGIC ---
window.toggleDeviceMenu = (menuId) => {
    const menu = document.getElementById(menuId);
    const isShown = menu.classList.contains('show');
    document.querySelectorAll('.device-menu').forEach(m => m.classList.remove('show'));
    if (!isShown) {
        menu.classList.add('show');
        // Обновляем список устройств
        navigator.mediaDevices.enumerateDevices().then(devices => {
            menu.innerHTML = '';
            const type = menuId === 'video-menu' ? 'videoinput' : 'audioinput';
            devices.filter(d => d.kind === type).forEach(d => {
                const div = document.createElement('div');
                div.className = 'device-option';
                if(type === 'videoinput' && currentVideoDevice === d.deviceId) div.classList.add('selected');
                if(type === 'audioinput' && currentAudioDevice === d.deviceId) div.classList.add('selected');
                div.textContent = d.label || `${type} ${menu.children.length + 1}`;
                div.onclick = () => { changeDevice(type, d.deviceId); menu.classList.remove('show'); };
                menu.appendChild(div);
            });
        });
    }
};

window.startCall = (e) => { 
    if(e) e.stopPropagation(); 
    if(currentChat.type === 'group') return alert("Звонки только тет-а-тет"); 
    setupCallUI(); 
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => { 
        localStream = stream;
        document.getElementById('local-video').srcObject = stream;
        currentPeer = new SimplePeer({ initiator: true, trickle: false, stream }); 
        currentPeer.on('signal', data => socket.emit('call_user', { userToCall: currentChat.id, signalData: data, from: currentUser.id, name: currentUser.nickname })); 
        currentPeer.on('stream', rs => { document.getElementById('remote-video').srcObject = rs; }); 
    }).catch(e => alert("Нет доступа: " + e)); 
};

window.acceptCall = () => { 
    document.getElementById('incoming-call-modal').style.display = 'none'; 
    setupCallUI();
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => { 
        localStream = stream;
        document.getElementById('local-video').srcObject = stream;
        currentPeer = new SimplePeer({ initiator: false, trickle: false, stream }); 
        currentPeer.on('signal', data => socket.emit('answer_call', { signal: data, to: incomingCallData.from })); 
        currentPeer.on('stream', rs => { document.getElementById('remote-video').srcObject = rs; }); 
        currentPeer.signal(incomingCallData.signal); 
    }).catch(e => alert("Ошибка: " + e)); 
};

window.declineCall = () => { 
    document.getElementById('incoming-call-modal').style.display = 'none'; 
    socket.emit('end_call', { to: incomingCallData.from }); 
    incomingCallData = null; 
};

function setupCallUI() { 
    document.getElementById('active-call-modal').style.display = 'flex'; 
}

window.changeDevice = async (kind, deviceId) => {
    if (kind === 'audioinput') currentAudioDevice = deviceId;
    else currentVideoDevice = deviceId;

    try {
        const constraints = {
            audio: currentAudioDevice ? { deviceId: { exact: currentAudioDevice } } : true,
            video: currentVideoDevice ? { deviceId: { exact: currentVideoDevice } } : false
        };
        if(isScreenSharing) { constraints.video = false; } // Don't override screen

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace tracks
        if(currentPeer) {
            const senders = currentPeer._pc.getSenders();
            newStream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track.kind === track.kind);
                if(sender) sender.replaceTrack(track);
            });
        }

        if(!isScreenSharing) {
            localStream = newStream;
            document.getElementById('local-video').srcObject = newStream;
        } else {
            // If screen sharing, only replace audio track in localStream
            const audioTrack = newStream.getAudioTracks()[0];
            if(audioTrack) {
                const oldAudio = localStream.getAudioTracks()[0];
                if(oldAudio) localStream.removeTrack(oldAudio);
                localStream.addTrack(audioTrack);
            }
        }
        
    } catch(e) { console.error(e); }
};

window.toggleMic = () => { 
    if(!localStream) return; 
    const track = localStream.getAudioTracks()[0]; 
    if(track) { 
        track.enabled = !track.enabled; 
        document.getElementById('btn-mic').classList.toggle('active', track.enabled); 
        document.getElementById('btn-mic').innerHTML = track.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    } 
};

window.toggleCam = async () => { 
    if(isScreenSharing) { alert("Сначала выключите демонстрацию экрана"); return; }
    
    // Если видео нет - включаем
    if(!localStream.getVideoTracks().length) {
        const vidStream = await navigator.mediaDevices.getUserMedia({ video: currentVideoDevice ? { deviceId: { exact: currentVideoDevice } } : true });
        const vidTrack = vidStream.getVideoTracks()[0];
        localStream.addTrack(vidTrack);
        if(currentPeer) currentPeer.addTrack(vidTrack, localStream);
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('btn-cam').classList.add('active');
    } else {
        // Если есть - тоглим
        const track = localStream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        document.getElementById('btn-cam').classList.toggle('active', track.enabled);
    }
};

window.startScreenShare = () => { document.getElementById('screen-share-modal').style.display = 'flex'; };

window.confirmScreenShare = async (withAudio) => {
    closeModal('screen-share-modal');
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withAudio });
        isScreenSharing = true;
        
        const screenTrack = stream.getVideoTracks()[0];
        // Заменяем видео дорожку
        if(currentPeer) {
            const senders = currentPeer._pc.getSenders();
            const sender = senders.find(s => s.track.kind === 'video');
            if(sender) sender.replaceTrack(screenTrack);
            else currentPeer.addTrack(screenTrack, localStream); // Если видео не было
        }
        
        document.getElementById('local-video').srcObject = stream;
        
        // Обработка остановки трансляции (кнопка браузера)
        screenTrack.onended = () => {
            isScreenSharing = false;
            // Вернуть камеру если была? Пока просто черный экран или остановка
            alert("Демонстрация завершена");
        };
        
    } catch(e) { console.error(e); }
};

window.endCall = () => { 
    const partnerId = currentChat ? currentChat.id : (incomingCallData ? incomingCallData.from : null); 
    if(partnerId) socket.emit('end_call', { to: partnerId }); 
    if(currentPeer) currentPeer.destroy(); 
    if(localStream) localStream.getTracks().forEach(t => t.stop()); 
    
    // FIX PIP: Clear sources
    // Force reload video element to detach PiP
    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');
    
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    
    remoteVideo.load();
    localVideo.load();

    currentPeer = null; localStream = null; incomingCallData = null; isScreenSharing = false;
    document.getElementById('active-call-modal').style.display = 'none'; 
    document.getElementById('incoming-call-modal').style.display = 'none'; 
};

window.openProfileSettings = () => { document.getElementById('profile-modal').style.display = 'flex'; document.getElementById('edit-nickname').value = currentUser.nickname; document.getElementById('profile-big-username').textContent = '@' + currentUser.username; const avatarSrc = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/100'; document.getElementById('profile-big-avatar').src = avatarSrc; };
function formatBytes(bytes, decimals = 2) { if (!+bytes) return '0 B'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`; }
window.copyUsername = () => { const fullId = "@" + currentUser.username; navigator.clipboard.writeText(fullId).then(() => { showToast("Ваш ID скопирован в буфер обмена"); }).catch(err => { console.error('Ошибка копирования: ', err); }); };
function showToast(message) { const oldToast = document.querySelector('.discord-toast'); if (oldToast) oldToast.remove(); const toast = document.createElement('div'); toast.className = 'discord-toast'; toast.textContent = message; document.body.appendChild(toast); void toast.offsetWidth; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000); }
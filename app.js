let socket;
let currentUser = null;
let currentChat = null; 
let serverUrl = localStorage.getItem('serverUrl') || '';
let sidebarChats = []; 
let localStream = null;
let currentPeer = null;
let incomingCallData = null;

document.addEventListener('DOMContentLoaded', () => {
    if(serverUrl) document.getElementById('server-url').value = serverUrl;
    const savedUser = localStorage.getItem('user');
    if (serverUrl && savedUser) {
        currentUser = JSON.parse(savedUser);
        connectToServer();
    }
    const emojis = ['😀','😂','😍','😎','😭','😡','👍','👎','❤️','🔥','🎉','💩','✅','🤔','👀','🙌'];
    document.getElementById('emoji-picker').innerHTML = emojis.map(e => `<span onclick="addEmoji('${e}')">${e}</span>`).join('');
});

window.switchTab = (tab) => {
    document.querySelectorAll('form').forEach(f => f.style.display = 'none');
    document.getElementById(tab === 'login' ? 'login-form' : 'register-form').style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
};
window.toggleEmoji = () => {
    const el = document.getElementById('emoji-picker');
    el.style.display = el.style.display === 'none' ? 'grid' : 'none';
};
window.addEmoji = (e) => {
    document.getElementById('message-input').value += e;
    document.getElementById('message-input').focus();
};
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.handleFileSelect = (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('file-preview-area');
    const nameSpan = document.getElementById('preview-filename');
    if(file) {
        preview.style.display = 'flex';
        nameSpan.textContent = file.name;
    } else {
        preview.style.display = 'none';
    }
};
window.clearFileSelection = () => {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview-area').style.display = 'none';
};

async function handleAuth(endpoint, body, isFormData = false) {
    let rawUrl = document.getElementById('server-url').value.trim().replace(/\/$/, "");
    if (!rawUrl.startsWith('http')) rawUrl = 'http://' + rawUrl;
    serverUrl = rawUrl;
    try {
        const res = await fetch(`${serverUrl}${endpoint}`, {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? body : JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('serverUrl', serverUrl);
        localStorage.setItem('user', JSON.stringify(data));
        currentUser = data;
        connectToServer();
    } catch (e) { alert(e.message); }
}

document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    handleAuth('/api/login', { username: document.getElementById('login-username').value, password: document.getElementById('login-password').value });
});
document.getElementById('register-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('username', document.getElementById('reg-username').value);
    fd.append('nickname', document.getElementById('reg-nickname').value);
    fd.append('password', document.getElementById('reg-password').value);
    const f = document.getElementById('reg-avatar').files[0];
    if(f) fd.append('avatar', f);
    handleAuth('/api/register', fd, true);
});
window.logout = () => { localStorage.removeItem('user'); location.reload(); };

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById('avatar-preview').src = e.target.result;
        reader.readAsDataURL(file);
    }
}

function connectToServer() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    document.getElementById('my-avatar').src = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/50';
    document.getElementById('my-name').textContent = currentUser.nickname;
    document.getElementById('my-username-small').textContent = '@' + currentUser.username;

    socket = io(serverUrl);
    socket.on('connect', () => socket.emit('authenticate', currentUser.id));

    socket.on('sidebar_update', (chats) => {
        sidebarChats = chats;
        renderSidebar();
    });

    socket.on('search_results', (users) => renderSidebar(users, true));

    socket.on('new_message', (msg) => {
        const isGroup = msg.group_id && currentChat?.type === 'group' && currentChat.id === msg.group_id;
        const isPrivate = !msg.group_id && currentChat?.type === 'user' && (msg.sender_id === currentChat.id || msg.sender_id === currentUser.id);
        if (isGroup || isPrivate) {
            renderMessage(msg);
        } else {
            socket.emit('authenticate', currentUser.id);
        }
    });

    socket.on('call_incoming', (data) => {
        if(currentPeer || incomingCallData) {
             socket.emit('call_busy'); return; 
        }
        incomingCallData = data;
        document.getElementById('incoming-call-modal').style.display = 'flex';
        document.getElementById('caller-name').textContent = data.name;
    });

    socket.on('call_accepted', (signal) => { if(currentPeer) currentPeer.signal(signal); });
    socket.on('call_busy', () => { alert("Абонент занят"); endCallUI(); });
    socket.on('call_ended', () => { endCallUI(); });

    socket.on('history_loaded', (msgs) => {
        document.getElementById('messages-container').innerHTML = '';
        msgs.forEach(renderMessage);
        scrollToBottom();
    });

    socket.on('all_users_list', (users) => {
        const list = document.getElementById('group-candidates-list');
        list.innerHTML = '';
        users.forEach(u => {
            if(u.id === currentUser.id) return;
            const div = document.createElement('div');
            div.className = 'check-item';
            div.innerHTML = `<input type="checkbox" id="user-${u.id}" value="${u.id}"><label for="user-${u.id}">${u.nickname}</label>`;
            list.appendChild(div);
        });
    });
}

function renderSidebar(list = null, isSearch = false) {
    const container = document.getElementById('chats-list');
    container.innerHTML = '';
    document.getElementById('sidebar-label').textContent = isSearch ? 'РЕЗУЛЬТАТЫ ПОИСКА' : 'ЧАТЫ';
    
    const data = list || sidebarChats;
    if(isSearch && data.length === 0) container.innerHTML = '<div style="padding:10px; color:#777;">Ничего не найдено</div>';

    data.forEach(item => {
        if(item.id === currentUser.id && item.type !== 'group') return;
        const el = document.createElement('div');
        el.className = 'chat-item';
        if(currentChat && currentChat.id === item.id && currentChat.type === (item.type || 'user')) el.classList.add('active');
        const avatar = item.avatar ? serverUrl + item.avatar : 'https://placehold.co/50';
        el.innerHTML = `<img src="${avatar}"><div><div style="font-weight:bold">${item.nickname || item.name}</div><div style="font-size:12px; color:#aaa">${item.type === 'group' ? 'Группа' : ''}</div></div>`;
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

function openChat(obj, type) {
    if(!type) type = obj.name ? 'group' : 'user';
    currentChat = { id: obj.id, type: type, ...obj };
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';
    document.getElementById('chat-name').textContent = obj.nickname || obj.name;
    document.getElementById('chat-avatar').src = obj.avatar ? serverUrl + obj.avatar : 'https://placehold.co/50';
    renderSidebar(); 
    const params = type === 'group' ? { groupId: obj.id } : { userId: currentUser.id, partnerId: obj.id };
    socket.emit('get_history', params);
    window.clearFileSelection();
}

window.closeChat = () => {
    currentChat = null;
    document.getElementById('chat-interface').style.display = 'none';
    document.getElementById('chat-placeholder').style.display = 'flex';
    renderSidebar();
};

function renderMessage(msg) {
    const div = document.createElement('div');
    const sender = msg.sender_id || msg.senderId;
    const isMe = sender === currentUser.id;
    
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    let html = '';
    
    if (msg.group_id && !isMe) html += `<span class="msg-name">${msg.senderName || 'User'}</span>`;
    
    if(msg.type === 'text') {
        html += msg.content.replace(/\n/g, '<br>');
    } else if(msg.type === 'image') {
        html += `<img src="${serverUrl + msg.file_url}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open('${serverUrl + msg.file_url}')">`;
    } else {
        const fileName = msg.file_name || 'Файл';
        html += `
            <a href="${serverUrl + msg.file_url}" target="_blank" class="file-card">
                <i class="fas fa-file-arrow-down file-icon"></i>
                <div class="file-info">
                    <span class="file-name">${fileName}</span>
                    <span class="file-download">Скачать</span>
                </div>
            </a>`;
    }
    
    div.innerHTML = html;
    document.getElementById('messages-container').appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const c = document.getElementById('messages-container');
    c.scrollTop = c.scrollHeight;
}

window.handleInputKey = (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

window.sendMessage = async () => {
    const input = document.getElementById('message-input');
    const txt = input.value.trim();
    const fileInput = document.getElementById('file-input');
    
    if(!txt && !fileInput.files.length) return;
    
    let fileData = null;

    if(fileInput.files.length) {
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        try {
            const res = await fetch(`${serverUrl}/api/upload`, { method:'POST', body:fd });
            fileData = await res.json();
            const type = fileInput.files[0].type.startsWith('image/') ? 'image' : 'file';
            emitMsg(null, type, fileData.url, fileData.originalName);
            window.clearFileSelection();
        } catch(e) {
            console.error(e);
            alert("Ошибка загрузки файла");
        }
    }

    if(txt) { 
        emitMsg(txt, 'text', null, null); 
        input.value = ''; 
    }
    document.getElementById('emoji-picker').style.display = 'none';
};

function emitMsg(content, type, url, fileName) {
    socket.emit('send_message', {
        senderId: currentUser.id,
        receiverId: currentChat.type === 'user' ? currentChat.id : null,
        groupId: currentChat.type === 'group' ? currentChat.id : null,
        content, type, fileUrl: url, fileName: fileName, senderName: currentUser.nickname
    });
}

// ЗВОНКИ
window.startCall = () => {
    if(currentChat.type === 'group') return alert("Звонки только тет-а-тет");
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        setupCallUI(stream);
        currentPeer = new SimplePeer({ initiator: true, trickle: false, stream });
        currentPeer.on('signal', data => socket.emit('call_user', { userToCall: currentChat.id, signalData: data, from: currentUser.id, name: currentUser.nickname }));
        currentPeer.on('stream', rs => document.getElementById('remote-video').srcObject = rs);
    }).catch(e => alert("Нет доступа к микрофону"));
};

window.acceptCall = () => {
    document.getElementById('incoming-call-modal').style.display = 'none';
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        setupCallUI(stream);
        currentPeer = new SimplePeer({ initiator: false, trickle: false, stream });
        currentPeer.on('signal', data => socket.emit('answer_call', { signal: data, to: incomingCallData.from }));
        currentPeer.on('stream', rs => document.getElementById('remote-video').srcObject = rs);
        currentPeer.signal(incomingCallData.signal);
    }).catch(e => alert("Ошибка: " + e));
};

window.declineCall = () => {
    document.getElementById('incoming-call-modal').style.display = 'none';
    socket.emit('end_call', { to: incomingCallData.from });
    incomingCallData = null;
};

async function setupCallUI(stream) {
    localStream = stream;
    document.getElementById('active-call-modal').style.display = 'flex';
    document.getElementById('local-video').srcObject = stream;
    // ВАЖНО: Запрашиваем устройства ПОСЛЕ того, как пользователь дал разрешение
    await setupDeviceSelectors();
}

function endCallUI() {
    if(currentPeer) currentPeer.destroy();
    if(localStream) localStream.getTracks().forEach(t => t.stop());
    currentPeer = null; localStream = null; incomingCallData = null;
    document.getElementById('active-call-modal').style.display = 'none';
    document.getElementById('incoming-call-modal').style.display = 'none';
}

window.endCall = () => {
    const partnerId = currentChat ? currentChat.id : (incomingCallData ? incomingCallData.from : null);
    if(partnerId) socket.emit('end_call', { to: partnerId });
    endCallUI();
};

async function setupDeviceSelectors() {
    try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const aud = document.getElementById('audio-source');
        const vid = document.getElementById('video-source');
        
        // Сохраняем текущий выбор, если был
        const curAud = aud.value;
        const curVid = vid.value;
        
        aud.innerHTML = ''; vid.innerHTML = '';
        devs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.text = d.label || (d.kind + ' ' + (d.kind === 'audioinput' ? aud.length : vid.length));
            if(d.kind === 'audioinput') aud.appendChild(opt);
            if(d.kind === 'videoinput') vid.appendChild(opt);
        });
        
        // Восстанавливаем выбор или выбираем первый
        if(curAud) aud.value = curAud;
        if(curVid) vid.value = curVid;
        
    } catch(e){ console.error(e); }
}

window.changeDevice = async () => {
    const audioId = document.getElementById('audio-source').value;
    const videoId = document.getElementById('video-source').value;
    
    // Получаем новый поток с выбранными устройствами
    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: audioId } },
            video: { deviceId: { exact: videoId } }
        });

        // Заменяем треки в P2P соединении
        if(currentPeer) {
            const oldVideo = localStream.getVideoTracks()[0];
            const newVideo = newStream.getVideoTracks()[0];
            if(oldVideo && newVideo) currentPeer.replaceTrack(oldVideo, newVideo, localStream);

            const oldAudio = localStream.getAudioTracks()[0];
            const newAudio = newStream.getAudioTracks()[0];
            if(oldAudio && newAudio) currentPeer.replaceTrack(oldAudio, newAudio, localStream);
        }

        // Обновляем локальное видео
        localStream = newStream;
        document.getElementById('local-video').srcObject = newStream;
        
        // Обновляем кнопки управления
        const videoTrack = newStream.getVideoTracks()[0];
        document.getElementById('btn-cam').classList.toggle('active', videoTrack && videoTrack.enabled);
        
        const audioTrack = newStream.getAudioTracks()[0];
        document.getElementById('btn-mic').classList.toggle('active', audioTrack && audioTrack.enabled);

    } catch(e) {
        console.error("Ошибка смены устройства", e);
    }
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

window.toggleCam = () => {
    if(!localStream) return;
    let track = localStream.getVideoTracks()[0];
    if(!track) {
         // Если видео не было, надо запросить его (обычно через changeDevice, но тут подсказка)
         alert("Камера не активна. Выберите камеру в списке.");
         return;
    }
    track.enabled = !track.enabled;
    document.getElementById('btn-cam').classList.toggle('active', track.enabled);
};

window.openCreateGroupModal = () => {
    document.getElementById('create-group-modal').style.display = 'flex';
    socket.emit('get_all_users_for_group');
};

window.createGroup = () => {
    const name = document.getElementById('new-group-name').value;
    const checks = document.querySelectorAll('#group-candidates-list input:checked');
    if(!name || checks.length === 0) return alert("Введите имя и выберите участников");
    const memberIds = Array.from(checks).map(c => parseInt(c.value));
    socket.emit('create_group', { name, memberIds, creatorId: currentUser.id });
    closeModal('create-group-modal');
};

window.openProfileSettings = () => {
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('profile-big-name').textContent = currentUser.nickname;
    document.getElementById('profile-big-username').textContent = '@' + currentUser.username;
    document.getElementById('profile-big-avatar').src = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/100';
};
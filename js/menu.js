'use strict';
// Eventos del menú, salas, partida rápida y botones

// =========================================================================
// 7. INICIALIZACIÓN Y EVENTOS GENERALES
// =========================================================================
function getPlayerProfile() {
    const rawName = document.getElementById('input-player-name').value.trim().toUpperCase();
    state.playerName = rawName || 'BRAWLER_' + Math.floor(10 + Math.random() * 89);
    document.getElementById('input-player-name').value = state.playerName;
    return {
        name: state.playerName,
        archetypeId: state.selectedArchetypeId
    };
}

function launchArena(room) {
    if (state.gameInstance) {
        state.gameInstance.destroy();
    }
    switchScreen('game');
    const canvas = document.getElementById('game-canvas');
    state.gameInstance = new BattleArenaEngine(canvas, room, net.userId);
    state.gameInstance.start();
}

net.onRoomUpdated = (room) => {
    state.currentRoom = room;
    const gameVisible = !document.getElementById('screen-game').classList.contains('hidden');
    if (room.status === 'playing') {
        if (!state.gameInstance || !state.gameInstance.running) launchArena(room);
        return;
    }
    if (room.status === 'lobby' && gameVisible) {
        if (state.gameInstance) state.gameInstance.destroy();
        switchScreen('lobby');
    }
    renderLobby(room);
};
net.onCombatStateReceived = (payload) => {
    if (state.gameInstance) state.gameInstance.applyRemoteSnapshot(payload);
};
net.onClientInputReceived = (senderId, input) => {
    if (state.gameInstance) state.gameInstance.remoteInputs[senderId] = input;
};
net.onRoomClosed = () => {
    if (state.gameInstance) state.gameInstance.destroy();
    net.leaveRoom();
    state.currentRoom = null;
    switchScreen('menu');
};

document.getElementById('btn-open-settings').onclick = () => {
    sfx.sfxSelect();
    activeRebindAction = null;
    activeRebindType = null;
    renderSettingsUI();
    document.getElementById('modal-settings').classList.remove('hidden');
};

document.getElementById('btn-close-settings').onclick = () => {
    sfx.sfxSelect();
    activeRebindAction = null;
    activeRebindType = null;
    document.getElementById('modal-settings').classList.add('hidden');
};

document.getElementById('tab-btn-gamepad').onclick = () => {
    sfx.sfxSelect();
    document.getElementById('tab-btn-gamepad').className = "px-4 py-2 text-xs font-bold rounded-t-lg bg-yellow-500/20 text-yellow-300 border-t border-x border-yellow-500/40";
    document.getElementById('tab-btn-keyboard').className = "px-4 py-2 text-xs font-bold rounded-t-lg bg-slate-900 text-slate-400 hover:text-white";
    document.getElementById('tab-panel-gamepad').classList.remove('hidden');
    document.getElementById('tab-panel-keyboard').classList.add('hidden');
};

document.getElementById('tab-btn-keyboard').onclick = () => {
    sfx.sfxSelect();
    document.getElementById('tab-btn-keyboard').className = "px-4 py-2 text-xs font-bold rounded-t-lg bg-yellow-500/20 text-yellow-300 border-t border-x border-yellow-500/40";
    document.getElementById('tab-btn-gamepad').className = "px-4 py-2 text-xs font-bold rounded-t-lg bg-slate-900 text-slate-400 hover:text-white";
    document.getElementById('tab-panel-keyboard').classList.remove('hidden');
    document.getElementById('tab-panel-gamepad').classList.add('hidden');
};

document.getElementById('btn-reset-binds').onclick = () => {
    sfx.sfxSelect();
    currentGamepadBinds = { ...DEFAULT_GAMEPAD_BINDS };
    currentKeyboardBinds = JSON.parse(JSON.stringify(DEFAULT_KEYBOARD_BINDS));
    localStorage.removeItem('gamepad_binds_v3');
    localStorage.removeItem('keyboard_binds_v3');
    renderSettingsUI();
    showToast('Controles restaurados por defecto.', 'info');
};

document.getElementById('btn-save-settings').onclick = () => {
    sfx.sfxSelect();
    localStorage.setItem('gamepad_binds_v3', JSON.stringify(currentGamepadBinds));
    localStorage.setItem('keyboard_binds_v3', JSON.stringify(currentKeyboardBinds));
    document.getElementById('modal-settings').classList.add('hidden');
    showToast('¡Ajustes guardados correctamente!', 'success');
};

document.getElementById('btn-toggle-sound').onclick = () => {
    const on = sfx.toggle();
    document.getElementById('sound-icon').textContent = on ? '🔊' : '🔇';
    document.getElementById('sound-text').textContent = on ? 'SONIDO: ON' : 'SONIDO: OFF';
    document.getElementById('btn-hud-sound').textContent = on ? '🔊' : '🔇';
};

document.getElementById('btn-hud-sound').onclick = () => { document.getElementById('btn-toggle-sound').click(); };

document.getElementById('btn-create-room').onclick = async () => {
    sfx.init();
    sfx.sfxSelect();
    try {
        const profile = getPlayerProfile();
        const room = await net.createRoom(profile, 'random', 'normal', '99');
        state.currentRoom = room;
        switchScreen('lobby');
        renderLobby(room);
        showToast(`Sala ${room.code} creada`, 'success');
    } catch (err) {
        showToast(err.message || 'No se pudo crear la sala.', 'error');
    }
};

document.getElementById('btn-join-room').onclick = async () => {
    sfx.init();
    sfx.sfxSelect();
    const code = document.getElementById('input-room-code').value;
    if (!code.trim()) {
        showToast('Ingresa un código de sala.', 'warn');
        return;
    }
    try {
        const profile = getPlayerProfile();
        const room = await net.joinRoom(code, profile);
        state.currentRoom = room;
        switchScreen('lobby');
        renderLobby(room);
        showToast(`Unido a la sala ${room.code}`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

document.getElementById('btn-quick-match').onclick = async () => {
    sfx.init();
    sfx.sfxSelect();
    net.leaveRoom();
    const profile = getPlayerProfile();
    const room = {
        code: 'LOCAL',
        hostId: net.userId,
        arena: 'random',
        difficulty: 'normal',
        timerMode: '99',
        mode: document.getElementById('select-quick-mode').value || 'ffa',
        status: 'playing',
        isLocal: true,
        slots: [{
            id: net.userId,
            name: profile.name,
            archetypeId: profile.archetypeId,
            isBot: false,
            isHost: true
        }],
        updatedAt: Date.now()
    };
    state.currentRoom = room;
    while (room.slots.length < 8) {
        addBotToRoom();
    }
    room.status = 'playing';
    resolveArenaForMatch(room);
    launchArena(room);
};

document.getElementById('btn-copy-code').onclick = () => {
    const code = document.getElementById('lobby-room-code').textContent;
    const temp = document.createElement('textarea');
    temp.value = code;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    sfx.sfxSelect();
    showToast(`Código "${code}" copiado`, 'success');
};

document.getElementById('select-arena').onchange = (e) => {
    if (!state.currentRoom || state.currentRoom.hostId !== net.userId) return;
    state.currentRoom.arena = e.target.value;
    net.saveRoomState(state.currentRoom);
};

document.getElementById('select-difficulty').onchange = (e) => {
    if (!state.currentRoom || state.currentRoom.hostId !== net.userId) return;
    state.currentRoom.difficulty = e.target.value;
    net.saveRoomState(state.currentRoom);
};

document.getElementById('select-mode').onchange = (e) => {
    if (!state.currentRoom || state.currentRoom.hostId !== net.userId) return;
    state.currentRoom.mode = e.target.value;
    net.saveRoomState(state.currentRoom);
};

document.getElementById('select-timer-mode').onchange = (e) => {
    if (!state.currentRoom || state.currentRoom.hostId !== net.userId) return;
    state.currentRoom.timerMode = e.target.value;
    net.saveRoomState(state.currentRoom);
};

document.getElementById('btn-add-bot').onclick = () => addBotToRoom();

document.getElementById('btn-fill-bots').onclick = () => {
    if (!state.currentRoom) return;
    while (state.currentRoom.slots.length < 8) {
        addBotToRoom();
    }
};

document.getElementById('btn-clear-bots').onclick = () => {
    if (!state.currentRoom) return;
    state.currentRoom.slots = state.currentRoom.slots.filter(s => !s.isBot);
    sfx.sfxSelect();
    net.saveRoomState(state.currentRoom);
};

document.getElementById('btn-start-match').onclick = async () => {
    if (!state.currentRoom || state.currentRoom.slots.length < 2) return;
    resolveArenaForMatch(state.currentRoom);
    state.currentRoom.status = 'playing';
    await net.saveRoomState(state.currentRoom);
    launchArena(state.currentRoom);
};

document.getElementById('btn-leave-room').onclick = () => {
    sfx.sfxSelect();
    net.leaveRoom();
    state.currentRoom = null;
    switchScreen('menu');
};

document.getElementById('btn-hud-exit').onclick = () => {
    if (state.currentRoom && !state.currentRoom.isLocal && state.currentRoom.hostId !== net.userId) {
        showToast('Solo el anfitrión puede salir.', 'warn');
        return;
    }
    if (state.gameInstance) state.gameInstance.destroy();
    if (state.currentRoom) {
        state.currentRoom.status = 'lobby';
        net.saveRoomState(state.currentRoom);
        switchScreen('lobby');
        renderLobby(state.currentRoom);
    } else {
        switchScreen('menu');
    }
};

document.getElementById('btn-rematch').onclick = async () => {
    sfx.sfxSelect();
    if (state.currentRoom) {
        if (!state.currentRoom.isLocal && state.currentRoom.hostId !== net.userId) {
            showToast('El anfitrión debe iniciar la revancha.', 'warn');
            return;
        }
        resolveArenaForMatch(state.currentRoom);
        state.currentRoom.status = 'playing';
        await net.saveRoomState(state.currentRoom);
        launchArena(state.currentRoom);
    }
};

document.getElementById('btn-back-lobby').onclick = () => {
    sfx.sfxSelect();
    if (state.currentRoom) {
        if (!state.currentRoom.isLocal && state.currentRoom.hostId !== net.userId) {
            showToast('El anfitrión debe volver al lobby.', 'warn');
            return;
        }
        state.currentRoom.status = 'lobby';
        net.saveRoomState(state.currentRoom);
        switchScreen('lobby');
        renderLobby(state.currentRoom);
    } else {
        switchScreen('menu');
    }
};

window.addEventListener('resize', () => {
    if (state.gameInstance) state.gameInstance.resize();
});

// Botones extra del HUD: controles táctiles y pantalla completa (intenta bloquear horizontal)
document.getElementById('btn-hud-touch').onclick = () => TouchPad.toggle();
async function toggleFullscreen() {
    try {
        if (!document.documentElement.requestFullscreen) throw new Error('nofs');
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
            if (screen.orientation && screen.orientation.lock) { try { await screen.orientation.lock('landscape'); } catch (e) {} }
        } else {
            await document.exitFullscreen();
        }
    } catch (e) { showToast('Tu navegador no permite pantalla completa. En iPhone usa Compartir → Añadir a pantalla de inicio.', 'warn'); }
}
document.getElementById('btn-hud-full').onclick = toggleFullscreen;
document.getElementById('btn-global-full').onclick = toggleFullscreen;
document.addEventListener('fullscreenchange', () => {
    const t = document.fullscreenElement ? '⤡' : '⛶';
    document.getElementById('btn-global-full').textContent = t;
    document.getElementById('btn-hud-full').textContent = t;
});
TouchPad.refresh();

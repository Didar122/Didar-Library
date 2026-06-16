// hub_multiplayer.js

let liveRoomsUnsubscribe = null;

function loadLiveRooms() {
    const listContainer = document.getElementById('liveRoomsList');
    if (!listContainer) return;

    // Check if firestore is available (set by firebaseSDK.js)
    if (typeof firestore === 'undefined' || !firestore) {
        listContainer.innerHTML = `<div style="text-align:center; color:#ff6b6b; padding: 20px;"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>${window.getTranslation('hub_db_error', 'Database not connected. Cannot fetch live rooms.')}</div>`;
        return;
    }

    listContainer.innerHTML = `<div style="text-align:center; color:#ccc; padding: 20px;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>${window.getTranslation('hub_fetching', 'Fetching live games...')}</div>`;

    if (liveRoomsUnsubscribe) {
        liveRoomsUnsubscribe();
        liveRoomsUnsubscribe = null;
    }

    // Listen to dama_rooms ordered by creation
    liveRoomsUnsubscribe = firestore.collection('dama_rooms')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .onSnapshot((snapshot) => {
            listContainer.innerHTML = '';

            let activeRoomsCount = 0;
            snapshot.forEach(doc => {
                const room = doc.data();
                const roomId = doc.id;

                // Skip fully finished games
                if (room.gameOver) return;

                let status = window.getTranslation('hub_game_status_waiting', 'Waiting for player');
                let statusColor = '#4CAF50';
                let actionBtn = `<button onclick="joinRoomHub('${roomId}')" style="background:#4CAF50; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;"><i class="fas fa-sign-in-alt" style="margin-right:5px;"></i>${window.getTranslation('hub_action_join', 'Join')}</button>`;

                if (room.gameStarted) {
                    // Live game in progress — show spectate button
                    status = window.getTranslation('hub_game_status_live', 'Live Game');
                    statusColor = '#f44336';
                    actionBtn = `<button onclick="viewLiveGame('${roomId}')" style="background:#2196F3; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;"><i class="fas fa-eye" style="margin-right:5px;"></i>${window.getTranslation('hub_action_view', 'View')}</button>`;
                } else if (room.creatorId) {
                    // Waiting for a player to join (joinerId may or may not be set)
                    if (room.joinerId) {
                        // Both players matched but game not started yet
                        status = window.getTranslation('hub_game_status_starting', 'Starting...');
                        statusColor = '#ff9800';
                        actionBtn = `<button disabled style="background:#555; color:#aaa; border:none; padding:8px 15px; border-radius:5px; cursor:not-allowed;"><i class="fas fa-hourglass-half" style="margin-right:5px;"></i>${window.getTranslation('hub_game_status_starting', 'Starting...')}</button>`;
                    }
                    // else: waiting for joiner — default join button is shown
                } else {
                    // No creatorId — incomplete/abandoned room, skip
                    return;
                }

                activeRoomsCount++;

                const card = document.createElement('div');
                card.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); box-shadow: 0 8px 32px rgba(0,0,0,0.2);';
                card.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: white; font-size: 1.1rem; font-weight: bold; margin-bottom: 5px;">
                            <i class="fas fa-chess-board" style="color: #ffd966; margin-right: 8px;"></i>${window.getTranslation('hub_game_title', 'Dama Game')}
                        </span>
                        <span style="color: #ccc; font-size: 0.9rem;">
                            ${window.getTranslation('hub_creator', 'Creator: ')}<strong>${room.creatorUsername || 'Unknown'}</strong>
                        </span>
                        <span style="color: ${statusColor}; font-size: 0.8rem; margin-top: 5px;">
                            <i class="fas fa-circle" style="font-size: 0.6rem; margin-right: 4px;"></i>${status}
                        </span>
                    </div>
                    <div>
                        ${actionBtn}
                    </div>
                `;

                listContainer.appendChild(card);
            });

            if (activeRoomsCount === 0) {
                listContainer.innerHTML = `<div style="text-align:center; color:#ccc; padding: 20px;"><i class="fas fa-moon" style="margin-right:8px;"></i>${window.getTranslation('hub_no_rooms', 'No live games available at the moment.')}</div>`;
            }
        }, (error) => {
            console.error("Error fetching live rooms: ", error);
            listContainer.innerHTML = `<div style="text-align:center; color:#ff6b6b; padding: 20px;"><i class="fas fa-exclamation-circle" style="margin-right:8px;"></i>${window.getTranslation('hub_failed', 'Failed to fetch live rooms.')}</div>`;
        });
}

function joinRoomHub(roomId) {
    // Navigate to dama section
    showSection('dama');

    // Switch to multiplayer mode automatically
    if (typeof showScreen === 'function') {
        showScreen('multiplayerModeScreen');
    }

    // Set the input field and call join
    const input = document.getElementById('joinRoomId');
    if (input) input.value = roomId;

    if (typeof joinRoom === 'function') {
        joinRoom(roomId);
    }
}

function viewLiveGame(roomId) {
    // Navigate to dama section
    showSection('dama');

    if (typeof spectateRoom === 'function') {
        spectateRoom(roomId);
    } else {
        console.error("spectateRoom is not implemented in multiplayer.js");
    }
}

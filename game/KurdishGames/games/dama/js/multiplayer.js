/* =====================================================
   DAMA GAME - MULTIPLAYER MODULE
   ===================================================== */

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Firestore availability check
let firebaseAvailable = false;
checkFirestoreAvailability();

async function checkFirestoreAvailability() {
    try {
        if (typeof firebase === 'undefined' || typeof firestore === 'undefined') {
            throw new Error('Firebase is not initialized');
        }

        const roomsQuery = firestore.collection('dama_rooms').limit(1);
        await roomsQuery.get();

        firebaseAvailable = true;
        console.log('[Multiplayer] Firestore connection successful');
    } catch (error) {
        firebaseAvailable = false;
        console.warn('[Multiplayer] Firestore not available:', error.message);
    }
}

// Multiplayer State
const multiplayer = {
    playerId: generatePlayerId(),
    roomId: null,
    playerRole: null, // 'creator' or 'joiner' or 'spectator'
    playerColor: null, // 'white' or 'black'
    opponentId: null,
    opponentColor: null,
    opponentUsername: null,
    opponentAvatar: null,
    opponentLevel: null,
    creatorAvatar: null,
    creatorLevel: null,
    joinerAvatar: null,
    joinerLevel: null,
    opponentDetailsFetched: false,
    spectatorDetailsFetched: false,
    gameMode: null, // 'online' multiplayer
    isPlayerTurn: false,
    gameStarted: false,
    roomListener: null,
    gameListener: null,
    timerInterval: null,
    turnTimeRemaining: 20, // 20 seconds per turn
    maxTurnTime: 20,
    isConnected: false,
    gameType: null, // 'standard' or 'compulsory'
};

// Make multiplayer accessible globally
window.multiplayer = multiplayer;

// =====================================================
// ROOM MANAGEMENT
// =====================================================

// Create a new multiplayer room
async function createRoom(gameMode, gameType) {
    try {
        console.log('[createRoom] Starting room creation with gameMode:', gameMode, 'gameType:', gameType);

        // Check if user is logged in
        const currentUserRaw = localStorage.getItem('currentUser');
        if (!currentUserRaw) {
            alert(window.getTranslation('mp_login_required', 'You must create an account first to play online! Opening Profile.'));
            if (typeof showSection === 'function') showSection('profile');
            return null;
        }
        const user = JSON.parse(currentUserRaw);
        const username = user.username;

        if (!firebaseAvailable) {
            const errorMsg = window.getTranslation('mp_db_unavailable', 'Firestore not available. Please check your Firebase setup and internet connection.');
            console.error('[createRoom] ' + errorMsg);
            alert(errorMsg);
            return null;
        }

        multiplayer.gameMode = gameMode;
        multiplayer.gameType = gameType;
        multiplayer.playerRole = 'creator';
        multiplayer.playerUsername = username; // Store username

        // Randomly assign creator's color
        multiplayer.playerColor = Math.random() > 0.5 ? 'white' : 'black';
        multiplayer.opponentColor = multiplayer.playerColor === 'white' ? 'black' : 'white';

        console.log('[createRoom] Player role set to creator, color:', multiplayer.playerColor, 'username:', username);

        // Use username as room ID
        const roomId = 'room_' + username + '_' + Date.now();
        const roomData = {
            roomId,
            creatorId: multiplayer.playerId,
            creatorUsername: username,
            creatorColor: multiplayer.playerColor,
            joinerColor: multiplayer.opponentColor,
            joinerId: null,
            joinerUsername: null,
            gameMode: gameMode,
            gameType: gameType,
            board: createInitialBoard(),
            capturedWhite: [],
            capturedBlack: [],
            currentPlayer: 'white',
            gameStarted: false,
            turnDuration: multiplayer.maxTurnTime,
            creatorBackground: getPlayerBackground(),
            creatorBoard: getPlayerBoardStyle(),
            creatorPiece: getPlayerPieceStyle(),
            creatorAvatar: getPlayerAvatar(),
            creatorFrame: getPlayerFrame(),
            creatorLevel: getPlayerLevel(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
            moves: []
        };

        await firestore.collection('dama_rooms').doc(roomId).set(roomData);
        multiplayer.roomId = roomId;

        console.log('[createRoom] Room created successfully:', multiplayer.roomId, 'by user:', username);

        // Start listening for joins
        startListeningToRoom(multiplayer.roomId);

        return multiplayer.roomId;
    } catch (error) {
        console.error('[createRoom] Error creating room:', error.message);
        console.error('[createRoom] Full error:', error);
        const errorMsg = window.getTranslation('mp_failed_create', 'Failed to create room: ') + error.message;
        alert(errorMsg);
        return null;
    }
}

// Get available rooms
async function getAvailableRooms() {
    try {
        if (!firebaseAvailable) {
            console.warn('Firestore not available');
            return [];
        }

        const roomsSnapshot = await firestore.collection('dama_rooms')
            .where('gameStarted', '==', false)
            .get();

        const rooms = [];
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        roomsSnapshot.forEach(doc => {
            const room = doc.data();
            // Only include valid rooms created recently, not stale, and not already joined
            if (room.creatorId && room.createdAt && room.createdAt > fiveMinutesAgo && !room.joinerId) {
                rooms.push(room);
            }
        });

        return rooms;
    } catch (error) {
        console.error('[getAvailableRooms] Error:', error);
        return [];
    }
}

// Join an existing room
async function joinRoom(roomId, gameType) {
    try {
        // Check if user is logged in
        const currentUserRaw = localStorage.getItem('currentUser');
        if (!currentUserRaw) {
            alert(window.getTranslation('mp_login_required', 'You must create an account first to play online! Opening Profile.'));
            if (typeof showSection === 'function') showSection('profile');
            return false;
        }

        const user = JSON.parse(currentUserRaw);
        const username = user.username;

        if (!firebaseAvailable) {
            alert(window.getTranslation('mp_db_unavailable', 'Firestore not available'));
            return false;
        }

        console.log('[joinRoom] Attempting to join room:', roomId, 'as user:', username);

        const roomRef = firestore.collection('dama_rooms').doc(roomId);
        const roomSnapshot = await roomRef.get();

        if (!roomSnapshot.exists) {
            alert(window.getTranslation('mp_room_not_found', 'Room not found'));
            return false;
        }

        const room = roomSnapshot.data();

        if (room.joinerId) {
            alert(window.getTranslation('mp_room_full', 'Room is already full'));
            return false;
        }

        if (room.gameStarted) {
            alert(window.getTranslation('mp_game_started', 'Game has already started'));
            return false;
        }

        multiplayer.roomId = roomId;
        multiplayer.gameMode = room.gameMode;
        multiplayer.gameType = room.gameType;
        multiplayer.playerRole = 'joiner';
        multiplayer.playerUsername = username;
        multiplayer.opponentId = room.creatorId;
        multiplayer.opponentUsername = room.creatorUsername;
        multiplayer.opponentDetailsFetched = true;
        fetchOpponentDetails(multiplayer.opponentUsername);
        multiplayer.playerColor = room.joinerColor;
        multiplayer.opponentColor = room.creatorColor;

        // Start listening before updating the room, so the joiner sees the full room state immediately.
        startListeningToRoom(roomId);

        await roomRef.update({
            joinerId: multiplayer.playerId,
            joinerUsername: username,
            joinerAvatar: getPlayerAvatar(),
            joinerFrame: getPlayerFrame(),
            joinerBoard: getPlayerBoardStyle(),
            joinerPiece: getPlayerPieceStyle(),
            joinerLevel: getPlayerLevel(),
            gameStarted: true,
            lastActivity: Date.now()
        });

        console.log('[joinRoom] Successfully joined room:', roomId);
        return true;
    } catch (error) {
        console.error('[joinRoom] Error joining room:', error);
        alert(window.getTranslation('mp_failed_join', 'Failed to join room. Please try again.'));
        return false;
    }
}

// Listen to room changes via Firestore snapshot
let roomListenerUnsubscribe = null;

function startListeningToRoom(roomId) {
    if (!firebaseAvailable) return;

    console.log('[startListeningToRoom] Starting Firestore listener for room:', roomId);
    const roomRef = firestore.collection('dama_rooms').doc(roomId);

    if (roomListenerUnsubscribe) {
        roomListenerUnsubscribe();
        roomListenerUnsubscribe = null;
    }

    roomListenerUnsubscribe = roomRef.onSnapshot(snapshot => {
        if (!snapshot.exists) {
            console.log('[startListeningToRoom] Room no longer available');
            onRoomDeleted();
            return;
        }

        const room = snapshot.data();
        handleRoomUpdate(room);
    }, error => {
        console.error('[startListeningToRoom] Firestore listener error:', error);
    });
}

function handleRoomUpdate(room) {
    // Keep room state updated early so splash screens and logic can access it
    multiplayer.lastRoomState = room;

    if (multiplayer.playerRole === 'spectator') {
        applyCreatorStyling(room);
        if (room.board) syncBoardState(room.board);
        syncCapturedPieces(room.capturedWhite, room.capturedBlack);
        if (typeof renderBoard === 'function') renderBoard();
        if (typeof updateUI === 'function') updateUI();

        // Sync turn timer
        syncTurnTimer(room);

        // Update current player if changed
        if (typeof gameState !== 'undefined' && gameState.currentPlayer !== room.currentPlayer) {
            gameState.currentPlayer = room.currentPlayer;
        }

        // Spectator: fetch creator and joiner details if not fetched yet
        if (!multiplayer.spectatorDetailsFetched && room.creatorUsername && room.joinerUsername) {
            multiplayer.spectatorDetailsFetched = true;
            fetchSpectatorPlayersDetails(room.creatorUsername, room.joinerUsername);
        }

        return;
    }

    // Apply creator's styling to joiner
    if (multiplayer.playerRole === 'joiner' && room.creatorBackground) {
        applyCreatorStyling(room);
    }

    // Auto-start game when both players are in the room and game is marked as started
    if (room.joinerId && room.creatorId && room.gameStarted === true) {
        if (!multiplayer.gameStarted) {
            console.log('[handleRoomUpdate] Both players in room, starting game preparation. Room:', room.roomId);
            multiplayer.gameStarted = true;

            if (multiplayer.playerRole === 'creator') {
                multiplayer.opponentId = room.joinerId;
                if (multiplayer.opponentUsername !== room.joinerUsername) {
                    multiplayer.opponentUsername = room.joinerUsername;
                    multiplayer.opponentDetailsFetched = false;
                }
            } else if (multiplayer.playerRole === 'joiner') {
                multiplayer.opponentId = room.creatorId;
                if (multiplayer.opponentUsername !== room.creatorUsername) {
                    multiplayer.opponentUsername = room.creatorUsername;
                    multiplayer.opponentDetailsFetched = false;
                }
            }

            if (typeof room.currentPlayer !== 'undefined' && typeof gameState !== 'undefined' && gameState) {
                gameState.currentPlayer = room.currentPlayer;
            }

            // Fetch opponent details from Firestore
            if (multiplayer.opponentUsername && !multiplayer.opponentDetailsFetched) {
                multiplayer.opponentDetailsFetched = true;
                fetchOpponentDetails(multiplayer.opponentUsername);
            }

            console.log('[handleRoomUpdate] Showing splash screen. Player role:', multiplayer.playerRole);
            // Show splash screen with 5-second countdown
            showGameStartSplash();
        }
    }

    // Check if opponent left after game started or during the countdown
    if (multiplayer.gameStarted && multiplayer.playerRole === 'creator' && !room.joinerId) {
        if (room.gameStarted === false) {
            console.log('[handleRoomUpdate] Opponent left before game start, returning to waiting state');
            multiplayer.gameStarted = false;
            showScreen('waitingScreen');
            const waitingStatus = document.getElementById('waitingStatus');
            if (waitingStatus) {
                waitingStatus.textContent = window.getTranslation('mp_opp_left_waiting', 'Opponent left. Waiting for a new opponent...');
            }
        } else {
            console.log('[handleRoomUpdate] Opponent left the room');
            stopTurnTimer();
            showOpponentLeftSplash();
        }
    }

    if (multiplayer.gameStarted && multiplayer.playerRole === 'joiner' && !room.creatorId) {
        console.log('[handleRoomUpdate] Creator left the room');
        stopTurnTimer();
        showOpponentLeftSplash();
    }

    // Update turn information if game has started
    if (room.gameStarted && typeof gameState !== 'undefined' && gameState) {
        if (typeof room.currentPlayer !== 'undefined') {
            gameState.currentPlayer = room.currentPlayer;
        }

        const isPlayerTurn =
            (room.currentPlayer === 'white' && multiplayer.playerColor === 'white') ||
            (room.currentPlayer === 'black' && multiplayer.playerColor === 'black');

        multiplayer.isPlayerTurn = isPlayerTurn;

        syncTurnTimer(room);

        // Update game board from room state
        if (room.board) {
            syncBoardState(room.board);
            syncCapturedPieces(room.capturedWhite, room.capturedBlack);
            if (typeof renderBoard === 'function') {
                renderBoard();
            }
            if (typeof updateUI === 'function') {
                updateUI();
            }
        }

        // Check if game has finished in multiplayer
        checkMultiplayerGameEnd();
    }
}

// Legacy function for compatibility
function listenToRoom(roomId) {
    startListeningToRoom(roomId);
}

// Sync board state from Firebase
function syncBoardState(boardData) {
    if (!boardData || typeof gameState === 'undefined' || !gameState) return;

    try {
        // Ensure board array exists before syncing
        if (!Array.isArray(gameState.board) || gameState.board.length !== 8) {
            gameState.board = Array.from({ length: 8 }, () => Array(8).fill(null));
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                gameState.board[row][col] = boardData[`${row}_${col}`] || null;
            }
        }
    } catch (error) {
        console.error('Error syncing board state:', error);
    }
}

// Apply creator's styling to the game
function applyCreatorStyling(room) {
    try {
        // Apply board style
        if (room.creatorBoard) {
            const gameBoard = document.querySelector('.game-board');
            if (gameBoard) {
                gameBoard.classList.remove('board-marble', 'board-neon', 'board-royal', 'board-cosmic');
                if (room.creatorBoard === 'dama_board_marble') {
                    gameBoard.classList.add('board-marble');
                } else if (room.creatorBoard === 'dama_board_neon') {
                    gameBoard.classList.add('board-neon');
                } else if (room.creatorBoard === 'dama_board_royal') {
                    gameBoard.classList.add('board-royal');
                } else if (room.creatorBoard === 'dama_board_cosmic') {
                    gameBoard.classList.add('board-cosmic');
                }
            }
        }

        // Store creator's piece type for later use
        window.creatorPieceType = room.creatorPiece || 'dama_piece_default';

        // Apply creator avatar/frame for opponent display (if available)
        if (room.creatorAvatar) {
            window.creatorAvatar = room.creatorAvatar;
        }
        if (room.creatorFrame) {
            window.creatorFrame = room.creatorFrame;
        }
    } catch (error) {
        console.error('Error applying creator styling:', error);
    }
}

// =====================================================
// GAME STATE MANAGEMENT
// =====================================================

// Update game state in Firestore
async function updateGameState(gameBoard, capturedWhite, capturedBlack, currentPlayer) {
    if (!multiplayer.roomId || !firebaseAvailable) return;

    try {
        const boardData = {};
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameBoard[row][col]) {
                    boardData[`${row}_${col}`] = gameBoard[row][col];
                }
            }
        }

        const updateData = {
            board: boardData,
            capturedWhite: capturedWhite,
            capturedBlack: capturedBlack,
            currentPlayer: currentPlayer,
            lastActivity: Date.now()
        };

        const roomRef = firestore.collection('dama_rooms').doc(multiplayer.roomId);
        await roomRef.update(updateData);
    } catch (error) {
        console.error('Error updating game state:', error);
    }
}

// Switch turn and start timer
async function switchMultiplayerTurn(nextPlayer) {
    if (!multiplayer.roomId || !firebaseAvailable) return;

    try {
        const roomRef = firestore.collection('dama_rooms').doc(multiplayer.roomId);
        await roomRef.update({
            currentPlayer: nextPlayer,
            turnStartedAt: Date.now(),
            turnDuration: multiplayer.maxTurnTime,
            lastActivity: Date.now()
        });

        multiplayer.isPlayerTurn =
            (nextPlayer === 'white' && multiplayer.playerColor === 'white') ||
            (nextPlayer === 'black' && multiplayer.playerColor === 'black');

        if (multiplayer.isPlayerTurn) {
            startTurnTimer();
        }

    } catch (error) {
        console.error('Error switching turn:', error);
    }
}

// =====================================================
// TURN TIMER
// ===================================================== 

function startTurnTimer() {
    multiplayer.turnTimeRemaining = multiplayer.maxTurnTime;

    // Clear existing timer
    if (multiplayer.timerInterval) {
        clearInterval(multiplayer.timerInterval);
    }

    // Update UI
    updateTimerDisplay();

    multiplayer.timerInterval = setInterval(() => {
        multiplayer.turnTimeRemaining--;
        updateTimerDisplay();

        if (multiplayer.turnTimeRemaining <= 0) {
            clearInterval(multiplayer.timerInterval);
            onPlayerTimeOut();
        }
    }, 1000);
}

function stopTurnTimer() {
    if (multiplayer.timerInterval) {
        clearInterval(multiplayer.timerInterval);
        multiplayer.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('turnTimer');
    if (timerElement) {
        const displayValue = Math.max(0, multiplayer.turnTimeRemaining);
        timerElement.textContent = displayValue;

        // Add warning color when time is low (5 seconds or less, but not 0)
        if (displayValue > 0 && displayValue <= 5) {
            timerElement.classList.add('timer-warning');
        } else {
            timerElement.classList.remove('timer-warning');
        }
    }
}

// Player ran out of time - automatically switch turn
async function onPlayerTimeOut() {
    console.log('Player ran out of time');
    stopTurnTimer();

    // Automatically switch turn to opponent
    const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
    gameState.currentPlayer = nextPlayer;
    gameState.selectedPiece = null;
    gameState.validMoves = [];

    await switchMultiplayerTurn(nextPlayer);
    await updateGameState(gameState.board, gameState.capturedWhite, gameState.capturedBlack, nextPlayer);

    if (typeof renderBoard === 'function') {
        renderBoard();
    }
    if (typeof updateUI === 'function') {
        updateUI();
    }
}

// =====================================================
// DISCONNECTION & ROOM CLEANUP
// =====================================================

async function leaveRoom() {
    try {
        stopTurnTimer();

        if (multiplayer.roomId && firebaseAvailable) {
            const roomRef = firestore.collection('dama_rooms').doc(multiplayer.roomId);
            const snapshot = await roomRef.get();

            if (snapshot.exists) {
                const room = snapshot.data();
                const isCreator = room.creatorId === multiplayer.playerId;
                const isJoiner = room.joinerId === multiplayer.playerId;
                const isSpectator = multiplayer.playerRole === 'spectator';

                if (isSpectator) {
                    console.log('Spectator leaving room, not modifying room doc.');
                } else if (isCreator) {
                    // Creator leaves: end the room for everyone
                    await roomRef.delete();
                } else if (isJoiner) {
                    if (room.gameStarted) {
                        // In-progress game ended when joiner leaves
                        await roomRef.delete();
                    } else {
                        // Joiner left before game start, keep room for creator
                        await roomRef.update({
                            joinerId: null,
                            gameStarted: false,
                            lastActivity: Date.now()
                        });
                    }
                } else {
                    // Fallback if we can't determine who left - do not modify room doc if guest
                    console.log('User leaving is not creator or joiner, not modifying room doc.');
                }
            }

            if (roomListenerUnsubscribe) {
                roomListenerUnsubscribe();
                roomListenerUnsubscribe = null;
            }
        }

        multiplayer.roomId = null;
        multiplayer.isConnected = false;
        multiplayer.gameStarted = false;

    } catch (error) {
        console.error('Error leaving room:', error);
    }
}

function showOpponentLeftSplash() {
    stopTurnTimer();
    const screen = document.getElementById('opponentLeftSplashScreen');
    if (screen) {
        showScreen('opponentLeftSplashScreen');
    }
}

function leaveMultiplayerGame() {
    // Don't immediately delete room - unsubscribe from listener first
    if (roomListenerUnsubscribe) {
        roomListenerUnsubscribe();
        roomListenerUnsubscribe = null;
    }

    // Mark room as abandoned but don't delete (let opponent see they left)
    if (multiplayer.roomId && firebaseAvailable) {
        try {
            const roomRef = firestore.collection('dama_rooms').doc(multiplayer.roomId);
            const isCreator = multiplayer.playerRole === 'creator';
            const isJoiner = multiplayer.playerRole === 'joiner';
            const isSpectator = multiplayer.playerRole === 'spectator';

            if (isSpectator) {
                console.log('Spectator leaving multiplayer game, not modifying room doc.');
            } else if (isCreator) {
                roomRef.delete().catch(e => console.log('Room delete error (expected):', e.message));
            } else if (isJoiner) {
                roomRef.update({
                    joinerId: null,
                    gameStarted: false,
                    lastActivity: Date.now()
                }).catch(e => console.log('Room update error (expected):', e.message));
            }
        } catch (e) {
            console.log('Error in leaveMultiplayerGame cleanup:', e);
        }
    }

    multiplayer.roomId = null;
    multiplayer.gameStarted = false;

    if (typeof backToModeScreen === 'function') {
        backToModeScreen();
    }
}

function onRoomDeleted() {
    stopTurnTimer();
    // Don't auto-redirect - let user see opponent left splash
    // The splash screen will have a Leave button for manual navigation
    if (!gameState.gameOver) {
        showOpponentLeftSplash();
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function createInitialBoard() {
    const boardData = {};

    // Place white pieces on rows 1 and 2
    for (let row = 1; row <= 2; row++) {
        for (let col = 0; col < 8; col++) {
            boardData[`${row}_${col}`] = { color: 'white', isKing: false };
        }
    }

    // Place black pieces on rows 5 and 6
    for (let row = 5; row <= 6; row++) {
        for (let col = 0; col < 8; col++) {
            boardData[`${row}_${col}`] = { color: 'black', isKing: false };
        }
    }

    return boardData;
}

function createBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Place white pieces on rows 1 and 2
    for (let row = 1; row <= 2; row++) {
        for (let col = 0; col < 8; col++) {
            board[row][col] = { color: 'white', isKing: false };
        }
    }

    // Place black pieces on rows 5 and 6
    for (let row = 5; row <= 6; row++) {
        for (let col = 0; col < 8; col++) {
            board[row][col] = { color: 'black', isKing: false };
        }
    }

    return board;
}

// Get player's background preference (placeholder)
// Get player's background preference
function getPlayerBackground() {
    // Prefer centralized playerDataManager, fallback to localStorage
    try {
        if (window.playerDataManager) {
            const d = window.playerDataManager.get() || {};
            return d.selectedItems?.global_background || localStorage.getItem('selectedBackground_dama') || 'dama_bg_default';
        }
    } catch (e) { }
    const damaBgId = localStorage.getItem('selectedBackground_dama');
    return damaBgId || 'dama_bg_default';
}

function getPlayerBoardStyle() {
    try {
        if (window.playerDataManager) {
            const d = window.playerDataManager.get() || {};
            return d.selectedItems?.dama_board || 'dama_board_default';
        }
    } catch (e) { }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let playerData = {};
    if (currentUser && currentUser.username) {
        playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
    }
    if (!playerData || Object.keys(playerData).length === 0) {
        playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
    }
    return playerData.selectedItems?.dama_board || 'dama_board_default';
}

function getPlayerPieceStyle() {
    try {
        if (window.playerDataManager) {
            const d = window.playerDataManager.get() || {};
            return d.selectedItems?.dama_piece || 'dama_piece_default';
        }
    } catch (e) { }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let playerData = {};
    if (currentUser && currentUser.username) {
        playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
    }
    if (!playerData || Object.keys(playerData).length === 0) {
        playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
    }
    return playerData.selectedItems?.dama_piece || 'dama_piece_default';
}

function getPlayerAvatar() {
    try {
        if (window.playerDataManager) {
            const d = window.playerDataManager.get() || {};
            // avatar stored as filename or as selectedItems
            return d.avatar || d.selectedItems?.global_avatar || null;
        }
    } catch (e) { }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let playerData = {};
    if (currentUser && currentUser.username) {
        playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
    }
    if (!playerData || Object.keys(playerData).length === 0) {
        playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
    }
    return playerData.avatar || playerData.selectedItems?.global_avatar || null;
}

function getPlayerFrame() {
    try {
        if (window.playerDataManager) {
            const d = window.playerDataManager.get() || {};
            return d.selectedItems?.global_frame || null;
        }
    } catch (e) { }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let playerData = {};
    if (currentUser && currentUser.username) {
        playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
    }
    if (!playerData || Object.keys(playerData).length === 0) {
        playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
    }
    return playerData.selectedItems?.global_frame || null;
}

function getPlayerLevel() {
    try {
        if (window.playerDataManager) {
            const data = window.playerDataManager.get();
            const score = data?.stats?.totalScore || 0;
            if (typeof calculateLevelFromScore === 'function') return calculateLevelFromScore(score).level;
            return Math.max(1, Math.floor(score / 100) + 1);
        }
    } catch (e) { }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let playerData = {};
    if (currentUser && currentUser.username) {
        playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
    }
    if (!playerData || Object.keys(playerData).length === 0) {
        playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
    }
    const score = playerData?.stats?.totalScore || 0;
    if (typeof calculateLevelFromScore === 'function') return calculateLevelFromScore(score).level;
    return Math.max(1, Math.floor(score / 100) + 1);
}

function syncCapturedPieces(capturedWhite, capturedBlack) {
    if (typeof gameState !== 'undefined' && gameState) {
        gameState.capturedWhite = capturedWhite || [];
        gameState.capturedBlack = capturedBlack || [];
        // Don't call updateUI here - it will be called by the listener separately
    }
}

// Sync turn timer from room state
function syncTurnTimer(room) {
    if (!room.turnStartedAt || !room.turnDuration) return;

    const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
    const remaining = Math.max(0, room.turnDuration - elapsed);

    multiplayer.turnTimeRemaining = remaining;

    // Stop any existing timer first
    stopTurnTimer();
    updateTimerDisplay();

    // Always start a countdown timer to show remaining time for both player and opponent
    if (remaining > 0) {
        multiplayer.timerInterval = setInterval(() => {
            multiplayer.turnTimeRemaining--;
            updateTimerDisplay();

            if (multiplayer.turnTimeRemaining <= 0) {
                clearInterval(multiplayer.timerInterval);
                if (multiplayer.isPlayerTurn) {
                    onPlayerTimeOut();
                }
            }
        }, 1000);
    }
}

function showMessage(message) {
    const feedbackElement = document.getElementById('feedbackMessage');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.style.display = 'block';
    }
}

function showError(error) {
    showMessage('Error: ' + error);
}

// =====================================================
// MULTIPLAYER GAME END CHECK
// =====================================================

function checkMultiplayerGameEnd() {
    if (!gameState || gameState.gameOver) return;

    const whiteCount = countPiecesOnline('white');
    const blackCount = countPiecesOnline('black');

    if (whiteCount === 0) {
        showGameWinnerSplash('black');
    } else if (blackCount === 0) {
        showGameWinnerSplash('white');
    }
}

function countPiecesOnline(color) {
    let count = 0;
    if (!gameState.board || !Array.isArray(gameState.board)) return 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col]?.color === color) {
                count++;
            }
        }
    }
    return count;
}

async function showGameWinnerSplash(winner) {
    if (gameState.gameOver) return; // Already ended

    function getStoredPlayerData(username) {
        if (!username) return null;
        try {
            const raw = localStorage.getItem(`playerData_${username}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function getProfileLevel(username) {
        if (multiplayer.lastRoomState) {
            const room = multiplayer.lastRoomState;
            if (username === room.creatorUsername && room.creatorLevel) return room.creatorLevel;
            if (username === room.joinerUsername && room.joinerLevel) return room.joinerLevel;
        }
        const profileData = getStoredPlayerData(username);
        const totalScore = profileData?.stats?.totalScore || 0;
        if (typeof calculateLevelFromScore === 'function') {
            return calculateLevelFromScore(totalScore).level;
        }
        return Math.max(1, Math.floor(totalScore / 100) + 1);
    }

    function getAvatarFile(username) {
        const profileData = getStoredPlayerData(username);
        if (profileData && profileData.avatar) return profileData.avatar;
        return 'avatar-default.png';
    }

    function getAvatarImagePath(avatarFile) {
        // For use in HTML img src attributes in dama context
        const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
        return isStandaloneDamaPage ? `../../assets/images/${avatarFile}` : `assets/images/${avatarFile}`;
    }

    gameState.gameOver = true;
    gameState.winner = winner;
    stopTurnTimer();

    const elapsedSeconds = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;
    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    const timePlayed = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
    const isPlayerWinner = (winner === multiplayer.playerColor);
    const rewardPoints = isPlayerWinner ? 50 : 10;
    const coinsEarned = isPlayerWinner ? 75 : 20;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const splashTitle = document.getElementById('winnerSplashTitle');
    const splashMessage = document.getElementById('winnerSplashMessage');

    const player1Username = currentUser?.username || window.getTranslation('profile_friend_btn_you', 'You');
    const player2Username = multiplayer.opponentUsername || window.getTranslation('mp_opponent', 'Opponent');
    const player1Avatar = getAvatarImagePath(getAvatarFile(player1Username));
    let player2AvatarFile = getAvatarFile(player2Username);
    if (multiplayer.opponentAvatar) {
        player2AvatarFile = multiplayer.opponentAvatar;
    }
    const player2Avatar = getAvatarImagePath(player2AvatarFile);
    const player1Level = getProfileLevel(player1Username);
    const player2Level = (player2Username === 'Opponent' || player2Username === window.getTranslation('mp_opponent', 'Opponent')) ? 1 : (multiplayer.opponentLevel || getProfileLevel(player2Username));
    const player1Status = isPlayerWinner ? window.getTranslation('dama_status_winner', 'Winner') : window.getTranslation('dama_status_loser', 'Loser');
    const player2Status = isPlayerWinner ? window.getTranslation('dama_status_loser', 'Loser') : window.getTranslation('dama_status_winner', 'Winner');
    const statusColor = isPlayerWinner ? '#4CAF50' : '#FF6B6B';

    splashTitle.innerHTML = isPlayerWinner
        ? `<i class="fas fa-trophy" style="color: #FFD700; margin-right: 10px;"></i>${window.getTranslation('dama_victory', 'Victory!')}`
        : `<i class="fas fa-flag-checkered" style="color: #FF6B6B; margin-right: 10px;"></i>${window.getTranslation('dama_defeated', 'Defeated')}`;
    splashTitle.style.color = statusColor;

    splashMessage.innerHTML = `
        <div style="display: grid; gap: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 15px;">
                <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 20px; text-align: center;">
                    <img src="${player1Avatar}" onerror="this.src='${getAvatarImagePath('avatar-default.png')}'" alt="${player1Username}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid #ffd966;">
                    <h3 style="margin: 0 0 8px; font-size: 18px;">${player1Username}</h3>
                    <p style="margin: 0 0 6px; color: #fff;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player1Level}</p>
                    <p style="margin: 0; color: ${player1Status === window.getTranslation('dama_status_winner', 'Winner') ? '#4CAF50' : '#FF6B6B'}; font-weight: 700;">${player1Status}</p>
                </div>
                <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 20px; text-align: center;">
                    <img src="${player2Avatar}" onerror="this.src='${getAvatarImagePath('avatar-default.png')}'" alt="${player2Username}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid #ffd966;">
                    <h3 style="margin: 0 0 8px; font-size: 18px;">${player2Username}</h3>
                    <p style="margin: 0 0 6px; color: #fff;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player2Level}</p>
                    <p style="margin: 0; color: ${player2Status === window.getTranslation('dama_status_winner', 'Winner') ? '#4CAF50' : '#FF6B6B'}; font-weight: 700;">${player2Status}</p>
                </div>
            </div>
            <div style="background: rgba(0,0,0,0.15); padding: 22px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); text-align: center;">
                <div style="font-size: 20px; color: #FFD700; margin-bottom: 14px; font-weight: bold; display: inline-flex; align-items: center; gap: 10px;"><i class="fas fa-star"></i> ${window.getTranslation('dama_points', 'Points: +')}${rewardPoints}</div>
                <div style="font-size: 16px; color: #fff; margin: 10px 0; display: inline-flex; align-items: center; gap: 10px;"><i class="fas fa-coins"></i> ${window.getTranslation('dama_coins_earned', 'Coins: +')}${coinsEarned}</div>
                <div style="font-size: 16px; color: #7dd3fc; margin-top: 8px; display: inline-flex; align-items: center; gap: 10px;"><i class="fas fa-hourglass-end"></i> ${window.getTranslation('dama_time', 'Time: ')}${timePlayed}</div>
            </div>
            <div style="text-align: center; color: #ddd; font-size: 14px;">${window.getTranslation('dama_waiting_seconds', 'Waiting for <strong>{sec} seconds</strong>...').replace('{sec}', '5')}</div>
            <div style="text-align: center; font-size: 28px; color: #ffd966; font-weight: 700;" id="resultCountdown">5</div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button id="splashLeaveGameButton" disabled style="padding: 12px 30px; font-size: 16px; background: #777; color: white; border: none; border-radius: 5px; cursor: not-allowed; opacity: 0.6;">
                <i class="fas fa-arrow-left"></i> ${window.getTranslation('dama_exit', 'Exit')}
            </button>
        </div>
    `;

    showScreen('winnerSplashScreen');

    let countdown = 5;
    const countdownEl = document.getElementById('resultCountdown');
    const leaveGameButton = document.getElementById('splashLeaveGameButton');
    const interval = setInterval(() => {
        countdown -= 1;
        if (countdownEl) countdownEl.textContent = countdown.toString();
        if (countdown <= 0) {
            clearInterval(interval);
            if (leaveGameButton) {
                leaveGameButton.disabled = false;
                leaveGameButton.style.background = '#2196F3';
                leaveGameButton.style.cursor = 'pointer';
                leaveGameButton.style.opacity = '1';
                leaveGameButton.onclick = leaveMultiplayerGame;
            }
        }
    }, 1000);

    // Close the room after the match ends so no one can rejoin it.
    if (multiplayer.roomId && firebaseAvailable) {
        try {
            await firestore.collection('dama_rooms').doc(multiplayer.roomId).delete();
        } catch (error) {
            console.warn('[showGameWinnerSplash] Could not delete finished room:', error);
        }
    }

    // Update player stats online (win/lose)
    try {
        if (typeof updatePlayerStats === 'function') {
            const myCaptures = multiplayer.playerColor === 'white' ? (gameState.capturedBlack ? gameState.capturedBlack.length : 0) : (gameState.capturedWhite ? gameState.capturedWhite.length : 0);
            const opCaptures = multiplayer.playerColor === 'white' ? (gameState.capturedWhite ? gameState.capturedWhite.length : 0) : (gameState.capturedBlack ? gameState.capturedBlack.length : 0);
            const myPromotions = gameState.kingPromotions || 0;

            // If Firestore is available and we have both usernames, try an atomic batch commit
            if (multiplayer.opponentUsername && typeof firestore !== 'undefined' && typeof firebase !== 'undefined' && firebase.firestore && currentUser && currentUser.username) {
                try {
                    const meRef = firestore.collection('players').doc(currentUser.username);
                    const opRef = firestore.collection('players').doc(multiplayer.opponentUsername);
                    const batch = firestore.batch();
                    
                    // Current player
                    batch.set(meRef, {
                        stats: {
                            totalScore: firebase.firestore.FieldValue.increment(rewardPoints),
                            gamesPlayed: firebase.firestore.FieldValue.increment(1),
                            onlineGames: firebase.firestore.FieldValue.increment(1),
                            onlineWins: firebase.firestore.FieldValue.increment(isPlayerWinner ? 1 : 0),
                            onlineLosses: firebase.firestore.FieldValue.increment(isPlayerWinner ? 0 : 1)
                        },
                        coins: firebase.firestore.FieldValue.increment(coinsEarned),
                        playtimeMinutes: firebase.firestore.FieldValue.increment(elapsedMinutes || 0),
                        gameStats: {
                            dama: {
                                name: "Dama",
                                totalGames: firebase.firestore.FieldValue.increment(1),
                                wins: firebase.firestore.FieldValue.increment(isPlayerWinner ? 1 : 0),
                                losses: firebase.firestore.FieldValue.increment(isPlayerWinner ? 0 : 1),
                                onlineWins: firebase.firestore.FieldValue.increment(isPlayerWinner ? 1 : 0),
                                onlineLosses: firebase.firestore.FieldValue.increment(isPlayerWinner ? 0 : 1),
                                totalScore: firebase.firestore.FieldValue.increment(rewardPoints),
                                captures: firebase.firestore.FieldValue.increment(myCaptures),
                                kingPromotions: firebase.firestore.FieldValue.increment(myPromotions),
                                lastPlayed: new Date().toLocaleString(),
                                favoriteMoves: "N/A"
                            }
                        }
                    }, { merge: true });
                    
                    // Opponent inverse
                    const opponentResult = isPlayerWinner ? 'loss' : 'win';
                    const opponentPoints = isPlayerWinner ? 10 : 50;
                    const opponentCoins = isPlayerWinner ? 20 : 75;
                    batch.set(opRef, {
                        stats: {
                            totalScore: firebase.firestore.FieldValue.increment(opponentPoints),
                            gamesPlayed: firebase.firestore.FieldValue.increment(1),
                            onlineGames: firebase.firestore.FieldValue.increment(1),
                            onlineWins: firebase.firestore.FieldValue.increment(opponentResult === 'win' ? 1 : 0),
                            onlineLosses: firebase.firestore.FieldValue.increment(opponentResult === 'loss' ? 1 : 0)
                        },
                        coins: firebase.firestore.FieldValue.increment(opponentCoins),
                        playtimeMinutes: firebase.firestore.FieldValue.increment(elapsedMinutes || 0),
                        gameStats: {
                            dama: {
                                name: "Dama",
                                totalGames: firebase.firestore.FieldValue.increment(1),
                                wins: firebase.firestore.FieldValue.increment(opponentResult === 'win' ? 1 : 0),
                                losses: firebase.firestore.FieldValue.increment(opponentResult === 'loss' ? 1 : 0),
                                onlineWins: firebase.firestore.FieldValue.increment(opponentResult === 'win' ? 1 : 0),
                                onlineLosses: firebase.firestore.FieldValue.increment(opponentResult === 'loss' ? 1 : 0),
                                totalScore: firebase.firestore.FieldValue.increment(opponentPoints),
                                captures: firebase.firestore.FieldValue.increment(opCaptures),
                                kingPromotions: firebase.firestore.FieldValue.increment(0),
                                lastPlayed: new Date().toLocaleString(),
                                favoriteMoves: "N/A"
                            }
                        }
                    }, { merge: true });
                    await batch.commit();
                } catch (err) {
                    console.warn('[multiplayer] Batch commit failed, falling back:', err);
                    updatePlayerStats('online-multiplayer', isPlayerWinner ? 'win' : 'loss', rewardPoints, coinsEarned, elapsedMinutes);
                    if (typeof updateGameStats === 'function') {
                        updateGameStats('dama', isPlayerWinner ? 'online-win' : 'online-loss', rewardPoints, {
                            captures: myCaptures,
                            kingPromotions: myPromotions,
                            lastPlayed: new Date().toLocaleString(),
                            favoriteMoves: 'N/A'
                        });
                    }
                    if (multiplayer.opponentUsername && typeof updateOtherPlayerStats === 'function') {
                        const opponentResult = isPlayerWinner ? 'loss' : 'win';
                        const opponentPoints = isPlayerWinner ? 10 : 50;
                        const opponentCoins = isPlayerWinner ? 20 : 75;
                        updateOtherPlayerStats(multiplayer.opponentUsername, 'online-multiplayer', opponentResult, opponentPoints, opponentCoins, elapsedMinutes);
                        if (typeof updateOtherGameStats === 'function') {
                            updateOtherGameStats(multiplayer.opponentUsername, 'dama', opponentResult === 'win' ? 'online-win' : 'online-loss', opponentPoints, {
                                captures: opCaptures,
                                kingPromotions: 0,
                                lastPlayed: new Date().toLocaleString(),
                                favoriteMoves: 'N/A'
                            });
                        }
                    }
                }
            } else {
                // Fallback: update current player and separately update opponent
                updatePlayerStats('online-multiplayer', isPlayerWinner ? 'win' : 'loss', rewardPoints, coinsEarned, elapsedMinutes);
                if (typeof updateGameStats === 'function') {
                    updateGameStats('dama', isPlayerWinner ? 'online-win' : 'online-loss', rewardPoints, {
                        captures: myCaptures,
                        kingPromotions: myPromotions,
                        lastPlayed: new Date().toLocaleString(),
                        favoriteMoves: 'N/A'
                    });
                }
                if (multiplayer.opponentUsername && typeof updateOtherPlayerStats === 'function') {
                    const opponentResult = isPlayerWinner ? 'loss' : 'win';
                    const opponentPoints = isPlayerWinner ? 10 : 50;
                    const opponentCoins = isPlayerWinner ? 20 : 75;
                    updateOtherPlayerStats(multiplayer.opponentUsername, 'online-multiplayer', opponentResult, opponentPoints, opponentCoins, elapsedMinutes);
                    if (typeof updateOtherGameStats === 'function') {
                        updateOtherGameStats(multiplayer.opponentUsername, 'dama', opponentResult === 'win' ? 'online-win' : 'online-loss', opponentPoints, {
                            captures: opCaptures,
                            kingPromotions: 0,
                            lastPlayed: new Date().toLocaleString(),
                            favoriteMoves: 'N/A'
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[multiplayer] Failed to update player stats:', e);
    }
}

// =====================================================
// GAME START SPLASH SCREEN
// =====================================================

function showGameStartSplash() {
    const screen = document.getElementById('gameStartSplashScreen');
    if (!screen) return;

    // For online multiplayer, show the online match splash instead
    if (multiplayer.playerRole) {
        showOnlineMatchStartSplash();
        return;
    }

    // Set player role and color info
    const role = multiplayer.playerRole === 'creator' ? window.getTranslation('mp_creator_lbl', 'Creator') : window.getTranslation('mp_guest_lbl', 'Guest');
    const color = multiplayer.playerColor === 'white' ? window.getTranslation('dama_color_white', 'White') : window.getTranslation('dama_color_black', 'Black');
    const firstPlayer = typeof gameState !== 'undefined' && gameState ?
        (gameState.currentPlayer === 'white' ? window.getTranslation('dama_color_white', 'White') : window.getTranslation('dama_color_black', 'Black')) : window.getTranslation('dama_color_white', 'White');

    document.getElementById('splashPlayerRole').textContent = role;
    document.getElementById('splashPlayerColor').textContent = color;
    document.getElementById('splashFirstPlayer').textContent = firstPlayer;

    showScreen('gameStartSplashScreen');

    // Auto-start after 2 seconds without visible countdown
    setTimeout(() => {
        startOnlineGame();
    }, 2000);
}

function showOnlineMatchStartSplash() {
    // Helper functions (same as in showGameWinnerSplash)
    function getStoredPlayerData(username) {
        if (!username) return null;
        try {
            const raw = localStorage.getItem(`playerData_${username}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function getProfileLevel(username) {
        if (multiplayer.lastRoomState) {
            const room = multiplayer.lastRoomState;
            if (username === room.creatorUsername && room.creatorLevel) return room.creatorLevel;
            if (username === room.joinerUsername && room.joinerLevel) return room.joinerLevel;
        }
        const profileData = getStoredPlayerData(username);
        const totalScore = profileData?.stats?.totalScore || 0;
        if (typeof calculateLevelFromScore === 'function') {
            return calculateLevelFromScore(totalScore).level;
        }
        return Math.max(1, Math.floor(totalScore / 100) + 1);
    }

    function getAvatarImagePathFromFile(avatarFile) {
        const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
        return isStandaloneDamaPage ? `../../assets/images/${avatarFile}` : `assets/images/${avatarFile}`;
    }

    // Player 1 is the current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const player1Username = currentUser?.username || window.getTranslation('profile_friend_btn_you', 'You');
    let player1AvatarFile = 'avatar-default.png';
    if (window.playerDataManager) {
        player1AvatarFile = window.playerDataManager.get().avatar || player1AvatarFile;
    } else {
        const pd = getStoredPlayerData(player1Username);
        if (pd?.avatar) player1AvatarFile = pd.avatar;
    }

    // Player 2: prefer room-stored customization, fall back to stored data
    const player2Username = multiplayer.opponentUsername || window.getTranslation('mp_opponent', 'Opponent');
    let player2AvatarFile = 'avatar-default.png';
    if (multiplayer.lastRoomState) {
        // If we are the joiner, the creator info is in lastRoomState.creatorAvatar
        const room = multiplayer.lastRoomState;
        if (multiplayer.playerRole === 'joiner' && room.creatorAvatar) {
            player2AvatarFile = room.creatorAvatar;
        } else if (multiplayer.playerRole === 'creator' && room.joinerAvatar) {
            player2AvatarFile = room.joinerAvatar;
        }
    }
    if (player2AvatarFile === 'avatar-default.png') {
        const pd2 = getStoredPlayerData(player2Username);
        if (pd2?.avatar) player2AvatarFile = pd2.avatar;
    }

    // OVERRIDE WITH REAL-TIME FIRESTORE DATA IF AVAILABLE
    if (multiplayer.opponentAvatar) {
        player2AvatarFile = multiplayer.opponentAvatar;
    }

    const player1Avatar = getAvatarImagePathFromFile(player1AvatarFile);
    const player2Avatar = getAvatarImagePathFromFile(player2AvatarFile);
    const player1Level = getProfileLevel(player1Username);
    const player2Level = multiplayer.opponentLevel || getProfileLevel(player2Username);

    const playersInfoDiv = document.getElementById('onlineMatchPlayersInfo');
    if (playersInfoDiv) {
        playersInfoDiv.innerHTML = `
            <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 20px; text-align: center;">
                <img src="${player1Avatar}" onerror="this.src='${getAvatarImagePathFromFile('avatar-default.png')}'" alt="${player1Username}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid #ffd966;">
                <h3 style="margin: 0 0 8px; font-size: 18px; color: #fff;">${player1Username}</h3>
                <p style="margin: 0; color: #aaa; font-size: 14px;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player1Level}</p>
            </div>
            <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 20px; text-align: center;">
                <img src="${player2Avatar}" onerror="this.src='${getAvatarImagePathFromFile('avatar-default.png')}'" alt="${player2Username}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid #ffd966;">
                <h3 style="margin: 0 0 8px; font-size: 18px; color: #fff;">${player2Username}</h3>
                <p style="margin: 0; color: #aaa; font-size: 14px;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player2Level}</p>
            </div>
        `;
    }

    showScreen('onlineMatchStartSplashScreen');

    // Start 5-second countdown
    let countdown = 5;
    const countdownEl = document.getElementById('onlineMatchCountdown');

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startOnlineGame();
        }
    }, 1000);
}

// =====================================================
// ROOM CLEANUP UTILITIES
// =====================================================

// Clean up stale rooms that haven't been active for more than 30 minutes
async function cleanupStaleRooms() {
    if (!firebaseAvailable) return;

    try {
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        const roomsSnapshot = await firestore.collection('dama_rooms')
            .where('lastActivity', '<', thirtyMinutesAgo)
            .get();

        const deletePromises = [];
        roomsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} stale rooms`);
    } catch (error) {
        console.error('Error cleaning up stale rooms:', error);
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupStaleRooms, 10 * 60 * 1000);


// =====================================================
// SPECTATOR MODE
// =====================================================

async function spectateRoom(roomId) {
    try {
        if (!firebaseAvailable) {
            alert(window.getTranslation('mp_db_unavailable', 'Firestore not available'));
            return;
        }

        const roomRef = firestore.collection('dama_rooms').doc(roomId);
        const roomSnap = await roomRef.get();

        if (!roomSnap.exists) {
            alert(window.getTranslation('mp_room_not_exists', 'Room no longer exists.'));
            return;
        }

        const room = roomSnap.data();
        if (!room.gameStarted) {
            alert(window.getTranslation('mp_game_not_started', 'Game has not started yet.'));
            return;
        }

        multiplayer.roomId = roomId;
        multiplayer.playerRole = 'spectator';
        multiplayer.gameStarted = true;
        multiplayer.lastRoomState = room;

        showScreen('gameScreen');

        const bottomActionContainer = document.getElementById('bottomActionContainer');
        if (bottomActionContainer) bottomActionContainer.style.display = 'flex';

        const newGameButton = document.getElementById('newGameButton');
        if (newGameButton) newGameButton.style.display = 'none';

        const gameBackButton = document.getElementById('gameBackButton');
        if (gameBackButton) gameBackButton.style.display = 'none';

        const leaveGameButton = document.getElementById('leaveGameButton');
        if (leaveGameButton) {
            leaveGameButton.style.display = 'block';
            leaveGameButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Stop Spectating';
            leaveGameButton.onclick = function () {
                if (roomListenerUnsubscribe) roomListenerUnsubscribe();
                multiplayer.roomId = null;
                multiplayer.gameStarted = false;
                multiplayer.playerRole = null;
                showSection('multiplayer');
            };
        }

        // Fake game start to render board properly
        if (typeof startOnlineGame === 'function') startOnlineGame();

        startListeningToRoom(roomId);

        return true;
    } catch (error) {
        console.error('[spectateRoom] Error spectating room:', error);
        alert(window.getTranslation('mp_failed_spectate', 'Failed to spectate room.'));
        return false;
    }
}


function fetchOpponentDetails(username) {
    if (!username || username === 'Opponent' || typeof firestore === 'undefined') return;
    firestore.collection('players').doc(username).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            multiplayer.opponentAvatar = data.avatar || 'avatar-default.png';
            const score = data.stats?.totalScore || 0;
            if (typeof calculateLevelFromScore === 'function') {
                multiplayer.opponentLevel = calculateLevelFromScore(score).level;
            } else {
                multiplayer.opponentLevel = Math.max(1, Math.floor(score / 100) + 1);
            }
            console.log('[fetchOpponentDetails] Loaded opponent details from Firestore:', username, multiplayer.opponentAvatar, multiplayer.opponentLevel);
            if (typeof updateMultiplayerVsBanner === 'function') {
                updateMultiplayerVsBanner();
            }
        }
    }).catch(e => {
        console.warn('[fetchOpponentDetails] Failed to fetch details from Firestore:', e);
    });
}

function fetchSpectatorPlayersDetails(creatorUsername, joinerUsername) {
    if (typeof firestore === 'undefined') return;
    let p1Promise = Promise.resolve();
    let p2Promise = Promise.resolve();

    if (creatorUsername) {
        p1Promise = firestore.collection('players').doc(creatorUsername).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                multiplayer.creatorAvatar = data.avatar || 'avatar-default.png';
                const score = data.stats?.totalScore || 0;
                multiplayer.creatorLevel = typeof calculateLevelFromScore === 'function' ? calculateLevelFromScore(score).level : Math.max(1, Math.floor(score / 100) + 1);
            }
        });
    }

    if (joinerUsername) {
        p2Promise = firestore.collection('players').doc(joinerUsername).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                multiplayer.joinerAvatar = data.avatar || 'avatar-default.png';
                const score = data.stats?.totalScore || 0;
                multiplayer.joinerLevel = typeof calculateLevelFromScore === 'function' ? calculateLevelFromScore(score).level : Math.max(1, Math.floor(score / 100) + 1);
            }
        });
    }

    Promise.all([p1Promise, p2Promise]).then(() => {
        if (typeof updateMultiplayerVsBanner === 'function') {
            updateMultiplayerVsBanner();
        }
    }).catch(e => {
        console.warn('[fetchSpectatorPlayersDetails] Failed:', e);
    });
}

function updateMultiplayerVsBanner() {
    const vsInfoDiv = document.getElementById('multiplayerVsInfo');
    if (!vsInfoDiv) return;

    if (gameState.gameMode !== 'online-multiplayer') {
        vsInfoDiv.style.display = 'none';
        return;
    }

    const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
    const getAvatarPath = (file) => isStandaloneDamaPage ? '../../assets/images/' + file : 'assets/images/' + file;

    function getStoredData(username) {
        if (!username) return null;
        try { return JSON.parse(localStorage.getItem('playerData_' + username) || 'null'); } catch (e) { return null; }
    }
    function getLevel(username) {
        const pd = getStoredData(username);
        const score = pd?.stats?.totalScore || 0;
        if (typeof calculateLevelFromScore === 'function') return calculateLevelFromScore(score).level;
        return Math.max(1, Math.floor(score / 100) + 1);
    }

    // Player 1 is the current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const player1Username = currentUser?.username || 'You';
    let player1AvatarFile = 'avatar-default.png';
    if (window.playerDataManager) {
        player1AvatarFile = window.playerDataManager.get().avatar || player1AvatarFile;
    } else {
        const pd = getStoredData(player1Username);
        if (pd?.avatar) player1AvatarFile = pd.avatar;
    }

    // Player 2: prefer room-stored customization, fall back to stored data
    const player2Username = multiplayer.opponentUsername || window.getTranslation('mp_opponent', 'Opponent');
    let player2AvatarFile = 'avatar-default.png';
    if (multiplayer.lastRoomState) {
        const room = multiplayer.lastRoomState;
        if (multiplayer.playerRole === 'joiner' && room.creatorAvatar) {
            player2AvatarFile = room.creatorAvatar;
        } else if (multiplayer.playerRole === 'creator' && room.joinerAvatar) {
            player2AvatarFile = room.joinerAvatar;
        } else if (multiplayer.playerRole === 'spectator' && room.creatorAvatar && room.joinerAvatar) {
            player1AvatarFile = room.creatorAvatar;
            player2AvatarFile = room.joinerAvatar;
        }
    }

    if (player2AvatarFile === 'avatar-default.png') {
        const pd2 = getStoredData(player2Username);
        if (pd2?.avatar) player2AvatarFile = pd2.avatar;
    }

    // OVERRIDE AVATARS WITH REAL-TIME FIRESTORE DATA IF AVAILABLE
    if (multiplayer.playerRole === 'creator' || multiplayer.playerRole === 'joiner') {
        if (multiplayer.opponentAvatar) {
            player2AvatarFile = multiplayer.opponentAvatar;
        }
    } else if (multiplayer.playerRole === 'spectator') {
        if (multiplayer.creatorAvatar) {
            player1AvatarFile = multiplayer.creatorAvatar;
        }
        if (multiplayer.joinerAvatar) {
            player2AvatarFile = multiplayer.joinerAvatar;
        }
    }

    const player1Avatar = getAvatarPath(player1AvatarFile);
    const player2Avatar = getAvatarPath(player2AvatarFile);

    let p1Name = player1Username;
    let p2Name = player2Username;
    let p1Level = getLevel(p1Name);
    let p2Level = getLevel(p2Name);

    if (multiplayer.lastRoomState) {
        const room = multiplayer.lastRoomState;
        if (multiplayer.playerRole === 'joiner' && room.creatorLevel) p2Level = room.creatorLevel;
        if (multiplayer.playerRole === 'creator' && room.joinerLevel) p2Level = room.joinerLevel;

        if (multiplayer.playerRole === 'spectator') {
            p1Name = room.creatorUsername || window.getTranslation('mp_creator_lbl', 'Creator');
            p2Name = room.joinerUsername || window.getTranslation('mp_joiner_lbl', 'Joiner');
            p1Level = room.creatorLevel || getLevel(p1Name);
            p2Level = room.joinerLevel || getLevel(p2Name);
        }
    }

    // OVERRIDE LEVELS WITH REAL-TIME FIRESTORE DATA IF AVAILABLE
    if (multiplayer.playerRole === 'creator' || multiplayer.playerRole === 'joiner') {
        if (multiplayer.opponentLevel) {
            p2Level = multiplayer.opponentLevel;
        }
    } else if (multiplayer.playerRole === 'spectator') {
        if (multiplayer.creatorLevel) {
            p1Level = multiplayer.creatorLevel;
        }
        if (multiplayer.joinerLevel) {
            p2Level = multiplayer.joinerLevel;
        }
    }

    // Ensure we resolve the real username for clicking even if display name is 'You' or 'Opponent'
    const p1ProfileUsername = (multiplayer.playerRole === 'spectator') ? p1Name : (currentUser?.username || '');
    const p2ProfileUsername = (multiplayer.playerRole === 'spectator') ? p2Name : (multiplayer.opponentUsername || '');

    vsInfoDiv.style.display = 'flex';
    vsInfoDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); cursor:pointer;" onclick="if(typeof showGlobalProfile === 'function' && '${p1ProfileUsername}') showGlobalProfile('${p1ProfileUsername}')">
            <img src="${player1Avatar}" onerror="this.src='${getAvatarPath('avatar-default.png')}'" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border: 2px solid #ffd966; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <div style="display:flex; flex-direction:column; line-height: 1.2;">
                <span style="color:white; font-size:16px; font-weight:bold;">${p1Name}</span>
                <span style="color:#ccc; font-size:13px;">Lv ${p1Level}</span>
            </div>
        </div>
        <div style="color:#ffd966; font-weight:bold; font-size:22px;">VS</div>
        <div style="display:flex; align-items:center; gap:10px; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); cursor:pointer;" onclick="if(typeof showGlobalProfile === 'function' && '${p2ProfileUsername}') showGlobalProfile('${p2ProfileUsername}')">
            <div style="display:flex; flex-direction:column; line-height: 1.2; text-align:right;">
                <span style="color:white; font-size:16px; font-weight:bold;">${p2Name}</span>
                <span style="color:#ccc; font-size:13px;">Lv ${p2Level}</span>
            </div>
            <img src="${player2Avatar}" onerror="this.src='${getAvatarPath('avatar-default.png')}'" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border: 2px solid #ffd966; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        </div>
    `;
}











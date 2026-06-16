/* =====================================================
   DAMA GAME - MAIN LOGIC (SLEMANI DAMA)
   ===================================================== */

// Ensure multiplayer.js is loaded
if (typeof window.multiplayer === 'undefined') {
    console.error('FATAL: multiplayer.js failed to load');
}

// Game State
const gameState = {
    board: [],
    currentPlayer: 'white',
    playerColor: null, // 'white' or 'black' - the human player's color
    aiColor: null, // 'white' or 'black' - the AI's color
    gameMode: null, // 'single-player' or 'two-player'
    gameType: null, // 'standard' or 'compulsory'
    aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
    selectedPiece: null,
    validMoves: [],
    capturedWhite: [],
    capturedBlack: [],
    gameOver: false,
    winner: null,
    aiThinking: false,
    lastInvalidMove: false,
    isChainCapture: false, // Track if we're in a chain capture sequence
    lastMovedPiece: null, // Track the piece that just moved for chain captures
    glowingPieces: [] // Track pieces that should glow for Hukum mode
};

function getDamaAssetPath(filename) {
    const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
    return isStandaloneDamaPage ? `assets/images/${filename}` : `games/dama/assets/images/${filename}`;
}

function getGlobalAssetPath(filename) {
    const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
    return isStandaloneDamaPage ? `../../assets/images/${filename}` : `assets/images/${filename}`;
}

// Load Dama background (uses Global background from main store)
function loadDamaBackground() {
    try {
        let globalBgId;
        if (typeof multiplayer !== 'undefined' && multiplayer.gameStarted && multiplayer.lastRoomState && multiplayer.lastRoomState.creatorBackground) {
            globalBgId = multiplayer.lastRoomState.creatorBackground;
        } else {
            let playerData = {};
            if (window.playerDataManager) {
                playerData = window.playerDataManager.get() || {};
            } else {
                playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
            }
            globalBgId = playerData.selectedItems?.global_background;
        }
        
        if (globalBgId) {
            const backgroundMap = {
                'global_bg_default': { desktop: getGlobalAssetPath('bg-desktop.png'), mobile: getGlobalAssetPath('bg-mobile.png') },
                'global_bg_mandala': { desktop: getGlobalAssetPath('bg-mandala-desktop.png'), mobile: getGlobalAssetPath('bg-mandala-mobile.png') },
'global_bg_sunset': { desktop: getGlobalAssetPath('bg-sunset-desktop.png'), mobile: getGlobalAssetPath('bg-sunset-mobile.png') },
'global_bg_midnight': { desktop: getGlobalAssetPath('bg-midnight-desktop.png'), mobile: getGlobalAssetPath('bg-midnight-mobile.png') }
            };
            
            const bgPaths = backgroundMap[globalBgId];
            if (bgPaths) {
                const isMobile = window.innerWidth <= 768;
                const bgPath = isMobile ? bgPaths.mobile : bgPaths.desktop;
                
                const elements = ['modeBackground', 'typeBackground', 'difficultyBackground', 'gameBackground'];
                elements.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.backgroundImage = `url('${bgPath}')`;
                });
                return true;
            }
        }
    } catch (e) {
        console.log('Error loading global background for Dama:', e);
    }
    return false;
}

// Load selected board and pieces from store
function loadSelectedBoardAndPieces() {
    try {
        let boardId, pieceId;
        
        // In multiplayer, use creator's choice overriding local player data
        if (typeof multiplayer !== 'undefined' && multiplayer.gameStarted && multiplayer.lastRoomState) {
            boardId = multiplayer.lastRoomState.creatorBoard;
            pieceId = multiplayer.lastRoomState.creatorPiece;
        } else {
            let playerData = {};
            if (window.playerDataManager) {
                playerData = window.playerDataManager.get() || {};
            } else {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (currentUser && currentUser.username) {
                    playerData = JSON.parse(localStorage.getItem(`playerData_${currentUser.username}`) || '{}');
                }
                if (!playerData || Object.keys(playerData).length === 0) {
                    playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
                }
            }
            boardId = playerData.selectedItems?.dama_board;
            pieceId = playerData.selectedItems?.dama_piece;
        }
        
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            // Remove old board class
            gameBoard.classList.remove('board-marble', 'board-neon', 'board-royal', 'board-cosmic');
            
            // Apply selected board style
            if (boardId === 'dama_board_marble') {
                gameBoard.classList.add('board-marble');
            } else if (boardId === 'dama_board_neon') {
                gameBoard.classList.add('board-neon');
            } else if (boardId === 'dama_board_royal') {
                gameBoard.classList.add('board-royal');
            } else if (boardId === 'dama_board_cosmic') {
                gameBoard.classList.add('board-cosmic');
            }
        }
        
        // Store piece selection for later use when pieces are created
        window.selectedPieceType = pieceId || 'dama_piece_default';
        window.creatorPieceType = pieceId; // ensure it is set for multiplayer override consistency
    } catch (e) {
        console.log('No board/piece selection found', e);
    }
}

// Initialize Game
let damaInitialized = false;

function initializeDama() {
    if (damaInitialized) return;
    const customBgLoaded = loadDamaBackground();
    if (!customBgLoaded) {
        setupBackgroundImages();
    }
    loadSelectedBoardAndPieces();
    setupEventListeners();
    initializeFooterNav();
    
    // Subscribe to store updates for real-time item changes
    if (window.playerDataManager) {
        window.playerDataManager.subscribe(() => {
            if (typeof multiplayer !== 'undefined' && multiplayer.gameStarted) {
                return; // Don't override mid-game multiplayer styles
            }
            loadSelectedBoardAndPieces();
            const bgLoaded = loadDamaBackground();
            if (!bgLoaded) {
                setupBackgroundImages();
            }
            // Re-render board immediately to apply piece styles if playing single player or waiting
            renderBoard();
        });
    }

    damaInitialized = true;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDama);
} else {
    initializeDama();
}

// Helper to open the Dama section from SPA and ensure the mode screen is visible
function openDamaSection() {
    initializeDama();
    if (typeof showSection === 'function') showSection('dama');
    // Ensure internal screens state: activate modeScreen and deactivate others
    document.querySelectorAll('#dama .game-screen').forEach(el => el.classList.remove('active'));
    const mode = document.getElementById('modeScreen');
    if (mode) mode.classList.add('active');
    // ensure footer nav visibility is correct
    const footerNav = document.querySelector('#dama .footer-nav');
    if (footerNav) footerNav.classList.remove('hidden');
    // Scroll to top for visibility
    const ds = document.getElementById('dama');
    if (ds) ds.scrollTop = 0;
}

window.openDamaSection = openDamaSection;

function setupBackgroundImages() {
    const isMobile = window.innerWidth <= 768;
    const bgFile = isMobile ? 'mobile_background1.png' : 'pc_background1.png';
    const bgPath = getDamaAssetPath(bgFile);

    ['modeBackground', 'typeBackground', 'difficultyBackground', 'gameBackground'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.backgroundImage = `url('${bgPath}')`;
    });
}

window.addEventListener('resize', function() {
    if (!loadDamaBackground()) {
        setupBackgroundImages();
    }
});

// Clean up multiplayer rooms when leaving the page
window.addEventListener('beforeunload', function() {
    if (typeof multiplayer !== 'undefined' && multiplayer.roomId) {
        // Synchronous cleanup - set a flag for cleanup
        localStorage.setItem('cleanupRoom', multiplayer.roomId);
        localStorage.setItem('cleanupRole', multiplayer.playerRole);
    }
});

// Clean up room on page load if needed
window.addEventListener('load', function() {
    const cleanupRoomId = localStorage.getItem('cleanupRoom');
    const cleanupRole = localStorage.getItem('cleanupRole');
    
    if (cleanupRoomId && cleanupRole) {
        // Clean up the room asynchronously
        setTimeout(async () => {
            try {
                if (typeof firestore !== 'undefined') {
                    const roomRef = firestore.collection('dama_rooms').doc(cleanupRoomId);
                    const snapshot = await roomRef.get();
                    
                    if (snapshot.exists) {
                        const room = snapshot.data();
                        
                        if (cleanupRole === 'creator') {
                            await roomRef.delete();
                        } else {
                            await roomRef.update({
                                joinerId: null,
                                gameStarted: false,
                                lastActivity: Date.now()
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error cleaning up room:', error);
            }
        }, 100);
        
        localStorage.removeItem('cleanupRoom');
        localStorage.removeItem('cleanupRole');
    }
});

let audioContext;
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(type) {
    if (localStorage.getItem('masterAudioEnabled') === 'false') {
        return;
    }
    if (localStorage.getItem('soundEffectsEnabled') === 'false') {
        return;
    }
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'move') {
        osc.frequency.value = 520;
        gain.gain.value = 0.08;
    } else if (type === 'capture') {
        osc.frequency.value = 320;
        gain.gain.value = 0.12;
    } else {
        osc.frequency.value = 180;
        gain.gain.value = 0.05;
    }

    osc.type = 'triangle';
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
}

function setupEventListeners() {
    // Mode Selection
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            const onclick = this.getAttribute('onclick');
            
            // Skip buttons without data-mode attribute or with special onclick handlers
            if (!mode || (onclick && (onclick.includes('showRoomActionScreen') || onclick.includes('showCustomizationScreen')))) {
                return;
            }
            
            if (mode === 'online-multiplayer') {
                // Handled by onclick handlers in HTML
                return;
            }
            gameState.gameMode = mode;
            showScreen('typeScreen');
        });
    });

    // Type Selection
    document.querySelectorAll('.type-button').forEach(btn => {
        // Skip buttons that have special onclick handlers for multiplayer
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes('handleRoomAction')) {
            return; // Skip this button
        }
        
        btn.addEventListener('click', function() {
            gameState.gameType = this.getAttribute('data-type');
            if (gameState.gameMode === 'single-player') {
                // Show difficulty selection for single player
                showScreen('difficultyScreen');
            } else if (gameState.gameMode === 'two-player') {
                    // Read optional opponent username from customization screen input, then start two-player
                    const otherInput = document.getElementById('opponentUsernameInput');
                    const other = otherInput ? (otherInput.value || '').trim() : '';
                    if (other) {
                        localStorage.setItem('secondPlayerUsername', other);
                        gameState.otherPlayerUsername = other;
                    } else {
                        localStorage.removeItem('secondPlayerUsername');
                        gameState.otherPlayerUsername = null;
                    }
                    // Start game directly for two-player
                    startTwoPlayerGame();
            }
        });
    });

    // Difficulty Selection
    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.addEventListener('click', function() {
            gameState.aiDifficulty = this.getAttribute('data-difficulty');
            initializeGame();
            showScreen('gameScreen');
        });
    });
}

// Start two-player game with timer
function startTwoPlayerGame() {
    gameState.gameMode = 'two-player';
    gameState.currentPlayer = 'white';
    gameState.gameOver = false;
    gameState.winner = null;
    
    // Reset board and game state
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.capturedWhite = [];
    gameState.capturedBlack = [];
    gameState.board = createBoard();
    gameState.aiThinking = false;
    gameState.lastInvalidMove = false;
    gameState.isChainCapture = false;
    gameState.lastMovedPiece = null;
    gameState.glowingPieces = [];
    gameState.startTime = Date.now();
    
    renderBoard();
    updateUI();
    updatePieceCounts();

    // Initialize and start the timer
    if (window.gameTimerInterval) {
        clearInterval(window.gameTimerInterval);
    }
    
    let totalSecondsElapsed = 0;
    const timerElement = document.getElementById('gameTimer');
    
    window.gameTimerInterval = setInterval(() => {
        if (gameState.gameOver) {
            clearInterval(window.gameTimerInterval);
            return;
        }
        totalSecondsElapsed++;
        const minutes = Math.floor(totalSecondsElapsed / 60);
        const seconds = totalSecondsElapsed % 60;
        
        if (timerElement) {
            timerElement.textContent = `${minutes}m ${seconds}s`;
        }
    }, 1000);

    showScreen('gameScreen');
}

function initializeFooterNav() {
    const navItems = document.querySelectorAll('.footer-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            item.classList.add('active');
            setTimeout(() => item.classList.remove('active'), 220);
            handleFooterNavAction(item.dataset.action);
        });
    });
}

function handleFooterNavAction(action) {
    if (!action) return;
    // If a multiplayer game is active, open profile/store as overlays to avoid disconnect
    const overlayActions = ['profile', 'store'];
    if (multiplayer.gameStarted && overlayActions.includes(action)) {
        showOverlay(action);
        return;
    }

    switch (action) {
        case 'profile':
            if (typeof showSection === 'function') showSection('profile');
            break;
        case 'friends':
        case 'leaderboards':
            // Intentionally disabled — these buttons have no action for now
            showMessage('This feature is coming soon');
            break;
        case 'store':
            if (typeof showSection === 'function') showSection('store');
            break;
        case 'home':
            if (typeof showSection === 'function') showSection('home');
            break;
    }
}

// Overlay helpers: shows a section as an overlay above the game without changing game state
function showOverlay(name) {
    const sectionId = name === 'profile' ? 'profileSection' : (name === 'store' ? 'storeSection' : null);
    if (!sectionId) return;
    const sec = document.getElementById(sectionId);
    if (!sec) return;

    // Make visible and style as overlay
    const wasHidden = sec.classList.contains('hidden');
    if (wasHidden) sec.classList.remove('hidden');
    sec.classList.add('overlay-section');
    sec.dataset._overlayOpened = wasHidden ? 'true' : 'false';
    // Add a close button
    let closeBtn = sec.querySelector('.overlay-close');
    if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'overlay-close';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => closeOverlay(sec);
        document.body.appendChild(closeBtn);
    }
}

function closeOverlay(sec) {
    if (!sec) return;
    sec.classList.remove('overlay-section');
    // If it was hidden before opening, hide it again
    if (sec.dataset._overlayOpened === 'true') {
        sec.classList.add('hidden');
    }
    delete sec.dataset._overlayOpened;
    const closeBtn = document.querySelector('.overlay-close');
    if (closeBtn) closeBtn.remove();
}

function showScreen(screenId) {
    const splashScreens = [
        'winnerSplashScreen', 
        'opponentLeftSplashScreen', 
        'gameStartSplashScreen', 
        'onlineMatchStartSplashScreen'
    ];

    if (splashScreens.includes(screenId)) {
        // Keep underlying screen active, just show the splash screen
        document.getElementById(screenId).classList.add('active');
    } else {
        // Deactivate all screens first
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    const footerNav = document.querySelector('#dama .footer-nav');
    if (footerNav) {
        if (screenId === 'gameScreen' || splashScreens.includes(screenId)) {
            footerNav.classList.add('hidden');
        } else {
            footerNav.classList.remove('hidden');
        }
    }

    if (screenId === 'gameScreen') {
        const bottomActionContainer = document.getElementById('bottomActionContainer');
        const timerDisplay = document.getElementById('timerDisplay');

        if (bottomActionContainer) bottomActionContainer.style.display = 'flex';
        if (typeof updateBottomButtons === 'function') updateBottomButtons();
        if (timerDisplay) timerDisplay.style.display = (gameState.gameMode === 'online-multiplayer') ? 'block' : 'none';
    }
}

function backToModeScreen() {
    gameState.gameMode = null;
    gameState.gameType = null;
    showScreen('modeScreen');
}

function backToTypeScreen() {
    gameState.gameType = null;
    
    // For multiplayer, go back to mode screen
    if (gameState.gameMode === 'online-multiplayer') {
        leaveRoom();
        backToModeScreen();
    } else {
        showScreen('typeScreen');
    }
}

function backToDifficultyScreen() {
    showScreen('difficultyScreen');
}

function goBackToGames() {
    if (typeof showSection === 'function') showSection('games');
}

// =====================================================
// MULTIPLAYER SCREEN NAVIGATION
// =====================================================

function showMultiplayerModeScreen() {
    const isMobile = window.innerWidth <= 768;
    const bgFile = isMobile ? 'mobile_background1.png' : 'pc_background1.png';
    const bgPath = getDamaAssetPath(bgFile);

    ['multiplayerModeBackground', 'roomActionBackground', 'roomListBackground', 'waitingBackground'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.backgroundImage = `url('${bgPath}')`;
    });

    showScreen('multiplayerModeScreen');
}

function backToMultiplayerModeScreen() {
    showScreen('multiplayerModeScreen');
}

function showRoomActionScreen(action) {
    const titleEl = document.getElementById('roomActionTitle');
    const subtitleEl = document.getElementById('roomActionSubtitle');
    
    if (action === 'create') {
        titleEl.textContent = window.getTranslation('dama_create_room', 'Create Room');
        subtitleEl.textContent = window.getTranslation('dama_create_room_desc', 'Select game type to create a new room');
        window.currentRoomAction = 'create';
        showScreen('roomActionScreen');
    } else if (action === 'join') {
        // Skip game type selection for join - go directly to available rooms
        multiplayer.gameMode = 'online';
        loadAndShowAvailableRooms();
    }
}

async function handleRoomAction(gameType) {
    console.log('handleRoomAction called with gameType:', gameType);
    gameState.gameType = gameType;
    multiplayer.gameMode = 'online';
    
    // Create a new room
    const roomId = await createRoom('online', gameType);
    if (roomId) {
        // Show waiting screen
        document.getElementById('roomIdDisplay').textContent = roomId;
        document.getElementById('playerColorSpan').textContent = window.getTranslation(multiplayer.playerColor.toLowerCase() === 'white' ? 'dama_color_white' : 'dama_color_black', multiplayer.playerColor);
        showScreen('waitingScreen');
    }
}

async function loadAndShowAvailableRooms() {
    const roomsList = document.getElementById('roomsList');
    roomsList.innerHTML = `<p class="loading-text">${window.getTranslation('dama_loading_rooms', 'Loading rooms...')}</p>`;
    
    const rooms = await getAvailableRooms();
    
    if (rooms.length === 0) {
        roomsList.innerHTML = `<p class="no-rooms-text">${window.getTranslation('dama_no_rooms', 'No available rooms found. Try creating one!')}</p>`;
        showScreen('roomListScreen');
        return;
    }
    
    roomsList.innerHTML = '';
    rooms.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'room-item';
        
        const roomLabel = window.getTranslation('mp_room_lbl', 'Room: ');
        const typeLabel = window.getTranslation('mp_type_lbl', 'Type: ');
        const createdLabel = window.getTranslation('mp_created_lbl', 'Created: ');
        const gameTypeTranslated = room.gameType === 'standard' 
            ? window.getTranslation('dama_type_standard_title', 'Standard') 
            : window.getTranslation('dama_type_hukum_title', 'Dama-y Hukum');
        const joinLabel = window.getTranslation('hub_action_join', 'Join');
        
        roomEl.innerHTML = `
            <div class="room-info">
                <h3>${roomLabel}${room.creatorUsername || 'Unknown'}</h3>
                <p>${typeLabel}<span>${gameTypeTranslated}</span></p>
                <p>${createdLabel}<span>${new Date(room.createdAt).toLocaleTimeString()}</span></p>
            </div>
            <button class="join-room-btn" onclick="joinRoomHandler('${room.roomId}', '${room.gameType}')">
                <i class="fas fa-sign-in-alt"></i> ${joinLabel}
            </button>
        `;
        roomsList.appendChild(roomEl);
    });
    
    showScreen('roomListScreen');
}

async function joinRoomHandler(roomId, gameType) {
    const success = await joinRoom(roomId, gameType);
    if (success) {
        document.getElementById('playerColorSpan').textContent = window.getTranslation(multiplayer.playerColor.toLowerCase() === 'white' ? 'dama_color_white' : 'dama_color_black', multiplayer.playerColor);
        // Only show waiting if the game has not started yet.
        setTimeout(() => {
            if (!multiplayer.gameStarted) {
                showScreen('waitingScreen');
            }
        }, 150);
    }
}

function cancelWaiting() {
    leaveRoom();
    backToMultiplayerModeScreen();
}

async function startOnlineGame() {
    gameState.gameMode = 'online-multiplayer';
    multiplayer.gameStarted = true;
    
    if (multiplayer.playerRole === 'spectator') {
        multiplayer.isPlayerTurn = false;
    } else {
        multiplayer.isPlayerTurn = 
            (gameState.currentPlayer === 'white' && multiplayer.playerColor === 'white') ||
            (gameState.currentPlayer === 'black' && multiplayer.playerColor === 'black');
    }
    
    // Initialize game board if not already done
    if (!gameState.board || gameState.board.length === 0) {
        gameState.board = createBoard();
    }
    
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.capturedWhite = [];
    gameState.capturedBlack = [];
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.aiThinking = false;
    gameState.lastInvalidMove = false;
    gameState.isChainCapture = false;
    gameState.lastMovedPiece = null;
    gameState.glowingPieces = [];
    gameState.startTime = Date.now();
    
    // Update room status to indicate game has started and begin timer only after splash
    if (multiplayer.playerRole !== 'spectator' && multiplayer.roomId && typeof firestore !== 'undefined' && firebaseAvailable) {
        try {
            await firestore.collection('dama_rooms').doc(multiplayer.roomId).update({
                turnStartedAt: Date.now(),
                turnDuration: multiplayer.maxTurnTime,
                lastActivity: Date.now()
            });
        } catch (error) {
            console.warn('[startOnlineGame] Failed to update timer start time:', error);
        }
    }
    
    multiplayer.turnTimeRemaining = multiplayer.maxTurnTime;
    updateTimerDisplay();
    
    // Ensure room cosmetics are correctly applied
    if (typeof loadSelectedBoardAndPieces === 'function') {
        loadSelectedBoardAndPieces();
    }
    if (typeof loadDamaBackground === 'function') {
        const customBgLoaded = loadDamaBackground();
        if (!customBgLoaded && typeof setupBackgroundImages === 'function') {
            setupBackgroundImages();
        }
    }
    
    renderBoard();
    updateUI();
    updatePieceCounts();
    
    // Ensure bottom action container is visible and update buttons centrally
    const bottomActionContainer = document.getElementById('bottomActionContainer');
    const leaveGameButton = document.getElementById('leaveGameButton');
    if (bottomActionContainer) bottomActionContainer.style.display = 'flex';
    if (leaveGameButton) leaveGameButton.onclick = function() { leaveMultiplayerGame(); };
    if (typeof updateBottomButtons === 'function') updateBottomButtons();
    
    showScreen('gameScreen');
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.style.display = 'block';
    }
    
    // Start the turn timer if it's the player's turn
    if (multiplayer.isPlayerTurn) {
        startTurnTimer();
    }
}

function showCustomizationScreen() {
    const isMobile = window.innerWidth <= 768;
    const bgFile = isMobile ? 'mobile_background1.png' : 'pc_background1.png';
    const bgPath = `assets/images/${bgFile}`;
    
    document.getElementById('customizationBackground').style.backgroundImage = `url('${bgPath}')`;
    showScreen('customizationScreen');
}

// =====================================================
// GAME INITIALIZATION
// =====================================================

function initializeGame() {
    gameState.board = createBoard();
    
    // For single player, randomly assign player color
    if (gameState.gameMode === 'single-player') {
        gameState.playerColor = Math.random() > 0.5 ? 'white' : 'black';
        gameState.aiColor = gameState.playerColor === 'white' ? 'black' : 'white';
    }
    
    // For extreme difficulty, give AI a starting king
    if (gameState.gameMode === 'single-player' && gameState.aiDifficulty === 'extreme') {
        const aiFirstRow = gameState.aiColor === 'white' ? 2 : 5;
        // Convert first piece in the AI's first row to a king
        gameState.board[aiFirstRow][0].isKing = true;
    }
    
    // Randomly choose starting player
    gameState.currentPlayer = Math.random() > 0.5 ? 'white' : 'black';
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.capturedWhite = [];
    gameState.capturedBlack = [];
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.aiThinking = false;
    gameState.lastInvalidMove = false;
    gameState.isChainCapture = false;
    gameState.lastMovedPiece = null;
    gameState.glowingPieces = [];
    gameState.captures = 0;
    gameState.kingPromotions = 0;

    renderBoard();
    updateUI();
    updatePieceCounts();
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.style.display = (gameState.gameMode === 'online-multiplayer') ? 'block' : 'none';
    }
    
    // If AI should go first, trigger AI move
    if (gameState.gameMode === 'single-player' && gameState.currentPlayer === gameState.aiColor && !gameState.gameOver) {
        gameState.aiThinking = true;
        setTimeout(() => {
            aiMakeMove();
            gameState.aiThinking = false;
        }, 1500);
    }
    // Update bottom buttons to match current game mode
    if (typeof updateBottomButtons === 'function') updateBottomButtons();
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

// =====================================================
// BOARD RENDERING
// =====================================================

function renderBoard() {
    const boardElement = document.getElementById('gameBoard');
    if (!boardElement) {
        console.error('gameBoard element not found');
        return;
    }
    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.id = `square-${row}-${col}`;
            square.addEventListener('click', () => handleSquareClick(row, col));

            // Highlight valid moves
            if (gameState.validMoves.some(m => m.row === row && m.col === col)) {
                square.classList.add('highlight');
            }

            const piece = gameState.board[row][col];
            if (piece) {
                const pieceElement = createPieceElement(piece, row, col);
                if (gameState.selectedPiece && gameState.selectedPiece.row === row && gameState.selectedPiece.col === col) {
                    pieceElement.classList.add('selected');
                }
                square.appendChild(pieceElement);
            }

            boardElement.appendChild(square);
        }
    }
}

function createPieceElement(piece, row, col) {
    const pieceDiv = document.createElement('div');
    pieceDiv.className = `piece ${piece.color}`;
    
    // Apply selected piece style - check creator's style first if in multiplayer
    const pieceType = window.creatorPieceType || window.selectedPieceType || 'dama_piece_default';
    if (pieceType === 'dama_piece_metallic') {
        pieceDiv.classList.add('piece-metallic');
    } else if (pieceType === 'dama_piece_neon') {
        pieceDiv.classList.add('piece-neon');
    } else if (pieceType === 'dama_piece_royal') {
        pieceDiv.classList.add('piece-royal');
    } else if (pieceType === 'dama_piece_cosmic') {
        pieceDiv.classList.add('piece-cosmic');
    }
    
    if (piece.isKing) {
        pieceDiv.classList.add('king');
    }
    pieceDiv.id = `piece-${row}-${col}`;
    
    // Re-apply glow if this piece was glowing
    if (gameState.glowingPieces && gameState.glowingPieces.includes(`${row}-${col}`)) {
        pieceDiv.classList.add('glow-hint');
    }

    return pieceDiv;
}

// =====================================================
// PIECE SELECTION & MOVEMENT
// =====================================================

function handleSquareClick(row, col) {
    if (gameState.gameOver || gameState.aiThinking) return;
    if (gameState.gameMode === 'single-player' && gameState.currentPlayer === gameState.aiColor) return;
    
    // Check if it's multiplayer and not player's turn
    if (typeof multiplayer !== 'undefined' && gameState.gameMode === 'online-multiplayer' && !multiplayer.isPlayerTurn) {
        playSound('invalid');
        return;
    }

    const piece = gameState.board[row][col];

    // If clicking on a valid move destination
    if (gameState.validMoves.some(m => m.row === row && m.col === col)) {
        const move = gameState.validMoves.find(m => m.row === row && m.col === col);
        if (movePiece(gameState.selectedPiece.row, gameState.selectedPiece.col, row, col, move)) {
            // Remove glow effect from all pieces after a valid move
            document.querySelectorAll('.piece.glow-hint').forEach(piece => {
                piece.classList.remove('glow-hint');
            });
            gameState.glowingPieces = [];
            
            gameState.selectedPiece = null;
            gameState.validMoves = [];
            gameState.lastInvalidMove = false;
            if (!gameState.gameOver) {
                if (move.capture) {
                    // After a capture, check if the same piece can capture another
                    const captureMoves = getValidMoves(row, col).filter(m => m.capture);
                    if (captureMoves.length > 0) {
                        // Chain capture available - keep the piece selected
                        gameState.selectedPiece = { row, col };
                        gameState.validMoves = captureMoves; // Only show capture moves
                        gameState.isChainCapture = true;
                        gameState.lastMovedPiece = { row, col };
                        setTimeout(() => {
                            renderBoard();
                        }, 450);
                    } else {
                        // No more captures available - switch player
                        gameState.isChainCapture = false;
                        gameState.lastMovedPiece = null;
                        switchPlayer();
                        setTimeout(() => {
                            renderBoard();
                        }, 450);
                    }
                } else {
                    // Regular move - switch player
                    gameState.isChainCapture = false;
                    gameState.lastMovedPiece = null;
                    switchPlayer();
                    setTimeout(() => {
                        renderBoard();
                    }, 450);
                }
            }
        } else {
            // Move was invalid, don't switch player
            gameState.lastInvalidMove = true;
            renderBoard();
        }
        return;
    }

    // If clicking on own piece, select it
    if (piece && piece.color === gameState.currentPlayer) {
        gameState.selectedPiece = { row, col };
        let validMoves = getValidMoves(row, col);
        
        // For compulsory capture mode, check if we must capture
        if (gameState.gameType === 'compulsory' && !gameState.isChainCapture) {
            const allMoves = getAllPossibleMoves(gameState.currentPlayer);
            const hasCapturesOnBoard = allMoves.some(m => m.move.capture);
            const pieceCaptureAvailable = validMoves.filter(m => m.capture).length > 0;
            
            if (hasCapturesOnBoard && !pieceCaptureAvailable) {
                // This piece can't capture but other pieces can - shake it and glow pieces that can capture
                gameState.selectedPiece = null;
                gameState.lastInvalidMove = true;
                
                // Shake the piece that was wrongly selected
                const pieceElement = document.getElementById(`piece-${row}-${col}`);
                if (pieceElement) {
                    pieceElement.classList.add('shake');
                    playSound('invalid');
                    setTimeout(() => {
                        pieceElement.classList.remove('shake');
                    }, 500);
                }
                
                // Glow pieces that can capture - don't remove on click, keep for full sequence
                for (let m of allMoves) {
                    if (m.move.capture) {
                        const capturePiece = document.getElementById(`piece-${m.fromRow}-${m.fromCol}`);
                        if (capturePiece) {
                            capturePiece.classList.add('glow-hint');
                            // Store glow state in gameState so it persists across renderBoard calls
                            if (!gameState.glowingPieces) gameState.glowingPieces = [];
                            gameState.glowingPieces.push(`${m.fromRow}-${m.fromCol}`);
                        }
                    }
                }
                
                renderBoard();
                return;
            }
            
            if (hasCapturesOnBoard) {
                // Filter to only capture moves
                validMoves = validMoves.filter(m => m.capture);
            }
        }
        
        gameState.validMoves = validMoves;
        gameState.lastInvalidMove = false;
        renderBoard();
    } else {
        gameState.selectedPiece = null;
        gameState.validMoves = [];
        gameState.lastInvalidMove = false;
        renderBoard();
    }
}

function highlightValidMoves() {
    // Highlighting is now handled in renderBoard
    // This function is kept for backward compatibility
}

function getValidMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    const moves = [];
    
    // For regular pieces in Slemani Dama: can only move forward-left or forward-right (one square)
    // For kings: can move in all 4 directions and multiple squares
    
    if (piece.isKing) {
        // King can move in all 4 orthogonal directions - any distance
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of directions) {
            for (let distance = 1; distance < 8; distance++) {
                const newRow = row + dr * distance;
                const newCol = col + dc * distance;
                
                if (!isValidSquare(newRow, newCol)) break;
                
                const targetPiece = gameState.board[newRow][newCol];
                
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, capture: false });
                } else if (targetPiece.color === piece.color) {
                    break; // Can't jump over own piece
                } else {
                    // King can capture and land on any empty cell after the captured piece
                    for (let landDistance = 1; landDistance < 8; landDistance++) {
                        const landRow = newRow + dr * landDistance;
                        const landCol = newCol + dc * landDistance;
                        
                        if (!isValidSquare(landRow, landCol)) break;
                        
                        if (gameState.board[landRow][landCol]) {
                            break; // Can't land on occupied cell
                        }
                        
                        moves.push({ row: landRow, col: landCol, capture: true, captureRow: newRow, captureCol: newCol });
                    }
                    break;
                }
            }
        }
    } else {
        // Regular piece: move forward, left, or right only
        const direction = piece.color === 'white' ? 1 : -1; // white goes down, black goes up
        const forwardMoves = [
            [direction, 0], // forward
            [0, -1],        // left
            [0, 1]          // right
        ];
        
        for (const [dr, dc] of forwardMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (isValidSquare(newRow, newCol) && !gameState.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, capture: false });
            }
            
            // Also check for captures in the same direction
            const captureRow = row + dr;
            const captureCol = col + dc;
            const landRow = row + dr * 2;
            const landCol = col + dc * 2;
            
            if (isValidSquare(captureRow, captureCol) && isValidSquare(landRow, landCol)) {
                const capturedPiece = gameState.board[captureRow][captureCol];
                if (capturedPiece && capturedPiece.color !== piece.color && !gameState.board[landRow][landCol]) {
                    moves.push({ row: landRow, col: landCol, capture: true, captureRow, captureCol });
                }
            }
        }
    }
    
    return moves;
}

function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// =====================================================
// PIECE MOVEMENT
// =====================================================

function movePiece(fromRow, fromCol, toRow, toCol, move) {
    const piece = gameState.board[fromRow][fromCol];
    if (!piece) return false;

    if (!move) {
        const square = document.getElementById(`square-${fromRow}-${fromCol}`);
        if (square) {
            square.classList.add('invalid');
            setTimeout(() => square.classList.remove('invalid'), 300);
        }
        playSound('invalid');
        return false;
    }

    const pieceElement = document.getElementById(`piece-${fromRow}-${fromCol}`);
    const toSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`) || document.getElementById(`square-${toRow}-${toCol}`);

    if (pieceElement && toSquare) {
        // 1. Measure the EXACT physical size of the circle piece, not the grid square
        const pieceRect = pieceElement.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();

        const animatingPiece = pieceElement.cloneNode(true);
        animatingPiece.id = `animate-piece-${fromRow}-${fromCol}`;

        // 2. Lock in starting position using exact viewport coordinates
        Object.assign(animatingPiece.style, {
            position: 'fixed',
            left: `${pieceRect.left}px`,
            top: `${pieceRect.top}px`,
            width: `${pieceRect.width}px`,
            height: `${pieceRect.height}px`,
            zIndex: '9999',
            transition: 'all 0.45s ease-in-out',
            pointerEvents: 'none',
            margin: '0',
            transform: 'none' // Crucial: strips out the original CSS translate(-50%, -50%)
        });

        document.body.appendChild(animatingPiece);

        // 3. CRITICAL: Force the browser to calculate the layout right now.
        // If you don't do this, the browser skips the animation and teleports it!
        void animatingPiece.offsetWidth;

        // 4. Hide original piece instantly
        pieceElement.style.visibility = 'hidden';

        // 5. Update state and render the new board synchronously
        gameState.board[toRow][toCol] = piece;
        gameState.board[fromRow][fromCol] = null;
        renderBoard();

        // 6. Instantly hide the new piece sitting at the destination square
        const newPiece = document.getElementById(`piece-${toRow}-${toCol}`);
        if (newPiece) {
            newPiece.style.visibility = 'hidden';
        }

        // 7. Calculate exact destination center inside the new square
        const destLeft = toRect.left + (toRect.width - pieceRect.width) / 2;
        const destTop = toRect.top + (toRect.height - pieceRect.height) / 2;

        // 8. Trigger movement in the next JS tick using setTimeout
        setTimeout(() => {
            animatingPiece.style.left = `${destLeft}px`;
            animatingPiece.style.top = `${destTop}px`;
        }, 10);

        // 9. Clean up after the flight finishes
        setTimeout(() => {
            animatingPiece.remove();
            const finalPiece = document.getElementById(`piece-${toRow}-${toCol}`);
            if (finalPiece) {
                finalPiece.style.visibility = 'visible';
            }
        }, 450);

    } else {
        // Fallback for missing elements
        gameState.board[toRow][toCol] = piece;
        gameState.board[fromRow][fromCol] = null;
        renderBoard();
    }

    // --- Capture and Game Logic (Unchanged from here down) ---
    playSound(move.capture ? 'capture' : 'move');

    if (move.capture) {
        if (piece && piece.color === gameState.playerColor) {
            gameState.captures = (gameState.captures || 0) + 1;
        }
        const capturedPiece = gameState.board[move.captureRow][move.captureCol];
        const captureTarget = capturedPiece && capturedPiece.color === 'white' ? document.getElementById('capturedWhite') : document.getElementById('capturedBlack');

        if (capturedPiece.color === 'white') {
            gameState.capturedWhite.push(capturedPiece);
        } else {
            gameState.capturedBlack.push(capturedPiece);
        }

        const captureElement = document.getElementById(`piece-${move.captureRow}-${move.captureCol}`);
        if (captureElement && captureTarget) {
            const clone = captureElement.cloneNode(true);
            const startRect = captureElement.getBoundingClientRect();
            const targetRect = captureTarget.getBoundingClientRect();
            const isMobile = window.innerWidth <= 768;
            const captureIndex = (capturedPiece.color === 'white' ? gameState.capturedWhite.length : gameState.capturedBlack.length) - 1;
            const offsetAmount = 24;
            const containerCenterX = targetRect.left + targetRect.width / 2;
            const containerCenterY = targetRect.top + targetRect.height / 2;

            let finalLeft, finalTop;
            if (isMobile) {
                finalLeft = targetRect.left + 16 + (captureIndex * offsetAmount);
                finalTop = containerCenterY - 16;
            } else {
                finalLeft = containerCenterX - 16;
                finalTop = targetRect.top + 16 + (captureIndex * offsetAmount);
            }

            Object.assign(clone.style, {
                position: 'fixed',
                left: `${startRect.left}px`,
                top: `${startRect.top}px`,
                width: `${startRect.width}px`,
                height: `${startRect.height}px`,
                margin: '0',
                transform: 'none',
                transition: 'all 0.35s ease',
                pointerEvents: 'none',
                zIndex: '998'
            });
            document.body.appendChild(clone);

            requestAnimationFrame(() => {
                clone.style.left = `${finalLeft}px`;
                clone.style.top = `${finalTop}px`;
                clone.style.opacity = '0.4';
                clone.style.transform = 'scale(0.75)';
            });

            setTimeout(() => {
                clone.remove();
                updateCapturedPieces();
            }, 350);
        }

        gameState.board[move.captureRow][move.captureCol] = null;

        const captureSquare = document.getElementById(`square-${move.captureRow}-${move.captureCol}`);
        if (captureSquare) {
            captureSquare.classList.add('invalid');
            setTimeout(() => captureSquare.classList.remove('invalid'), 300);
        }
    }

    if (!piece.isKing) {
        if ((piece.color === 'white' && toRow === 7) || (piece.color === 'black' && toRow === 0)) {
            piece.isKing = true;
            if (piece.color === gameState.playerColor) {
                gameState.kingPromotions = (gameState.kingPromotions || 0) + 1;
            }
            const toSquareElement = document.getElementById(`square-${toRow}-${toCol}`);
            if (toSquareElement) {
                toSquareElement.style.animation = 'none';
                setTimeout(() => toSquareElement.style.animation = '', 10);
            }
        }
    }

    const whiteCount = countPieces('white');
    const blackCount = countPieces('black');

    if (whiteCount === 1) {
        makeLastPieceKing('white');
    }
    if (blackCount === 1) {
        makeLastPieceKing('black');
    }

    updatePieceCounts();

    if (typeof multiplayer !== 'undefined' && gameState.gameMode === 'online-multiplayer' && multiplayer.roomId) {
        updateGameState(gameState.board, gameState.capturedWhite, gameState.capturedBlack, gameState.currentPlayer);
    }

    checkGameOver();
    return true;
}

function makeLastPieceKing(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col]?.color === color) {
                gameState.board[row][col].isKing = true;
                return;
            }
        }
    }
}

function countPieces(color) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col]?.color === color) {
                count++;
            }
        }
    }
    return count;
}

// =====================================================
// GAME STATE
// =====================================================

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    updateUI();
    renderBoard();

    // Handle multiplayer turn switching
    if (typeof multiplayer !== 'undefined' && gameState.gameMode === 'online-multiplayer' && multiplayer.roomId) {
        if (multiplayer.playerRole !== 'spectator') {
            updateGameState(gameState.board, gameState.capturedWhite, gameState.capturedBlack, gameState.currentPlayer);
            switchMultiplayerTurn(gameState.currentPlayer);
            stopTurnTimer(); // Stop player's timer
        }
    } else if (gameState.gameMode === 'single-player' && gameState.currentPlayer === gameState.aiColor && !gameState.gameOver) {
        // AI turn in single player mode
        gameState.aiThinking = true;
        setTimeout(() => {
            aiMakeMove();
            gameState.aiThinking = false;
        }, 1000);
    }
}

function updateUI() {
    const turnInfo = document.getElementById('turnInfo');
    const gameTypeLabel = document.getElementById('gameTypeLabel');
    const difficultyLabel = document.getElementById('difficultyLabel');
    
    // Guard against missing elements
    if (!gameTypeLabel || !difficultyLabel || !turnInfo) return;
    
    if (typeof updateMultiplayerVsBanner === 'function') {
        updateMultiplayerVsBanner();
    }
    
    // Update game type and difficulty
    gameTypeLabel.textContent = gameState.gameType === 'standard' ? window.getTranslation('dama_type_standard_title', 'Standard') : window.getTranslation('dama_type_hukum_title', 'Dama-y Hukum');
    
    if (gameState.gameMode === 'single-player') {
        const diffKey = 'dama_diff_' + gameState.aiDifficulty.toLowerCase();
        const defaultText = gameState.aiDifficulty.charAt(0).toUpperCase() + gameState.aiDifficulty.slice(1);
        difficultyLabel.textContent = window.getTranslation(diffKey, defaultText);
    } else if (gameState.gameMode === 'online-multiplayer') {
        difficultyLabel.textContent = window.getTranslation('dama_online_multiplayer', 'Online');
    } else {
        difficultyLabel.textContent = window.getTranslation('dama_two_player', 'Two Players');
    }
    
    // Remove previous turn color classes
    turnInfo.classList.remove('white-turn', 'black-turn');
    
    // Update turn info with modern styling
    if (gameState.gameMode === 'single-player') {
        if (gameState.currentPlayer === gameState.playerColor) {
            const colorName = gameState.playerColor === 'white' ? window.getTranslation('dama_color_white', 'White') : window.getTranslation('dama_color_black', 'Black');
            turnInfo.textContent = `${window.getTranslation('dama_turn_your', 'Your Turn')} (${colorName})`;
            turnInfo.classList.add(gameState.playerColor === 'white' ? 'white-turn' : 'black-turn');
        } else {
            const colorName = gameState.aiColor === 'white' ? window.getTranslation('dama_color_white', 'White') : window.getTranslation('dama_color_black', 'Black');
            turnInfo.textContent = `${window.getTranslation('dama_turn_ai', "AI's Turn")} (${colorName})`;
            turnInfo.classList.add(gameState.aiColor === 'white' ? 'white-turn' : 'black-turn');
        }
    } else if (gameState.gameMode === 'online-multiplayer') {
        const isPlayerTurn = 
            (gameState.currentPlayer === 'white' && multiplayer.playerColor === 'white') ||
            (gameState.currentPlayer === 'black' && multiplayer.playerColor === 'black');
        
        const colorName = gameState.currentPlayer === 'white' ? window.getTranslation('dama_color_white', 'White') : window.getTranslation('dama_color_black', 'Black');
        
        if (multiplayer.playerRole === 'spectator') {
            turnInfo.textContent = gameState.currentPlayer === 'white' ? window.getTranslation('dama_spectating_white', "Spectating: White's Turn") : window.getTranslation('dama_spectating_black', "Spectating: Black's Turn");
        } else if (isPlayerTurn) {
            turnInfo.textContent = `${window.getTranslation('dama_turn_your', 'Your Turn')} (${colorName})`;
        } else {
            turnInfo.textContent = `${window.getTranslation('dama_turn_opponent', "Opponent's Turn")} (${colorName})`;
        }
        turnInfo.classList.add(gameState.currentPlayer === 'white' ? 'white-turn' : 'black-turn');
    } else {
        const isWhite = gameState.currentPlayer === 'white';
        turnInfo.textContent = isWhite ? window.getTranslation('dama_turn_white', "White's Turn") : window.getTranslation('dama_turn_black', "Black's Turn");
        turnInfo.classList.add(isWhite ? 'white-turn' : 'black-turn');
    }
    
    updateCapturedPieces();
}

function updatePieceCounts() {
    const whiteCount = countPieces('white');
    const blackCount = countPieces('black');
    const whiteCountEl = document.getElementById('whiteCount');
    const blackCountEl = document.getElementById('blackCount');
    if (whiteCountEl) whiteCountEl.textContent = whiteCount;
    if (blackCountEl) blackCountEl.textContent = blackCount;
}

function updateCapturedPieces() {
    const capturedBlackDiv = document.getElementById('capturedBlack');
    const capturedWhiteDiv = document.getElementById('capturedWhite');
    if (!capturedBlackDiv || !capturedWhiteDiv) return;
    
    const isMobile = window.innerWidth <= 768;
    const pieceType = window.creatorPieceType || window.selectedPieceType || 'dama_piece_default';
    let skinClass = '';
    if (pieceType === 'dama_piece_metallic') {
        skinClass = 'piece-metallic';
    } else if (pieceType === 'dama_piece_neon') {
        skinClass = 'piece-neon';
    } else if (pieceType === 'dama_piece_royal') {
        skinClass = 'piece-royal';
    } else if (pieceType === 'dama_piece_cosmic') {
        skinClass = 'piece-cosmic';
    }

    capturedBlackDiv.innerHTML = '';
    gameState.capturedBlack.forEach((piece, index) => {
        const elem = document.createElement('div');
        elem.className = `captured-piece ${piece.color}`;
        if (skinClass) {
            elem.classList.add(skinClass);
        }
        if (piece.isKing) elem.textContent = '♛';
        
        if (isMobile) {
            // Mobile: horizontal stacking
            elem.style.left = (index * 20) + 'px';
            elem.style.top = '0px';
        } else {
            // PC: vertical stacking
            elem.style.left = '0px';
            elem.style.top = (index * 20) + 'px';
        }
        elem.style.zIndex = index + 1;
        
        capturedBlackDiv.appendChild(elem);
    });

    capturedWhiteDiv.innerHTML = '';
    gameState.capturedWhite.forEach((piece, index) => {
        const elem = document.createElement('div');
        elem.className = `captured-piece ${piece.color}`;
        if (skinClass) {
            elem.classList.add(skinClass);
        }
        if (piece.isKing) elem.textContent = '♛';
        
        if (isMobile) {
            // Mobile: horizontal stacking
            elem.style.left = (index * 20) + 'px';
            elem.style.top = '0px';
        } else {
            // PC: vertical stacking
            elem.style.left = '0px';
            elem.style.top = (index * 20) + 'px';
        }
        elem.style.zIndex = index + 1;
        
        capturedWhiteDiv.appendChild(elem);
    });
}

function checkGameOver() {
    const whiteCount = countPieces('white');
    const blackCount = countPieces('black');

    if (whiteCount === 0) {
        if (gameState.gameMode === 'online-multiplayer') {
            showGameWinnerSplash('black');
        } else {
            endGame('black');
        }
    } else if (blackCount === 0) {
        if (gameState.gameMode === 'online-multiplayer') {
            showGameWinnerSplash('white');
        } else {
            endGame('white');
        }
    } else if (!hasValidMoves(gameState.currentPlayer)) {
        const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';
        if (gameState.gameMode === 'online-multiplayer') {
            showGameWinnerSplash(opponent);
        } else {
            endGame(opponent);
        }
    }
}

function hasValidMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col]?.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}

async function endGame(winner) {
    gameState.gameOver = true;
    gameState.winner = winner;

    // Calculate elapsed time
    const elapsedSeconds = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;
    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    const timePlayed = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;

    // Track game statistics with requested scoring rules
    if (gameState.gameMode === 'single-player') {
        const playerWon = winner === gameState.playerColor;
        const difficulty = (gameState.aiDifficulty || 'medium').toLowerCase();
        const winMap = { easy: 25, medium: 30, hard: 35, extreme: 45 };
        const winScore = winMap[difficulty] || 30;
        const lossScore = 5;
        const score = playerWon ? winScore : lossScore;
        const difficultyCoinsMap = { easy: 5, medium: 10, hard: 15, extreme: 25 };
        const coins = playerWon ? (difficultyCoinsMap[difficulty] || 10) : 0;
        
        if (typeof updatePlayerStats === 'function') {
            updatePlayerStats('single-player', playerWon ? 'win' : 'loss', score, coins, elapsedMinutes);
        }
        if (typeof updateGameStats === 'function') {
            const captures = gameState.playerColor === 'white' ? (gameState.capturedBlack ? gameState.capturedBlack.length : 0) : (gameState.capturedWhite ? gameState.capturedWhite.length : 0);
            updateGameStats('dama', playerWon ? 'win' : 'loss', score, {
                captures: captures,
                kingPromotions: gameState.kingPromotions || 0,
                lastPlayed: new Date().toLocaleString(),
                favoriteMoves: 'N/A'
            });
        }
        
        // Show enhanced splash screen for single player
        showGameResultSplash(winner === gameState.playerColor, score, coins, timePlayed, 'AI', 'AI');
        return;
    } else if (gameState.gameMode === 'two-player') {
        const playerWon = winner === gameState.playerColor;
        const score = playerWon ? 35 : 10;
        const coins = playerWon ? 40 : 15;
        
        // Track for the current player
        if (typeof updatePlayerStats === 'function') {
            updatePlayerStats('two-player', playerWon ? 'win' : 'loss', score, coins, elapsedMinutes);
        }
        if (typeof updateGameStats === 'function') {
            const captures = gameState.playerColor === 'white' ? (gameState.capturedBlack ? gameState.capturedBlack.length : 0) : (gameState.capturedWhite ? gameState.capturedWhite.length : 0);
            updateGameStats('dama', playerWon ? 'win' : 'loss', score, {
                captures: captures,
                kingPromotions: gameState.kingPromotions || 0,
                lastPlayed: new Date().toLocaleString(),
                favoriteMoves: 'N/A'
            });
        }
        // Also update the other local player's stats if a username was provided
        const otherUsername = gameState.otherPlayerUsername || localStorage.getItem('secondPlayerUsername');
        if (otherUsername) {
            const opponentResult = playerWon ? 'loss' : 'win';
            const opponentScore = playerWon ? 10 : 35;
            const opponentCoins = playerWon ? 15 : 40;
            const myCaptures = gameState.playerColor === 'white' ? (gameState.capturedBlack ? gameState.capturedBlack.length : 0) : (gameState.capturedWhite ? gameState.capturedWhite.length : 0);
            const opCaptures = gameState.playerColor === 'white' ? (gameState.capturedWhite ? gameState.capturedWhite.length : 0) : (gameState.capturedBlack ? gameState.capturedBlack.length : 0);

            // If Firestore is available, try to perform an atomic batch update for both players
            try {
                if (typeof firestore !== 'undefined' && typeof firebase !== 'undefined' && firebase.firestore) {
                    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    const meRef = firestore.collection('players').doc(currentUser.username);
                    const opRef = firestore.collection('players').doc(otherUsername);
                    const batch = firestore.batch();
                    
                    // Current player increments
                    batch.set(meRef, {
                        stats: {
                            totalScore: firebase.firestore.FieldValue.increment(score),
                            gamesPlayed: firebase.firestore.FieldValue.increment(1),
                            singlePlayerGames: firebase.firestore.FieldValue.increment(1)
                        },
                        coins: firebase.firestore.FieldValue.increment(coins),
                        playtimeMinutes: firebase.firestore.FieldValue.increment(elapsedMinutes),
                        gameStats: {
                            dama: {
                                name: "Dama",
                                totalGames: firebase.firestore.FieldValue.increment(1),
                                wins: firebase.firestore.FieldValue.increment(playerWon ? 1 : 0),
                                losses: firebase.firestore.FieldValue.increment(playerWon ? 0 : 1),
                                totalScore: firebase.firestore.FieldValue.increment(score),
                                captures: firebase.firestore.FieldValue.increment(myCaptures),
                                kingPromotions: firebase.firestore.FieldValue.increment(gameState.kingPromotions || 0),
                                lastPlayed: new Date().toLocaleString(),
                                favoriteMoves: "N/A"
                            }
                        }
                    }, { merge: true });
                    
                    // Opponent increments
                    batch.set(opRef, {
                        stats: {
                            totalScore: firebase.firestore.FieldValue.increment(opponentScore),
                            gamesPlayed: firebase.firestore.FieldValue.increment(1),
                            singlePlayerGames: firebase.firestore.FieldValue.increment(1)
                        },
                        coins: firebase.firestore.FieldValue.increment(opponentCoins),
                        playtimeMinutes: firebase.firestore.FieldValue.increment(elapsedMinutes),
                        gameStats: {
                            dama: {
                                name: "Dama",
                                totalGames: firebase.firestore.FieldValue.increment(1),
                                wins: firebase.firestore.FieldValue.increment(opponentResult === 'win' ? 1 : 0),
                                losses: firebase.firestore.FieldValue.increment(opponentResult === 'loss' ? 1 : 0),
                                totalScore: firebase.firestore.FieldValue.increment(opponentScore),
                                captures: firebase.firestore.FieldValue.increment(opCaptures),
                                kingPromotions: firebase.firestore.FieldValue.increment(0),
                                lastPlayed: new Date().toLocaleString(),
                                favoriteMoves: "N/A"
                            }
                        }
                    }, { merge: true });
                    await batch.commit();
                } else {
                    // Fallback to non-atomic update
                    if (typeof updateOtherPlayerStats === 'function') {
                        updateOtherPlayerStats(otherUsername, 'two-player', opponentResult, opponentScore, opponentCoins, elapsedMinutes);
                    }
                    if (typeof updateOtherGameStats === 'function') {
                        updateOtherGameStats(otherUsername, 'dama', opponentResult, opponentScore, {
                            captures: opCaptures,
                            kingPromotions: 0,
                            lastPlayed: new Date().toLocaleString(),
                            favoriteMoves: 'N/A'
                        });
                    }
                }
            } catch (e) {
                console.warn('[dama] Batch update failed, falling back:', e);
                if (typeof updateOtherPlayerStats === 'function') {
                    updateOtherPlayerStats(otherUsername, 'two-player', opponentResult, opponentScore, opponentCoins, elapsedMinutes);
                }
                if (typeof updateOtherGameStats === 'function') {
                    updateOtherGameStats(otherUsername, 'dama', opponentResult, opponentScore, {
                        captures: opCaptures,
                        kingPromotions: 0,
                        lastPlayed: new Date().toLocaleString(),
                        favoriteMoves: 'N/A'
                    });
                }
            }
        }
        
        // Show enhanced splash screen for two player
        showGameResultSplash(winner === gameState.playerColor, score, coins, timePlayed, 'Player 1', 'Player 2');
        return;
    }
}

function newGame() {
    document.getElementById('gameOverModal').classList.remove('active');
    
    // For two-player mode, use the specialized initialization with timer
    if (gameState.gameMode === 'two-player') {
        startTwoPlayerGame();
    } else {
        initializeGame();
    }
}

function exitToDamaHome() {
    document.getElementById('gameOverModal').classList.remove('active');
    
    // Hide winnerSplashScreen if it is active
    const winnerSplash = document.getElementById('winnerSplashScreen');
    if (winnerSplash) {
        winnerSplash.classList.remove('active');
    }
    
    if (gameState.gameMode === 'online-multiplayer' && typeof leaveRoom === 'function') {
        leaveRoom();
    }
    gameState.gameMode = null;
    gameState.gameType = null;
    initializeGame();
    
    // Direct back to Dama home page (modeScreen) inside Dama section
    if (typeof showSection === 'function') {
        showSection('dama');
    }
    showScreen('modeScreen');
}

function resetGame() {
    gameState.gameType = null;
    showScreen('typeScreen');
}

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
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser && currentUser.avatar ? currentUser.avatar : 'avatar-default.png';
}

function getAvatarImagePath(avatarFile) {
    // For use in HTML img src attributes in dama context
    const isStandaloneDamaPage = window.location.pathname.includes('/games/dama/');
    return isStandaloneDamaPage ? `../../assets/images/${avatarFile}` : `assets/images/${avatarFile}`;
}

function showGameResultSplash(playerWon, rewardPoints, coinsEarned, timePlayed, player1Name, player2Name) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const splashScreen = document.getElementById('winnerSplashScreen');
    const title = document.getElementById('winnerSplashTitle');
    const message = document.getElementById('winnerSplashMessage');

    let player1DisplayName, player2DisplayName, player1AvatarPath, player2AvatarPath;

    // Determine display names and avatars based on game mode
    if (gameState.gameMode === 'single-player') {
        // Single player: Player is current user, opponent is AI
        player1DisplayName = currentUser?.username || 'Player';
        player2DisplayName = 'AI';
        player1AvatarPath = getAvatarImagePath(getAvatarFile(currentUser?.username || 'Player'));
        player2AvatarPath = getAvatarImagePath('avatar-default.png'); // AI gets default avatar
    } else if (gameState.gameMode === 'two-player') {
        // Two player: Player 1 and Player 2 with default avatars
        player1DisplayName = 'Player 1';
        player2DisplayName = 'Player 2';
        player1AvatarPath = getAvatarImagePath('avatar-default.png');
        player2AvatarPath = getAvatarImagePath('avatar-default.png');
    } else if (gameState.gameMode === 'online-multiplayer') {
        // Multiplayer: Use actual player names and their avatars from room data
        player1DisplayName = multiplayer.playerRole === 'creator' 
            ? (currentUser?.username || 'Creator') 
            : (multiplayer.opponentUsername || 'Opponent');
        player2DisplayName = multiplayer.playerRole === 'creator' 
            ? (multiplayer.opponentUsername || 'Opponent')
            : (currentUser?.username || 'Creator');
        
        // Get avatars from stored data
        player1AvatarPath = getAvatarImagePath(getAvatarFile(player1DisplayName));
        player2AvatarPath = getAvatarImagePath(getAvatarFile(player2DisplayName));
    } else {
        // Fallback
        player1DisplayName = player1Name || currentUser?.username || 'Player 1';
        player2DisplayName = player2Name || 'Player 2';
        player1AvatarPath = getAvatarImagePath('avatar-default.png');
        player2AvatarPath = getAvatarImagePath('avatar-default.png');
    }

    const player1Level = getProfileLevel(player1DisplayName);
    const player2Level = gameState.gameMode === 'single-player' && player2DisplayName === 'AI' 
        ? 1 
        : getProfileLevel(player2DisplayName);
    const player1Status = playerWon ? window.getTranslation('dama_status_winner', 'Winner') : window.getTranslation('dama_status_loser', 'Loser');
    const player2Status = playerWon ? window.getTranslation('dama_status_loser', 'Loser') : window.getTranslation('dama_status_winner', 'Winner');
    const statusColor = playerWon ? '#4CAF50' : '#FF6B6B';

    title.innerHTML = playerWon
        ? `<i class="fas fa-trophy" style="color: #FFD700; margin-right: 10px;"></i>${window.getTranslation('dama_victory', 'Victory!')}`
        : `<i class="fas fa-flag-checkered" style="color: #FF6B6B; margin-right: 10px;"></i>${window.getTranslation('dama_defeated', 'Defeated')}`;
    title.style.color = statusColor;

    message.innerHTML = `
        <div style="display: grid; gap: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 15px;">
                <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 20px; text-align: center;">
                    <img src="${player1AvatarPath}" onerror="this.src='${getAvatarImagePath('avatar-default.png')}'" alt="${player1DisplayName}" class="splash-avatar">
                    <h3 style="margin: 0 0 8px; font-size: 18px;">${player1DisplayName}</h3>
                    <p style="margin: 0 0 6px; color: #fff;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player1Level}</p>
                    <p style="margin: 0; color: ${playerWon ? '#4CAF50' : '#FF6B6B'}; font-weight: 700;">${player1Status}</p>
                </div>
                <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 20px; text-align: center;">
                    <img src="${player2AvatarPath}" onerror="this.src='${getAvatarImagePath('avatar-default.png')}'" alt="${player2DisplayName}" class="splash-avatar">
                    <h3 style="margin: 0 0 8px; font-size: 18px;">${player2DisplayName}</h3>
                    <p style="margin: 0 0 6px; color: #fff;">${window.getTranslation('modal_profile_lvl', 'Level ')}${player2Level}</p>
                    <p style="margin: 0; color: ${!playerWon ? '#4CAF50' : '#FF6B6B'}; font-weight: 700;">${player2Status}</p>
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
            <button id="playAgainButton" disabled style="padding: 12px 30px; font-size: 16px; background: #777; color: white; border: none; border-radius: 5px; cursor: not-allowed; opacity: 0.6;">
                <i class="fas fa-redo"></i> ${window.getTranslation('dama_play_again', 'Play Again')}
            </button>
            <button id="homeButton" disabled style="padding: 12px 30px; font-size: 16px; background: #777; color: white; border: none; border-radius: 5px; cursor: not-allowed; opacity: 0.6;">
                <i class="fas fa-home"></i> ${window.getTranslation('dama_exit', 'Exit')}
            </button>
        </div>
    `;

    showScreen('winnerSplashScreen');

    let countdown = 5;
    const countdownEl = document.getElementById('resultCountdown');
    const playAgainButton = document.getElementById('playAgainButton');
    const homeButton = document.getElementById('homeButton');

    const interval = setInterval(() => {
        countdown -= 1;
        if (countdownEl) countdownEl.textContent = countdown.toString();
        if (countdown <= 0) {
            clearInterval(interval);
            if (playAgainButton) {
                playAgainButton.disabled = false;
                playAgainButton.style.background = '#4CAF50';
                playAgainButton.style.cursor = 'pointer';
                playAgainButton.style.opacity = '1';
                playAgainButton.onclick = newGame;
            }
            if (homeButton) {
                homeButton.disabled = false;
                homeButton.style.background = '#2196F3';
                homeButton.style.cursor = 'pointer';
                homeButton.style.opacity = '1';
                homeButton.onclick = exitToDamaHome;
            }
        }
    }, 1000);
}

// =====================================================
// AI LOGIC
// =====================================================

let aiWorker = null;
let workerPendingCallback = null;

function initializeAIWorker() {
    if (!aiWorker) {
        try {
            console.log('Creating Web Worker as inline Blob');
            
            // Worker code as string
            const workerCode = `
const transpositionTable = new Map();

self.onmessage = function(event) {
    const { board, color, depth, gameType, difficulty } = event.data;
    transpositionTable.clear();
    
    try {
        let bestMove;
        if (difficulty === 'extreme') {
            bestMove = getBestMoveExtreme(board, color, depth, gameType);
        } else {
            bestMove = evaluateMovesSimple(board, color, gameType);
        }
        self.postMessage({
            success: true,
            bestMove: bestMove
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};

function getBestMoveExtreme(board, color, depth, gameType) {
    const moves = getAllMovesFromBoard(board, color);
    if (moves.length === 0) return null;
    
    // Always prioritize captures in any game mode
    const captureMoves = moves.filter(m => m.move.capture);
    let priorityMoves = captureMoves.length > 0 ? captureMoves : moves;
    const sortedMoves = orderMoves(priorityMoves, color);
    
    // For very few moves, just pick the best immediately
    if (sortedMoves.length === 1) {
        return sortedMoves[0];
    }
    
    let bestMove = sortedMoves[0];
    let bestScore = -Infinity;
    
    // Only evaluate top moves to save time
    const moveLimit = Math.min(Math.ceil(sortedMoves.length * 0.6), 12);
    for (let i = 0; i < moveLimit; i++) {
        const move = sortedMoves[i];
        const boardCopy = copyBoard(board);
        makeMove(boardCopy, move);
        const score = minimax(boardCopy, depth - 1, -Infinity, Infinity, false, color);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
    // Fast board hash using numeric encoding
    let hash = (depth << 24) | (isMaximizing ? 0x800000 : 0);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            const cellVal = !p ? 0 : (p.color === 'white' ? (p.isKing ? 2 : 1) : (p.isKing ? 4 : 3));
            hash = ((hash << 2) | cellVal) >>> 0;
        }
    }
    
    if (transpositionTable.has(hash)) {
        return transpositionTable.get(hash);
    }
    
    if (depth === 0 || isGameOverBoard(board)) {
        return evaluateBoard(board, aiColor);
    }
    
    const currentColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    const moves = getAllMovesFromBoard(board, currentColor);
    
    if (moves.length === 0) {
        return evaluateBoard(board, aiColor);
    }
    
    const sortedMoves = orderMoves(moves, currentColor);
    let evalResult;
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of sortedMoves) {
            const newBoard = copyBoard(board);
            makeMove(newBoard, move);
            const eval_score = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
            maxEval = Math.max(maxEval, eval_score);
            alpha = Math.max(alpha, eval_score);
            if (beta <= alpha) break; // Beta cutoff
        }
        evalResult = maxEval;
    } else {
        let minEval = Infinity;
        for (let move of sortedMoves) {
            const newBoard = copyBoard(board);
            makeMove(newBoard, move);
            const eval_score = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
            minEval = Math.min(minEval, eval_score);
            beta = Math.min(beta, eval_score);
            if (beta <= alpha) break; // Alpha cutoff
        }
        evalResult = minEval;
    }
    
    transpositionTable.set(hash, evalResult);
    return evalResult;
}

function evaluateBoard(board, aiColor) {
    let score = 0;
    const enemy = aiColor === 'white' ? 'black' : 'white';
    
    let aiKings = 0, aiMen = 0;
    let enemyKings = 0, enemyMen = 0;
    let aiBackRowOccupied = 0, enemyBackRowOccupied = 0;
    
    const aiBackRow = aiColor === 'white' ? 7 : 0;
    const enemyBackRow = aiColor === 'white' ? 0 : 7;
    
    // Fast material count and positional evaluation
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) continue;
            
            const isAI = piece.color === aiColor;
            let pieceValue = 0;
            
            if (piece.isKing) {
                pieceValue = 50; // Kings worth much more
                if (isAI) {
                    aiKings++;
                } else {
                    enemyKings++;
                }
                
                // King mobility - fast calculation (count empty adjacent squares only)
                const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                let adjacentEmpty = 0;
                for (const [dr, dc] of directions) {
                    const checkRow = row + dr;
                    const checkCol = col + dc;
                    if (isValidSquare(checkRow, checkCol) && !board[checkRow][checkCol]) {
                        adjacentEmpty++;
                    }
                }
                pieceValue += adjacentEmpty * 2; // Simpler mobility bonus
            } else {
                pieceValue = 10; // Men
                if (isAI) {
                    aiMen++;
                } else {
                    enemyMen++;
                }
                
                // Promotion pressure - closer to back row = higher value
                const promotionRow = piece.color === 'white' ? 7 : 0;
                const distanceToPromotion = Math.abs(row - promotionRow);
                const promotionBonus = (7 - distanceToPromotion) * 6;
                pieceValue += promotionBonus;
            }
            
            // Center control (columns 2-5 are center)
            if (col >= 2 && col <= 5) {
                pieceValue += piece.isKing ? 8 : 5;
            }
            
            // Edge penalty (columns 0 and 7)
            if (col === 0 || col === 7) {
                pieceValue -= piece.isKing ? 3 : 2;
            }
            
            // Back row defense
            if (row === aiBackRow && isAI) {
                aiBackRowOccupied++;
                pieceValue += piece.isKing ? 15 : 10; // Defend your back row
            } else if (row === enemyBackRow && !isAI) {
                enemyBackRowOccupied++;
                pieceValue += piece.isKing ? 15 : 10;
            }
            
            if (isAI) {
                score += pieceValue;
            } else {
                score -= pieceValue;
            }
        }
    }
    
    // Mobility bonus - limit to reasonable range
    const aiMoveCount = Math.min(getAllMovesFromBoard(board, aiColor).length, 15);
    const enemyMoveCount = Math.min(getAllMovesFromBoard(board, enemy).length, 15);
    score += (aiMoveCount - enemyMoveCount) * 4;
    
    // Material advantage
    const aiMaterial = aiKings * 50 + aiMen * 10;
    const enemyMaterial = enemyKings * 50 + enemyMen * 10;
    score += (aiMaterial - enemyMaterial);
    
    // King advantage bonus
    score += (aiKings - enemyKings) * 70;
    
    // Back row pressure
    score += (aiBackRowOccupied - enemyBackRowOccupied) * 12;
    
    return score;
}

function getAllMovesFromBoard(board, color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col]?.color === color) {
                const validMoves = getValidMovesFromBoard(board, row, col);
                validMoves.forEach(move => {
                    moves.push({ fromRow: row, fromCol: col, move });
                });
            }
        }
    }
    return moves;
}

function getValidMovesFromBoard(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    const moves = [];
    if (piece.isKing) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            for (let distance = 1; distance < 8; distance++) {
                const newRow = row + dr * distance;
                const newCol = col + dc * distance;
                if (!isValidSquare(newRow, newCol)) break;
                const targetPiece = board[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, capture: false });
                } else if (targetPiece.color === piece.color) {
                    break;
                } else {
                    for (let landDistance = 1; landDistance < 8; landDistance++) {
                        const landRow = newRow + dr * landDistance;
                        const landCol = newCol + dc * landDistance;
                        if (!isValidSquare(landRow, landCol)) break;
                        if (board[landRow][landCol]) {
                            break;
                        }
                        moves.push({ row: landRow, col: landCol, capture: true, captureRow: newRow, captureCol: newCol });
                    }
                    break;
                }
            }
        }
    } else {
        const direction = piece.color === 'white' ? 1 : -1;
        const forwardMoves = [[direction, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of forwardMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (isValidSquare(newRow, newCol) && !board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, capture: false });
            }
            const captureRow = row + dr;
            const captureCol = col + dc;
            const landRow = row + dr * 2;
            const landCol = col + dc * 2;
            if (isValidSquare(captureRow, captureCol) && isValidSquare(landRow, landCol)) {
                const capturedPiece = board[captureRow][captureCol];
                if (capturedPiece && capturedPiece.color !== piece.color && !board[landRow][landCol]) {
                    moves.push({ row: landRow, col: landCol, capture: true, captureRow, captureCol });
                }
            }
        }
    }
    return moves;
}

function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isGameOverBoard(board) {
    let whiteCount = 0, blackCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col]?.color === 'white') whiteCount++;
            if (board[row][col]?.color === 'black') blackCount++;
        }
    }
    return whiteCount === 0 || blackCount === 0;
}

function copyBoard(board) {
    return board.map(row => row.map(piece => piece ? { ...piece } : null));
}

function makeMove(board, move) {
    const piece = board[move.fromRow][move.fromCol];
    board[move.move.row][move.move.col] = piece;
    board[move.fromRow][move.fromCol] = null;
    if (move.move.capture) {
        board[move.move.captureRow][move.move.captureCol] = null;
    }
    if (!piece.isKing) {
        if ((piece.color === 'white' && move.move.row === 7) || (piece.color === 'black' && move.move.row === 0)) {
            piece.isKing = true;
        }
    }
}

function orderMoves(moves, color) {
    return moves.sort((a, b) => {
        // Captures first (highest priority)
        const aIsCapture = a.move.capture;
        const bIsCapture = b.move.capture;
        
        if (aIsCapture && !bIsCapture) return -1;
        if (!aIsCapture && bIsCapture) return 1;
        
        // For captures: prioritize king captures and multiple capture chains
        if (aIsCapture && bIsCapture) {
            // Prioritize promotion (king making)
            const aPromo = color === 'white' ? a.move.row === 7 : a.move.row === 0;
            const bPromo = color === 'white' ? b.move.row === 7 : b.move.row === 0;
            if (aPromo && !bPromo) return -1;
            if (!aPromo && bPromo) return 1;
            return 0;
        }
        
        // King promotions for non-captures
        const aPromo = color === 'white' ? a.move.row === 7 : a.move.row === 0;
        const bPromo = color === 'white' ? b.move.row === 7 : b.move.row === 0;
        if (aPromo && !bPromo) return -1;
        if (!aPromo && bPromo) return 1;
        
        // Center moves
        const aCenterDist = Math.min(Math.abs(a.move.col - 3.5), Math.abs(a.move.col - 4.5));
        const bCenterDist = Math.min(Math.abs(b.move.col - 3.5), Math.abs(b.move.col - 4.5));
        return aCenterDist - bCenterDist;
    });
}

function isCaptureTrap(move) {
    try {
        if (!move || !move.move || !move.move.capture) return false;
        
        const piece = gameState.board[move.fromRow]?.[move.fromCol];
        if (!piece) return false;
        
        // Kings are very valuable - never trade a king for a piece
        if (piece.isKing) {
            const capturedPiece = gameState.board[move.move.captureRow]?.[move.move.captureCol];
            if (capturedPiece && !capturedPiece.isKing) {
                // Don't trade king for regular piece
                return true;
            }
        }
        
        // Check if the destination square is vulnerable to recapture AFTER simulating the move
        const destRow = move.move.row;
        const destCol = move.move.col;
        const opponent = piece.color === 'white' ? 'black' : 'white';
        
        // Store original board
        const originalBoard = gameState.board.map(row => [...row]);
        
        // Simulate the move on gameState.board
        gameState.board[destRow][destCol] = piece;
        gameState.board[move.fromRow][move.fromCol] = null;
        if (move.move.captureRow !== undefined && move.move.captureCol !== undefined) {
            gameState.board[move.move.captureRow][move.move.captureCol] = null;
        }
        
        // Look for opponent pieces that can recapture on the simulated board
        const enemyMoves = getAllMovesFromBoard(gameState.board, opponent);
        let isTrap = false;
        
        for (let enemyMove of enemyMoves) {
            if (enemyMove.move.capture && 
                enemyMove.move.captureRow === destRow && 
                enemyMove.move.captureCol === destCol) {
                
                // Opponent can recapture the AI's piece
                const recapturingPiece = gameState.board[enemyMove.fromRow]?.[enemyMove.fromCol];
                if (recapturingPiece) {
                    const originallyCapturedPiece = originalBoard[move.move.captureRow]?.[move.move.captureCol];
                    const capturedValue = originallyCapturedPiece ? (originallyCapturedPiece.isKing ? 50 : 10) : 10;
                    const recapturerValue = recapturingPiece.isKing ? 50 : 10;
                    
                    // If we lose more or equal value than we gain, it's a bad trade (trap)
                    if (recapturerValue > capturedValue || (recapturerValue === capturedValue && piece.isKing)) {
                        isTrap = true;
                        break;
                    }
                }
            }
        }
        
        // Restore board
        gameState.board = originalBoard;
        
        return isTrap;
    } catch (e) {
        console.error('Error in isCaptureTrap:', e);
        return false;
    }
}

function countContinuedCaptures(row, col) {
    // Simple heuristic: count how many opponent pieces are nearby (possible future captures)
    let count = 0;
    const opponent = 'placeholder'; // color will be determined by context
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        if (checkRow >= 0 && checkRow < 8 && checkCol >= 0 && checkCol < 8) {
            // This is simplified - just return a small bonus
            count++;
        }
    }
    return Math.min(count, 3); // Cap at 3 to avoid extreme values
}

function evaluateMovesSimple(board, color, gameType) {
    const moves = getAllMovesFromBoard(board, color);
    if (moves.length === 0) return null;
    let filteredMoves = moves;
    if (gameType === 'compulsory') {
        const captureMoves = moves.filter(m => m.move.capture);
        if (captureMoves.length > 0) {
            filteredMoves = captureMoves;
        }
    }
    return orderMoves(filteredMoves, color)[0];
}
            `;
            
            // Create blob and worker from it
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            aiWorker = new Worker(workerUrl);
            console.log('Worker created successfully from Blob');
            
            // Set up permanent message handler
            aiWorker.onmessage = function(event) {
                console.log('Worker message received:', event.data);
                if (workerPendingCallback) {
                    workerPendingCallback(event.data);
                    workerPendingCallback = null;
                } else {
                    console.warn('Worker message received but no callback pending');
                }
            };
            
            // Error handling
            aiWorker.onerror = function(error) {
                console.error('Worker runtime error:', error.message);
                console.error('Worker line:', error.lineno);
                aiWorker = null;
            };
        } catch (e) {
            console.error('Failed to create worker:', e);
            aiWorker = null;
        }
    }
    return aiWorker;
}

function aiMakeMove() {
    let possibleMoves;
    if (gameState.isChainCapture && gameState.lastMovedPiece) {
        const moves = getValidMoves(gameState.lastMovedPiece.row, gameState.lastMovedPiece.col);
        possibleMoves = moves.map(move => ({
            fromRow: gameState.lastMovedPiece.row,
            fromCol: gameState.lastMovedPiece.col,
            move
        }));
    } else {
        possibleMoves = getAllPossibleMoves(gameState.aiColor);
    }
    
    if (possibleMoves.length === 0) {
        gameState.isChainCapture = false;
        gameState.lastMovedPiece = null;
        switchPlayer();
        return;
    }

    // For compulsory capture mode, filter to only capture moves if any are available
    if (gameState.gameType === 'compulsory') {
        const captureMoves = possibleMoves.filter(m => m.move.capture);
        if (captureMoves.length > 0) {
            possibleMoves = captureMoves;
        }
    }

    let moveToMake;
    
    if (gameState.aiDifficulty === 'easy') {
        // Easy: Random move
        moveToMake = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        executeAIMove(moveToMake);
    } else if (gameState.aiDifficulty === 'medium') {
        // Medium: Prioritize safe captures, then strategic moves
        const captureMoves = possibleMoves.filter(m => m.move.capture);
        let safeMoves;
        
        if (captureMoves.length > 0) {
            // Filter out trap moves
            safeMoves = captureMoves.filter(m => !isCaptureTrap(m));
            if (safeMoves.length === 0) {
                // All captures are traps, pick the least bad one
                safeMoves = captureMoves;
            }
            // Pick best capture by basic heuristic
            moveToMake = safeMoves.reduce((best, current) => {
                const bestVal = (best.move.capture ? 30 : 0) + 
                               (gameState.board[best.fromRow][best.fromCol].isKing ? 0 : (best.move.row === (gameState.aiColor === 'white' ? 7 : 0) ? 50 : 0));
                const currentVal = (current.move.capture ? 30 : 0) + 
                                  (gameState.board[current.fromRow][current.fromCol].isKing ? 0 : (current.move.row === (gameState.aiColor === 'white' ? 7 : 0) ? 50 : 0));
                return currentVal > bestVal ? current : best;
            });
        } else {
            // No captures, pick a strategic move
            moveToMake = possibleMoves.reduce((best, current) => {
                const bestScore = evaluateStrategicPosition(best);
                const currentScore = evaluateStrategicPosition(current);
                return currentScore > bestScore ? current : best;
            });
        }
        executeAIMove(moveToMake);
    } else if (gameState.aiDifficulty === 'hard') {
        // Hard: Strategic AI with lookahead capability and trap avoidance
        const captureMoves = possibleMoves.filter(m => m.move.capture);
        if (captureMoves.length > 0) {
            // Filter out trap moves
            let safeMoves = captureMoves.filter(m => !isCaptureTrap(m));
            if (safeMoves.length === 0) {
                // All captures are traps, pick least bad
                safeMoves = captureMoves;
            }
            // Evaluate safe captures
            moveToMake = safeMoves.reduce((best, current) => {
                const bestScore = evaluateAIMove(best, true);
                const currentScore = evaluateAIMove(current, true);
                return currentScore > bestScore ? current : best;
            });
        } else {
            // Strategic non-capture moves with lookahead
            moveToMake = evaluateBestStrategicMove(possibleMoves);
        }
        executeAIMove(moveToMake);
    } else {
        // Extreme: Use Web Worker for minimax with Alpha-Beta Pruning
        console.log('AI Extreme mode - initializing worker');
        const depth = window.innerWidth <= 768 ? 5 : 6; // Reduced depth for faster response
        
        const worker = initializeAIWorker();
        
        if (!worker) {
            console.error('Worker initialization failed, using fallback move');
            executeAIMove(possibleMoves[0]);
            return;
        }
        
        console.log('Sending calculation to worker with depth:', depth, 'color:', gameState.aiColor);
        
        // Set up callback for this specific calculation
        workerPendingCallback = function(data) {
            console.log('Worker callback executed with data:', data);
            if (data.success) {
                let moveToMake = data.bestMove;
                if (moveToMake) {
                    console.log('Executing best move from worker:', moveToMake);
                    executeAIMove(moveToMake);
                } else {
                    // No move found, use first possible move
                    console.log('Worker returned no move, using fallback');
                    executeAIMove(possibleMoves[0]);
                }
            } else {
                console.error('Worker calculation error:', data.error);
                // Fallback to first move
                executeAIMove(possibleMoves[0]);
            }
        };
        
        // Send calculation to worker
        worker.postMessage({
            board: gameState.board,
            color: gameState.aiColor,
            depth: depth,
            gameType: gameState.gameType,
            difficulty: gameState.aiDifficulty
        });
        console.log('Message sent to worker');
        
        return; // Exit early - will continue after worker responds
    }
}

function executeAIMove(moveToMake) {
    movePiece(moveToMake.fromRow, moveToMake.fromCol, moveToMake.move.row, moveToMake.move.col, moveToMake.move);
    renderBoard();
    updateUI();
    
    // Check for chain capture after AI's move
    if (moveToMake.move.capture) {
        const captureMoves = getValidMoves(moveToMake.move.row, moveToMake.move.col).filter(m => m.capture);
        if (captureMoves.length > 0) {
            // Chain capture available - AI continues capturing
            gameState.isChainCapture = true;
            gameState.lastMovedPiece = { row: moveToMake.move.row, col: moveToMake.move.col };
            setTimeout(() => {
                aiMakeMove();
            }, 800);
            return;
        }
    }
    
    gameState.isChainCapture = false;
    gameState.lastMovedPiece = null;
    switchPlayer();
}

// =====================================================
// MINIMAX WITH ALPHA-BETA PRUNING FOR EXTREME MODE
// ===================================================== 
// NOTE: Extreme mode now uses Web Worker (dama-worker.js)
// These functions have been moved to the Worker for performance.
// Keeping this section header for reference.

function evaluateAIMove(move, isCapture = false) {
    let score = 0;
    const piece = gameState.board[move.fromRow][move.fromCol];
    
    // Avoid traps - huge penalty
    if (isCaptureTrap(move)) {
        return -500; // Very bad move
    }
    
    if (isCapture && move.move.capture) {
        const capturedPiece = gameState.board[move.move.captureRow][move.move.captureCol];
        const isKingCapture = capturedPiece && capturedPiece.isKing;
        const futureCaptures = getValidMoves(move.move.row, move.move.col).filter(m => m.capture).length;
        
        score = 100 + (isKingCapture ? 60 : 0) + (futureCaptures * 30);
    }
    
    // Don't trade king for anything
    if (piece.isKing) {
        const capturedPiece = gameState.board[move.move.captureRow]?.[move.move.captureCol];
        if (move.move.capture && capturedPiece && !capturedPiece.isKing) {
            score -= 1000; // Never trade king for regular piece
        }
    }
    
    return score;
}

function evaluateBestStrategicMove(moves) {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    for (let move of moves) {
        let score = evaluateStrategicPosition(move);
        
        // Simulate this move and check opponent's response
        const simulatedScore = simulateAndEvaluate(move);
        score += simulatedScore * 0.5; // Weight future position
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

function simulateAndEvaluate(move) {
    // Create a board copy
    const originalBoard = gameState.board.map(row => [...row]);
    const piece = gameState.board[move.fromRow][move.fromCol];
    
    // Simulate the move
    gameState.board[move.move.row][move.move.col] = piece;
    gameState.board[move.fromRow][move.fromCol] = null;
    
    if (move.move.capture) {
        gameState.board[move.move.captureRow][move.move.captureCol] = null;
    }
    
    // Check opponent's best response
    const opponentMoves = getAllPossibleMoves(gameState.playerColor);
    let opponentBestThreat = 0;
    
    for (let oppMove of opponentMoves) {
        if (oppMove.move.capture) {
            opponentBestThreat = Math.max(opponentBestThreat, 50);
        }
    }
    
    // Restore board
    gameState.board = originalBoard;
    
    // Subtract threat penalty
    let positionScore = evaluateStrategicPosition(move) - opponentBestThreat;
    return positionScore;
}

function evaluateStrategicPosition(move) {
    let score = 0;
    const piece = gameState.board[move.fromRow][move.fromCol];
    const toRow = move.move.row;
    const toCol = move.move.col;
    
    // Promote king row approach (high priority)
    const aiPromotionRow = gameState.aiColor === 'white' ? 7 : 0;
    const distToPromotion = Math.abs(toRow - aiPromotionRow);
    score += (8 - distToPromotion) * 15;
    
    // Bonus for reaching king row
    if (toRow === aiPromotionRow && !piece.isKing) {
        score += 200;
    }
    
    // Control center (columns 2-5)
    if (toCol >= 2 && toCol <= 5) {
        score += 20;
    }
    
    // Protect existing pieces
    score += evaluateDefense(toRow, toCol);
    
    // Avoid vulnerable positions
    if (isPositionVulnerable(toRow, toCol)) {
        score -= 50;
    }
    
    // King pieces are valuable - protect them
    if (piece.isKing) {
        score += 30;
    }
    
    return score;
}

function evaluateDefense(row, col) {
    let defenseScore = 0;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (let [dr, dc] of directions) {
        const checkRow = row + dr;
        const checkCol = col + dc;
        if (isValidSquare(checkRow, checkCol)) {
            const neighborPiece = gameState.board[checkRow][checkCol];
            if (neighborPiece && neighborPiece.color === gameState.aiColor) {
                defenseScore += 10; // Ally nearby
            }
        }
    }
    
    return defenseScore;
}

function isPositionVulnerable(row, col) {
    // Check if opponent can capture this position next move
    const opponentMoves = getAllPossibleMoves(gameState.playerColor);
    for (let m of opponentMoves) {
        if (m.move.capture && m.move.captureRow === row && m.move.captureCol === col) {
            return true;
        }
    }
    return false;
}

function showFeedbackMessage(message) {
    const feedbackElement = document.getElementById('feedbackMessage');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.style.display = 'block';
        setTimeout(() => hideFeedbackMessage(), 4000);
    }
}

function hideFeedbackMessage() {
    const feedbackElement = document.getElementById('feedbackMessage');
    if (feedbackElement) {
        feedbackElement.style.display = 'none';
    }
}

function getAllPossibleMoves(color) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col]?.color === color) {
                const validMoves = getValidMoves(row, col);
                validMoves.forEach(move => {
                    moves.push({ fromRow: row, fromCol: col, move });
                });
            }
        }
    }
    
    return moves;
}

// Manage visibility of the three bottom buttons in the game screen
function updateBottomButtons() {
    const backBtn = document.getElementById('gameBackButton');
    const newGameBtn = document.getElementById('newGameButton');
    const leaveBtn = document.getElementById('leaveGameButton');

    if (gameState.gameMode === 'online-multiplayer') {
        // Multiplayer: only Leave Game button
        if (backBtn) backBtn.style.display = 'none';
        if (newGameBtn) newGameBtn.style.display = 'none';
        if (leaveBtn) leaveBtn.style.display = 'inline-flex';
    } else {
        // Single-player or two-player: only Back button
        if (backBtn) backBtn.style.display = 'inline-flex';
        if (newGameBtn) newGameBtn.style.display = 'none';
        if (leaveBtn) leaveBtn.style.display = 'none';
    }
}


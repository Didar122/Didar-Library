/* =====================================================
   PROFILE PAGE LOGIC - AUTHENTICATION, LEVELS, AND GAME STATS
   ===================================================== */

let currentUser = null;
let currentGame = 'dama';
let profileListenersInitialized = false;
let gameStatsData = {
    dama: {
        name: 'Dama',
        totalGames: 0,
        wins: 0,
        losses: 0,
        onlineWins: 0,
        onlineLosses: 0,
        captures: 0,
        kingPromotions: 0,
        totalScore: 0,
        lastPlayed: 'Never',
        favoriteMoves: 'N/A'
    }
};

const savedCurrentUser = localStorage.getItem('currentUser');
if (savedCurrentUser) {
    try {
        currentUser = JSON.parse(savedCurrentUser);
    } catch (e) {
        currentUser = null;
    }
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    try { element.style.display = 'block'; } catch(e) {}
    element.setAttribute('role', 'alert');
    // automatically hide after 5s
    setTimeout(() => {
        element.classList.remove('show');
        try { element.style.display = 'none'; } catch(e) {}
    }, 5000);
}

function clearErrors() {
    const le = document.getElementById('loginError');
    const re = document.getElementById('registerError');
    if (le) {
        le.classList.remove('show');
        try { le.style.display = 'none'; } catch(e) {}
        le.textContent = '';
    }
    if (re) {
        re.classList.remove('show');
        try { re.style.display = 'none'; } catch(e) {}
        re.textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', initializeProfileListeners);
if (document.readyState !== 'loading') {
    initializeProfileListeners();
}

function initializeProfileListeners() {
    if (profileListenersInitialized) return;
    profileListenersInitialized = true;
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchAuthTab(this.dataset.tab);
        });
    });

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    // Fallback: attach click handler to the explicit login button to ensure submit fires
    const loginBtn = document.getElementById('loginSubmit');
    if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
            // ensure the form submit handler runs even if default form submit is prevented elsewhere
            try { e.preventDefault(); } catch (er) {}
            handleLogin(e);
        });
    }
    document.getElementById('registerUsername')?.addEventListener('blur', checkUsernameAvailability);
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.querySelectorAll('#loginForm input, #registerForm input').forEach(input => {
        input.addEventListener('input', clearErrors);
    });

    initGameTabs();
}

const originalShowSection = window.showSection;
window.showSection = function(sectionId, fromBack) {
    if (originalShowSection) {
        originalShowSection(sectionId, fromBack);
    }

    if (sectionId === 'profile') {
        setTimeout(() => {
            initializeProfile();
        }, 80);
    }
};

function getPlayerDataStorageKey(username) {
    return `playerData_${username}`;
}

function getPlayerDataFromStorage(username) {
    const raw = localStorage.getItem(getPlayerDataStorageKey(username));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function savePlayerDataToStorage(playerData, username) {
    localStorage.setItem(getPlayerDataStorageKey(username), JSON.stringify(playerData));
}

async function initializeProfile() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            currentUser = null;
        }
    }

    if (currentUser && currentUser.username) {
        showProfileScreen();
        await ensurePlayerDataExists(currentUser.username);
        await loadUserProfile();
    } else {
        showAuthScreen();
    }
}

async function ensurePlayerDataExists(username) {
    let playerData = getPlayerDataFromStorage(username);
    if (playerData && Object.keys(playerData).length > 0) {
        return playerData;
    }

    playerData = {
        username,
        createdAt: new Date().toISOString(),
        coins: 0,
        diamonds: 0,
        playtimeMinutes: 0,
        favoriteGame: 'Dama',
        stats: {
            totalScore: 0,
            gamesPlayed: 0,
            singlePlayerGames: 0,
            twoPlayerGames: 0,
            onlineGames: 0,
            onlineWins: 0,
            onlineLosses: 0,
            itemsPurchased: 0,
            lastGamePlayed: null
        },
        gameStats: {
            dama: { ...gameStatsData.dama }
        }
    };

    savePlayerDataToStorage(playerData, username);

    if (typeof firestore !== 'undefined') {
        try {
            await firestore.collection('players').doc(username).set(playerData, { merge: true });
        } catch (err) {
            console.warn('Firestore save failed in ensurePlayerDataExists', err);
        }
    }

    return playerData;
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabName}Form`);
    });
    clearErrors();
}

async function checkUsernameAvailability() {
    const username = document.getElementById('registerUsername')?.value.trim();
    const availability = document.getElementById('usernameAvailability');
    if (!username || !availability) return;

    const exists = await getUserByUsername(username);
    availability.textContent = exists ? window.getTranslation('auth_avail_taken', 'Username already taken') : window.getTranslation('auth_avail_ok', 'Available');
    availability.className = exists ? 'availability-check unavailable' : 'availability-check available';
}

async function handleLogin(event) {
    event.preventDefault();
    clearErrors();

    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!username || !password) {
        showError(document.getElementById('loginError'), window.getTranslation('auth_err_fields', 'Please enter both username and password.'));
        return;
    }

    const user = await authenticateUser(username, password);
    if (!user) {
        const loginErrorEl = document.getElementById('loginError');
        showError(loginErrorEl, window.getTranslation('auth_err_invalid', 'Invalid username or password.'));
        document.getElementById('loginPassword')?.focus();
        return;
    }

    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    try { sessionStorage.removeItem('lastSectionBeforeAuth'); } catch(e){}

    if (typeof showSection === 'function') {
        showSection('profile');
    }
    showProfileScreen();

    if (window.playerDataManager && typeof window.playerDataManager.loadForCurrentUser === 'function') {
        await window.playerDataManager.loadForCurrentUser();
    }
    if (typeof window.syncSettingsUI === 'function') {
        window.syncSettingsUI();
    }

    await ensurePlayerDataExists(currentUser.username);
    const pData = getPlayerDataFromStorage(currentUser.username);
    if (!pData || !pData.welcomeRewardClaimed) {
        await grantWelcomeReward(currentUser.username);
    }

    try {
        await loadUserProfile();
    } catch (err) {
        console.error('Failed to load profile after login:', err);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    clearErrors();

    const username = document.getElementById('registerUsername')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('registerConfirm')?.value;

    if (!username || !password || !confirmPassword) {
        showError(document.getElementById('registerError'), window.getTranslation('auth_err_fill_all', 'Please fill out all fields.'));
        return;
    }
    if (password !== confirmPassword) {
        showError(document.getElementById('registerError'), window.getTranslation('auth_err_mismatch', 'Passwords do not match.'));
        return;
    }

    const existing = await getUserByUsername(username);
    if (existing) {
        showError(document.getElementById('registerError'), window.getTranslation('auth_err_taken', 'That username is already taken.'));
        return;
    }

    currentUser = await createUser(username, password);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    try { sessionStorage.removeItem('lastSectionBeforeAuth'); } catch(e){}

    if (typeof showSection === 'function') {
        showSection('profile');
    }
    showProfileScreen();

    if (window.playerDataManager && typeof window.playerDataManager.loadForCurrentUser === 'function') {
        await window.playerDataManager.loadForCurrentUser();
    }
    if (typeof window.syncSettingsUI === 'function') {
        window.syncSettingsUI();
    }

    await ensurePlayerDataExists(currentUser.username);
    await grantWelcomeReward(currentUser.username);

    try {
        await loadUserProfile();
    } catch (err) {
        console.error('Failed to load profile after register:', err);
    }
}

async function authenticateUser(username, password) {
    const localUsers = JSON.parse(localStorage.getItem('appUsers') || '{}');
    if (localUsers[username] && localUsers[username].password === password) {
        return localUsers[username];
    }

    if (typeof firestore !== 'undefined') {
        try {
            const doc = await firestore.collection('players').doc(username).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.password === password) {
                    return {
                        username,
                        password,
                        createdAt: data.createdAt || new Date().toISOString(),
                        avatar: data.avatar || 'avatar-default.png'
                    };
                }
            }
        } catch (err) {
            console.warn('Firestore auth unavailable', err);
        }
    }

    return null;
}

async function getUserByUsername(username) {
    const localUsers = JSON.parse(localStorage.getItem('appUsers') || '{}');
    if (localUsers[username]) {
        return localUsers[username];
    }

    if (typeof firestore !== 'undefined') {
        try {
            const doc = await firestore.collection('players').doc(username).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    username,
                    password: data.password || '',
                    createdAt: data.createdAt || new Date().toISOString(),
                    avatar: data.avatar || 'avatar-default.png'
                };
            }
        } catch (err) {
            console.warn('Firestore lookup failed', err);
        }
    }

    return null;
}

async function createUser(username, password) {
    const newUser = {
        username,
        password,
        createdAt: new Date().toISOString(),
        avatar: 'avatar-default.png'
    };
    const localUsers = JSON.parse(localStorage.getItem('appUsers') || '{}');
    localUsers[username] = newUser;
    localStorage.setItem('appUsers', JSON.stringify(localUsers));

    if (typeof firestore !== 'undefined') {
        try {
            await firestore.collection('players').doc(username).set({
                username,
                password,
                createdAt: newUser.createdAt,
                avatar: newUser.avatar
            }, { merge: true });
        } catch (err) {
            console.warn('Firestore create user failed', err);
        }
    }

    return newUser;
}

function showAuthScreen() {
    // remember current visible section so we can return there after auth
    try {
        const currentSectionEl = document.querySelector('.section:not(.hidden)');
        const sectionId = currentSectionEl ? currentSectionEl.id.replace(/Section$/, '') : 'home';
        sessionStorage.setItem('lastSectionBeforeAuth', sectionId);
    } catch (e) {}

    document.getElementById('authScreen')?.classList.add('active');
    document.getElementById('profileScreen')?.classList.remove('active');
    switchAuthTab('login');
}

// --- Welcome Reward ---
async function grantWelcomeReward(username) {
    const COINS_REWARD = 100;
    const DIAMONDS_REWARD = 5;

    const playerData = getPlayerDataFromStorage(username);
    if (playerData && playerData.welcomeRewardClaimed) return; // already claimed

    // Apply to playerDataManager if available
    if (window.playerDataManager) {
        window.playerDataManager.update(d => {
            d.coins = (d.coins || 0) + COINS_REWARD;
            d.diamonds = (d.diamonds || 0) + DIAMONDS_REWARD;
            d.welcomeRewardClaimed = true;
        });
    } else {
        // Fallback: patch localStorage directly
        const pd = getPlayerDataFromStorage(username) || {};
        pd.coins = (pd.coins || 0) + COINS_REWARD;
        pd.diamonds = (pd.diamonds || 0) + DIAMONDS_REWARD;
        pd.welcomeRewardClaimed = true;
        savePlayerDataToStorage(pd, username);

        if (typeof firestore !== 'undefined') {
            try {
                await firestore.collection('players').doc(username).set(
                    { coins: pd.coins, diamonds: pd.diamonds, welcomeRewardClaimed: true },
                    { merge: true }
                );
            } catch (e) { console.warn('Firestore welcome reward save failed', e); }
        }
    }

    showWelcomeRewardToast(COINS_REWARD, DIAMONDS_REWARD);
}

function showWelcomeRewardToast(coins, diamonds) {
    // Remove any existing toast
    const existingToast = document.getElementById('welcomeRewardToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'welcomeRewardToast';
    const title = window.getTranslation('welcome_reward_title', 'Welcome Reward!');
    const tpl = window.getTranslation('welcome_reward_message', `+{coins} coins &nbsp;+{diamonds} diamonds`);
    const message = tpl.replace('{coins}', coins).replace('{diamonds}', diamonds);
    toast.innerHTML = `
        <div class="wr-toast-inner">
            <div class="wr-toast-icon"><i class="fas fa-gift"></i></div>
            <div class="wr-toast-text">
                <strong>${title}</strong>
                <span>${message} <i class="fas fa-coins" style="color:#f59e0b"></i> &nbsp;<i class="fas fa-gem" style="color:#a78bfa"></i></span>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('wr-toast-visible');
    });

    // Fade out after 4s
    setTimeout(() => {
        toast.classList.remove('wr-toast-visible');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showProfileScreen() {
    document.getElementById('authScreen')?.classList.remove('active');
    document.getElementById('profileScreen')?.classList.add('active');
}

async function loadUserProfile() {
    if (!currentUser || !currentUser.username) {
        showAuthScreen();
        return;
    }

    const playerData = await fetchPlayerData(currentUser.username);
    if (!playerData) {
        console.warn('No player data found for', currentUser.username);
        return;
    }

    if (playerData.avatar) {
        document.getElementById('profileAvatar').src = `assets/images/${playerData.avatar}`;
    }
    document.getElementById('profileUsername').textContent = currentUser.username;
    const joinDate = new Date(playerData.createdAt || currentUser.createdAt || new Date().toISOString());
    document.getElementById('joinDate').textContent = window.getTranslation('profile_join_date', 'Member since ') + joinDate.toLocaleDateString();

    const stats = playerData.stats || {};
    const totalScoreVal = stats.totalScore || 0;
    const levelData = calculateLevelFromScore(totalScoreVal);

    document.getElementById('profileLevel').textContent = levelData.level;
    document.getElementById('profileLevelText').textContent = levelData.level;

    const progressPercent = Math.max(0, Math.min(100, Math.floor(levelData.progress * 100)));
    const levelProgress = document.getElementById('levelProgress');
    if (levelProgress) {
        levelProgress.style.width = `${progressPercent}%`;
        levelProgress.setAttribute('data-progress', progressPercent);
    }
    document.getElementById('levelProgressText').textContent = `${levelData.pointsIntoLevel} / ${levelData.requiredForLevel} XP`;

    document.getElementById('profileCoins').textContent = (playerData.coins || 0).toLocaleString();
    document.getElementById('profileDiamonds').textContent = (playerData.diamonds || 0).toLocaleString();
    document.getElementById('itemsPurchased').textContent = (stats.itemsPurchased || 0).toLocaleString();
    document.getElementById('playtimeHours').textContent = ((playerData.playtimeMinutes || 0) / 60).toFixed(1) + window.getTranslation('profile_hour_suffix', 'h');
    document.getElementById('totalScore').textContent = totalScoreVal.toLocaleString();
    document.getElementById('scoreRank').textContent = await getPlayerGlobalRank(currentUser.username, totalScoreVal);

    const singlePlayerGames = (stats.singlePlayerGames || 0) + (stats.twoPlayerGames || 0);
    const onlineGames = stats.onlineGames || 0;
    const totalGames = singlePlayerGames + onlineGames;
    const winRatio = onlineGames > 0 ? Math.round(((stats.onlineWins || 0) / onlineGames) * 100) : 0;

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('totalGamesPlayed', totalGames);
    setEl('offlineGamesCount', singlePlayerGames);
    setEl('singlePlayerGames', stats.singlePlayerGames || 0);
    setEl('onlineGamesCount', onlineGames);
    setEl('winRatio', `${winRatio}%`);
    setEl('winLossDetail', `${stats.onlineWins || 0}W / ${stats.onlineLosses || 0}L`);
    setEl('favoriteGame', playerData.favoriteGame || 'Not Set');
    setEl('mostPlayedGameName', playerData.favoriteGame || 'Not Set');
    setEl('mostPlayedGameCount', `${singlePlayerGames}${window.getTranslation('profile_plays', ' plays')}`);

    // Populate new global statistics cards
    setEl('profileGamesPlayed', stats.gamesPlayed || totalGames || 0);
    setEl('profileOnlineGames', onlineGames);
    setEl('profileOnlineWins', stats.onlineWins || 0);
    setEl('profileOnlineLosses', stats.onlineLosses || 0);
    setEl('profileSinglePlayerGames', stats.singlePlayerGames || 0);
    setEl('profileTwoPlayerGames', stats.twoPlayerGames || 0);

    if (stats.lastGamePlayed) {
        const lastGameDate = new Date(stats.lastGamePlayed);
        const now = new Date();
        const diffDays = Math.floor((now - lastGameDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            document.getElementById('lastGamePlayed').textContent = window.getTranslation('profile_today', 'Today');
        } else if (diffDays === 1) {
            document.getElementById('lastGamePlayed').textContent = window.getTranslation('profile_yesterday', 'Yesterday');
        } else {
            document.getElementById('lastGamePlayed').textContent = `${diffDays}${window.getTranslation('profile_days_ago', ' days ago')}`;
        }
    } else {
        document.getElementById('lastGamePlayed').textContent = window.getTranslation('profile_never', 'Never');
    }

    loadPerGameStats(playerData);
    renderStatsForGame(currentGame);
}

async function fetchPlayerData(username) {
    if (window.playerDataManager) {
        const d = window.playerDataManager.get();
        if (d && (d.username === username || (currentUser && currentUser.username === username))) {
            return d;
        }
    }
    if (typeof firestore !== 'undefined') {
        try {
            const doc = await firestore.collection('players').doc(username).get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (err) {
            console.warn('Failed to fetch Firestore player data', err);
        }
    }

    return getPlayerDataFromStorage(username);
}

function loadPerGameStats(playerData) {
    if (!playerData) return;
    const loadedGameStats = playerData.gameStats || {};
    gameStatsData = {
        dama: {
            name: 'Dama',
            totalGames: 0,
            wins: 0,
            losses: 0,
            onlineWins: 0,
            onlineLosses: 0,
            captures: 0,
            kingPromotions: 0,
            totalScore: 0,
            lastPlayed: 'Never',
            favoriteMoves: 'N/A',
            ...loadedGameStats.dama
        }
    };
}

function renderStatsForGame(gameId) {
    const gameStats = gameStatsData[gameId] || gameStatsData.dama;
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-gamepad"></i></div>
            <div class="stat-label">${window.getTranslation('profile_stat_games', 'Total Games')}</div>
            <div class="stat-value">${gameStats.totalGames || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-trophy"></i></div>
            <div class="stat-label">${window.getTranslation('profile_wins', 'Wins')}</div>
            <div class="stat-value">${gameStats.wins || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-skull-crossbones"></i></div>
            <div class="stat-label">${window.getTranslation('profile_losses', 'Losses')}</div>
            <div class="stat-value">${gameStats.losses || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-star"></i></div>
            <div class="stat-label">${window.getTranslation('profile_score_earned', 'Score Earned')}</div>
            <div class="stat-value">${gameStats.totalScore || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-chess-rook"></i></div>
            <div class="stat-label">${window.getTranslation('profile_promotions', 'King Promotions')}</div>
            <div class="stat-value">${gameStats.kingPromotions || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-bomb"></i></div>
            <div class="stat-label">${window.getTranslation('profile_captures', 'Captures')}</div>
            <div class="stat-value">${gameStats.captures || 0}</div>
        </div>
    `;
}

function initGameTabs() {
    const tabs = document.querySelectorAll('.game-tab');
    const statsGrid = document.getElementById('statsGrid');
    
    // Hidden by default
    if (statsGrid) {
        statsGrid.style.display = 'none';
    }
    
    tabs.forEach(tab => {
        if (!tab.querySelector('.toggle-icon')) {
            const icon = document.createElement('i');
            icon.className = 'toggle-icon fas fa-chevron-right';
            tab.appendChild(icon);
            tab.style.display = 'inline-flex';
            tab.style.gap = '0.5rem';
            tab.style.alignItems = 'center';
        }

        tab.addEventListener('click', () => {
            const targetGame = tab.dataset.game || 'dama';
            const icon = tab.querySelector('.toggle-icon');

            if (tab.classList.contains('active')) {
                const isGridVisible = statsGrid && statsGrid.style.display !== 'none';
                if (isGridVisible) {
                    statsGrid.style.display = 'none';
                    if (icon) icon.className = 'toggle-icon fas fa-chevron-right';
                } else {
                    if (statsGrid) statsGrid.style.display = 'grid';
                    if (icon) icon.className = 'toggle-icon fas fa-chevron-down';
                    renderStatsForGame(targetGame);
                }
                return;
            }

            tabs.forEach(item => {
                item.classList.remove('active');
                const otherIcon = item.querySelector('.toggle-icon');
                if (otherIcon) otherIcon.className = 'toggle-icon fas fa-chevron-right';
            });
            tab.classList.add('active');
            currentGame = targetGame;
            if (statsGrid) {
                statsGrid.style.display = 'grid';
            }
            if (icon) icon.className = 'toggle-icon fas fa-chevron-down';
            renderStatsForGame(currentGame);
        });
    });
}

async function getPlayerGlobalRank(username, score) {
    let globalRankNum = 'No Rank';
    if (typeof firestore !== 'undefined') {
        try {
            const snapshot = await firestore.collection('players').get();
            const playersList = [];
            snapshot.forEach(doc => {
                const pData = doc.data();
                const pScore = pData.stats?.totalScore || 0;
                playersList.push({
                    username: doc.id,
                    score: pScore
                });
            });
            const sorted = playersList.sort((a, b) => b.score - a.score);
            const rankIndex = sorted.findIndex(p => p.username === username);
            if (rankIndex !== -1) {
                globalRankNum = '#' + (rankIndex + 1);
            }
        } catch (rankErr) {
            console.warn('Failed to calculate player rank dynamically:', rankErr);
        }
    }
    if (globalRankNum === 'No Rank' && typeof getRankFromScore === 'function') {
        globalRankNum = getRankFromScore(score);
    }
    let displayRank = globalRankNum;
    if (globalRankNum === 'No Rank') {
        displayRank = window.getTranslation('profile_rank_no', 'No Rank');
    } else if (!globalRankNum.startsWith('#')) {
        displayRank = window.getTranslation('rank_' + globalRankNum.toLowerCase(), globalRankNum);
    }
    return displayRank;
}

function getRankFromScore(score) {
    if (score < 100) return 'Beginner';
    if (score < 500) return 'Amateur';
    if (score < 1000) return 'Intermediate';
    if (score < 2000) return 'Advanced';
    if (score < 5000) return 'Expert';
    return 'Master';
}

function calculateLevelFromScore(totalScore) {
    let remainingScore = Number(totalScore) || 0;
    let level = 1;
    while (true) {
        const requiredForNext = Math.ceil(100 * Math.pow(1.25, level - 1));
        if (remainingScore < requiredForNext) {
            const progress = requiredForNext === 0 ? 0 : remainingScore / requiredForNext;
            return {
                level: level,
                progress: progress,
                pointsIntoLevel: remainingScore,
                requiredForLevel: requiredForNext
            };
        }
        remainingScore -= requiredForNext;
        level++;
        if (level > 10000) {
            return { level: 10000, progress: 1, pointsIntoLevel: 0, requiredForLevel: 0 };
        }
    }
}

function handleLogout() {
    if (confirm(window.getTranslation('prompt_logout_confirm', 'Are you sure you want to logout?'))) {
        // Reset in-memory player data to anonymous defaults (do NOT push this to Firestore)
        try { window.playerDataManager && typeof window.playerDataManager.clear === 'function' && window.playerDataManager.clear(); } catch(e){}

        currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('loginForm')?.reset();
        document.getElementById('registerForm')?.reset();

        // Reset all currency displays to 0 on logout
        const zero = '0';
        ['coinAmount', 'diamondAmount', 'profileCoins', 'profileDiamonds',
         'modalProfileCoins', 'modalProfileDiamonds'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = zero;
        });

        showAuthScreen();
        switchAuthTab('login');
    }
}

function handleSectionBack() {
    if (typeof showSection === 'function') {
        showSection('home');
    }
}

async function updateGameStats(gameId, result, score = 0, stats = {}) {
    if (!currentUser || !currentUser.username) return;

    if (window.playerDataManager) {
        window.playerDataManager.update(playerData => {
            if (!playerData.gameStats) playerData.gameStats = {};
            if (!playerData.gameStats[gameId]) {
                playerData.gameStats[gameId] = {
                    name: gameId,
                    totalGames: 0,
                    wins: 0,
                    losses: 0,
                    onlineWins: 0,
                    onlineLosses: 0,
                    captures: 0,
                    kingPromotions: 0,
                    totalScore: 0,
                    lastPlayed: 'Never',
                    favoriteMoves: 'N/A'
                };
            }

            const entry = playerData.gameStats[gameId];
            entry.totalGames = (entry.totalGames || 0) + 1;
            entry.totalScore = (entry.totalScore || 0) + score;
            if (result === 'win') entry.wins = (entry.wins || 0) + 1;
            if (result === 'loss') entry.losses = (entry.losses || 0) + 1;
            if (result === 'online-win') entry.onlineWins = (entry.onlineWins || 0) + 1;
            if (result === 'online-loss') entry.onlineLosses = (entry.onlineLosses || 0) + 1;
            if (stats.captures) entry.captures = (entry.captures || 0) + stats.captures;
            if (stats.kingPromotions) entry.kingPromotions = (entry.kingPromotions || 0) + stats.kingPromotions;
            if (stats.lastPlayed) entry.lastPlayed = stats.lastPlayed;
            if (stats.favoriteMoves) entry.favoriteMoves = stats.favoriteMoves;

            playerData.gameStats[gameId] = entry;
        });
    } else {
        const playerData = getPlayerDataFromStorage(currentUser.username) || await ensurePlayerDataExists(currentUser.username);
        if (!playerData.gameStats) playerData.gameStats = {};
        if (!playerData.gameStats[gameId]) {
            playerData.gameStats[gameId] = { ...gameStatsData.dama, name: gameId };
        }

        const entry = playerData.gameStats[gameId];
        entry.totalGames = (entry.totalGames || 0) + 1;
        entry.totalScore = (entry.totalScore || 0) + score;
        if (result === 'win') entry.wins = (entry.wins || 0) + 1;
        if (result === 'loss') entry.losses = (entry.losses || 0) + 1;
        if (result === 'online-win') entry.onlineWins = (entry.onlineWins || 0) + 1;
        if (result === 'online-loss') entry.onlineLosses = (entry.onlineLosses || 0) + 1;
        if (stats.captures) entry.captures = (entry.captures || 0) + stats.captures;
        if (stats.kingPromotions) entry.kingPromotions = (entry.kingPromotions || 0) + stats.kingPromotions;
        if (stats.lastPlayed) entry.lastPlayed = stats.lastPlayed;
        if (stats.favoriteMoves) entry.favoriteMoves = stats.favoriteMoves;

        playerData.gameStats[gameId] = entry;
        savePlayerDataToStorage(playerData, currentUser.username);
        await saveGameStatsToFirestore(currentUser.username, playerData.gameStats);
    }

    if (currentGame === gameId) {
        renderStatsForGame(gameId);
    }
}

async function saveGameStatsToFirestore(username, gameStats) {
    if (typeof firestore === 'undefined') return;
    try {
        await firestore.collection('players').doc(username).set({ gameStats }, { merge: true });
    } catch (err) {
        console.warn('Could not save gameStats to Firestore', err);
    }
}

async function updatePlayerStats(gameType, result, score, coinsEarned = 0, playtimeMinutes = 0) {
    if (!currentUser || !currentUser.username) {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            currentUser = JSON.parse(saved);
        }
    }
    if (!currentUser || !currentUser.username) return;

    const now = new Date().toISOString();

    if (window.playerDataManager) {
        window.playerDataManager.update(playerData => {
            if (!playerData.stats) playerData.stats = {};

            playerData.stats.totalScore = (playerData.stats.totalScore || 0) + (score || 0);
            playerData.stats.gamesPlayed = (playerData.stats.gamesPlayed || 0) + 1;
            playerData.stats.lastGamePlayed = now;
            playerData.coins = (playerData.coins || 0) + (coinsEarned || 0);
            playerData.playtimeMinutes = (playerData.playtimeMinutes || 0) + (playtimeMinutes || 0);
            playerData.favoriteGame = playerData.favoriteGame || 'Dama';

            if (gameType === 'single-player') {
                playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
            } else if (gameType === 'two-player') {
                playerData.stats.twoPlayerGames = (playerData.stats.twoPlayerGames || 0) + 1;
                playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
            } else if (gameType === 'online-multiplayer') {
                playerData.stats.onlineGames = (playerData.stats.onlineGames || 0) + 1;
                if (result === 'win') {
                    playerData.stats.onlineWins = (playerData.stats.onlineWins || 0) + 1;
                } else {
                    playerData.stats.onlineLosses = (playerData.stats.onlineLosses || 0) + 1;
                }
            }
        });
    } else {
        const playerData = getPlayerDataFromStorage(currentUser.username) || { stats: {}, coins: 0, playtimeMinutes: 0 };
        if (!playerData.stats) playerData.stats = {};

        playerData.stats.totalScore = (playerData.stats.totalScore || 0) + (score || 0);
        playerData.stats.gamesPlayed = (playerData.stats.gamesPlayed || 0) + 1;
        playerData.stats.lastGamePlayed = now;
        playerData.coins = (playerData.coins || 0) + (coinsEarned || 0);
        playerData.playtimeMinutes = (playerData.playtimeMinutes || 0) + (playtimeMinutes || 0);
        playerData.favoriteGame = playerData.favoriteGame || 'Dama';

        if (gameType === 'single-player') {
            playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
        } else if (gameType === 'two-player') {
            playerData.stats.twoPlayerGames = (playerData.stats.twoPlayerGames || 0) + 1;
            playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
        } else if (gameType === 'online-multiplayer') {
            playerData.stats.onlineGames = (playerData.stats.onlineGames || 0) + 1;
            if (result === 'win') {
                playerData.stats.onlineWins = (playerData.stats.onlineWins || 0) + 1;
            } else {
                playerData.stats.onlineLosses = (playerData.stats.onlineLosses || 0) + 1;
            }
        }

        savePlayerDataToStorage(playerData, currentUser.username);
        await savePlayerStatsToFirestore(currentUser.username, playerData);
    }
    await loadUserProfile();
}

async function savePlayerStatsToFirestore(username, playerData) {
    if (typeof firestore === 'undefined') return;
    try {
        await firestore.collection('players').doc(username).set(playerData, { merge: true });
    } catch (err) {
        console.warn('Unable to save player stats to Firestore', err);
    }
}

function setFavoriteGame(gameKey, displayName) {
    if (!currentUser || !currentUser.username) return;
    const username = currentUser.username;
    const playerData = getPlayerDataFromStorage(username) || { stats: {} };
    playerData.favoriteGame = displayName || gameKey || 'Not Set';
    savePlayerDataToStorage(playerData, username);
    if (typeof firestore !== 'undefined') {
        firestore.collection('players').doc(username).set({ favoriteGame: playerData.favoriteGame }, { merge: true }).catch(() => {
            savePlayerDataToStorage(playerData, username);
        });
    }
    loadUserProfile();
}

async function updateOtherPlayerStats(username, gameType, result, score, coinsEarned = 0, playtimeMinutes = 0) {
    if (!username) return;

    try {
        const now = new Date().toISOString();
        let playerData = await fetchPlayerData(username);
        if (!playerData) {
            playerData = {
                username,
                createdAt: now,
                coins: 0,
                diamonds: 0,
                playtimeMinutes: 0,
                favoriteGame: 'Dama',
                stats: {
                    totalScore: 0,
                    gamesPlayed: 0,
                    singlePlayerGames: 0,
                    twoPlayerGames: 0,
                    onlineGames: 0,
                    onlineWins: 0,
                    onlineLosses: 0,
                    itemsPurchased: 0,
                    lastGamePlayed: null
                },
                gameStats: {
                    dama: {
                        name: 'Dama',
                        totalGames: 0,
                        wins: 0,
                        losses: 0,
                        onlineWins: 0,
                        onlineLosses: 0,
                        captures: 0,
                        kingPromotions: 0,
                        totalScore: 0,
                        lastPlayed: 'Never',
                        favoriteMoves: 'N/A'
                    }
                }
            };
        }
        
        if (!playerData.stats) playerData.stats = {};

        playerData.stats.totalScore = (playerData.stats.totalScore || 0) + (score || 0);
        playerData.stats.gamesPlayed = (playerData.stats.gamesPlayed || 0) + 1;
        playerData.stats.lastGamePlayed = now;
        playerData.coins = (playerData.coins || 0) + (coinsEarned || 0);
        playerData.playtimeMinutes = (playerData.playtimeMinutes || 0) + (playtimeMinutes || 0);
        playerData.favoriteGame = playerData.favoriteGame || 'Dama';

        if (gameType === 'single-player') {
            playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
        } else if (gameType === 'two-player') {
            playerData.stats.twoPlayerGames = (playerData.stats.twoPlayerGames || 0) + 1;
            playerData.stats.singlePlayerGames = (playerData.stats.singlePlayerGames || 0) + 1;
        } else if (gameType === 'online-multiplayer') {
            playerData.stats.onlineGames = (playerData.stats.onlineGames || 0) + 1;
            if (result === 'win') {
                playerData.stats.onlineWins = (playerData.stats.onlineWins || 0) + 1;
            } else {
                playerData.stats.onlineLosses = (playerData.stats.onlineLosses || 0) + 1;
            }
        }

        savePlayerDataToStorage(playerData, username);
        await savePlayerStatsToFirestore(username, playerData);
    } catch (e) {
        console.warn('updateOtherPlayerStats failed:', e);
    }
}

async function updateOtherGameStats(username, gameId, result, score = 0, stats = {}) {
    if (!username) return;

    try {
        let playerData = await fetchPlayerData(username);
        if (!playerData) return;
        if (!playerData.gameStats) playerData.gameStats = {};
        if (!playerData.gameStats[gameId]) {
            playerData.gameStats[gameId] = {
                name: gameId,
                totalGames: 0,
                wins: 0,
                losses: 0,
                onlineWins: 0,
                onlineLosses: 0,
                captures: 0,
                kingPromotions: 0,
                totalScore: 0,
                lastPlayed: 'Never',
                favoriteMoves: 'N/A'
            };
        }

        const entry = playerData.gameStats[gameId];
        entry.totalGames = (entry.totalGames || 0) + 1;
        entry.totalScore = (entry.totalScore || 0) + score;
        if (result === 'win') entry.wins = (entry.wins || 0) + 1;
        if (result === 'loss') entry.losses = (entry.losses || 0) + 1;
        if (result === 'online-win') entry.onlineWins = (entry.onlineWins || 0) + 1;
        if (result === 'online-loss') entry.onlineLosses = (entry.onlineLosses || 0) + 1;
        if (stats.captures) entry.captures = (entry.captures || 0) + stats.captures;
        if (stats.kingPromotions) entry.kingPromotions = (entry.kingPromotions || 0) + stats.kingPromotions;
        if (stats.lastPlayed) entry.lastPlayed = stats.lastPlayed;
        if (stats.favoriteMoves) entry.favoriteMoves = stats.favoriteMoves;

        playerData.gameStats[gameId] = entry;
        savePlayerDataToStorage(playerData, username);
        await saveGameStatsToFirestore(username, playerData.gameStats);
    } catch (e) {
        console.warn('updateOtherGameStats failed:', e);
    }
}

window.updatePlayerStats = updatePlayerStats;
window.updateGameStats = updateGameStats;
window.updateOtherPlayerStats = updateOtherPlayerStats;
window.updateOtherGameStats = updateOtherGameStats;
window.getPlayerProfileData = function(username) {
    return getPlayerDataFromStorage(username);
};
window.setFavoriteGame = setFavoriteGame;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;

if (window.playerDataManager) {
    window.playerDataManager.subscribe(function(d) {
        if (!currentUser || !currentUser.username) return;
        const coinsEl = document.getElementById('profileCoins');
        if (coinsEl) coinsEl.textContent = (d.coins || 0).toLocaleString();
        const diamondsEl = document.getElementById('profileDiamonds');
        if (diamondsEl) diamondsEl.textContent = (d.diamonds || 0).toLocaleString();
        const itemsPurchasedEl = document.getElementById('itemsPurchased');
        if (itemsPurchasedEl) itemsPurchasedEl.textContent = (d.stats?.itemsPurchased || d.itemsPurchased || 0).toString();
        if (d.stats) {
            const totalScoreVal = d.stats.totalScore || 0;
            const levelData = calculateLevelFromScore(totalScoreVal);
            const profileLevelEl = document.getElementById('profileLevel');
            if (profileLevelEl) profileLevelEl.textContent = levelData.level;
            const profileLevelTextEl = document.getElementById('profileLevelText');
            if (profileLevelTextEl) profileLevelTextEl.textContent = levelData.level;
            const progressPercent = Math.max(0, Math.min(100, Math.floor(levelData.progress * 100)));
            const levelProgressEl = document.getElementById('levelProgress');
            if (levelProgressEl && levelProgressEl.style) {
                levelProgressEl.style.width = `${progressPercent}%`;
            }
            const levelProgressTextEl = document.getElementById('levelProgressText');
            if (levelProgressTextEl) levelProgressTextEl.textContent = `${levelData.pointsIntoLevel} / ${levelData.requiredForLevel} XP`;
            const totalScoreEl = document.getElementById('totalScore');
            if (totalScoreEl) totalScoreEl.textContent = totalScoreVal.toLocaleString();
            const scoreRankEl = document.getElementById('scoreRank');
            if (scoreRankEl) {
                getPlayerGlobalRank(currentUser.username, totalScoreVal).then(rank => {
                    scoreRankEl.textContent = rank;
                });
            }
        }
        loadPerGameStats(d);
        renderStatsForGame(currentGame || 'dama');
    });
}

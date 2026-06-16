/* js/social.js - Logic for Leaderboards, Friends, and Global Profile Viewer */

let currentLeaderboardSort = 'level'; // 'level' or 'score'
let allPlayers = []; // Cache of all players for leaderboard
let currentModalUsername = null; // Currently viewed profile

// Ensure CSS is loaded
if (!document.querySelector('link[href="css/social.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/social.css';
    document.head.appendChild(link);
}

// ----------------------------------------------------------------------------
// Leaderboards
// ----------------------------------------------------------------------------

async function loadLeaderboards() {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;

    if (typeof firestore === 'undefined') {
        container.innerHTML = `<div style="color:#aaa; padding:10px;">${window.getTranslation('leaderboards_db_error', 'Firestore not available. Cannot load leaderboards.')}</div>`;
        return;
    }

    container.innerHTML = `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> ${window.getTranslation('leaderboards_loading', 'Loading players...')}</div>`;

    try {
        const snapshot = await firestore.collection('players').get();
        allPlayers = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const score = data.stats?.totalScore || 0;
            let level = Math.max(1, Math.floor(score / 100) + 1);
            if (typeof calculateLevelFromScore === 'function') {
                level = calculateLevelFromScore(score).level;
            }
            
            allPlayers.push({
                username: doc.id,
                avatar: data.avatar || 'avatar-default.png',
                score: score,
                level: level,
                raw: data
            });
        });

        sortLeaderboard(currentLeaderboardSort);
    } catch (e) {
        console.error('Error loading leaderboards:', e);
        container.innerHTML = `<div style="color:red; padding:10px;">${window.getTranslation('leaderboards_failed', 'Failed to load leaderboards.')}</div>`;
    }
}

function sortLeaderboard(criteria) {
    currentLeaderboardSort = criteria;
    
    // Update active button
    document.getElementById('btnSortLevel')?.classList.remove('active');
    document.getElementById('btnSortScore')?.classList.remove('active');
    
    if (criteria === 'level') {
        document.getElementById('btnSortLevel')?.classList.add('active');
        allPlayers.sort((a, b) => b.level - a.level || b.score - a.score);
    } else {
        document.getElementById('btnSortScore')?.classList.add('active');
        allPlayers.sort((a, b) => b.score - a.score);
    }
    
    renderLeaderboard();
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const myUsername = currentUser.username;
    
    // Use window.playerDataManager.get() to see if already friends
    let myFriends = [];
    if (window.playerDataManager) {
        myFriends = window.playerDataManager.get().friends || [];
    }

    if (allPlayers.length === 0) {
        container.innerHTML = `<div style="color:#aaa; padding:10px;">${window.getTranslation('leaderboards_no_players', 'No players found.')}</div>`;
        return;
    }

    allPlayers.forEach((player, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        const isMe = player.username === myUsername;
        const isFriend = myFriends.includes(player.username);
        
        let actionBtnHTML = '';
        if (isMe) {
            actionBtnHTML = `<span style="color:#aaa; font-size:0.85rem;">${window.getTranslation('profile_friend_btn_you', 'You')}</span>`;
        } else if (isFriend) {
            actionBtnHTML = `<button class="social-btn" onclick="showGlobalProfile('${player.username}')"><i class="fas fa-user-check" style="color:#10b981;"></i></button>`;
        } else {
            actionBtnHTML = `<button class="social-btn primary" onclick="showGlobalProfile('${player.username}')"><i class="fas fa-user-plus"></i></button>`;
        }

        const avatarPath = player.avatar.startsWith('http') ? player.avatar : 'assets/images/' + player.avatar;

        const card = document.createElement('div');
        card.className = 'social-card';
        card.innerHTML = `
            <div class="social-card-rank ${rankClass}">#${rank}</div>
            <img src="${avatarPath}" class="social-card-avatar" onerror="this.src='assets/images/avatar-default.png'" onclick="showGlobalProfile('${player.username}')">
            <div class="social-card-info">
                <h3 class="social-card-name" onclick="showGlobalProfile('${player.username}')">${player.username}</h3>
                <div class="social-card-stats">
                    <span style="color:#ffd700;"><i class="fas fa-star"></i> Lvl ${player.level}</span>
                    <span><i class="fas fa-trophy" style="color:#38bdf8;"></i> ${player.score}</span>
                </div>
            </div>
            <div class="social-card-actions">
                ${actionBtnHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

// ----------------------------------------------------------------------------
// Friends
// ----------------------------------------------------------------------------

async function loadFriends() {
    const reqContainer = document.getElementById('friendRequestsContainer');
    const friendsContainer = document.getElementById('friendsListContainer');
    if (!reqContainer || !friendsContainer) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || !currentUser.username) {
        reqContainer.innerHTML = `<div style="color:#aaa; padding:10px;">${window.getTranslation('friends_login_required', 'Please log in to use Friends.')}</div>`;
        friendsContainer.innerHTML = '';
        return;
    }

    if (typeof firestore === 'undefined') return;

    // Refresh my data to get latest requests and friends
    let myData = window.playerDataManager ? window.playerDataManager.get() : {};
    try {
        const doc = await firestore.collection('players').doc(currentUser.username).get();
        if (doc.exists) {
            myData = doc.data();
            if (window.playerDataManager) {
                // Keep local cache synced
                window.playerDataManager.loadForCurrentUser();
            }
        }
    } catch (e) {
        console.error('Failed to load my data for friends', e);
    }

    const requests = myData.friendRequests || [];
    const friends = myData.friends || [];

    // Render Requests
    reqContainer.innerHTML = '';
    if (requests.length === 0) {
        reqContainer.innerHTML = `<div style="color:#aaa; padding:10px;">${window.getTranslation('friends_no_requests', 'No pending requests.')}</div>`;
    } else {
        for (const reqUser of requests) {
            reqContainer.appendChild(await createSocialCard(reqUser, 'request'));
        }
    }

    friendsContainer.innerHTML = '';
    if (friends.length === 0) {
        friendsContainer.innerHTML = `<div style="color:#aaa; padding:10px;">${window.getTranslation('friends_no_friends', "You haven't added any friends yet.")}</div>`;
    } else {
        for (const friendUser of friends) {
            friendsContainer.appendChild(await createSocialCard(friendUser, 'friend'));
        }
    }
}

async function createSocialCard(username, type) {
    const card = document.createElement('div');
    card.className = 'social-card';
    card.innerHTML = `<div style="color:#aaa; padding:10px;">Loading ${username}...</div>`;

    try {
        const doc = await firestore.collection('players').doc(username).get();
        if (doc.exists) {
            const data = doc.data();
            const score = data.stats?.totalScore || 0;
            let level = Math.max(1, Math.floor(score / 100) + 1);
            if (typeof calculateLevelFromScore === 'function') {
                level = calculateLevelFromScore(score).level;
            }
            const avatar = data.avatar || 'avatar-default.png';
            const avatarPath = avatar.startsWith('http') ? avatar : 'assets/images/' + avatar;

            let actionBtnHTML = '';
            if (type === 'request') {
                actionBtnHTML = `
                    <button class="social-btn success" onclick="acceptFriendRequest('${username}')" title="Accept"><i class="fas fa-check"></i></button>
                    <button class="social-btn danger" onclick="rejectFriendRequest('${username}')" title="Reject"><i class="fas fa-times"></i></button>
                `;
            } else if (type === 'friend') {
                actionBtnHTML = `
                    <button class="social-btn primary" onclick="showGlobalProfile('${username}')">${window.getTranslation('profile_friend_btn_account', 'Account')}</button>
                `;
            }

            card.innerHTML = `
                <img src="${avatarPath}" class="social-card-avatar" onerror="this.src='assets/images/avatar-default.png'" onclick="showGlobalProfile('${username}')">
                <div class="social-card-info">
                    <h3 class="social-card-name" onclick="showGlobalProfile('${username}')">${username}</h3>
                    <div class="social-card-stats">
                        <span style="color:#ffd700;"><i class="fas fa-star"></i> Lvl ${level}</span>
                    </div>
                </div>
                <div class="social-card-actions">
                    ${actionBtnHTML}
                </div>
            `;
        } else {
            card.innerHTML = `<div style="color:red; padding:10px;">${window.getTranslation('modal_profile_not_found', 'User Not Found')}: ${username}</div>`;
        }
    } catch (e) {
        card.innerHTML = `<div style="color:red; padding:10px;">${window.getTranslation('friends_error_loading', 'Error loading')} ${username}</div>`;
    }

    return card;
}

// ----------------------------------------------------------------------------
// Friend Request Actions
// ----------------------------------------------------------------------------

async function sendFriendRequestFromModal() {
    if (!currentModalUsername) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const myUsername = currentUser.username;
    
    if (!myUsername) {
        alert(window.getTranslation('friends_alert_login', 'Please log in to send friend requests.'));
        return;
    }

    const btn = document.getElementById('modalAddFriendBtn');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.getTranslation('friends_sending', 'Sending...')}`;
    btn.classList.add('disabled');

    try {
        const targetRef = firestore.collection('players').doc(currentModalUsername);
        
        await firestore.runTransaction(async (transaction) => {
            const targetDoc = await transaction.get(targetRef);
            if (!targetDoc.exists) throw "User does not exist!";
            
            let data = targetDoc.data();
            let requests = data.friendRequests || [];
            let friends = data.friends || [];
            
            if (friends.includes(myUsername)) throw "Already friends!";
            if (requests.includes(myUsername)) throw "Request already sent!";
            
            requests.push(myUsername);
            transaction.update(targetRef, { friendRequests: requests });
        });

        btn.innerHTML = `<i class="fas fa-clock"></i> ${window.getTranslation('modal_profile_sent', 'Request Sent')}`;
        btn.classList.remove('primary');
        btn.classList.add('success');
    } catch (e) {
        console.error("Failed to send friend request:", e);
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + (typeof e === 'string' ? e : "Error");
        btn.classList.remove('primary');
        btn.classList.add('danger');
    }
}

async function acceptFriendRequest(targetUsername) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const myUsername = currentUser.username;
    if (!myUsername || typeof firestore === 'undefined') return;

    try {
        const myRef = firestore.collection('players').doc(myUsername);
        const targetRef = firestore.collection('players').doc(targetUsername);

        await firestore.runTransaction(async (transaction) => {
            const myDoc = await transaction.get(myRef);
            const targetDoc = await transaction.get(targetRef);

            let myData = myDoc.data() || {};
            let targetData = targetDoc.data() || {};

            let myRequests = myData.friendRequests || [];
            let myFriends = myData.friends || [];
            let targetFriends = targetData.friends || [];

            // Remove from requests, add to friends
            myRequests = myRequests.filter(u => u !== targetUsername);
            if (!myFriends.includes(targetUsername)) myFriends.push(targetUsername);
            if (!targetFriends.includes(myUsername)) targetFriends.push(myUsername);

            transaction.update(myRef, { friendRequests: myRequests, friends: myFriends });
            transaction.update(targetRef, { friends: targetFriends });
        });

        loadFriends(); // Refresh UI
    } catch (e) {
        console.error("Failed to accept request", e);
        alert(window.getTranslation('friends_failed_accept', 'Failed to accept request.'));
    }
}

async function rejectFriendRequest(targetUsername) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const myUsername = currentUser.username;
    if (!myUsername || typeof firestore === 'undefined') return;

    try {
        const myRef = firestore.collection('players').doc(myUsername);
        
        await firestore.runTransaction(async (transaction) => {
            const myDoc = await transaction.get(myRef);
            let myData = myDoc.data() || {};
            let myRequests = myData.friendRequests || [];
            
            myRequests = myRequests.filter(u => u !== targetUsername);
            transaction.update(myRef, { friendRequests: myRequests });
        });

        loadFriends(); // Refresh UI
    } catch (e) {
        console.error("Failed to reject request", e);
        alert(window.getTranslation('friends_failed_reject', 'Failed to reject request.'));
    }
}

// ----------------------------------------------------------------------------
// Global Profile Modal
// ----------------------------------------------------------------------------

async function showGlobalProfile(username) {
    if (!username) return;
    
    const modal = document.getElementById('globalProfileModal');
    if (!modal) return;
    
    currentModalUsername = username;
    
    // Reset modal state
    document.getElementById('modalProfileUsername').innerText = username;
    document.getElementById('modalProfileLevel').innerText = window.getTranslation('leaderboards_loading', 'Loading...');
    document.getElementById('modalProfileScore').innerText = '-';
    document.getElementById('modalProfileFavGame').innerText = window.getTranslation('leaderboards_loading', 'Loading...');
    document.getElementById('modalProfileCoins').innerText = '-';
    document.getElementById('modalProfileDiamonds').innerText = '-';
    document.getElementById('modalProfilePlaytime').innerText = '-';
    document.getElementById('modalProfileRank').innerText = '-';
    document.getElementById('modalProfileAvatar').src = 'assets/images/avatar-default.png';
    
    const btn = document.getElementById('modalAddFriendBtn');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.getTranslation('modal_profile_checking', 'Checking...')}`;
    btn.className = 'social-action-btn disabled';
    
    modal.classList.remove('hidden');

    try {
        const doc = await firestore.collection('players').doc(username).get();
        if (doc.exists) {
            const data = doc.data();
            
            // Adjust path based on context (dama game vs hub)
            const isDama = window.location.pathname.includes('/games/dama/');
            let avatarPath = data.avatar || 'avatar-default.png';
            if (!avatarPath.startsWith('http')) {
                avatarPath = (isDama ? '../../assets/images/' : 'assets/images/') + avatarPath;
            }
            
            const score = data.stats?.totalScore || 0;
            let level = Math.max(1, Math.floor(score / 100) + 1);
            if (typeof calculateLevelFromScore === 'function') {
                level = calculateLevelFromScore(score).level;
            }
            
            document.getElementById('modalProfileAvatar').src = avatarPath;
            document.getElementById('modalProfileLevel').innerText = window.getTranslation('modal_profile_lvl', 'Level ') + level;
            document.getElementById('modalProfileScore').innerText = score.toLocaleString();
            document.getElementById('modalProfileFavGame').innerText = (data.favoriteGame === 'Not Set' || !data.favoriteGame) ? window.getTranslation('profile_not_set', 'Not Set') : data.favoriteGame;
            document.getElementById('modalProfileCoins').innerText = (data.coins || 0).toLocaleString();
            document.getElementById('modalProfileDiamonds').innerText = (data.diamonds || 0).toLocaleString();
            document.getElementById('modalProfilePlaytime').innerText = ((data.playtimeMinutes || 0) / 60).toFixed(1) + window.getTranslation('profile_hour_suffix', 'h');
            
            // Calculate and display rank
            let globalRank = 'No Rank';
            if (typeof firestore !== 'undefined') {
                try {
                    if (allPlayers.length === 0) {
                        const snapshot = await firestore.collection('players').get();
                        snapshot.forEach(doc => {
                            const pData = doc.data();
                            const pScore = pData.stats?.totalScore || 0;
                            let pLevel = Math.max(1, Math.floor(pScore / 100) + 1);
                            if (typeof calculateLevelFromScore === 'function') {
                                pLevel = calculateLevelFromScore(pScore).level;
                            }
                            allPlayers.push({
                                username: doc.id,
                                avatar: pData.avatar || 'avatar-default.png',
                                score: pScore,
                                level: pLevel,
                                raw: pData
                            });
                        });
                    }
                    const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
                    const rankIndex = sorted.findIndex(p => p.username === username);
                    if (rankIndex !== -1) {
                        globalRank = '#' + (rankIndex + 1);
                    }
                } catch (rankErr) {
                    console.warn('Failed to calculate player rank dynamically:', rankErr);
                }
            }
            if (globalRank === 'No Rank' && typeof getRankFromScore === 'function') {
                globalRank = getRankFromScore(score);
            }
            let displayRank = globalRank;
            if (globalRank === 'No Rank') {
                displayRank = window.getTranslation('profile_rank_no', 'No Rank');
            } else if (!globalRank.startsWith('#')) {
                displayRank = window.getTranslation('rank_' + globalRank.toLowerCase(), globalRank);
            }
            document.getElementById('modalProfileRank').innerText = displayRank;

            // Check friendship status
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const myUsername = currentUser.username;
            
            if (myUsername === username) {
                btn.innerHTML = `<i class="fas fa-user"></i> ${window.getTranslation('modal_profile_you', 'This is You')}`;
            } else {
                let myData = window.playerDataManager ? window.playerDataManager.get() : {};
                const myFriends = myData.friends || [];
                const targetRequests = data.friendRequests || [];

                if (myFriends.includes(username)) {
                    btn.innerHTML = `<i class="fas fa-user-friends"></i> ${window.getTranslation('modal_profile_friends', 'Friends')}`;
                    btn.className = 'social-action-btn success';
                    btn.onclick = null; // Maybe add unfriend later
                } else if (targetRequests.includes(myUsername)) {
                    btn.innerHTML = `<i class="fas fa-clock"></i> ${window.getTranslation('modal_profile_sent', 'Request Sent')}`;
                    btn.className = 'social-action-btn disabled';
                } else {
                    btn.innerHTML = `<i class="fas fa-user-plus"></i> ${window.getTranslation('modal_profile_add', 'Add Friend')}`;
                    btn.className = 'social-action-btn primary';
                    btn.onclick = sendFriendRequestFromModal;
                }
            }
        } else {
            document.getElementById('modalProfileLevel').innerText = window.getTranslation('modal_profile_not_found', 'User Not Found');
        }
    } catch (e) {
        console.error("Error loading profile modal", e);
        document.getElementById('modalProfileLevel').innerText = window.getTranslation('friends_error_loading', 'Error loading');
    }
}

function closeGlobalProfile() {
    const modal = document.getElementById('globalProfileModal');
    if (modal) modal.classList.add('hidden');
    currentModalUsername = null;
}

// Direct calls are made from js/home.js showSection to avoid hook race conditions.

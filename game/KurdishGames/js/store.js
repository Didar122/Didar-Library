/* =====================================================
   STORE PAGE FUNCTIONALITY - REBUILT
   ===================================================== */

// Player currency and inventory data (centralized)
let playerData = window.playerDataManager ? window.playerDataManager.get() : { coins: 0, diamonds: 0, inventory: {}, selectedItems: {} };

// Ensure currentUser is available in store pages
window.currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');

function getPlayerDataStorageKey(username) {
    return `playerData_${username}`;
}

function getActivePlayerDataKey() {
    const user = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (user && user.username) {
        return getPlayerDataStorageKey(user.username);
    }
    return 'playerData';
}

// Current section and category filter
let currentSection = 'global';
let currentCategory = 'theme';

// Section structure
const sectionStructure = {
    global: {
        name: 'Global',
        icon: 'fas fa-globe',
        categories: ['theme', 'background', 'avatar', 'songs', 'currency']
    },
    dama: {
        name: 'Dama',
        icon: 'fas fa-chess',
        categories: ['board', 'piece']
    },
    coming: {
        name: 'Coming Soon',
        icon: 'fas fa-star',
        categories: []
    }
};

// Store items data structure
const storeItems = {
    global: [
        {
            id: 'global_bg_default',
            name: 'Default Background',
            description: 'The classic Kurdish Games background.',
            image: 'assets/images/bg-desktop.png',
            mobileImage: 'assets/images/bg-mobile.png',
            isDualImage: true,
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'blue',
            defaultOwned: true,
            isBackground: true,
            itemType: 'background'
        },
        {
            id: 'global_bg_mandala',
            name: 'Golden Mandalas',
            description: 'Beautiful golden mandala patterns background.',
            image: 'assets/images/bg-mandala-desktop.png',
            mobileImage: 'assets/images/bg-mandala-mobile.png',
            isDualImage: true,
            price: 1000,
            currency: 'coins',
            category: 'global',
            color: 'gold',
            defaultOwned: false,
            isBackground: true,
            itemType: 'background'
        },
        {
            id: 'global_bg_sunset',
            name: 'Sunset Sky',
            description: 'A warm and relaxing sunset background.',
            image: 'assets/images/bg-sunset-desktop.png',
            mobileImage: 'assets/images/bg-sunset-mobile.png',
            isDualImage: true,
            price: 25,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            defaultOwned: false,
            isBackground: true,
            itemType: 'background'
        },
        {
            id: 'global_bg_midnight',
            name: 'Midnight Aurora',
            description: 'A beautiful starry midnight sky with aurora colors.',
            image: 'assets/images/bg-midnight-desktop.png',
            mobileImage: 'assets/images/bg-midnight-mobile.png',
            isDualImage: true,
            price: 50,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            defaultOwned: false,
            isBackground: true,
            itemType: 'background'
        },
        {
            id: 'global_theme_default',
            name: 'Default Theme',
            description: 'The default gaming theme.',
            image: 'assets/images/theme1.png',
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'purple',
            defaultOwned: true,
            itemType: 'theme'
        },
        {
            id: 'global_avatar_default',
            name: 'Default Avatar',
            description: 'Start with the classic Kurdish Games avatar.',
            image: 'assets/images/avatar-default.png',
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'blue',
            defaultOwned: true,
            itemType: 'avatar'
        },
        {
            id: 'global_avatar_kurdistan',
            name: 'Kurdistan Flag',
            description: 'Show your Kurdish pride with the Kurdistan flag avatar.',
            image: 'assets/images/avatar-kurdistan.png',
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'green',
            defaultOwned: true,
            itemType: 'avatar'
        },
        {
            id: 'global_avatar_warrior',
            name: 'Kurdish Warrior',
            description: 'A legendary Kurdish warrior avatar.',
            image: 'assets/images/avatar-warrior.png',
            price: 750,
            currency: 'coins',
            category: 'global',
            color: 'gold',
            defaultOwned: false,
            itemType: 'avatar'
        },
        {
            id: 'global_avatar_eagle',
            name: 'Golden Eagle',
            description: 'A majestic golden eagle avatar.',
            image: 'assets/images/avatar-eagle.gif',
            price: 30,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            defaultOwned: false,
            itemType: 'avatar'
        },
        {
            id: 'global_song_jalsa',
            name: 'Hasan Zirak : Jalsa',
            description: 'Classic Kurdish song by Hasan Zirak.',
            image: 'assets/images/jalsa.png',
            audioUrl: 'assets/audios/jalsa.mp3',
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'purple',
            defaultOwned: true,
            itemType: 'songs'
        },
        {
            id: 'global_song_amine',
            name: 'Kamkaran : Amine Tu Gulekemi',
            description: 'Beautiful traditional track by Kamkaran.',
            image: 'assets/images/amine.png',
            audioUrl: 'assets/audios/amine.mp3',
            price: 0,
            currency: 'coins',
            category: 'global',
            color: 'green',
            defaultOwned: true,
            itemType: 'songs'
        },
        {
            id: 'global_song_kurdsat',
            name: 'Dangi Kurdsat',
            description: 'Live Kurdsat Radio stream.',
            image: 'assets/images/kurdsat.png',
            audioUrl: 'https://stream-283.zeno.fm/aky4f7r29f8uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJha3k0ZjdyMjlmOHV2IiwiaG9zdCI6InN0cmVhbS0yODMuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IjNLenJoUXdPUl9TbUxpc05sUVU0ekEiLCJpYXQiOjE3Nzg4NTcwNjAsImV4cCI6MTc3ODg1NzEyMH0.orVP0pGmPWljIgQRaWZuMHeWiriWPTKQVhuA3j2ceDg',
            price: 50,
            currency: 'diamonds',
            category: 'global',
            color: 'gold',
            defaultOwned: false,
            itemType: 'songs'
        },
        {
            id: 'pack_1d_100c',
            name: '1 Diamond for 100 Coins',
            description: 'Exchange 1 diamond for 100 gold coins.',
            image: 'assets/images/pack-1d.png',
            price: 1,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            itemType: 'currency',
            rewardCurrency: 'coins',
            rewardAmount: 100
        },
        {
            id: 'pack_5d_550c',
            name: '5 Diamonds for 550 Coins',
            description: 'Exchange 5 diamonds for 550 gold coins.',
            image: 'assets/images/pack-5d.png',
            price: 5,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            itemType: 'currency',
            rewardCurrency: 'coins',
            rewardAmount: 550
        },
        {
            id: 'pack_10d_1250c',
            name: '10 Diamonds for 1250 Coins',
            description: 'Exchange 10 diamonds for 1250 gold coins.',
            image: 'assets/images/pack-10d.png',
            price: 10,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            itemType: 'currency',
            rewardCurrency: 'coins',
            rewardAmount: 1250
        },
        {
            id: 'pack_25d_4250c',
            name: '25 Diamonds for 4250 Coins',
            description: 'Exchange 25 diamonds for 4250 gold coins.',
            image: 'assets/images/pack-25d.png',
            price: 25,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            itemType: 'currency',
            rewardCurrency: 'coins',
            rewardAmount: 4250
        },
        {
            id: 'pack_50d_9999c',
            name: '50 Diamonds for 9999 Coins',
            description: 'Exchange 50 diamonds for 9999 gold coins.',
            image: 'assets/images/pack-50d.png',
            price: 50,
            currency: 'diamonds',
            category: 'global',
            color: 'purple',
            itemType: 'currency',
            rewardCurrency: 'coins',
            rewardAmount: 9999
        },
        {
            id: 'pack_9999c_25d',
            name: '9999 Coins for 25 Diamonds',
            description: 'Exchange 9999 gold coins for 25 diamonds.',
            image: 'assets/images/pack-coins.png',
            price: 9999,
            currency: 'coins',
            category: 'global',
            color: 'gold',
            itemType: 'currency',
            rewardCurrency: 'diamonds',
            rewardAmount: 25
        }
    ],
    dama: [
        {
            id: 'dama_board_default',
            name: 'Default Board',
            description: 'The standard Dama game board.',
            image: 'assets/images/board1.png',
            price: 0,
            currency: 'coins',
            category: 'dama',
            color: 'red',
            defaultOwned: true,
            itemType: 'board'
        },
        {
            id: 'dama_board_marble',
            name: 'Marble Board',
            description: 'An elegant marble-textured Dama board.',
            image: 'assets/images/board-marble.png',
            price: 300,
            currency: 'coins',
            category: 'dama',
            color: 'blue',
            defaultOwned: false,
            itemType: 'board'
        },
        {
            id: 'dama_board_neon',
            name: 'Neon Grid Board',
            description: 'A modern neon grid Dama board.',
            image: 'assets/images/board-neon.png',
            price: 75,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'board'
        },
        {
            id: 'dama_board_royal',
            name: 'Golden Royal Board',
            description: 'A premium golden royal Dama board.',
            image: 'assets/images/board-royal.png',
            price: 75,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'board'
        },
        {
            id: 'dama_board_cosmic',
            name: 'Cosmic Vortex Board',
            description: 'A legendary cosmic vortex Dama board with modern animations.',
            image: 'assets/images/board-cosmic.svg',
            price: 150,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'board'
        },
        {
            id: 'dama_piece_default',
            name: 'Default Pieces',
            description: 'The standard game pieces used in Dama.',
            image: 'assets/images/piece1.png',
            price: 0,
            currency: 'coins',
            category: 'dama',
            color: 'green',
            defaultOwned: true,
            itemType: 'piece'
        },
        {
            id: 'dama_piece_metallic',
            name: 'Metallic Pieces',
            description: 'Beautiful metallic-colored game pieces.',
            image: 'assets/images/piece-metallic.png',
            price: 250,
            currency: 'coins',
            category: 'dama',
            color: 'gray',
            defaultOwned: false,
            itemType: 'piece'
        },
        {
            id: 'dama_piece_neon',
            name: 'Neon Glow Pieces',
            description: 'Modern neon glowing game pieces.',
            image: 'assets/images/piece-neon.png',
            price: 75,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'piece'
        },
        {
            id: 'dama_piece_royal',
            name: 'Golden Royal Pieces',
            description: 'Premium golden royal game pieces.',
            image: 'assets/images/piece-royal.png',
            price: 75,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'piece'
        },
        {
            id: 'dama_piece_cosmic',
            name: 'Cosmic Vortex Pieces',
            description: 'Legendary cosmic vortex game pieces with modern animations.',
            image: 'assets/images/piece-cosmic.gif',
            price: 150,
            currency: 'diamonds',
            category: 'dama',
            color: 'purple',
            defaultOwned: false,
            itemType: 'piece'
        }
    ]
};

// Initialize store on page load
document.addEventListener('DOMContentLoaded', function () {
    initializeStore();
});

function initializeStore() {
    loadPlayerData();
    switchSection('global', document.querySelector('.section-btn'));
    updateCurrencyDisplay();
}

function switchSection(section, button) {
    // Update current section
    currentSection = section;

    // Update active section button
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Render category buttons for this section
    renderCategoryNav();

    // Render items for first category of this section
    if (sectionStructure[section].categories.length > 0) {
        currentCategory = sectionStructure[section].categories[0];
        renderStoreItems();
    } else {
        // Coming Soon section - show empty state
        document.getElementById('storeItemsGrid').innerHTML =
            '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + window.getTranslation('games_coming_soon') + '</p></div>';
    }
}

function renderCategoryNav() {
    const categoriesNav = document.getElementById('storeCategoriesNav');
    const categories = sectionStructure[currentSection].categories;

    categoriesNav.innerHTML = '';

    categories.forEach((category, index) => {
        const fallbackName = category.charAt(0).toUpperCase() + category.slice(1);
        const categoryName = window.getTranslation('category_' + category, fallbackName);
        const icon = getCategoryIcon(category);

        const button = document.createElement('button');
        button.className = `category-btn ${index === 0 ? 'active' : ''}`;
        button.innerHTML = `<i class="${icon}"></i><span>${categoryName}</span>`;
        button.onclick = function () {
            switchCategory(category, this);
        };

        categoriesNav.appendChild(button);
    });
}

function getCategoryIcon(category) {
    const icons = {
        'background': 'fas fa-image',
        'theme': 'fas fa-palette',
        'avatar': 'fas fa-user-circle',
        'board': 'fas fa-chess-board',
        'piece': 'fas fa-circle',
        'music': 'fas fa-music',
        'songs': 'fas fa-music',
        'currency': 'fas fa-coins'
    };
    return icons[category] || 'fas fa-box';
}

function switchCategory(category, button) {
    // Update current category
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Render items for this category
    renderStoreItems();
}

function loadPlayerData() {
    if (window.playerDataManager) {
        // Load centralized player data and subscribe for updates
        window.playerDataManager.loadForCurrentUser().then(() => {
            playerData = window.playerDataManager.get();
            // Ensure defaults and selections inside update to avoid reference staleness
            window.playerDataManager.update(data => {
                if (typeof data.coins === 'undefined' || data.coins === null) data.coins = 0;
                if (typeof data.diamonds === 'undefined' || data.diamonds === null) data.diamonds = 0;
                if (!data.inventory) data.inventory = {};
                if (!data.selectedItems) data.selectedItems = {};
                if (!data.playtimeMinutes) data.playtimeMinutes = 0;
                if (!data.favoriteGame) data.favoriteGame = null;

                // Ensure default ownership and selections
                storeItems.global.forEach(item => {
                    if (item.defaultOwned) {
                        data.inventory[item.id] = true;
                        const itemType = item.itemType || 'theme';
                        const selectionKey = `global_${itemType}`;
                        if (!data.selectedItems[selectionKey]) data.selectedItems[selectionKey] = item.id;
                    }
                });
                storeItems.dama.forEach(item => {
                    if (item.defaultOwned) {
                        data.inventory[item.id] = true;
                        const itemType = item.itemType || 'theme';
                        const selectionKey = (itemType === 'theme' || itemType === 'background') ? `global_${itemType}` : `dama_${itemType}`;
                        if (!data.selectedItems[selectionKey]) data.selectedItems[selectionKey] = item.id;
                    }
                });
            });

            // Subscribe to updates to refresh UI
            window.playerDataManager.subscribe(d => {
                playerData = d;
                updateCurrencyDisplay();
                renderStoreItems();
                if (window.backgroundMusicManager) {
                    window.backgroundMusicManager.playSelectedSong();
                }
            });
        });
        return;
    }
}

function savePlayerData() {
    if (window.playerDataManager) {
        // manager.save will persist to localStorage and Firestore (if available)
        window.playerDataManager.update(() => { });
        return;
    }
    localStorage.setItem(getActivePlayerDataKey(), JSON.stringify(playerData));
}

function updateCurrencyDisplay() {
    const coinAmount = document.getElementById('coinAmount');
    const diamondAmount = document.getElementById('diamondAmount');

    if (coinAmount) coinAmount.textContent = playerData.coins.toLocaleString();
    if (diamondAmount) diamondAmount.textContent = playerData.diamonds.toLocaleString();
}

function renderStoreItems() {
    const grid = document.getElementById('storeItemsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Get items from current section
    const sectionItems = storeItems[currentSection];

    // Filter items by current category (itemType)
    let filteredItems = sectionItems.filter(item => {
        const itemTypeKey = item.itemType || 'theme';
        return itemTypeKey === currentCategory;
    });

    // Render filtered items
    if (filteredItems.length > 0) {
        filteredItems.forEach(item => {
            grid.appendChild(createItemCard(item));
        });
    } else {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + window.getTranslation('store_no_items') + '</p></div>';
    }
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.id = `item-${item.id}`;

    // Determine dynamic color based on requirements:
    // green = default/free items
    // blue = completing events items
    // gold = purchasable with coins
    // purple = purchasable with diamonds
    let cardColor = item.color;
    if (item.isEventItem || item.obtainedFrom === 'event') {
        cardColor = 'blue';
    } else if (item.defaultOwned || item.price === 0) {
        cardColor = 'green';
    } else if (item.currency === 'coins') {
        cardColor = 'gold';
    } else if (item.currency === 'diamonds') {
        cardColor = 'purple';
    }
    card.setAttribute('data-color', cardColor);

    const isCurrency = item.itemType === 'currency';
    const isOwned = !isCurrency && (playerData.inventory[item.id] || false);

    // Determine selection key based on item type
    const itemType = item.itemType || 'theme';
    const selectionKey = `${item.category}_${itemType}`;
    const isSelected = !isCurrency && (playerData.selectedItems[selectionKey] === item.id);

    const currencyClass = item.currency === 'coins' ? 'coins' : 'diamonds';

    // Determine which image to use based on screen size
    const isMobile = window.innerWidth <= 640;
    const displayImage = (item.isDualImage && item.mobileImage && isMobile) ? item.mobileImage : item.image;

    const nameTranslated = window.getTranslation(item.id + '_name', item.name);
    card.innerHTML = `
        <div class="item-image" style="background-image: url('${displayImage}');" data-desktop-image="${item.image}" data-mobile-image="${item.mobileImage || item.image}" onclick="openImageViewer('${displayImage}', '${nameTranslated}')"></div>
        <div class="item-info">
            <h3>${nameTranslated}</h3>
            ${item.price > 0 ? `
                <div class="item-price ${currencyClass}">
                    <i class="fas fa-${item.currency === 'coins' ? 'coins' : 'gem'}"></i>
                    <span>${item.price.toLocaleString()}</span>
                </div>
            ` : `<div class="item-price" style="color: #90ee90;"><i class="fas fa-check"></i><span>${window.getTranslation('store_already_owned')}</span></div>`}
        </div>
        <div class="item-actions">
            ${(item.price > 0 || isCurrency) ? `
                <button class="item-button btn-buy" onclick="buyItem('${item.id}', ${item.price}, '${item.currency}')" ${isOwned ? 'disabled' : ''}>
                    <i class="fas fa-${isOwned ? 'check' : 'shopping-cart'}"></i>
                    ${isOwned ? window.getTranslation('store_btn_owned') : window.getTranslation('store_btn_buy')}
                </button>
            ` : ''}
            ${!isCurrency ? `
            <button class="item-button btn-select ${isSelected ? 'selected' : ''}" onclick="selectItem('${item.id}', '${item.category}')">
                <i class="fas fa-check-circle"></i>
                ${isSelected ? window.getTranslation('store_btn_selected') : window.getTranslation('store_btn_select')}
            </button>
            ` : ''}
        </div>
    `;

    return card;
}

function buyItem(itemId, price, currency) {
    const currencyKey = currency === 'coins' ? 'coins' : 'diamonds';

    // Find item details to check if it's a currency pack
    let item = null;
    Object.values(storeItems).forEach(categoryItems => {
        const found = categoryItems.find(i => i.id === itemId);
        if (found) item = found;
    });

    const isCurrency = item && item.itemType === 'currency';

    // Check if player already owns the item (only for non-currencies)
    if (!isCurrency && playerData.inventory && playerData.inventory[itemId]) {
        showNotification('Already Owned', 'You already own this item!');
        return;
    }

    // Check if player has enough currency
    if (playerData[currencyKey] < price) {
        showNotification('Insufficient Funds', `You don't have enough ${currencyKey === 'coins' ? 'coins' : 'diamonds'}!`);
        return;
    }

    // Mutate state inside update to avoid reference staleness
    if (window.playerDataManager) {
        window.playerDataManager.update(data => {
            if (!data.inventory) data.inventory = {};
            if (!data.stats) data.stats = {};

            data[currencyKey] -= price;

            if (isCurrency) {
                const rewardKey = item.rewardCurrency;
                data[rewardKey] = (data[rewardKey] || 0) + item.rewardAmount;
                data.stats.currencyPurchased = (data.stats.currencyPurchased || 0) + item.rewardAmount;
            } else {
                data.inventory[itemId] = true;
                data.stats.itemsPurchased = (data.stats.itemsPurchased || 0) + 1;
            }
        });
    } else {
        playerData[currencyKey] -= price;
        if (isCurrency) {
            const rewardKey = item.rewardCurrency;
            playerData[rewardKey] = (playerData[rewardKey] || 0) + item.rewardAmount;
            if (!playerData.stats) playerData.stats = {};
            playerData.stats.currencyPurchased = (playerData.stats.currencyPurchased || 0) + item.rewardAmount;
        } else {
            playerData.inventory[itemId] = true;
            if (!playerData.stats) playerData.stats = {};
            playerData.stats.itemsPurchased = (playerData.stats.itemsPurchased || 0) + 1;
        }
        savePlayerData();
    }

    // Update display
    updateCurrencyDisplay();
    renderStoreItems();

    if (isCurrency) {
        const rewardName = item.rewardCurrency === 'coins' ? 'coins' : 'diamonds';
        showNotification('Purchase Successful', `Successfully exchanged for ${item.rewardAmount.toLocaleString()} ${rewardName}!`);
    } else {
        showNotification('Purchase Successful', 'Item purchased successfully!');
    }
}

function selectItem(itemId, category) {
    // Check if player owns the item
    if (!playerData.inventory || !playerData.inventory[itemId]) {
        showNotification('Not Owned', 'You must purchase this item first!');
        return;
    }

    // Find the item to check its type
    let selectedItem = null;
    Object.values(storeItems).forEach(categoryItems => {
        const found = categoryItems.find(item => item.id === itemId);
        if (found) selectedItem = found;
    });

    // Create a selection key that separates different item types
    const itemType = selectedItem.itemType || 'theme';
    const selectionKey = `${category}_${itemType}`;

    // Mutate selection state inside update to avoid reference staleness
    if (window.playerDataManager) {
        window.playerDataManager.update(data => {
            if (!data.selectedItems) data.selectedItems = {};

            if (data.selectedItems[selectionKey] === itemId) {
                data.selectedItems[selectionKey] = null;
            } else {
                data.selectedItems[selectionKey] = itemId;
            }
        });
    } else {
        if (playerData.selectedItems[selectionKey] === itemId) {
            playerData.selectedItems[selectionKey] = null;
        } else {
            playerData.selectedItems[selectionKey] = itemId;
        }
        savePlayerData();
    }

    // If it's an avatar item and we have a logged-in user, update their profile avatar
    if (selectedItem && selectedItem.itemType === 'avatar' && window.currentUser) {
        const avatarImagePath = selectedItem.image.split('/').pop(); // Get filename
        window.currentUser.avatar = avatarImagePath;
        playerData.avatar = avatarImagePath;
        localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
        // Persist the avatar selection into the player's stored data
        try {
            savePlayerData();
        } catch (e) {
            console.warn('Failed to save playerData after avatar change', e);
        }

        // Trigger profile refresh if the profile is currently displayed
        if (typeof window.loadUserProfile === 'function') {
            window.loadUserProfile();
        }
    }

    // Apply background if it's a background item
    if (selectedItem && selectedItem.isBackground) {
        applyBackground(itemId, category);
    }

    // Update display
    renderStoreItems();

    showNotification('Selection Updated', 'Item selection updated!');
}

function applyBackground(itemId, category) {
    // Find the item details
    let backgroundItem = null;
    Object.entries(storeItems).forEach(([catKey, categoryItems]) => {
        const found = categoryItems.find(item => item.id === itemId);
        if (found) {
            backgroundItem = found;
        }
    });

    if (!backgroundItem || !backgroundItem.isBackground) return;

    // Only update global CSS variables if it's a global background
    // Dama backgrounds should only affect the dama game, not global pages
    if (category === 'global') {
        // Update CSS variables for responsive background switching
        // Paths must be relative to CSS file location (use ../ prefix for paths from document root)
        const addCSSRelativePath = (path) => {
            if (path.startsWith('games/') || path.startsWith('assets/')) {
                return '../' + path;
            }
            return path;
        };

        const desktopPath = addCSSRelativePath(backgroundItem.image);
        const mobilePath = addCSSRelativePath(backgroundItem.mobileImage || backgroundItem.image);

        document.documentElement.style.setProperty('--bg-desktop', `url('${desktopPath}')`);
        document.documentElement.style.setProperty('--bg-mobile', `url('${mobilePath}')`);

        // Force immediate visual update by triggering a reflow
        void document.documentElement.offsetHeight;
    }

    // Save the selected background to localStorage with category prefix
    localStorage.setItem(`selectedBackground_${category}`, itemId);
}

function loadSelectedBackground() {
    // Try to load global background first, then dama
    const globalBgId = localStorage.getItem('selectedBackground_global');
    const damaBgId = localStorage.getItem('selectedBackground_dama');

    // Apply the global background (for home and other pages)
    if (globalBgId) {
        let backgroundItem = null;
        Object.values(storeItems).forEach(categoryItems => {
            const found = categoryItems.find(item => item.id === globalBgId);
            if (found) backgroundItem = found;
        });

        if (backgroundItem && backgroundItem.isBackground) {
            setTimeout(() => {
                applyBackground(globalBgId);
            }, 50);
        }
    }
}

function showNotification(title, message) {
    console.log(`${title}: ${message}`);
}

// Export functions for external use
window.buyItem = buyItem;
window.selectItem = selectItem;
window.switchSection = switchSection;
window.switchCategory = switchCategory;
window.toggleSection = toggleSection;
window.showSection = showSection;

// Make player data accessible globally for debugging
window.getPlayerData = function () {
    return playerData;
};

window.addCurrency = function (type, amount) {
    if (type === 'coins' || type === 'diamonds') {
        playerData[type] += amount;
        savePlayerData();
        updateCurrencyDisplay();
        console.log(`Added ${amount} ${type}`);
    }
};

// Image Viewer Functions
function openImageViewer(imageSrc, imageTitle) {
    const modal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerTitle = document.getElementById('viewerTitle');

    viewerImage.src = imageSrc;
    viewerTitle.textContent = imageTitle;
    modal.classList.add('active');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    modal.classList.remove('active');

    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside the image
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('imageViewerModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeImageViewer();
            }
        });
    }

    // Load selected background on store page load
    loadSelectedBackground();
});

// ESC key to close image viewer
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeImageViewer();
    }
});

// Make functions accessible globally
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
window.buyItem = buyItem;
window.selectItem = selectItem;
window.switchSection = switchSection;
window.switchCategory = switchCategory;

// Handle responsive image swapping on screen resize
window.addEventListener('resize', function () {
    updateResponsiveImages();
});

function updateResponsiveImages() {
    const isMobile = window.innerWidth <= 640;
    const itemImages = document.querySelectorAll('.item-image[data-mobile-image]');

    itemImages.forEach(img => {
        const desktopImage = img.getAttribute('data-desktop-image');
        const mobileImage = img.getAttribute('data-mobile-image');
        const currentImage = isMobile ? mobileImage : desktopImage;

        img.style.backgroundImage = `url('${currentImage}')`;
    });
}

/* =====================================================
   KURDISH GAMES - HOME SCREEN INTERACTIONS
   ===================================================== */

let sectionHistory = ['home'];

document.addEventListener('DOMContentLoaded', function() {
    initializeButtons();
    initializeFooterNav();
    setupLanguageSupport();
    initPwaSupport();
    initializeCarousel();
    loadSelectedBackgroundHome();
    initializeSettingsControls();
    initializeNotifications();

    const urlParams = new URLSearchParams(window.location.search);
    const fromDama = urlParams.get('from') === 'dama';
    if (fromDama) {
        try { sessionStorage.setItem('fromDamaOrigin', '1'); } catch (e) { /* ignore */ }
    }
    const hash = window.location.hash.slice(1);

    if (hash === 'games') {
        showSection('games');
    } else if (hash === 'store') {
        showSection('store');
    } else if (hash === 'profile') {
        showSection('profile');
    } else if (fromDama) {
        showSection('home');
    } else if (hash) {
        showSection('home');
    } else {
        showSection('loading');
        setTimeout(function() {
            showSection('home');
        }, 5000);
    }
});

function handleSectionBack() {
    const fromDamaSession = sessionStorage.getItem('fromDamaOrigin') === '1';
    if (sectionHistory.length > 1) {
        sectionHistory.pop();
        const previousSection = sectionHistory[sectionHistory.length - 1] || 'home';
        if (fromDamaSession && previousSection === 'home') {
            try { sessionStorage.removeItem('fromDamaOrigin'); } catch (e) {}
            showSection('dama');
            return;
        }
        showSection(previousSection, true);
        return;
    }

    if (fromDamaSession) {
        try { sessionStorage.removeItem('fromDamaOrigin'); } catch (e) {}
        showSection('dama');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'dama') {
        showSection('dama');
    } else {
        showSection('home', true);
    }
}

function handleNavAction(action) {
    if (!action) return;
    
    switch (action) {
        case 'profile':
            showSection('profile');
            break;
        case 'friends':
            showSection('friends');
            break;
        case 'leaderboards':
            showSection('leaderboards');
            break;
    }
}

function showSection(sectionId, fromBack = false) {
    // determine currently visible section before hiding anything
    const currentSection = document.querySelector('.section:not(.hidden)');
    const currentId = currentSection ? currentSection.id.replace(/Section$/, '') : null;

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));

    if (!fromBack && currentId !== sectionId && sectionHistory[sectionHistory.length - 1] !== sectionId) {
        sectionHistory.push(sectionId);
    }

    let target = document.getElementById(`${sectionId}Section`);
    if (!target && sectionId === 'dama') {
        target = document.getElementById('dama');
    }
    if (target) {
        target.classList.remove('hidden');
    }

    if (sectionId === 'dama') {
        try {
            if (typeof window.openDamaSection === 'function') {
                window.openDamaSection();
            } else if (typeof showScreen === 'function') {
                showScreen('modeScreen');
            } else {
                const screens = document.querySelectorAll('#dama .game-screen');
                screens.forEach(screen => screen.classList.remove('active'));
                const modeScreen = document.getElementById('modeScreen');
                if (modeScreen) {
                    modeScreen.classList.add('active');
                }
            }
        } catch (err) {
            console.error('Dama screen initialization failed:', err);
            const screens = document.querySelectorAll('#dama .game-screen');
            screens.forEach(screen => screen.classList.remove('active'));
            const modeScreen = document.getElementById('modeScreen');
            if (modeScreen) {
                modeScreen.classList.add('active');
            }
        }
    }

    const currentSearch = window.location.search || '';
    // Use the current path to keep navigation within the single-page app
    const basePath = location.pathname || '';
    const newUrl = `${basePath}${currentSearch}${sectionId ? '#' + sectionId : ''}`;
    history.replaceState(null, '', newUrl);

    // Update footer navs so the button for the current section is hidden
    updateFooterNavActive(sectionId);

    // Load social data when switching to social sections
    if (sectionId === 'leaderboards') {
        if (typeof loadLeaderboards === 'function') {
            loadLeaderboards();
        }
    } else if (sectionId === 'friends' && typeof loadFriends === 'function') {
        loadFriends();
    }
}

function updateFooterNavActive(sectionId) {
    const footerNavs = document.querySelectorAll('.footer-nav');
    footerNavs.forEach(nav => {
        const items = nav.querySelectorAll('.nav-item');
        items.forEach(item => {
            // Reset visibility
            item.style.display = '';

            const onclick = item.getAttribute('onclick') || '';
            const dataAction = item.getAttribute('data-action') || '';
            const pointsTo = onclick + ' ' + dataAction;

            // If the nav item points to the current section, hide it
            if (pointsTo.includes(`'${sectionId}'`) || pointsTo.includes(sectionId)) {
                item.style.display = 'none';
            }
        });
    });
}

function initializeButtons() {
    const buttons = document.querySelectorAll('.menu-button');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const label = this.getAttribute('data-label');
            handleButtonClick(e, label);
        });

        button.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

function handleButtonClick(event, buttonLabel) {
    const button = event.target.closest('.menu-button');
    if (button) {
        button.style.animation = 'buttonPress 0.3s ease';
        setTimeout(() => {
            button.style.animation = 'none';
        }, 300);
    }

    switch (buttonLabel) {
        case 'PLAY GAMES':
            handlePlayGames();
            break;
        case 'MULTIPLAYER':
            handleMultiplayer();
            break;
        case 'SETTINGS':
            handleSettings();
            break;
        case 'ABOUT':
            handleAbout();
            break;
        case 'EVENTS':
            handleEvents();
            break;
    }
}

function handlePlayGames() {
    showSection('games');
}

function handleMultiplayer() {
    showSection('multiplayer');
    if (typeof loadLiveRooms === 'function') {
        loadLiveRooms();
    }
}

function handleSettings() {
    showSection('settings');
}

function handleAbout() {
    showSection('about');
}

function handleEvents() {
    showSection('events');
}

let currentSlide = 1;
let slideInterval;
let adLinks = {};
let adLinksLoaded = false;
let lastDragTime = 0;

function initializeCarousel() {
    const carousel = document.querySelector('.ad-carousel');
    const dots = document.querySelectorAll('.dot');
    let startX = 0;
    let isPointerDown = false;
    let isDragging = false;

    loadAdLinks();
    showSlide(1);
    startAutoSlide();

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const slideIndex = Number(dot.getAttribute('data-slide'));
            const direction = slideIndex > currentSlide ? 'next' : 'prev';
            clearInterval(slideInterval);
            showSlide(slideIndex, direction);
            startAutoSlide();
        });
    });

    if (carousel) {
        carousel.addEventListener('dragstart', function(e) {
            e.preventDefault();
        });

        carousel.addEventListener('pointerdown', function(e) {
            isPointerDown = true;
            isDragging = false;
            startX = e.clientX;
        });

        carousel.addEventListener('pointermove', function(e) {
            if (!isPointerDown) return;
            const distance = e.clientX - startX;
            if (Math.abs(distance) > 20) {
                isDragging = true;
            }
        });

        carousel.addEventListener('pointerup', function(e) {
            if (!isPointerDown) return;
            const distance = e.clientX - startX;
            isPointerDown = false;

            if (isDragging) {
                lastDragTime = Date.now();
            }

            if (!isDragging) {
                // Handle click on current slide
                const activeSlide = document.querySelector('.ad-slide.active');
                if (activeSlide) {
                    const adNumber = activeSlide.getAttribute('data-ad');
                    handleAdClick(adNumber);
                }
                return;
            }

            clearInterval(slideInterval);
            if (distance < -70) {
                nextSlide('next');
            } else if (distance > 70) {
                prevSlide();
            }
            startAutoSlide();
        });

        carousel.addEventListener('pointercancel', function() {
            isPointerDown = false;
        });
    }
}

function loadAdLinks() {
    if (adLinksLoaded) return Promise.resolve(adLinks);

    adLinks = {
        '1': 'https://didar122.github.io/Didar-Library/',
        '2': 'https://didar122.github.io/Kurdish-Imposter-New/',
        '3': 'https://didar122.github.io/32-Dent/'
    };
    adLinksLoaded = true;
    return Promise.resolve(adLinks);
}

function showSlide(slideNumber, direction) {
    const slides = document.querySelectorAll('.ad-slide');
    const dots = document.querySelectorAll('.dot');

    if (slideNumber < 1 || slideNumber > slides.length || slideNumber === currentSlide) {
        return;
    }

    if (!direction) {
        direction = slideNumber > currentSlide ? 'next' : 'prev';
    }

    const leaving = slides[currentSlide - 1];
    const entering = slides[slideNumber - 1];

    dots.forEach(dot => dot.classList.remove('active'));
    dots[slideNumber - 1]?.classList.add('active');

    leaving.classList.remove('from-left', 'from-right', 'to-left', 'to-right');
    entering.classList.remove('from-left', 'from-right', 'to-left', 'to-right', 'active');

    entering.classList.add(direction === 'next' ? 'from-right' : 'from-left');
    entering.classList.add('active');

    requestAnimationFrame(() => {
        entering.classList.remove(direction === 'next' ? 'from-right' : 'from-left');
        leaving.classList.add(direction === 'next' ? 'to-left' : 'to-right');
    });

    setTimeout(() => {
        leaving.classList.remove('active', 'to-left', 'to-right');
    }, 550);
    currentSlide = slideNumber;
}

function startAutoSlide() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => nextSlide('next'), 6000);
}

function nextSlide(direction) {
    const nextIndex = currentSlide === 3 ? 1 : currentSlide + 1;
    showSlide(nextIndex, direction);
}

function prevSlide() {
    const prevIndex = currentSlide === 1 ? 3 : currentSlide - 1;
    showSlide(prevIndex, 'prev');
}

function handleAdClick(slide) {
    loadAdLinks().then(links => {
        const url = links[slide];
        if (url) {
            window.open(url, '_blank');
        }
    });
}

function initializeFooterNav() {
    const navItems = document.querySelectorAll('.footer-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            item.classList.add('active');
            setTimeout(() => item.classList.remove('active'), 250);
        });
    });
}

let deferredInstallPrompt = null;

function setupLanguageSupport() {
    const preferredLang = localStorage.getItem('preferredLanguage') || 'ku';
    if (typeof window.translatePage === 'function') {
        window.translatePage(preferredLang);
    }
}

function initPwaSupport() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('Service worker registration failed:', err);
        });
    }

    const installBtn = document.getElementById('installAppBtn');
    if (!installBtn) return;
    installBtn.style.display = 'none';

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        installBtn.style.display = 'inline-flex';
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    });
}

window.promptInstallApp = async function() {
    if (!deferredInstallPrompt) return;
    const installBtn = document.getElementById('installAppBtn');
    try {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            if (installBtn) installBtn.style.display = 'none';
        }
    } catch (err) {
        console.warn('PWA install prompt failed:', err);
    } finally {
        deferredInstallPrompt = null;
    }
};

function changeLanguage(lang) {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (user && user.username && window.playerDataManager) {
        try {
            window.playerDataManager.update(d => {
                d.settings = d.settings || {};
                d.settings.preferredLanguage = lang;
            });
        } catch (e) {
            console.warn('Failed to save preferred language to player data:', e);
        }
    }
    localStorage.setItem('preferredLanguage', lang);
    if (typeof window.translatePage === 'function') {
        window.translatePage(lang);
    }
    
    // Refresh active views to translate dynamic text instantly
    try {
        if (typeof renderCategoryNav === 'function' && typeof renderStoreItems === 'function') {
            renderCategoryNav();
            renderStoreItems();
        }
        if (typeof loadUserProfile === 'function') {
            loadUserProfile();
        }
        if (typeof renderLeaderboard === 'function') {
            renderLeaderboard();
        }
        if (typeof loadFriends === 'function') {
            loadFriends();
        }
        if (typeof updateUI === 'function' && typeof renderBoard === 'function') {
            updateUI();
            renderBoard();
        }
        if (typeof loadLiveRooms === 'function') {
            loadLiveRooms();
        }
    } catch (e) {
        console.warn('Error refreshing views after language change:', e);
    }
}
window.changeLanguage = changeLanguage;

// Populate About page version from manifest.json if available
fetch('manifest.json').then(r => r.json()).then(man => {
    if (man && man.version) {
        const el = document.getElementById('aboutVersion');
        if (el) el.textContent = 'v' + man.version;
    }
}).catch(() => {});

function loadSelectedBackgroundHome() {
    // Try to load global background first (home page uses global backgrounds)
    const globalBgId = localStorage.getItem('selectedBackground_global');
    
    if (globalBgId) {
        // Map item IDs to their image paths - paths are relative to CSS file location (use ../)
        const backgroundMap = {
            'global_bg_default': { desktop: '../assets/images/bg-desktop.png', mobile: '../assets/images/bg-mobile.png' },
            'global_bg_mandala': { desktop: '../assets/images/bg-mandala-desktop.png', mobile: '../assets/images/bg-mandala-mobile.png' },
            'global_bg_sunset': { desktop: '../assets/images/bg-sunset-desktop.png', mobile: '../assets/images/bg-sunset-mobile.png' },
            'global_bg_midnight': { desktop: '../assets/images/bg-midnight-desktop.png', mobile: '../assets/images/bg-midnight-mobile.png' },
            'dama_bg_default': { desktop: '../games/dama/assets/images/pc_background1.png', mobile: '../games/dama/assets/images/mobile_background1.png' },
            'dama_bg_mandala': { desktop: '../games/dama/assets/images/bg-mandala-desktop.png', mobile: '../games/dama/assets/images/bg-mandala-mobile.png' }
        };
        
        const bgPaths = backgroundMap[globalBgId];
        if (bgPaths) {
            document.documentElement.style.setProperty('--bg-desktop', `url('${bgPaths.desktop}')`);
            document.documentElement.style.setProperty('--bg-mobile', `url('${bgPaths.mobile}')`);
            // Force immediate reflow to apply changes instantly
            void document.documentElement.offsetHeight;
        }
    }
}

/* =====================================================
   BACKGROUND MUSIC MANAGER & SETTINGS INITIALIZER
   ===================================================== */

class BackgroundMusicManager {
    constructor() {
        this.audio = null;
        this.currentSongId = null;
        this.isPlaying = false;
        this.pendingPlayListener = null;
        
        // Read volume and status
        this.volume = localStorage.getItem('musicVolume') !== null ? parseFloat(localStorage.getItem('musicVolume')) : 0.5;
    }

    getIsMuted() {
        const masterMuted = localStorage.getItem('masterAudioEnabled') === 'false';
        const musicMuted = localStorage.getItem('musicEnabled') === 'false';
        return masterMuted || musicMuted;
    }

    _setupUserInteractionPlay(songId) {
        const playOnInteract = () => {
            if (this.currentSongId === songId && this.audio && !this.getIsMuted()) {
                this.audio.play().catch(e => console.warn(e));
                this.isPlaying = true;
            }
            document.removeEventListener('click', playOnInteract);
            document.removeEventListener('keydown', playOnInteract);
            document.removeEventListener('touchend', playOnInteract);
            document.removeEventListener('pointerdown', playOnInteract);
        };
        document.addEventListener('click', playOnInteract);
        document.addEventListener('keydown', playOnInteract);
        document.addEventListener('touchend', playOnInteract, { passive: true });
        document.addEventListener('pointerdown', playOnInteract);
        this.pendingPlayListener = playOnInteract;
    }

    _cleanupUserInteractionPlay() {
        if (this.pendingPlayListener) {
            document.removeEventListener('click', this.pendingPlayListener);
            document.removeEventListener('keydown', this.pendingPlayListener);
            document.removeEventListener('touchend', this.pendingPlayListener);
            document.removeEventListener('pointerdown', this.pendingPlayListener);
            this.pendingPlayListener = null;
        }
    }

    playSong(songId, audioUrl) {
        if (!audioUrl) return;

        if (this.currentSongId === songId && this.audio) {
            const isMuted = this.getIsMuted();
            if (!isMuted) {
                if (this.audio.paused) {
                    this.audio.play().catch(e => console.warn("Audio play blocked/interrupted:", e));
                    this.isPlaying = true;
                }
            } else {
                this.audio.pause();
                this.isPlaying = false;
            }
            return;
        }

        this.stop();

        this.currentSongId = songId;
        this.audio = new Audio(audioUrl);
        this.audio.loop = (songId !== 'global_song_kurdsat');
        this.audio.volume = this.volume;

        const isMuted = this.getIsMuted();
        if (!isMuted) {
            this.audio.play().catch(e => {
                console.warn("Audio play blocked, waiting for user interaction:", e);
                this._setupUserInteractionPlay(songId);
            });
            this.isPlaying = true;
        } else {
            this.isPlaying = false;
        }
    }

    stop() {
        if (this.audio) {
            this.audio.pause();
            if (this.currentSongId === 'global_song_kurdsat') {
                this.audio.src = '';
                this.audio.load();
            }
            this.audio = null;
        }
        this.isPlaying = false;
    }

    updateMuteState() {
        const isMuted = this.getIsMuted();
        if (isMuted) {
            if (this.audio) {
                this.audio.pause();
                if (this.currentSongId === 'global_song_kurdsat') {
                    this.audio.src = '';
                    this.audio.load();
                }
            }
            this.isPlaying = false;
            this._cleanupUserInteractionPlay();
        } else {
            if (this.audio) {
                if (this.currentSongId === 'global_song_kurdsat') {
                    if (typeof storeItems !== 'undefined' && storeItems.global) {
                        const song = storeItems.global.find(i => i.id === this.currentSongId);
                        if (song) {
                            this.audio.src = song.audioUrl;
                            this.audio.load();
                        }
                    }
                }
                this.audio.volume = this.volume;
                if (this.audio.paused) {
                    this.audio.play().catch(e => {
                        console.warn("Audio play blocked when unmuting:", e);
                        this._setupUserInteractionPlay(this.currentSongId);
                    });
                }
                this.isPlaying = true;
            } else {
                this.playSelectedSong();
            }
        }
    }

    setVolume(vol) {
        this.volume = vol;
        localStorage.setItem('musicVolume', vol.toString());
        if (this.audio) {
            this.audio.volume = vol;
            if (!this.getIsMuted() && this.audio.paused) {
                this.audio.play().catch(e => {
                    console.warn("Audio play blocked on volume change:", e);
                    this._setupUserInteractionPlay(this.currentSongId);
                });
            }
        }
    }

    playSelectedSong() {
        // Find selection
        let selectedSongId = 'global_song_jalsa';
        try {
            const pData = window.playerDataManager ? window.playerDataManager.get() : (window.getPlayerData ? window.getPlayerData() : null);
            if (pData && pData.selectedItems && pData.selectedItems['global_songs']) {
                selectedSongId = pData.selectedItems['global_songs'];
            }
        } catch (err) {
            console.warn(err);
        }
        
        let songItem = null;
        if (typeof storeItems !== 'undefined' && storeItems.global) {
            songItem = storeItems.global.find(item => item.id === selectedSongId);
        } else {
            // Fallback hardcoded defaults if storeItems not initialized yet
            const songDefaults = {
                'global_song_jalsa': 'assets/audios/jalsa.mp3',
                'global_song_amine': 'assets/audios/amine.mp3',
                'global_song_kurdsat': 'https://stream-283.zeno.fm/aky4f7r29f8uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJha3k0ZjdyMjlmOHV2IiwiaG9zdCI6InN0cmVhbS0yODMuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IjNLenJoUXdPUl9TbUxpc05sUVU0ekEiLCJpYXQiOjE3Nzg4NTcwNjAsImV4cCI6MTc3ODg1NzEyMH0.orVP0pGmPWljIgQRaWZuMHeWiriWPTKQVhuA3j2ceDg'
            };
            const url = songDefaults[selectedSongId];
            if (url) {
                songItem = { id: selectedSongId, audioUrl: url };
            }
        }

        if (songItem && songItem.audioUrl) {
            this.playSong(songItem.id, songItem.audioUrl);
        } else {
            this.stop();
        }
    }
}

function getCurrentUserSettings() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser && currentUser.username && window.playerDataManager && typeof window.playerDataManager.get === 'function') {
        const pd = window.playerDataManager.get() || {};
        return pd.settings || null;
    }
    return null;
}

function syncSettingsUI() {
    const settings = getCurrentUserSettings();
    if (!settings) return;

    if (settings.preferredLanguage) {
        localStorage.setItem('preferredLanguage', settings.preferredLanguage);
        if (typeof window.translatePage === 'function') {
            window.translatePage(settings.preferredLanguage);
        }
    }

    const masterAudioToggle = document.getElementById('settingMasterAudio');
    const soundEffectsToggle = document.getElementById('settingSoundEffects');
    const musicToggle = document.getElementById('settingMusic');
    const volumeSlider = document.getElementById('settingVolume');
    const notificationsToggle = document.getElementById('settingNotifications');

    if (masterAudioToggle && settings.masterAudioEnabled !== undefined) masterAudioToggle.checked = settings.masterAudioEnabled;
    if (soundEffectsToggle && settings.soundEffectsEnabled !== undefined) soundEffectsToggle.checked = settings.soundEffectsEnabled;
    if (musicToggle && settings.musicEnabled !== undefined) musicToggle.checked = settings.musicEnabled;
    if (volumeSlider && settings.musicVolume !== undefined) volumeSlider.value = parseFloat(settings.musicVolume);
    if (notificationsToggle && settings.notificationsEnabled !== undefined) notificationsToggle.checked = settings.notificationsEnabled;

    const notifBtn = document.getElementById('notificationBtn');
    if (notifBtn) {
        notifBtn.style.display = settings.notificationsEnabled === false ? 'none' : 'flex';
    }
}

function initializeSettingsControls() {
    const masterAudioToggle = document.getElementById('settingMasterAudio');
    const soundEffectsToggle = document.getElementById('settingSoundEffects');
    const musicToggle = document.getElementById('settingMusic');
    const volumeSlider = document.getElementById('settingVolume');
    const notificationsToggle = document.getElementById('settingNotifications');

    // Load initial states from player data (if logged in) else LocalStorage or default
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    let playerSettings = null;
    try {
        if (currentUser && window.playerDataManager && typeof window.playerDataManager.get === 'function') {
            const pd = window.playerDataManager.get() || {};
            playerSettings = pd.settings || null;
        }
    } catch (e) { playerSettings = null }

    const masterAudioEnabled = (playerSettings && playerSettings.masterAudioEnabled !== undefined) ? playerSettings.masterAudioEnabled : (localStorage.getItem('masterAudioEnabled') !== 'false');
    const soundEffectsEnabled = (playerSettings && playerSettings.soundEffectsEnabled !== undefined) ? playerSettings.soundEffectsEnabled : (localStorage.getItem('soundEffectsEnabled') !== 'false');
    const musicEnabled = (playerSettings && playerSettings.musicEnabled !== undefined) ? playerSettings.musicEnabled : (localStorage.getItem('musicEnabled') !== 'false');
    const musicVolume = (playerSettings && playerSettings.musicVolume !== undefined) ? parseFloat(playerSettings.musicVolume) : (localStorage.getItem('musicVolume') !== null ? parseFloat(localStorage.getItem('musicVolume')) : 0.5);
    const notificationsEnabled = (playerSettings && playerSettings.notificationsEnabled !== undefined) ? playerSettings.notificationsEnabled : (localStorage.getItem('notificationsEnabled') !== 'false');

    // Set UI states
    if (masterAudioToggle) masterAudioToggle.checked = masterAudioEnabled;
    if (soundEffectsToggle) soundEffectsToggle.checked = soundEffectsEnabled;
    if (musicToggle) musicToggle.checked = musicEnabled;
    if (volumeSlider) volumeSlider.value = musicVolume;
    if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;

    const notifBtn = document.getElementById('notificationBtn');
    if (notifBtn) {
        notifBtn.style.display = notificationsEnabled ? 'flex' : 'none';
    }

    // Initialize the background music manager
    if (!window.backgroundMusicManager) {
        window.backgroundMusicManager = new BackgroundMusicManager();
    }

    // Bind event listeners
    if (masterAudioToggle) {
        masterAudioToggle.addEventListener('change', function() {
            const enabled = this.checked;
            // Save to player settings if logged in, otherwise localStorage
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (user && user.username && window.playerDataManager) {
                try { window.playerDataManager.update(d => { d.settings = d.settings || {}; d.settings.masterAudioEnabled = enabled; }); } catch(e){}
            } else {
                localStorage.setItem('masterAudioEnabled', enabled.toString());
            }
            if (window.backgroundMusicManager) {
                window.backgroundMusicManager.updateMuteState();
            }
        });
    }

    if (soundEffectsToggle) {
        soundEffectsToggle.addEventListener('change', function() {
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (user && user.username && window.playerDataManager) {
                try { window.playerDataManager.update(d => { d.settings = d.settings || {}; d.settings.soundEffectsEnabled = this.checked; }); } catch(e){}
            } else {
                localStorage.setItem('soundEffectsEnabled', this.checked.toString());
            }
        });
    }

    if (musicToggle) {
        musicToggle.addEventListener('change', function() {
            const enabled = this.checked;
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (user && user.username && window.playerDataManager) {
                try { window.playerDataManager.update(d => { d.settings = d.settings || {}; d.settings.musicEnabled = enabled; }); } catch(e){}
            } else {
                localStorage.setItem('musicEnabled', enabled.toString());
            }
            if (window.backgroundMusicManager) {
                if (enabled) {
                    window.backgroundMusicManager.playSelectedSong();
                } else {
                    window.backgroundMusicManager.updateMuteState();
                }
            }
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (window.backgroundMusicManager) {
                window.backgroundMusicManager.setVolume(val);
                if (!window.backgroundMusicManager.getIsMuted()) {
                    window.backgroundMusicManager.updateMuteState();
                }
            }
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (user && user.username && window.playerDataManager) {
                try { window.playerDataManager.update(d => { d.settings = d.settings || {}; d.settings.musicVolume = val; }); } catch(e){}
            } else {
                localStorage.setItem('musicVolume', val.toString());
            }
        });
    }

    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', function() {
            const enabled = this.checked;
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (user && user.username && window.playerDataManager) {
                try { window.playerDataManager.update(d => { d.settings = d.settings || {}; d.settings.notificationsEnabled = enabled; }); } catch(e){}
            } else {
                localStorage.setItem('notificationsEnabled', enabled.toString());
            }
            const notifBtn = document.getElementById('notificationBtn');
            if (notifBtn) {
                notifBtn.style.display = enabled ? 'flex' : 'none';
            }
        });
    }

    if (window.playerDataManager && typeof window.playerDataManager.subscribe === 'function') {
        window.playerDataManager.subscribe(() => {
            syncSettingsUI();
        });
    }

    if (window.playerDataManager && typeof window.playerDataManager.loadForCurrentUser === 'function') {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (currentUser && currentUser.username) {
            window.playerDataManager.loadForCurrentUser().then(() => {
                syncSettingsUI();
            }).catch(() => {});
        }
    }

    syncSettingsUI();
    window.syncSettingsUI = syncSettingsUI;

    // Play selected background music initially
    setTimeout(() => {
        if (window.backgroundMusicManager) {
            window.backgroundMusicManager.playSelectedSong();
        }
    }, 150);
}

window.BackgroundMusicManager = BackgroundMusicManager;
window.initializeSettingsControls = initializeSettingsControls;

function toggleSettingsGroup(groupId, headerEl) {
    const content = document.getElementById(groupId);
    if (content) {
        content.classList.toggle('collapsed');
        headerEl.classList.toggle('collapsed');
    }
}
window.toggleSettingsGroup = toggleSettingsGroup;

// ----------------------------------------------------------------------------
// Notifications System Logic
// ----------------------------------------------------------------------------

function initializeNotifications() {
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    updateNotificationBadge(readIds);
}

function updateNotificationBadge(readIds) {
    const badge = document.getElementById('notificationBadge');
    const btn = document.getElementById('notificationBtn');
    if (!badge || !btn) return;
    
    const list = window.gameNotifications || [];
    const unreadList = list.filter(item => !readIds.includes(item.id));
    
    if (unreadList.length > 0) {
        badge.classList.remove('hidden');
        btn.classList.add('ringing');
    } else {
        badge.classList.add('hidden');
        btn.classList.remove('ringing');
    }
}

function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    const listContainer = document.getElementById('notificationsList');
    if (!modal || !listContainer) return;
    
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const list = window.gameNotifications || [];
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    
    if (list.length === 0) {
        listContainer.innerHTML = `<p class="no-notifications-text">${window.getTranslation('notifications_empty', 'No new notifications.')}</p>`;
    } else {
        listContainer.innerHTML = '';
        list.forEach(item => {
            const isUnread = !readIds.includes(item.id);
            const title = lang === 'ku' ? item.titleKu : item.titleEn;
            const desc = lang === 'ku' ? item.descKu : item.descEn;
            
            const itemEl = document.createElement('div');
            itemEl.className = `notification-item ${isUnread ? 'unread' : ''}`;
            itemEl.innerHTML = `
                <div class="notification-status-dot"></div>
                <div class="notification-content-wrapper" style="flex: 1; display: flex; flex-direction: column;">
                    <div class="notification-header-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <h4 style="margin: 0;">${title}</h4>
                        <span class="notification-time" style="margin: 0; font-size: 0.75rem; color: #64748b;">${item.date}</span>
                    </div>
                    <div class="notification-body" style="max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease; margin-top: 0; font-size: 0.88rem; color: #cbd5e1; line-height: 1.4;">
                        ${desc}
                    </div>
                </div>
            `;
            
            itemEl.onclick = () => {
                const body = itemEl.querySelector('.notification-body');
                const isExpanded = itemEl.classList.toggle('expanded');
                
                if (isExpanded) {
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.opacity = '1';
                    body.style.marginTop = '8px';
                } else {
                    body.style.maxHeight = '0';
                    body.style.opacity = '0';
                    body.style.marginTop = '0';
                }
                
                // Mark as seen (read)
                const currentReadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
                if (!currentReadIds.includes(item.id)) {
                    currentReadIds.push(item.id);
                    localStorage.setItem('readNotifications', JSON.stringify(currentReadIds));
                    updateNotificationBadge(currentReadIds);
                    itemEl.classList.remove('unread');
                }
            };
            
            listContainer.appendChild(itemEl);
        });
    }
    
    modal.classList.remove('hidden');
}

function markAllNotificationsAsReadImmediately() {
    const list = window.gameNotifications || [];
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    let changed = false;
    list.forEach(item => {
        if (!readIds.includes(item.id)) {
            readIds.push(item.id);
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem('readNotifications', JSON.stringify(readIds));
        updateNotificationBadge(readIds);
    }
}

function markNotificationAsRead(id) {
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('readNotifications', JSON.stringify(readIds));
        updateNotificationBadge(readIds);
        
        const items = document.querySelectorAll('.notification-item');
        const list = window.gameNotifications || [];
        list.forEach((item, index) => {
            if (item.id === id && items[index]) {
                items[index].classList.remove('unread');
            }
        });
    }
}

function markAllNotificationsAsRead() {
    markAllNotificationsAsReadImmediately();
    const items = document.querySelectorAll('.notification-item');
    items.forEach(el => {
        el.classList.remove('unread');
    });
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

window.initializeNotifications = initializeNotifications;
window.openNotificationsModal = openNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;


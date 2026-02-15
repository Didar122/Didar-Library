class KurdishSnakeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gridSize = 20;
        this.tileCount = 20;
        
        // Game modes
        this.gameMode = 'classic'; // 'classic' or 'modern'
        
        // Classic mode snake (grid-based)
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.dx = 0;
        this.dy = 0;
        
        // Modern mode snake (smooth movement)
        this.modernSnake = {
            segments: [
                { x: 200, y: 200 },
                { x: 180, y: 200 },
                { x: 160, y: 200 }
            ],
            angle: 0,
            speed: 2,
            segmentDistance: 15
        };
        
        this.food = { x: 15, y: 15 };
        this.modernFood = { x: 300, y: 300 };
        this.specialFood = null;
        this.specialFoodTimer = null;
        this.specialFoodSpawnTimer = null;
        this.score = 0;
        
        this.highScore = parseInt(localStorage.getItem('kurdish-snake-high-score')) || 0;
        this.classicHighScore = parseInt(localStorage.getItem('kurdish-snake-classic-high-score')) || 0;
        this.modernHighScore = parseInt(localStorage.getItem('kurdish-snake-modern-high-score')) || 0;
        this.coins = parseInt(localStorage.getItem('kurdish-snake-coins')) || 500;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;
        this.startTime = null;
        this.gameTime = 0;
        this.obstacles = [];
        this.bot = null;
        this.botKillReward = 500;
        
        // Difficulty system
        this.difficulty = localStorage.getItem('kurdish-snake-difficulty') || 'normal';
        this.difficultySettings = {
            easy: { 
                speed: 400, 
                coinMultiplier: 1, 
                name: 'Easy', 
                obstacles: 0, 
                hasBot: false,
                modernSpeed: 0.8,
                modernObstacles: 0
            },
            normal: { 
                speed: 300, 
                coinMultiplier: 2, 
                name: 'Normal', 
                obstacles: 5, 
                hasBot: false,
                modernSpeed: 1.2,
                modernObstacles: 5
            },
            hard: { 
                speed: 300, 
                coinMultiplier: 3, 
                name: 'Hard', 
                obstacles: 8, 
                hasBot: false,
                modernSpeed: 1.2,
                modernObstacles: 8
            },
            extreme: { 
                speed: 300, 
                coinMultiplier: 5, 
                name: 'Extreme', 
                obstacles: 12, 
                hasBot: true,
                modernSpeed: 1.2,
                modernObstacles: 12
            }
        };
        
        // Customization
        this.currentTheme = localStorage.getItem('kurdish-snake-theme') || 'light';
        this.currentSkin = localStorage.getItem('kurdish-snake-skin') || 'peshmerga';
        this.ownedThemes = JSON.parse(localStorage.getItem('kurdish-snake-owned-themes')) || ['dark', 'light'];
        this.ownedSkins = JSON.parse(localStorage.getItem('kurdish-snake-owned-skins')) || ['peshmerga'];
        
        // Settings
        this.soundEnabled = localStorage.getItem('kurdish-snake-sound') !== 'false';
        this.gameSpeed = this.difficultySettings[this.difficulty].speed;
        this.vipStatus = localStorage.getItem('kurdish-snake-vip') === 'true';
        
        // Game loop
        this.gameLoop = null;
        this.timerInterval = null;
        this.titleTapCount = 0;
        this.titleTapTimer = null;
        this.currentPage = 'home';
        
        // Modern mode controls
        this.keys = {};

        // Theme animation timers
        this.themeAnimationTimer = null;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeGame());
        } else {
            this.initializeGame();
        }
    }
    
    initializeGame() {
        try {
            // Set initial language
            currentLang = localStorage.getItem('kurdish-snake-language') || 'en';
            document.getElementById('languageSelect').value = currentLang;
            updateLanguage();
            
            this.bindEvents();
            this.updateDisplay();
            this.applyTheme();
            this.updateSoundToggle();
            
            // Check VIP status and show banner if VIP
            if (this.vipStatus) {
                const banner = document.getElementById('vipBanner');
                const spacer = document.getElementById('vipSpacer');
                banner.classList.remove('hidden');
                spacer.classList.remove('hidden');
                banner.innerHTML = '👑 VIP Activated 👑';
                
                // Add crown to game title
                const gameTitle = document.getElementById('gameTitle');
                const titleText = gameTitle.textContent;
                gameTitle.innerHTML = titleText.slice(0, -1) + '<span class="relative inline-block">' + titleText.slice(-1) + '<span class="absolute -top-4 left-1/2 transform -translate-x-1/2 text-2xl animate-float">👑</span></span>';
            }
            
            this.updateVipStatus();
            this.generateShopContent();
            this.generateObstacles();
            this.generateBot();
            this.showSplashScreen();
            
            setTimeout(() => {
                this.showHomePage();
            }, 2600);
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }
    
    initCanvas() {
        try {
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                console.error('Canvas element not found');
                return false;
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                console.error('Canvas context not available');
                return false;
            }
            
            this.canvas.width = 400;
            this.canvas.height = 400;
            this.tileCount = this.canvas.width / this.gridSize;
            
            console.log('Canvas initialized successfully:', this.canvas.width, 'x', this.canvas.height);
            return true;
        } catch (error) {
            console.error('Error initializing canvas:', error);
            return false;
        }
    }
    
    showHomePage() {
        this.currentPage = 'home';
        document.getElementById('homePage').classList.remove('hidden');
        document.getElementById('gamePage').classList.add('hidden');
        document.getElementById('splashScreen').classList.add('hidden');
        
        this.resetGame();
        this.updateHomeDisplay();
    }
    
    showGamePage(mode) {
        this.gameMode = mode;
        this.currentPage = 'game';
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('gamePage').classList.remove('hidden');
        
        // Update mode indicator
        const indicator = document.getElementById('gameModeIndicator');
        if (mode === 'classic') {
            indicator.innerHTML = '🎮 Classic Mode';
        } else {
            indicator.innerHTML = '🚀 Modern Mode';
        }
        
        // Update display with mode-specific high score
        document.getElementById('highScore').textContent = mode === 'classic' ? this.classicHighScore : this.modernHighScore;
        
        setTimeout(() => {
            const canvasReady = this.initCanvas();
            if (canvasReady) {
                this.gameSpeed = this.difficultySettings[this.difficulty].speed;
                if (mode === 'modern') {
                    switch (this.difficulty) {
                        case 'easy': this.modernSnake.speed = 1; break;
                        case 'normal': this.modernSnake.speed = 2; break;
                        case 'hard': this.modernSnake.speed = 3; break;
                        case 'extreme': this.modernSnake.speed = 3; break;
                    }
                }
                this.generateObstacles();
                this.generateBot();
                this.drawGame();
            } else {
                console.error('Failed to initialize canvas');
                this.showStatus('Error: Game canvas not available');
            }
        }, 100);
    }
    
    updateHomeDisplay() {
        document.getElementById('homeClassicHighScore').textContent = this.classicHighScore;
        document.getElementById('homeModernHighScore').textContent = this.modernHighScore;
        document.getElementById('homeCoins').textContent = this.coins;
        document.getElementById('currentDifficulty').textContent = this.difficultySettings[this.difficulty].name;
    }
    
    showSplashScreen() {
        setTimeout(() => {
            document.getElementById('splashScreen').classList.add('hidden');
            this.showStatus('Choose a game mode to begin!');
        }, 2500);
    }
    
    createGalaxyStars() {
        const starsContainer = document.getElementById('galaxyStars');
        starsContainer.innerHTML = '';
        
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = (Math.random() * 3 + 1) + 'px';
            star.style.height = star.style.width;
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }
    
    bindEvents() {
        document.getElementById('classicModeBtn').addEventListener('click', () => this.showGamePage('classic'));
        document.getElementById('modernModeBtn').addEventListener('click', () => this.showGamePage('modern'));
        document.getElementById('difficultyBtn').addEventListener('click', () => this.openDifficulty());
        document.getElementById('homeShopBtn').addEventListener('click', () => this.openShop());
        document.getElementById('homeSettingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('gameTitle').addEventListener('click', () => this.handleTitleTap());
    
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('shopBtn').addEventListener('click', () => this.openShop());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
    
        document.getElementById('upBtn').addEventListener('click', () => this.handleMobileControl('up'));
        document.getElementById('downBtn').addEventListener('click', () => this.handleMobileControl('down'));
        document.getElementById('leftBtn').addEventListener('click', () => this.handleMobileControl('left'));
        document.getElementById('rightBtn').addEventListener('click', () => this.handleMobileControl('right'));
        document.getElementById('mobilePauseBtn').addEventListener('click', () => this.togglePause());
    
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.addEventListener('keyup', (e) => this.handleKeyRelease(e));
    
        document.getElementById('closeShop').addEventListener('click', () => this.closeShop());
        document.getElementById('themesTab').addEventListener('click', () => this.showShopTab('themes'));
        document.getElementById('skinsTab').addEventListener('click', () => this.showShopTab('skins'));
    
        document.getElementById('closeDifficulty').addEventListener('click', () => this.closeDifficulty());
        document.getElementById('easyDifficulty').addEventListener('click', () => this.setDifficulty('easy'));
        document.getElementById('normalDifficulty').addEventListener('click', () => this.setDifficulty('normal'));
        document.getElementById('hardDifficulty').addEventListener('click', () => this.setDifficulty('hard'));
        document.getElementById('extremeDifficulty').addEventListener('click', () => this.setDifficulty('extreme'));
    
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('languageSelect').addEventListener('change', (e) => this.setLanguage(e.target.value));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('aboutBtn').addEventListener('click', () => this.showAbout());
        document.getElementById('resetDataBtn').addEventListener('click', () => this.showResetModal());
    
        document.getElementById('closeAbout').addEventListener('click', () => this.closeAbout());
    
        document.getElementById('closeReset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('cancelReset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('confirmReset').addEventListener('click', () => this.confirmReset());
    
        document.getElementById('playAgain').addEventListener('click', () => this.playAgain());
        document.getElementById('backToMenu').addEventListener('click', () => this.backToMenu());
    }

    handleMobileControl(direction) {
        if (!this.gameStarted) {
            this.startGame();
        }
        if (this.gameMode === 'classic') {
            switch (direction) {
                case 'up': this.changeDirection(0, -1); break;
                case 'down': this.changeDirection(0, 1); break;
                case 'left': this.changeDirection(-1, 0); break;
                case 'right': this.changeDirection(1, 0); break;
            }
        } else {
            let angleIncrement = 0.5;
            switch (direction) {
                case 'up': this.modernSnake.angle = -Math.PI / 2; break;
                case 'down': this.modernSnake.angle = Math.PI / 2; break;
                case 'left': this.modernSnake.angle -= angleIncrement; break;
                case 'right': this.modernSnake.angle += angleIncrement; break;
            }
        }
    }
    
    handleTitleTap() {
        this.titleTapCount = (this.titleTapCount || 0) + 1;
        
        if (this.titleTapTimer) {
            clearTimeout(this.titleTapTimer);
        }
        
        this.titleTapTimer = setTimeout(() => {
            this.titleTapCount = 0;
        }, 2000);
        
        if (this.titleTapCount >= 7) {
            this.activateCheat();
            this.titleTapCount = 0;
        }
    }
    
    activateCheat() {
        // Show permanent VIP banner
        const banner = document.getElementById('vipBanner');
        banner.classList.remove('hidden');
        banner.innerHTML = '👑 VIP Activated 👑';
        document.getElementById('vipSpacer').classList.remove('hidden');

        // Add crown to game title
        const gameTitle = document.getElementById('gameTitle');
        const titleText = gameTitle.textContent;
        gameTitle.innerHTML = titleText.slice(0, -1) + '<span class="relative inline-block">' + titleText.slice(-1) + '<span class="absolute -top-4 left-1/2 transform -translate-x-1/2 text-2xl animate-float">👑</span></span>';

        // Show epic activation animation
        const cheatSplash = document.getElementById('cheatSplash');
        cheatSplash.classList.remove('hidden');
        
        // Create particle explosion
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'cheat-particle';
            particle.innerHTML = ['✨', '💫', '⭐', '🌟'][Math.floor(Math.random() * 4)];
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.setProperty('--angle', (Math.random() * 360) + 'deg');
            particle.style.setProperty('--distance', (Math.random() * 100 + 50) + 'px');
            cheatSplash.appendChild(particle);
            
            setTimeout(() => particle.remove(), 2000);
        }

        setTimeout(() => {
            cheatSplash.classList.add('hidden');
        }, 3000);

        this.coins = 99999999; // Massive coin boost
        this.ownedThemes.push('vip');
        this.ownedSkins.push('vip');
        this.vipStatus = true;
        
        this.saveData();
        this.updateDisplay();
        this.updateVipStatus();
        this.generateShopContent();
        if (typeof playCheatSound === 'function') {
            playCheatSound();
        }
    }
    
    createCoinRain() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const coin = document.createElement('div');
                coin.className = 'coin-rain';
                coin.textContent = '💰';
                coin.style.left = Math.random() * 100 + 'vw';
                coin.style.animationDelay = Math.random() * 2 + 's';
                document.body.appendChild(coin);
                
                setTimeout(() => {
                    coin.remove();
                }, 3000);
            }, i * 100);
        }
    }
    
    startGame() {
        if (!this.gameStarted) {
            if (!this.canvas || !this.ctx) {
                const canvasReady = this.initCanvas();
                if (!canvasReady) {
                    console.error('Failed to initialize canvas');
                    this.showStatus('Error: Canvas not available');
                    return;
                }
            }
            
            this.gameStarted = true;
            this.gameRunning = true;
            this.startTime = Date.now();
            this.startTimer();
            this.startSpecialFoodSpawnTimer();
            
            if (this.gameMode === 'classic') {
                this.gameLoop = setInterval(() => this.updateClassic(), this.gameSpeed);
            } else {
                this.gameLoop = setInterval(() => this.updateModern(), 16); // 60 FPS for smooth movement
            }
            
            const startBtn = document.getElementById('startBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            
            if (startBtn) startBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = false;
            
            this.showStatus('Game Started! Use arrow keys to move');
            this.playSound('start');
            
            this.drawGame();
        }
    }
    
    togglePause() {
        if (!this.gameStarted) return;
        
        this.gamePaused = !this.gamePaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.gamePaused) {
            clearInterval(this.gameLoop);
            clearInterval(this.timerInterval);
            pauseBtn.innerHTML = '▶️ Resume';
            this.showStatus('Game Paused');
        } else {
            if (this.gameMode === 'classic') {
                this.gameLoop = setInterval(() => this.updateClassic(), this.gameSpeed);
            } else {
                this.gameLoop = setInterval(() => this.updateModern(), 16);
            }
            this.startTimer();
            pauseBtn.innerHTML = '⏸️ Pause';
            this.showStatus('Game Resumed');
        }
    }
    
    startSpecialFoodSpawnTimer() {
        // Clear any existing timers
        if (this.specialFoodSpawnTimer) clearInterval(this.specialFoodSpawnTimer);
        if (this.specialFoodTimer) clearInterval(this.specialFoodTimer);
        
        // Start spawning special food every 15 seconds
        this.specialFoodSpawnTimer = setInterval(() => {
            if (!this.gamePaused && this.gameRunning) {
                this.generateSpecialFood();
            }
        }, 15000); // 15 seconds
    }

    generateSpecialFood() {
        if (this.gameMode === 'classic') {
            let newFood;
            do {
                newFood = {
                    x: Math.floor(Math.random() * this.tileCount),
                    y: Math.floor(Math.random() * this.tileCount),
                    createdAt: Date.now(),
                    type: 'special'
                };
            } while (
                this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
                this.obstacles.some(obstacle => 
                    newFood.x >= obstacle.x && newFood.x < obstacle.x + obstacle.width &&
                    newFood.y >= obstacle.y && newFood.y < obstacle.y + obstacle.height
                )
            );
            this.specialFood = newFood;
        } else {
            let newFood;
            do {
                newFood = {
                    x: Math.random() * (this.canvas.width - 40) + 20,
                    y: Math.random() * (this.canvas.height - 40) + 20,
                    createdAt: Date.now(),
                    type: 'special'
                };
            } while (
                this.modernSnake.segments.some(segment => {
                    const distance = Math.sqrt(
                        Math.pow(segment.x - newFood.x, 2) + Math.pow(segment.y - newFood.y, 2)
                    );
                    return distance < 30;
                })
            );
            this.specialFood = newFood;
        }

        // Remove special food after 5 seconds
        if (this.specialFoodTimer) clearInterval(this.specialFoodTimer);
        this.specialFoodTimer = setTimeout(() => {
            this.specialFood = null;
        }, 5000);
    }

    resetGame() {
        clearInterval(this.gameLoop);
        clearInterval(this.timerInterval);
        clearInterval(this.specialFoodSpawnTimer);
        clearInterval(this.specialFoodTimer);
        
        // Reset classic mode
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.food = { x: 15, y: 15 };
        this.dx = 0;
        this.dy = 0;
        
        // Reset modern mode
        let modernSpeed = 2;
        if (this.gameMode === 'modern') {
            switch (this.difficulty) {
                case 'easy': modernSpeed = 1; break;
                case 'normal': modernSpeed = 2; break;
                case 'hard': modernSpeed = 3; break;
                case 'extreme': modernSpeed = 3; break;
            }
        }
        this.modernSnake = {
            segments: [
                { x: 200, y: 200 },
                { x: 180, y: 200 },
                { x: 160, y: 200 }
            ],
            angle: 0,
            speed: modernSpeed,
            segmentDistance: 15
        };
        this.modernFood = { x: 300, y: 300 };
        
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;
        this.startTime = null;
        this.gameTime = 0;
        this.gameSpeed = this.difficultySettings[this.difficulty].speed;
        this.obstacles = [];
        this.bot = null;
        this.keys = {};
        
        this.generateObstacles();
        this.generateBot();
        
        if (this.currentPage === 'game') {
            const startBtn = document.getElementById('startBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            
            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) {
                pauseBtn.disabled = true;
                pauseBtn.innerHTML = '⏸️ Pause';
            }
            
            this.showStatus('Game Reset! Press Start to begin');
            
            if (this.canvas && this.ctx) {
                this.drawGame();
            } else {
                setTimeout(() => {
                    const canvasReady = this.initCanvas();
                    if (canvasReady) {
                        this.drawGame();
                    }
                }, 100);
            }
        }
        
        this.updateDisplay();
    }
    
    updateClassic() {
        if (!this.gameRunning || this.gamePaused) return;
        
        try {
            const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
            
            if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
                this.gameOver();
                return;
            }
            
            if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
                this.gameOver();
                return;
            }
            
            if (this.obstacles.some(obstacle => 
                head.x >= obstacle.x && head.x < obstacle.x + obstacle.width &&
                head.y >= obstacle.y && head.y < obstacle.y + obstacle.height
            )) {
                this.gameOver();
                return;
            }
            
            if (this.bot && this.bot.segments.some(segment => segment.x === head.x && segment.y === head.y)) {
                this.gameOver();
                return;
            }
            
            this.snake.unshift(head);
            
            if (head.x === this.food.x && head.y === this.food.y) {
                this.eatFood();
            } else if (this.specialFood && head.x === this.specialFood.x && head.y === this.specialFood.y) {
                this.eatSpecialFood();
            } else {
                this.snake.pop();
            }
            
            this.updateBot();
            this.drawGame();
        } catch (error) {
            console.error('Error in classic game update:', error);
            this.gameOver();
        }
    }
    
    updateModern() {
        if (!this.gameRunning || this.gamePaused) return;
        
        try {
            // Handle smooth turning
            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                this.modernSnake.angle -= 0.1;
            }
            if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
                this.modernSnake.angle += 0.1;
            }
            
            // Move head
            const head = this.modernSnake.segments[0];
            head.x += Math.cos(this.modernSnake.angle) * this.modernSnake.speed;
            head.y += Math.sin(this.modernSnake.angle) * this.modernSnake.speed;
            
            // Check wall collision
            if (head.x < 10 || head.x > this.canvas.width - 10 || head.y < 10 || head.y > this.canvas.height - 10) {
                this.gameOver();
                return;
            }
            
            // Check obstacle collision
            for (const obstacle of this.obstacles) {
                if (obstacle.type === 'round') {
                    const dx = head.x - obstacle.x;
                    const dy = head.y - obstacle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < obstacle.radius + 10) { // 10 is half of snake width
                        this.gameOver();
                        return;
                    }
                }
            }
            
            // Update body segments to follow head smoothly
            for (let i = 1; i < this.modernSnake.segments.length; i++) {
                const current = this.modernSnake.segments[i];
                const target = this.modernSnake.segments[i - 1];
                
                const dx = target.x - current.x;
                const dy = target.y - current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > this.modernSnake.segmentDistance) {
                    const moveRatio = (distance - this.modernSnake.segmentDistance) / distance;
                    current.x += dx * moveRatio;
                    current.y += dy * moveRatio;
                }
            }
            
            // Check self collision
            for (let i = 4; i < this.modernSnake.segments.length; i++) {
                const segment = this.modernSnake.segments[i];
                const distance = Math.sqrt(
                    Math.pow(head.x - segment.x, 2) + Math.pow(head.y - segment.y, 2)
                );
                if (distance < 12) {
                    this.gameOver();
                    return;
                }
            }
            
            // Check food collision
            const foodDistance = Math.sqrt(
                Math.pow(head.x - this.modernFood.x, 2) + Math.pow(head.y - this.modernFood.y, 2)
            );
            if (foodDistance < 15) {
                this.eatModernFood();
            }
            
            // Check special food collision
            if (this.specialFood) {
                const specialFoodDistance = Math.sqrt(
                    Math.pow(head.x - this.specialFood.x, 2) + Math.pow(head.y - this.specialFood.y, 2)
                );
                if (specialFoodDistance < 15) {
                    this.eatSpecialFood();
                }
            }
            
            this.drawGame();
        } catch (error) {
            console.error('Error in modern game update:', error);
            this.gameOver();
        }
    }
    
    eatFood() {
        const points = 10;
        this.score += points;
        const coinsEarned = points * this.difficultySettings[this.difficulty].coinMultiplier;
        this.coins += coinsEarned;
        this.generateFood();
        this.updateDisplay();
        this.playSound('eat');
        
        if (this.snake.length % 5 === 0) {
            this.gameSpeed = Math.max(50, this.gameSpeed - 5);
            clearInterval(this.gameLoop);
            this.gameLoop = setInterval(() => this.updateClassic(), this.gameSpeed);
        }
    }

    eatSpecialFood() {
        const points = 20;  // Double points
        this.score += points;
        const coinsEarned = points * this.difficultySettings[this.difficulty].coinMultiplier * 2; // Double coins
        this.coins += coinsEarned;
        
        // Add 3 segments instead of 1
        if (this.gameMode === 'classic') {
            const tail = this.snake[this.snake.length - 1];
            for (let i = 0; i < 3; i++) {
                this.snake.push({ ...tail });
            }
        } else {
            const tail = this.modernSnake.segments[this.modernSnake.segments.length - 1];
            for (let i = 0; i < 3; i++) {
                this.modernSnake.segments.push({ ...tail });
            }
        }
        
        this.specialFood = null;
        this.updateDisplay();
        this.playSound('eat');
    }
    
    eatModernFood() {
        const points = 10;
        this.score += points;
        const coinsEarned = points * this.difficultySettings[this.difficulty].coinMultiplier;
        this.coins += coinsEarned;
        
        // Add new segment to snake
        const tail = this.modernSnake.segments[this.modernSnake.segments.length - 1];
        this.modernSnake.segments.push({ x: tail.x, y: tail.y });
        
        this.generateModernFood();
        this.updateDisplay();
        this.playSound('eat');
        
        // Increase speed slightly
        this.modernSnake.speed = Math.min(4, this.modernSnake.speed + 0.1);
    }
    
    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (
            this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
            this.obstacles.some(obstacle => 
                newFood.x >= obstacle.x && newFood.x < obstacle.x + obstacle.width &&
                newFood.y >= obstacle.y && newFood.y < obstacle.y + obstacle.height
            ) ||
            (this.bot && this.bot.segments.some(segment => segment.x === newFood.x && segment.y === newFood.y))
        );
        
        this.food = newFood;
    }
    
    generateModernFood() {
        let newFood;
        do {
            newFood = {
                x: Math.random() * (this.canvas.width - 40) + 20,
                y: Math.random() * (this.canvas.height - 40) + 20
            };
        } while (
            this.modernSnake.segments.some(segment => {
                const distance = Math.sqrt(
                    Math.pow(segment.x - newFood.x, 2) + Math.pow(segment.y - newFood.y, 2)
                );
                return distance < 30;
            })
        );
        
        this.modernFood = newFood;
    }
    
    generateObstacles() {
        this.obstacles = [];
        const settings = this.difficultySettings[this.difficulty];
        const obstacleCount = this.gameMode === 'classic' ? settings.obstacles : settings.modernObstacles;
        
        if (this.gameMode === 'modern') {
            // Generate round obstacles for modern mode
            let placedObstacles = 0;
            let maxAttempts = 200; // More attempts to ensure better placement

            while (placedObstacles < obstacleCount && maxAttempts > 0) {
                const radius = Math.random() * 8 + 12; // Random radius between 12-20 (smaller)
                const margin = 25; // Reduced margin
                const x = Math.random() * (this.canvas.width - 2 * radius - 2 * margin) + radius + margin;
                const y = Math.random() * (this.canvas.height - 2 * radius - 2 * margin) + radius + margin;
                
                // Ensure obstacles don't overlap with snake or food
                const tooClose = this.modernSnake.segments.some(segment => {
                    const dx = segment.x - x;
                    const dy = segment.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < (radius + 15); // Reduced safety margin
                });
                
                const tooCloseToFood = Math.sqrt(
                    Math.pow(this.modernFood.x - x, 2) + 
                    Math.pow(this.modernFood.y - y, 2)
                ) < (radius + 12); // Reduced safety margin
                
                // Check if too close to other obstacles
                const tooCloseToOtherObstacles = this.obstacles.some(obstacle => {
                    if (obstacle.type === 'round') {
                        const dx = obstacle.x - x;
                        const dy = obstacle.y - y;
                        return Math.sqrt(dx * dx + dy * dy) < (radius + obstacle.radius + 10); // Reduced spacing
                    }
                    return false;
                });
                
                if (!tooClose && !tooCloseToFood && !tooCloseToOtherObstacles) {
                    this.obstacles.push({
                        x: x,
                        y: y,
                        radius: radius,
                        type: 'round'
                    });
                    placedObstacles++;
                }
                maxAttempts--;
            }
            return;
        }
        
        // Classic mode obstacles (grid-based)
        // Create a grid to track occupied spaces
        const grid = Array(this.tileCount).fill().map(() => Array(this.tileCount).fill(false));
        
        // Mark snake position as occupied
        this.snake.forEach(segment => {
            grid[segment.y][segment.x] = true;
        });
        
        // Mark food position as occupied
        grid[this.food.y][this.food.x] = true;
        
        // Keep track of connected empty spaces
        const isValidPosition = (x, y, w, h) => {
            if (x < 0 || y < 0 || x + w > this.tileCount || y + h > this.tileCount) return false;
            
            // Check if space is already occupied
            for (let i = y; i < y + h; i++) {
                for (let j = x; j < x + w; j++) {
                    if (grid[i][j]) return false;
                }
            }
            
            // Ensure there's at least one empty tile around the obstacle
            let hasEmptyAdjacent = false;
            for (let i = Math.max(0, y - 1); i <= Math.min(this.tileCount - 1, y + h); i++) {
                for (let j = Math.max(0, x - 1); j <= Math.min(this.tileCount - 1, x + w); j++) {
                    if (!grid[i][j]) hasEmptyAdjacent = true;
                }
            }
            
            return hasEmptyAdjacent;
        };
        
        for (let i = 0; i < obstacleCount; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 50) {
                // Smaller obstacles for better playability
                const width = Math.floor(Math.random() * 2) + 1;
                const height = Math.floor(Math.random() * 2) + 1;
                const x = Math.floor(Math.random() * (this.tileCount - width));
                const y = Math.floor(Math.random() * (this.tileCount - height));
                
                if (isValidPosition(x, y, width, height)) {
                    // Mark position as occupied
                    for (let i = y; i < y + height; i++) {
                        for (let j = x; j < x + width; j++) {
                            grid[i][j] = true;
                        }
                    }
                    
                    this.obstacles.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    });
                    
                    placed = true;
                }
                
                attempts++;
            }
        }
    }
    
    generateBot() {
        if (!this.difficultySettings[this.difficulty].hasBot) {
            this.bot = null;
            return;
        }
        
        if (this.gameMode === 'modern') {
            // Modern mode bot
            let botPosition;
            let attempts = 0;
            do {
                botPosition = {
                    x: Math.random() * (this.canvas.width - 100) + 50,
                    y: Math.random() * (this.canvas.height - 100) + 50
                };
                attempts++;
                
                // Check if position is valid (not too close to obstacles, snake, or food)
                const tooCloseToObstacle = this.obstacles.some(obstacle => {
                    if (obstacle.type === 'round') {
                        const dx = obstacle.x - botPosition.x;
                        const dy = obstacle.y - botPosition.y;
                        return Math.sqrt(dx * dx + dy * dy) < (obstacle.radius + 30);
                    }
                    return false;
                });
                
                const tooCloseToSnake = this.modernSnake.segments.some(segment => {
                    const dx = segment.x - botPosition.x;
                    const dy = segment.y - botPosition.y;
                    return Math.sqrt(dx * dx + dy * dy) < 40;
                });
                
                const tooCloseToFood = Math.sqrt(
                    Math.pow(this.modernFood.x - botPosition.x, 2) + 
                    Math.pow(this.modernFood.y - botPosition.y, 2)
                ) < 30;
                
            } while (attempts < 50 && (tooCloseToObstacle || tooCloseToSnake || tooCloseToFood));
            
            if (attempts < 50) {
                this.bot = {
                    segments: [
                        { x: botPosition.x, y: botPosition.y },
                        { x: botPosition.x - 20, y: botPosition.y },
                        { x: botPosition.x - 40, y: botPosition.y }
                    ],
                    angle: 0,
                    speed: this.modernSnake.speed * 0.9,
                    segmentDistance: 20,
                    moveCounter: 0,
                    mode: 'modern'
                };
            }
        } else {
            // Classic mode bot
            let botPosition;
            let attempts = 0;
            do {
                botPosition = {
                    x: Math.floor(Math.random() * this.tileCount),
                    y: Math.floor(Math.random() * this.tileCount)
                };
                attempts++;
            } while (
                attempts < 50 && (
                    this.snake.some(segment => segment.x === botPosition.x && segment.y === botPosition.y) ||
                    (botPosition.x === this.food.x && botPosition.y === this.food.y) ||
                    this.obstacles.some(obstacle => 
                        botPosition.x >= obstacle.x && botPosition.x < obstacle.x + obstacle.width &&
                        botPosition.y >= obstacle.y && botPosition.y < obstacle.y + obstacle.height
                    )
                )
            );
            
            if (attempts < 50) {
                this.bot = {
                    segments: [
                        { x: botPosition.x, y: botPosition.y },
                        { x: botPosition.x - 1, y: botPosition.y },
                        { x: botPosition.x - 2, y: botPosition.y }
                    ],
                    dx: 1,
                    dy: 0,
                    moveCounter: 0,
                    mode: 'classic'
                };
            }
        }
    }
    
    updateBot() {
        if (!this.bot) return;
        
        if (this.bot.mode === 'modern') {
            // Modern mode bot update
            this.bot.moveCounter++;
            if (this.bot.moveCounter < 2) return;
            this.bot.moveCounter = 0;
            
            // Randomly change direction
            if (Math.random() < 0.05) {
                this.bot.angle += (Math.random() - 0.5) * Math.PI;
            }
            
            // Calculate new position
            const head = { ...this.bot.segments[0] };
            head.x += Math.cos(this.bot.angle) * this.bot.speed;
            head.y += Math.sin(this.bot.angle) * this.bot.speed;
            
            // Check boundaries and obstacles
            if (head.x < 0 || head.x > this.canvas.width || 
                head.y < 0 || head.y > this.canvas.height ||
                this.obstacles.some(obstacle => {
                    if (obstacle.type === 'round') {
                        const dx = obstacle.x - head.x;
                        const dy = obstacle.y - head.y;
                        return Math.sqrt(dx * dx + dy * dy) < (obstacle.radius + 15);
                    }
                    return false;
                })) {
                // Change direction when hitting boundaries or obstacles
                this.bot.angle += Math.PI + (Math.random() - 0.5);
                head.x = this.bot.segments[0].x;
                head.y = this.bot.segments[0].y;
            }
            
            // Check collision with player's snake
            const playerHead = this.modernSnake.segments[0];
            const playerCollision = this.modernSnake.segments.some((segment, index) => {
                const dx = segment.x - head.x;
                const dy = segment.y - head.y;
                const collisionDistance = index === 0 ? 20 : 15; // Smaller collision for body
                return Math.sqrt(dx * dx + dy * dy) < collisionDistance;
            });
            
            // Check if bot's head hits player's head
            const headToHeadCollision = Math.sqrt(
                Math.pow(playerHead.x - head.x, 2) + 
                Math.pow(playerHead.y - head.y, 2)
            ) < 20;
            
            if (playerCollision) {
                if (headToHeadCollision) {
                    // Head-to-head collision, both die
                    this.coins += this.botKillReward;
                    this.showStatus(`🤖 Head-on collision! +${this.botKillReward} coins!`);
                    this.playSound('powerup');
                    this.generateBot();
                    this.updateDisplay();
                    this.gameOver();
                } else if (this.modernSnake.segments.indexOf(
                    this.modernSnake.segments.find(segment => {
                        const dx = segment.x - head.x;
                        const dy = segment.y - head.y;
                        return Math.sqrt(dx * dx + dy * dy) < 15;
                    })
                ) > 3) {
                    // Bot hits player's body (after first few segments)
                    this.coins += this.botKillReward;
                    this.showStatus(`🤖 Bot eliminated! +${this.botKillReward} coins!`);
                    this.playSound('powerup');
                    this.generateBot();
                    this.updateDisplay();
                } else {
                    // Bot hits player's head or neck area
                    this.gameOver();
                }
                return;
            }
            
            // Update segments
            this.bot.segments.unshift(head);
            this.bot.segments.pop();
            
            // Ensure smooth segment following
            for (let i = 1; i < this.bot.segments.length; i++) {
                const segment = this.bot.segments[i];
                const prevSegment = this.bot.segments[i - 1];
                const dx = prevSegment.x - segment.x;
                const dy = prevSegment.y - segment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > this.bot.segmentDistance) {
                    const angle = Math.atan2(dy, dx);
                    segment.x = prevSegment.x - Math.cos(angle) * this.bot.segmentDistance;
                    segment.y = prevSegment.y - Math.sin(angle) * this.bot.segmentDistance;
                }
            }
        } else {
            // Classic mode bot update
            this.bot.moveCounter++;
            if (this.bot.moveCounter < 3) return;
            this.bot.moveCounter = 0;
            
            if (Math.random() < 0.3) {
                const directions = [
                    { dx: 0, dy: -1 },
                    { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 },
                    { dx: 1, dy: 0 }
                ];
                const newDirection = directions[Math.floor(Math.random() * directions.length)];
                
                if (!(newDirection.dx === -this.bot.dx && newDirection.dy === -this.bot.dy)) {
                    this.bot.dx = newDirection.dx;
                    this.bot.dy = newDirection.dy;
                }
            }
            
            const head = { 
                x: this.bot.segments[0].x + this.bot.dx, 
                y: this.bot.segments[0].y + this.bot.dy 
            };
            
            if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount ||
                this.obstacles.some(obstacle => 
                    obstacle.type !== 'round' && 
                    head.x >= obstacle.x && head.x < obstacle.x + obstacle.width &&
                    head.y >= obstacle.y && head.y < obstacle.y + obstacle.height
                ) ||
                this.bot.segments.some(segment => segment.x === head.x && segment.y === head.y)) {
                
                const directions = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                ];
                
                for (const dir of directions) {
                    const testHead = { 
                        x: this.bot.segments[0].x + dir.dx, 
                        y: this.bot.segments[0].y + dir.dy 
                    };
                    
                    if (testHead.x >= 0 && testHead.x < this.tileCount && 
                        testHead.y >= 0 && testHead.y < this.tileCount &&
                        !this.obstacles.some(obstacle => 
                            obstacle.type !== 'round' &&
                            testHead.x >= obstacle.x && testHead.x < obstacle.x + obstacle.width &&
                            testHead.y >= obstacle.y && testHead.y < obstacle.y + obstacle.height
                        ) &&
                        !this.bot.segments.some(segment => segment.x === testHead.x && segment.y === testHead.y)) {
                        
                        this.bot.dx = dir.dx;
                        this.bot.dy = dir.dy;
                        head.x = testHead.x;
                        head.y = testHead.y;
                        break;
                    }
                }
            }
            
            // Check collision with player
            const hitPlayer = this.snake.some((segment, index) => {
                if (head.x === segment.x && head.y === segment.y) {
                    if (index === 0) {
                        // Head-to-head collision
                        this.coins += this.botKillReward;
                        this.showStatus(`🤖 Head-on collision! +${this.botKillReward} coins!`);
                        this.playSound('powerup');
                        this.generateBot();
                        this.updateDisplay();
                        this.gameOver();
                    } else if (index > 3) {
                        // Bot hits player's body (after first few segments)
                        this.coins += this.botKillReward;
                        this.showStatus(`🤖 Bot eliminated! +${this.botKillReward} coins!`);
                        this.playSound('powerup');
                        this.generateBot();
                        this.updateDisplay();
                    } else {
                        // Bot hits player's neck area
                        this.gameOver();
                    }
                    return true;
                }
                return false;
            });
            
            if (hitPlayer) return;
            
            this.bot.segments.unshift(head);
            this.bot.segments.pop();
        }
    }
    
    changeDirection(newDx, newDy) {
        if (this.gameMode !== 'classic') return;
        
        if (this.snake.length > 1) {
            if (newDx === -this.dx && newDy === -this.dy) return;
        }
        
        this.dx = newDx;
        this.dy = newDy;
        
        if (!this.gameStarted) {
            this.startGame();
        }
    }
    
    handleKeyPress(e) {
        this.keys[e.key] = true;
    
        if (!this.gameRunning && !this.gameStarted) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                this.startGame();
            }
        }
    
        if (this.gameMode === 'classic') {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.changeDirection(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.changeDirection(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.changeDirection(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.changeDirection(1, 0);
                    break;
            }
        } else {
            let angleIncrement = 0.1;
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.modernSnake.angle -= angleIncrement;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.modernSnake.angle += angleIncrement;
                    break;
            }
        }
    
        if (e.key === ' ') {
            e.preventDefault();
            this.togglePause();
        }
    }
    
    handleKeyRelease(e) {
        this.keys[e.key] = false;
    }
    
    drawGame() {
        if (!this.canvas || !this.ctx) {
            console.log('Canvas or context not available for drawing');
            return;
        }
        
        try {
            this.ctx.fillStyle = this.getBackgroundColor();
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (this.gameMode === 'classic') {
                this.drawFood();
                this.drawObstacles();
                this.drawSnake();
                this.drawBot();
                if (this.specialFood) this.drawSpecialFood();
            } else {
                this.drawObstacles(); // Draw obstacles first so they appear behind everything
                this.drawBot(); // Draw bot before snake and food
                this.drawModernSnake();
                this.drawModernFood();
                if (this.specialFood) this.drawSpecialFood();
            }
            
        } catch (error) {
            console.error('Error drawing game:', error);
            setTimeout(() => {
                const canvasReady = this.initCanvas();
                if (canvasReady) {
                    console.log('Canvas reinitialized after error');
                }
            }, 100);
        }
    }
    
    getBackgroundColor() {
        const themes = {
            dark: '#1a1a1a',
            light: '#f8f9fa',
            ocean: '#1a1a2e',
            sunset: '#2d1810',
            forest: '#1a4d1a',
            neon: '#0f0f23',
            galaxy: '#0f0f23',
            vip: '#1a0033'
        };
        return themes[this.currentTheme] || themes.light;
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        const gradient = this.ctx.createRadialGradient(
            x + this.gridSize/2, y + this.gridSize/2, 0,
            x + this.gridSize/2, y + this.gridSize/2, this.gridSize/2
        );
        
        const foodColors = this.getFoodColors();
        gradient.addColorStop(0, foodColors.center);
        gradient.addColorStop(1, foodColors.edge);
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = foodColors.glow;
        this.ctx.shadowBlur = 15;
        
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize/2, y + this.gridSize/2, this.gridSize/2 - 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }
    
    drawModernFood() {
        const gradient = this.ctx.createRadialGradient(
            this.modernFood.x, this.modernFood.y, 0,
            this.modernFood.x, this.modernFood.y, 12
        );
        
        const foodColors = this.getFoodColors();
        gradient.addColorStop(0, foodColors.center);
        gradient.addColorStop(1, foodColors.edge);
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = foodColors.glow;
        this.ctx.shadowBlur = 15;
        
        this.ctx.beginPath();
        this.ctx.arc(this.modernFood.x, this.modernFood.y, 12, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    drawSpecialFood() {
        if (!this.specialFood) return;

        const x = this.gameMode === 'classic' ? 
            this.specialFood.x * this.gridSize + this.gridSize / 2 : 
            this.specialFood.x;
        const y = this.gameMode === 'classic' ? 
            this.specialFood.y * this.gridSize + this.gridSize / 2 : 
            this.specialFood.y;

        // Calculate time remaining
        const timeElapsed = Date.now() - this.specialFood.createdAt;
        const timeRemaining = Math.max(0, 5000 - timeElapsed);
        const progress = timeRemaining / 5000;

        // Pulse animation
        const pulseScale = 1 + Math.sin(Date.now() / 150) * 0.1;
        const baseRadius = this.gameMode === 'classic' ? this.gridSize / 2 : 12;
        const radius = baseRadius * pulseScale;

        // Special fruit gradient with sparkle effect
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#ffd700'); // Gold center
        gradient.addColorStop(0.5, '#ff4500'); // Orange middle
        gradient.addColorStop(1, '#ff0000'); // Red edge

        // Draw the special fruit
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        // Add glow effect
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw sparkles
        const sparkleCount = 5;
        const time = Date.now() / 200;
        for (let i = 0; i < sparkleCount; i++) {
            const angle = (i / sparkleCount) * Math.PI * 2 + time;
            const sparkleX = x + Math.cos(angle) * radius * 1.2;
            const sparkleY = y + Math.sin(angle) * radius * 1.2;
            
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
        }

        // Draw timer arc
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 1.5, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * progress));
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }
    
    getFoodColors() {
        const themes = {
            dark: { center: '#ffffff', edge: '#cccccc', glow: '#ffffff' },
            light: { center: '#ff6b6b', edge: '#ee5a52', glow: '#ff6b6b' },
            ocean: { center: '#ffff00', edge: '#ffd700', glow: '#ffff00' },
            sunset: { center: '#ff6b35', edge: '#ff4500', glow: '#ff6b35' },
            forest: { center: '#32cd32', edge: '#228b22', glow: '#32cd32' },
            neon: { center: '#ff0080', edge: '#7928ca', glow: '#ff0080' },
            galaxy: { center: '#ffffff', edge: '#87ceeb', glow: '#ffffff' },
            vip: { center: '#ffd700', edge: '#ffed4e', glow: '#ffd700' }
        };
        return themes[this.currentTheme] || themes.light;
    }
    
    drawSnake() {
        const snakeColors = this.getSnakeColors();
        
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const centerX = x + this.gridSize / 2;
            const centerY = y + this.gridSize / 2;
            const isHead = index === 0;
            const isTail = index === this.snake.length - 1;
            
            const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
            gradient.addColorStop(0, isHead ? snakeColors.headStart : snakeColors.bodyStart);
            gradient.addColorStop(1, isHead ? snakeColors.headEnd : snakeColors.bodyEnd);
            
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = snakeColors.glow;
            this.ctx.shadowBlur = isHead ? 20 : (isTail ? 8 : 10);
            
            if (isHead) {
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, (this.gridSize - 2) / 2, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(centerX - 4, centerY - 3, 2, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(centerX + 4, centerY - 3, 2, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(centerX - 4, centerY - 3, 1, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(centerX + 4, centerY - 3, 1, 0, 2 * Math.PI);
                this.ctx.fill();
            } else if (isTail && this.snake.length > 1) {
                const prevSegment = this.snake[index - 1];
                const tailDirection = {
                    x: segment.x - prevSegment.x,
                    y: segment.y - prevSegment.y
                };
                
                this.ctx.beginPath();
                if (tailDirection.x > 0) {
                    this.ctx.moveTo(x + 2, y + 2);
                    this.ctx.lineTo(x + 2, y + this.gridSize - 2);
                    this.ctx.lineTo(x + this.gridSize - 2, centerY);
                } else if (tailDirection.x < 0) {
                    this.ctx.moveTo(x + this.gridSize - 2, y + 2);
                    this.ctx.lineTo(x + this.gridSize - 2, y + this.gridSize - 2);
                    this.ctx.lineTo(x + 2, centerY);
                } else if (tailDirection.y > 0) {
                    this.ctx.moveTo(x + 2, y + 2);
                    this.ctx.lineTo(x + this.gridSize - 2, y + 2);
                    this.ctx.lineTo(centerX, y + this.gridSize - 2);
                } else {
                    this.ctx.moveTo(x + 2, y + this.gridSize - 2);
                    this.ctx.lineTo(x + this.gridSize - 2, y + this.gridSize - 2);
                    this.ctx.lineTo(centerX, y + 2);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            }
            
            if (isTail && this.snake.length > 1) {
                this.createParticleEffect(centerX, centerY);
            }
        });
        
        this.ctx.shadowBlur = 0;
    }

    drawBot() {
        if (!this.bot) return;
        
        if (this.bot.mode === 'modern') {
            // Draw modern mode bot
            const segments = this.bot.segments;
            
            // Draw body with tapering tail
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowColor = '#ff4444';
            
            // Draw tail with gradient and taper
            const tail = segments[segments.length - 1];
            const secondToLast = segments[segments.length - 2];
            const tailAngle = Math.atan2(tail.y - secondToLast.y, tail.x - secondToLast.x);
            
            // Tail gradient
            const tailGradient = this.ctx.createLinearGradient(
                secondToLast.x, secondToLast.y,
                tail.x, tail.y
            );
            tailGradient.addColorStop(0, '#cc3333');
            tailGradient.addColorStop(1, '#aa2222');
            
            // Draw tapered tail
            this.ctx.beginPath();
            this.ctx.strokeStyle = tailGradient;
            this.ctx.lineWidth = 7; // Thinner tail to match player snake
            this.ctx.shadowBlur = 10;
            this.ctx.moveTo(secondToLast.x, secondToLast.y);
            this.ctx.lineTo(tail.x, tail.y);
            this.ctx.stroke();
            
            // Draw body segments with gradient
            this.ctx.lineWidth = 14; // Thinner body to match player snake
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#cc3333';
            
            this.ctx.beginPath();
            this.ctx.moveTo(segments[0].x, segments[0].y);
            
            for (let i = 1; i < segments.length - 1; i++) {
                const segment = segments[i];
                this.ctx.lineTo(segment.x, segment.y);
            }
            this.ctx.stroke();
            
            // Draw head
            const head = segments[0];
            const neck = segments[1];
            const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
            
            // Create head gradient
            const headGradient = this.ctx.createRadialGradient(
                head.x, head.y, 0,
                head.x, head.y, 20
            );
            headGradient.addColorStop(0, '#ff4444');
            headGradient.addColorStop(1, '#cc3333');
            
            this.ctx.fillStyle = headGradient;
            this.ctx.shadowColor = '#ff4444';
            this.ctx.shadowBlur = 20;
            
            // Draw slightly oval head
            this.ctx.save();
            this.ctx.translate(head.x, head.y);
            this.ctx.rotate(headAngle);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 18, 15, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
            
            // Draw eyes
            this.ctx.shadowBlur = 0;
            
            const eyeOffset = 8;
            const eyeAngle1 = headAngle - 0.5;
            const eyeAngle2 = headAngle + 0.5;
            
            const eye1X = head.x + Math.cos(eyeAngle1) * eyeOffset;
            const eye1Y = head.y + Math.sin(eyeAngle1) * eyeOffset;
            const eye2X = head.x + Math.cos(eyeAngle2) * eyeOffset;
            const eye2Y = head.y + Math.sin(eyeAngle2) * eyeOffset;
            
            // Draw eye whites
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw red pupils
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
        } else {
            // Draw classic mode bot
            this.bot.segments.forEach((segment, index) => {
                const x = segment.x * this.gridSize;
                const y = segment.y * this.gridSize;
                const centerX = x + this.gridSize / 2;
                const centerY = y + this.gridSize / 2;
                const isHead = index === 0;
                const isTail = index === this.bot.segments.length - 1;
                
                const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
                gradient.addColorStop(0, isHead ? '#ff4444' : '#cc3333');
                gradient.addColorStop(1, isHead ? '#cc3333' : '#aa2222');
                
                this.ctx.fillStyle = gradient;
                this.ctx.shadowColor = '#ff4444';
                this.ctx.shadowBlur = isHead ? 15 : (isTail ? 6 : 8);
                
                if (isHead) {
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, (this.gridSize - 2) / 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX - 4, centerY - 3, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(centerX + 4, centerY - 3, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX - 4, centerY - 3, 1, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(centerX + 4, centerY - 3, 1, 0, 2 * Math.PI);
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
                }
            });
        }
    }
    
    drawModernSnake() {
        const snakeColors = this.getSnakeColors();
        const segments = this.modernSnake.segments;
        
        // Draw body with tapering tail
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowColor = snakeColors.glow;
        
        // Draw tail with gradient and taper
        const tail = segments[segments.length - 1];
        const secondToLast = segments[segments.length - 2];
        const tailAngle = Math.atan2(tail.y - secondToLast.y, tail.x - secondToLast.x);
        
        // Tail gradient
        const tailGradient = this.ctx.createLinearGradient(
            secondToLast.x, secondToLast.y,
            tail.x, tail.y
        );
        tailGradient.addColorStop(0, snakeColors.bodyStart);
        tailGradient.addColorStop(1, snakeColors.bodyEnd);
        
        // Draw tapered tail
        this.ctx.beginPath();
        this.ctx.strokeStyle = tailGradient;
        this.ctx.lineWidth = 7; // Thinner tail
        this.ctx.shadowBlur = 10;
        this.ctx.moveTo(secondToLast.x, secondToLast.y);
        this.ctx.lineTo(tail.x, tail.y);
        this.ctx.stroke();
        
        // Draw body segments with gradient
        this.ctx.lineWidth = 14; // Thinner body
        this.ctx.shadowBlur = 15;
        this.ctx.strokeStyle = snakeColors.bodyStart;
        
        this.ctx.beginPath();
        this.ctx.moveTo(segments[0].x, segments[0].y);
        
        for (let i = 1; i < segments.length - 1; i++) {
            const segment = segments[i];
            this.ctx.lineTo(segment.x, segment.y);
        }
        this.ctx.stroke();
        
        // Draw head with improved shape
        const head = segments[0];
        const neck = segments[1];
        const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
        
        // Create head gradient
        const headGradient = this.ctx.createRadialGradient(
            head.x, head.y, 0,
            head.x, head.y, 16
        );
        headGradient.addColorStop(0, snakeColors.headStart);
        headGradient.addColorStop(1, snakeColors.headEnd);
        
        this.ctx.fillStyle = headGradient;
        this.ctx.shadowColor = snakeColors.glow;
        this.ctx.shadowBlur = 20;
        
        // Draw slightly oval head
        this.ctx.save();
        this.ctx.translate(head.x, head.y);
        this.ctx.rotate(headAngle);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 14, 12, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
        
        // Draw eyes with shine
        this.ctx.shadowBlur = 0;
        
        const eyeOffset = 8;
        const eyeAngle1 = headAngle - 0.5;
        const eyeAngle2 = headAngle + 0.5;
        
        const eye1X = head.x + Math.cos(eyeAngle1) * eyeOffset;
        const eye1Y = head.y + Math.sin(eyeAngle1) * eyeOffset;
        const eye2X = head.x + Math.cos(eyeAngle2) * eyeOffset;
        const eye2Y = head.y + Math.sin(eyeAngle2) * eyeOffset;
        
        // Draw eye whites
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(eye2X, eye2Y, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw pupils with shine
        this.ctx.fillStyle = '#000000';
        const pupilOffset = 0.5;
        
        // Left eye
        this.ctx.beginPath();
        this.ctx.arc(eye1X + pupilOffset, eye1Y + pupilOffset, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Right eye
        this.ctx.beginPath();
        this.ctx.arc(eye2X + pupilOffset, eye2Y + pupilOffset, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add eye shine
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = 0.7;
        
        // Shine in left eye
        this.ctx.beginPath();
        this.ctx.arc(eye1X - 1, eye1Y - 1, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Shine in right eye
        this.ctx.beginPath();
        this.ctx.arc(eye2X - 1, eye2Y - 1, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        // Draw devil horns for VIP skin
        if (this.currentSkin === 'vip') {
            this.ctx.save();
            this.ctx.translate(head.x, head.y);
            this.ctx.rotate(headAngle);
            
            const snakeColors = this.getSnakeColors();
            this.ctx.fillStyle = snakeColors.headEnd;
            
            // Left horn (positioned forward)
            this.ctx.beginPath();
            this.ctx.moveTo(8, -6);
            this.ctx.quadraticCurveTo(16, -12, 20, -8);
            this.ctx.quadraticCurveTo(22, -6, 20, -4);
            this.ctx.quadraticCurveTo(16, -2, 8, -4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Right horn (positioned forward)
            this.ctx.beginPath();
            this.ctx.moveTo(8, 6);
            this.ctx.quadraticCurveTo(16, 12, 20, 8);
            this.ctx.quadraticCurveTo(22, 6, 20, 4);
            this.ctx.quadraticCurveTo(16, 2, 8, 4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add glow effect matching snake
            this.ctx.shadowColor = snakeColors.glow;
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Add movement particles at tail
        if (Math.random() < 0.3) { // 30% chance to spawn particles
            this.createParticleEffect(tail.x, tail.y);
        }
    }
    
    getSnakeColors() {
        const time = Date.now() / 10;
        const skins = {
            peshmerga: { headStart: '#2f4f2f', headEnd: '#556b2f', bodyStart: '#2f4f2f', bodyEnd: '#556b2f', glow: '#556b2f' },
            rainbow: { 
                headStart: `hsl(${time % 360}, 70%, 50%)`, 
                headEnd: `hsl(${(time + 60) % 360}, 70%, 60%)`, 
                bodyStart: `hsl(${time % 360}, 70%, 50%)`, 
                bodyEnd: `hsl(${(time + 60) % 360}, 70%, 60%)`, 
                glow: `hsl(${time % 360}, 70%, 50%)` 
            },
            fire: { 
                headStart: '#ff4500', headEnd: '#ff6347', 
                bodyStart: '#ff0000', bodyEnd: '#ff4500', 
                glow: '#ff4500' 
            },
            ice: { 
                headStart: '#87ceeb', headEnd: '#b0e0e6', 
                bodyStart: '#4682b4', bodyEnd: '#87ceeb', 
                glow: '#87ceeb' 
            },
            electric: { 
                headStart: '#ffff00', headEnd: '#ffd700', 
                bodyStart: '#9370db', bodyEnd: '#ffff00', 
                glow: '#ffff00' 
            },
            galaxy: { 
                headStart: '#4b0082', headEnd: '#9370db', 
                bodyStart: '#191970', bodyEnd: '#4b0082', 
                glow: '#9370db' 
            },
            golden: { 
                headStart: '#ffd700', headEnd: '#ffed4e', 
                bodyStart: '#daa520', bodyEnd: '#ffd700', 
                glow: '#ffd700' 
            },
            shadow: { 
                headStart: '#2f2f2f', headEnd: '#4f4f4f', 
                bodyStart: '#1a1a1a', bodyEnd: '#2f2f2f', 
                glow: '#4f4f4f' 
            },
            neon: { 
                headStart: `hsl(${time % 360}, 100%, 50%)`, 
                headEnd: `hsl(${(time + 120) % 360}, 100%, 60%)`, 
                bodyStart: `hsl(${time % 360}, 100%, 50%)`, 
                bodyEnd: `hsl(${(time + 120) % 360}, 100%, 60%)`, 
                glow: `hsl(${time % 360}, 100%, 50%)` 
            },
            diamond: { 
                headStart: '#e6e6fa', headEnd: '#ffffff', 
                bodyStart: '#dda0dd', bodyEnd: '#e6e6fa', 
                glow: '#ffffff' 
            },
            phoenix: { 
                headStart: '#ff4500', headEnd: '#ffd700', 
                bodyStart: '#dc143c', bodyEnd: '#ff4500', 
                glow: '#ffd700' 
            },
            void: { 
                headStart: '#000000', headEnd: '#4b0082', 
                bodyStart: '#000000', bodyEnd: '#2f2f2f', 
                glow: '#4b0082' 
            },
            vip: {
                headStart: '#d4af37', headEnd: '#ffd700',
                bodyStart: '#b8860b', bodyEnd: '#d4af37',
                glow: '#ffd700'
            }
        };
        
        if (this.currentTheme === 'neon') {
            return {
                headStart: '#ff0080',
                headEnd: '#7928ca',
                bodyStart: '#ff0080',
                bodyEnd: '#7928ca',
                glow: '#ff0080'
            };
        }
        
        return skins[this.currentSkin] || skins.peshmerga;
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            if (this.gameMode === 'modern' && obstacle.type === 'round') {
                // Draw round obstacles for modern mode with a more visible rock-like appearance
                const centerX = obstacle.x;
                const centerY = obstacle.y;
                const radius = obstacle.radius;
                
                // Create inner and outer gradients for 3D effect with more contrast
                const outerGradient = this.ctx.createRadialGradient(
                    centerX - radius/4, centerY - radius/4, 0,
                    centerX, centerY, radius
                );
                outerGradient.addColorStop(0, '#ad5a2a');  // Lighter brown
                outerGradient.addColorStop(0.6, '#8b4513');
                outerGradient.addColorStop(1, '#2d1810');  // Darker edge
                
                const innerGradient = this.ctx.createRadialGradient(
                    centerX - radius/3, centerY - radius/3, radius/4,
                    centerX, centerY, radius
                );
                innerGradient.addColorStop(0, '#cd853f');  // Much lighter center
                innerGradient.addColorStop(0.5, '#8b4513');
                innerGradient.addColorStop(1, '#3d2914');
                
                // Draw main rock shape with stronger shadow
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                this.ctx.shadowBlur = 20;
                this.ctx.shadowOffsetX = 8;
                this.ctx.shadowOffsetY = 8;
                
                this.ctx.beginPath();
                this.ctx.fillStyle = outerGradient;
                this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Add inner shading for depth
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                
                this.ctx.beginPath();
                this.ctx.fillStyle = innerGradient;
                this.ctx.arc(centerX, centerY, radius * 0.85, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Add highlight
                const highlightGradient = this.ctx.createRadialGradient(
                    centerX - radius/2, centerY - radius/2, 0,
                    centerX - radius/2, centerY - radius/2, radius/3
                );
                highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.ctx.beginPath();
                this.ctx.fillStyle = highlightGradient;
                this.ctx.arc(centerX - radius/2, centerY - radius/2, radius/2, 0, 2 * Math.PI);
                this.ctx.fill();
                
            } else {
                // Draw classic mode obstacles with a more detailed rocky texture
                const x = obstacle.x * this.gridSize;
                const y = obstacle.y * this.gridSize;
                const width = obstacle.width * this.gridSize;
                const height = obstacle.height * this.gridSize;
                
                // Create base gradient
                const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
                gradient.addColorStop(0, '#8b4513');
                gradient.addColorStop(0.5, '#654321');
                gradient.addColorStop(1, '#3d2914');
                
                this.ctx.fillStyle = gradient;
                this.ctx.shadowColor = '#000000';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
                
                // Draw main rock shape
                this.ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
                
                // Add highlight
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                
                const highlightGradient = this.ctx.createLinearGradient(x, y, x + width/2, y + height/2);
                highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.ctx.fillStyle = highlightGradient;
                this.ctx.fillRect(x + 2, y + 2, width/2 - 2, height/2 - 2);
            }
        });
    }
    
    drawBot() {
        if (!this.bot) return;
        
        if (this.bot.mode === 'modern') {
            // Draw modern mode bot
            const segments = this.bot.segments;
            
            // Draw body with tapering tail (similar to modern snake but with red colors)
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowColor = '#ff4444';
            
            // Draw tail with gradient and taper
            const tail = segments[segments.length - 1];
            const secondToLast = segments[segments.length - 2];
            const tailAngle = Math.atan2(tail.y - secondToLast.y, tail.x - secondToLast.x);
            
            // Tail gradient
            const tailGradient = this.ctx.createLinearGradient(
                secondToLast.x, secondToLast.y,
                tail.x, tail.y
            );
            tailGradient.addColorStop(0, '#cc3333');
            tailGradient.addColorStop(1, '#aa2222');
            
            // Draw tapered tail
            this.ctx.beginPath();
            this.ctx.strokeStyle = tailGradient;
            this.ctx.lineWidth = 10;
            this.ctx.shadowBlur = 10;
            this.ctx.moveTo(secondToLast.x, secondToLast.y);
            this.ctx.lineTo(tail.x, tail.y);
            this.ctx.stroke();
            
            // Draw body segments with gradient
            this.ctx.lineWidth = 14; // Reduced size to match modern snake
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#cc3333';
            
            this.ctx.beginPath();
            this.ctx.moveTo(segments[0].x, segments[0].y);
            
            for (let i = 1; i < segments.length - 1; i++) {
                const segment = segments[i];
                this.ctx.lineTo(segment.x, segment.y);
            }
            this.ctx.stroke();
            
            // Draw head
            const head = segments[0];
            const neck = segments[1];
            const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
            
            // Create head gradient
            const headGradient = this.ctx.createRadialGradient(
                head.x, head.y, 0,
                head.x, head.y, 16
            );
            headGradient.addColorStop(0, '#ff4444');
            headGradient.addColorStop(1, '#cc3333');
            
            this.ctx.fillStyle = headGradient;
            this.ctx.shadowColor = '#ff4444';
            this.ctx.shadowBlur = 20;
            
            // Draw slightly oval head
            this.ctx.save();
            this.ctx.translate(head.x, head.y);
            this.ctx.rotate(headAngle);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 14, 12, 0, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();
            
            // Draw eyes
            this.ctx.shadowBlur = 0;
            
            const eyeOffset = 6;
            const eyeAngle1 = headAngle - 0.5;
            const eyeAngle2 = headAngle + 0.5;
            
            const eye1X = head.x + Math.cos(eyeAngle1) * eyeOffset;
            const eye1Y = head.y + Math.sin(eyeAngle1) * eyeOffset;
            const eye2X = head.x + Math.cos(eyeAngle2) * eyeOffset;
            const eye2Y = head.y + Math.sin(eyeAngle2) * eyeOffset;
            
            // Draw eye whites
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw pupils
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(eye1X, eye1Y, 1.5, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(eye2X, eye2Y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
        } else {
            // Draw classic mode bot
            this.bot.segments.forEach((segment, index) => {
                const x = segment.x * this.gridSize;
                const y = segment.y * this.gridSize;
                const centerX = x + this.gridSize / 2;
                const centerY = y + this.gridSize / 2;
                const isHead = index === 0;
                const isTail = index === this.bot.segments.length - 1;
                
                const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
                gradient.addColorStop(0, isHead ? '#ff4444' : '#cc3333');
                gradient.addColorStop(1, isHead ? '#cc3333' : '#aa2222');
                
                this.ctx.fillStyle = gradient;
                this.ctx.shadowColor = '#ff4444';
                this.ctx.shadowBlur = isHead ? 15 : (isTail ? 6 : 8);
                
                if (isHead) {
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, (this.gridSize - 2) / 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX - 4, centerY - 3, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(centerX + 4, centerY - 3, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX - 4, centerY - 3, 1, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(centerX + 4, centerY - 3, 1, 0, 2 * Math.PI);
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
                }
            });
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    createParticleEffect(x, y) {
        const animatedSkins = ['fire', 'ice', 'electric', 'galaxy', 'golden', 'shadow', 'diamond', 'phoenix', 'void', 'vip'];
        if (!animatedSkins.includes(this.currentSkin)) return;
        
        // Special coin particles for VIP skin
        if (this.currentSkin === 'vip') {
            // Only create particles occasionally
            if (Math.random() > 0.3) return; // 30% chance to create particles
            
            const offsetX = (Math.random() - 0.5) * 20; // Reduced horizontal spread
            const offsetY = (Math.random() - 0.5) * 10; // Significantly reduced vertical spread
            
            const particle = document.createElement('div');
            particle.className = 'vip-particle';
            particle.textContent = '💰';
            particle.style.position = 'absolute';
            particle.style.fontSize = '20px'; // Larger coins
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            
            // Set random direction for the particle
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
            
            particle.style.animation = 'coinFade 2s ease-out forwards'; // Slower animation
            
            const canvas = document.getElementById('gameCanvas');
            const wrapper = canvas.parentElement;
            
            // Detect if we're on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Mobile-specific positioning
                const rect = canvas.getBoundingClientRect();
                const isPortrait = window.innerHeight > window.innerWidth;
                
                // Get the canvas scaling and position relative to its container
                const containerRect = wrapper.getBoundingClientRect();
                const canvasTop = rect.top - containerRect.top;
                const canvasLeft = rect.left - containerRect.left;
                
                // Calculate position based on orientation
                let finalX, finalY;
                
                if (isPortrait) {
                    // Apply orientation-specific adjustments for portrait mode
                    const portraitScaleX = rect.width / canvas.width;
                    const portraitScaleY = rect.height / canvas.height;
                    finalX = x * portraitScaleX;
                    finalY = y * portraitScaleY;
                } else {
                    // Landscape mode - use direct positioning as it works correctly
                    finalX = x;
                    finalY = y;
                }
                
                particle.style.position = 'absolute';
                particle.style.transform = 'translate(-50%, -50%)';
                particle.style.left = (finalX + offsetX) + 'px';
                particle.style.top = (finalY + offsetY) + 'px';
            } else {
                // Desktop positioning (keeping the working approach)
                particle.style.position = 'absolute';
                particle.style.left = (x + offsetX) + 'px';
                particle.style.top = (y + offsetY) + 'px';
            }
            
            // Ensure proper positioning context
            if (getComputedStyle(wrapper).position === 'static') {
                wrapper.style.position = 'relative';
            }
            wrapper.appendChild(particle);
            
            // Remove after animation
            setTimeout(() => particle.remove(), 2000);
            return;
        }
        const canvas = document.getElementById('gameCanvas');
        // Position relative to canvas, not page
        let oppositeX = 0;
        let oppositeY = 0;
        if (this.gameMode === 'classic') {
            if (this.dx !== 0 || this.dy !== 0) {
                oppositeX = -this.dx;
                oppositeY = -this.dy;
            } else {
                oppositeX = -1;
                oppositeY = 0;
            }
        } else {
            oppositeX = -Math.cos(this.modernSnake.angle);
            oppositeY = -Math.sin(this.modernSnake.angle);
        }
        // The canvas is position: static, so use offsetLeft/offsetTop for relative position
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect = canvas.offsetParent ? canvas.offsetParent.getBoundingClientRect() : {left:0,top:0};
        const relLeft = canvasRect.left - parentRect.left;
        const relTop = canvasRect.top - parentRect.top;
        for (let i = 0; i < 2; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${this.currentSkin}-particle`;
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = (Math.random() - 0.5) * 15;
            // Place particle absolutely inside the canvas's parent
            particle.style.position = 'absolute';
            particle.style.left = (relLeft + x + offsetX) + 'px';
            particle.style.top = (relTop + y + offsetY) + 'px';
            particle.style.zIndex = '1000';
            particle.style.setProperty('--move-x', (oppositeX * 40) + 'px');
            particle.style.setProperty('--move-y', (oppositeY * 40) + 'px');
            // Append to canvas parent so it overlays the canvas, not the whole page
            (canvas.parentElement || document.body).appendChild(particle);
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1500);
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        clearInterval(this.timerInterval);
        
        // Update appropriate high score
        if (this.gameMode === 'classic') {
            if (this.score > this.classicHighScore) {
                this.classicHighScore = this.score;
                this.showStatus('🎉 New Classic High Score!');
            }
        } else {
            if (this.score > this.modernHighScore) {
                this.modernHighScore = this.score;
                this.showStatus('🎉 New Modern High Score!');
            }
        }
        
        // Update overall high score
        this.highScore = Math.max(this.classicHighScore, this.modernHighScore);
        
        const baseCoins = Math.floor(this.score / 10);
        const coinsEarned = baseCoins * this.difficultySettings[this.difficulty].coinMultiplier;
        this.coins += coinsEarned;
        
        this.saveData();
        this.playSound('gameover');
        this.showGameOverModal(coinsEarned);
    }
    
                goHome() {
        clearInterval(this.gameLoop);
        clearInterval(this.timerInterval);
    
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;
    
        this.showHomePage();
    }
    
    openDifficulty() {
        document.getElementById('difficultyModal').classList.remove('hidden');
    }
    
    closeDifficulty() {
        document.getElementById('difficultyModal').classList.add('hidden');
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.gameSpeed = this.difficultySettings[difficulty].speed;
        
        if (this.gameMode === 'modern') {
            switch (difficulty) {
                case 'easy': this.modernSnake.speed = 1; break;
                case 'normal': this.modernSnake.speed = 2; break;
                case 'hard': this.modernSnake.speed = 3; break;
                case 'extreme': this.modernSnake.speed = 3; break;
            }
        }
        
        this.resetGame();
        
        this.saveData();
        this.updateHomeDisplay();
        this.closeDifficulty();
        this.playSound('select');
    }
    
    showGameOverModal(coinsEarned) {
        const snakeLength = this.gameMode === 'classic' ? this.snake.length : this.modernSnake.segments.length;
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLength').textContent = snakeLength;
        document.getElementById('finalLevel').textContent = Math.floor(this.score / 100) + 1;
        document.getElementById('finalTime').textContent = this.formatTime(this.gameTime);
        document.getElementById('coinsEarned').textContent = `+${coinsEarned}`;
        document.getElementById('gameOverModal').classList.remove('hidden');
    }
    
    playAgain() {
        document.getElementById('gameOverModal').classList.add('hidden');
        this.resetGame();
    }
    
    backToMenu() {
        document.getElementById('gameOverModal').classList.add('hidden');
        this.goHome();
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime && this.gameRunning && !this.gamePaused) {
                this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
                document.getElementById('timer').textContent = this.formatTime(this.gameTime);
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateDisplay() {
        const snakeLength = this.gameMode === 'classic' ? this.snake.length : this.modernSnake.segments.length;
        const currentHighScore = this.gameMode === 'classic' ? this.classicHighScore : this.modernHighScore;
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('length').textContent = snakeLength;
        document.getElementById('highScore').textContent = currentHighScore;
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('shopCoinsCount').textContent = this.coins;
    }
    
    showStatus(message) {
        const status = document.getElementById('gameStatus');
        status.textContent = message;
        status.style.opacity = '1';
        
        setTimeout(() => {
            status.style.opacity = '0';
        }, 3000);
    }
    
    generateShopContent() {
        this.generateThemesContent();
        this.generateSkinsContent();
    }
    
    generateThemesContent() {
        const themesContent = document.getElementById('themesContent');
        themesContent.innerHTML = '';
        
        const themes = [
            { id: 'light', name: 'Light Mode', cost: 0, emoji: '☀️', desc: 'Clean light theme' },
            { id: 'dark', name: 'Dark Mode', cost: 0, emoji: '🌙', desc: 'Classic dark theme' },
            { id: 'ocean', name: 'Ocean Waves', cost: 1000, emoji: '🌊', desc: 'Deep blue ocean theme' },
            { id: 'sunset', name: 'Sunset Glow', cost: 1200, emoji: '🌅', desc: 'Warm sunset colors' },
            { id: 'forest', name: 'Forest Green', cost: 1500, emoji: '🌲', desc: 'Natural forest theme' },
            { id: 'neon', name: 'Neon Lights', cost: 2000, emoji: '💡', desc: 'Color-changing neon theme' },
            { id: 'phoenix', name: 'Phoenix Fire', cost: 5000, emoji: '🔥', desc: 'Legendary: Blazing fire', legendary: true, frame: 'epic' },
            { id: 'void', name: 'Void Realm', cost: 5000, emoji: '🕳️', desc: 'Legendary: Dark energy', legendary: true, frame: 'epic' },
            { id: 'celestial', name: 'Celestial', cost: 5000, emoji: '✨', desc: 'Legendary: Cosmic power', legendary: true, frame: 'epic' },
            { id: 'snow', name: 'Snowy Day', cost: 3000, emoji: '❄️', desc: 'Festive snow theme', frame: 'legendary' },
            { id: 'galaxy', name: 'Galaxy Space', cost: 0, emoji: '🌌', desc: 'Animated space theme', vipOnly: true, frame: 'legendary' },
            { id: 'vip', name: 'VIP Royal', cost: 0, emoji: '👑', desc: 'Exclusive VIP theme', vipOnly: true, frame: 'legendary' }
        ];
        
        themes.forEach(theme => {
            const themeDiv = document.createElement('div');
            const isOwned = this.ownedThemes.includes(theme.id);
            const canBuy = theme.cost === 0 || this.coins >= theme.cost;
            const isVipOnly = theme.vipOnly === true;
            const isSelected = this.currentTheme === theme.id;
            const canAccess = !isVipOnly || this.vipStatus;
            
            themeDiv.className = `bg-gray-800 rounded-xl p-4 transition-all transform hover:scale-105 ${
                isSelected ? 'ring-2 ring-blue-400' : ''
            } ${canAccess ? 'hover:bg-gray-700' : 'opacity-50'} ${theme.frame || ''}`;
            
            let buttonText = '';
            let buttonClass = '';
            let buttonAction = '';
            
            if (!canAccess) {
                buttonText = '🔒 VIP Only';
                buttonClass = 'bg-gray-600 cursor-not-allowed';
            } else if (isSelected) {
                buttonText = '✅ Selected';
                buttonClass = 'bg-green-600';
            } else if (isOwned) {
                buttonText = 'Select';
                buttonClass = 'bg-blue-600 hover:bg-blue-700';
                buttonAction = `onclick="game.selectTheme('${theme.id}')"`;
            } else if (canBuy) {
                buttonText = `Buy ${theme.cost} 💰`;
                buttonClass = 'bg-yellow-600 hover:bg-yellow-700';
                buttonAction = `onclick="game.buyTheme('${theme.id}')"`;
            } else {
                buttonText = `${theme.cost} 💰`;
                buttonClass = 'bg-gray-600 cursor-not-allowed';
            }
            
            themeDiv.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-3xl">${theme.emoji}</span>
                    <div class="flex-1">
                        <h3 class="font-bold text-white">${theme.name}</h3>
                        <p class="text-sm opacity-70">${theme.desc}</p>
                    </div>
                    <button class="px-4 py-2 rounded-lg font-bold text-white transition-all ${buttonClass}" ${buttonAction}>
                        ${buttonText}
                    </button>
                </div>
            `;
            
            themesContent.appendChild(themeDiv);
        });
    }
    
    generateSkinsContent() {
        const skinsContent = document.getElementById('skinsContent');
        skinsContent.innerHTML = '';
        
        const skins = [
            { id: 'peshmerga', name: 'Peshmerga', cost: 0, emoji: '🐍', desc: 'Classic Kurdish warrior' },
            { id: 'rainbow', name: 'Rainbow', cost: 800, emoji: '🌈', desc: 'Color-changing rainbow' },
            { id: 'fire', name: 'Fire Dragon', cost: 1200, emoji: '🔥', desc: 'Blazing fire effects' },
            { id: 'ice', name: 'Ice Crystal', cost: 1200, emoji: '❄️', desc: 'Frozen ice effects' },
            { id: 'electric', name: 'Lightning', cost: 1500, emoji: '⚡', desc: 'Electric energy' },
            { id: 'galaxy', name: 'Galaxy', cost: 2000, emoji: '🌌', desc: 'Cosmic space theme' },
            { id: 'golden', name: 'Golden', cost: 0, emoji: '🏆', desc: 'Luxurious gold', vipOnly: true },
            { id: 'shadow', name: 'Shadow', cost: 0, emoji: '🌑', desc: 'Dark shadow', vipOnly: true },
            { id: 'neon', name: 'Neon Glow', cost: 0, emoji: '💡', desc: 'Glowing neon', vipOnly: true },
            { id: 'diamond', name: 'Diamond', cost: 0, emoji: '💎', desc: 'Sparkling diamond', vipOnly: true },
            { id: 'phoenix', name: 'Phoenix', cost: 0, emoji: '🔥', desc: 'Mythical phoenix', vipOnly: true },
            { id: 'void', name: 'Void', cost: 0, emoji: '🕳️', desc: 'Dark void energy', vipOnly: true },
            { id: 'vip', name: 'VIP Skin', cost: 0, emoji: '👑', desc: 'The ultimate VIP skin', vipOnly: true }
        ];
        
        skins.forEach(skin => {
            const skinDiv = document.createElement('div');
            const isOwned = this.ownedSkins.includes(skin.id);
            const canBuy = skin.cost === 0 || this.coins >= skin.cost;
            const isVipOnly = skin.vipOnly === true;
            const isSelected = this.currentSkin === skin.id;
            const canAccess = !isVipOnly || this.vipStatus;
            
            skinDiv.className = `bg-gray-800 rounded-xl p-4 transition-all transform hover:scale-105 ${
                isSelected ? 'ring-2 ring-blue-400' : ''
            } ${canAccess ? 'hover:bg-gray-700' : 'opacity-50'}`;
            
            let buttonText = '';
            let buttonClass = '';
            let buttonAction = '';
            
            if (!canAccess) {
                buttonText = '🔒 VIP Only';
                buttonClass = 'bg-gray-600 cursor-not-allowed';
            } else if (isSelected) {
                buttonText = '✅ Selected';
                buttonClass = 'bg-green-600';
            } else if (isOwned) {
                buttonText = 'Select';
                buttonClass = 'bg-blue-600 hover:bg-blue-700';
                buttonAction = `onclick="game.selectSkin('${skin.id}')"`;
            } else if (canBuy) {
                buttonText = `Buy ${skin.cost} 💰`;
                buttonClass = 'bg-yellow-600 hover:bg-yellow-700';
                buttonAction = `onclick="game.buySkin('${skin.id}')"`;
            } else {
                buttonText = `${skin.cost} 💰`;
                buttonClass = 'bg-gray-600 cursor-not-allowed';
            }
            
            skinDiv.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-3xl">${skin.emoji}</span>
                    <div class="flex-1">
                        <h3 class="font-bold text-white">${skin.name}</h3>
                        <p class="text-sm opacity-70">${skin.desc}</p>
                    </div>
                    <button class="px-4 py-2 rounded-lg font-bold text-white transition-all ${buttonClass}" ${buttonAction}>
                        ${buttonText}
                    </button>
                </div>
            `;
            
            skinsContent.appendChild(skinDiv);
        });
    }
    
    openShop() {
        document.getElementById('shopModal').classList.remove('hidden');
        this.generateShopContent();
    }
    
    closeShop() {
        document.getElementById('shopModal').classList.add('hidden');
    }
    
    showShopTab(tab) {
        const themesTab = document.getElementById('themesTab');
        const skinsTab = document.getElementById('skinsTab');
        const themesContent = document.getElementById('themesContent');
        const skinsContent = document.getElementById('skinsContent');
        
        if (tab === 'themes') {
            themesTab.classList.add('text-blue-400', 'bg-blue-500', 'bg-opacity-20');
            themesTab.classList.remove('opacity-70');
            skinsTab.classList.remove('text-blue-400', 'bg-blue-500', 'bg-opacity-20');
            skinsTab.classList.add('opacity-70');
            
            themesContent.classList.remove('hidden');
            skinsContent.classList.add('hidden');
        } else {
            skinsTab.classList.add('text-blue-400', 'bg-blue-500', 'bg-opacity-20');
            skinsTab.classList.remove('opacity-70');
            themesTab.classList.remove('text-blue-400', 'bg-blue-500', 'bg-opacity-20');
            themesTab.classList.add('opacity-70');
            
            skinsContent.classList.remove('hidden');
            themesContent.classList.add('hidden');
        }
    }
    
    buyTheme(themeId) {
        const themes = [
            { id: 'ocean', cost: 1000 },
            { id: 'sunset', cost: 1200 },
            { id: 'forest', cost: 1500 },
            { id: 'neon', cost: 2000 },
            { id: 'phoenix', cost: 5000 },
            { id: 'void', cost: 5000 },
            { id: 'celestial', cost: 5000 },
            { id: 'snow', cost: 3000 }
        ];
        
        const theme = themes.find(t => t.id === themeId);
        if (theme && this.coins >= theme.cost) {
            this.coins -= theme.cost;
            this.ownedThemes.push(themeId);
            this.saveData();
            this.updateDisplay();
            this.generateShopContent();
            this.playSound('purchase');
        }
    }
    
    selectTheme(themeId) {
        if (this.ownedThemes.includes(themeId)) {
            this.currentTheme = themeId;
            this.saveData();
            this.applyTheme();
            this.generateShopContent();
            this.playSound('select');
        }
    }
    
    buySkin(skinId) {
        const skins = [
            { id: 'rainbow', cost: 800 },
            { id: 'fire', cost: 1200 },
            { id: 'ice', cost: 1200 },
            { id: 'electric', cost: 1500 },
            { id: 'galaxy', cost: 2000 }
        ];
        
        const skin = skins.find(s => s.id === skinId);
        if (skin && this.coins >= skin.cost) {
            this.coins -= skin.cost;
            this.ownedSkins.push(skinId);
            this.saveData();
            this.updateDisplay();
            this.generateShopContent();
            this.playSound('purchase');
        }
    }
    
    selectSkin(skinId) {
        if (this.ownedSkins.includes(skinId)) {
            this.currentSkin = skinId;
            this.saveData();
            this.generateShopContent();
            this.playSound('select');
        }
    }
    
                applyTheme() {
        const theme = this.currentTheme;
        document.body.className = `min-h-screen text-gray-100 transition-all duration-500 theme-${theme}`;
        
        if (window.setTheme) {
            window.setTheme(this.currentTheme);
        }

        // Stop any previous theme animations
        if (this.themeAnimationTimer) {
            clearInterval(this.themeAnimationTimer);
            this.themeAnimationTimer = null;
        }

        // Hide all special animation containers initially and clear their content
        const allAnimationContainers = ['galaxyStars', 'vipElements', 'phoenixFlames', 'voidRift', 'celestialOrbs', 'snowfall', 'shootingStar', 'snowCloud'];
        allAnimationContainers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                el.innerHTML = ''; // Clear previous animations
            }
        });

        // Show and generate animations for the current theme
        if (theme === 'galaxy') {
            const starsContainer = document.getElementById('galaxyStars');
            const shootingStar = document.getElementById('shootingStar');
            if (starsContainer && shootingStar) {
                starsContainer.classList.remove('hidden');
                shootingStar.classList.remove('hidden');
                if (starsContainer.children.length === 0) {
                    for (let i = 0; i < 100; i++) {
                        const star = document.createElement('div');
                        star.className = 'star';
                        star.style.width = `${Math.random() * 2 + 1}px`;
                        star.style.height = star.style.width;
                        star.style.top = `${Math.random() * 100}%`;
                        star.style.left = `${Math.random() * 100}%`;
                        starsContainer.appendChild(star);
                    }
                }
            }
        } else if (theme === 'vip') {
            const vipContainer = document.getElementById('vipElements');
            if (vipContainer) {
                vipContainer.classList.remove('hidden');
                
                // Create background effects for VIP theme
                this.themeAnimationTimer = setInterval(() => {
                    // Alternate between money, crowns, and sparkles
                    const type = Math.floor(Math.random() * 3);
                    const element = document.createElement('div');
                    
                    switch(type) {
                        case 0:
                            element.className = 'vip-money';
                            element.textContent = '💰';
                            break;
                        case 1:
                            element.className = 'vip-crown-float';
                            element.textContent = '👑';
                            break;
                        case 2:
                            element.className = 'vip-sparkle';
                            element.textContent = ['✨', '�', '⭐'][Math.floor(Math.random() * 3)];
                            break;
                    }
                    
                    // Random position and animation duration
                    element.style.left = Math.random() * 100 + 'vw';
                    element.style.top = Math.random() * 100 + 'vh';
                    element.style.animationDuration = (Math.random() * 2 + 3) + 's';
                    element.style.opacity = '0.6';
                    
                    vipContainer.appendChild(element);
                    setTimeout(() => element.remove(), 5000);
                }, 300);
            }
        } else if (theme === 'phoenix') {
            const container = document.getElementById('phoenixFlames');
            if (container) {
                container.classList.remove('hidden');
                if (container.children.length === 0) {
                    for (let i = 0; i < 10; i++) {
                        const flame = document.createElement('div');
                        flame.className = 'phoenix-flame';
                        flame.style.left = `${Math.random() * 90}vw`;
                        flame.style.width = `${Math.random() * 50 + 20}px`;
                        flame.style.height = `${Math.random() * 100 + 50}px`;
                        flame.style.animationDuration = `${Math.random() * 2 + 3}s`;
                        flame.style.animationDelay = `${Math.random() * 2}s`;
                        container.appendChild(flame);
                    }
                }
            }
        } else if (theme === 'void') {
            const container = document.getElementById('voidRift');
            if (container) {
                container.classList.remove('hidden');
                this.themeAnimationTimer = setInterval(() => {
                    const lightning = document.createElement('div');
                    lightning.className = 'void-lightning';
                    lightning.style.left = `${Math.random() * 100}vw`;
                    lightning.style.height = `${Math.random() * 50 + 50}vh`;
                    container.appendChild(lightning);
                    if (typeof playLightningSound === 'function') playLightningSound();
                    setTimeout(() => lightning.remove(), 300);
                }, Math.random() * 4000 + 1000);
            }
        } else if (theme === 'celestial') {
            const container = document.getElementById('celestialOrbs');
            if (container) {
                container.classList.remove('hidden');
                const MAX_SHAPES = 8; // Increased from 5 to 8
                
                this.themeAnimationTimer = setInterval(() => {
                    // Check current shape count
                    const currentShapes = container.querySelectorAll('.celestial-shape');
                    if (currentShapes.length >= MAX_SHAPES) {
                        return; // Don't create more shapes if at max
                    }

                    const shape = document.createElement('div');
                    shape.className = 'celestial-shape';
                    
                    // Random position
                    shape.style.left = `${Math.random() * 90}vw`;
                    shape.style.top = `${Math.random() * 90}vh`;
                    
                    // Random size between 20px and 120px (increased range)
                    const size = Math.random() * 100 + 20;
                    shape.style.width = `${size}px`;
                    shape.style.height = `${size}px`;
                    
                    // Random color with higher saturation and brightness
                    shape.style.backgroundColor = `hsl(${Math.random() * 360}, 85%, 75%)`;
                    
                    // Random shape (circle, square, or diamond)
                    const shapeType = Math.random();
                    if (shapeType < 0.33) {
                        shape.style.borderRadius = '50%'; // Circle
                    } else if (shapeType < 0.66) {
                        shape.style.borderRadius = '0'; // Square
                    } else {
                        shape.style.transform = 'rotate(45deg)'; // Diamond
                    }
                    
                    container.appendChild(shape);
                    if (typeof playCelestialSound === 'function') playCelestialSound();
                    
                    // Remove shape after animation
                    setTimeout(() => shape.remove(), 10000);
                }, 2000);
            }
        } else if (theme === 'snow') {
            const container = document.getElementById('snowfall');
            const cloud = document.getElementById('snowCloud');
            if (container && cloud) {
                container.classList.remove('hidden');
                cloud.classList.remove('hidden');
                this.themeAnimationTimer = setInterval(() => {
                    const flake = document.createElement('div');
                    flake.className = 'snow-particle';
                    const size = `${Math.random() * 4 + 2}px`;
                    flake.style.width = size;
                    flake.style.height = size;
                    flake.style.left = `${Math.random() * 100}vw`;
                    flake.style.animationDuration = `${Math.random() * 5 + 5}s`;
                    container.appendChild(flake);
                    if (Math.random() < 0.1 && typeof playSnowSound === 'function') playSnowSound();
                    setTimeout(() => flake.remove(), 10000);
                }, 100);
            }
        }
    }
    
    updateVipStatus() {
        if (this.vipStatus) {
            this.ownedThemes = [...new Set([...this.ownedThemes, 'galaxy', 'vip'])];
            this.ownedSkins = [...new Set([...this.ownedSkins, 'golden', 'shadow', 'neon', 'diamond', 'phoenix', 'void'])];
        }
        this.applyTheme();
    }
    
    openSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
    }
    
    closeSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }
    
    setLanguage(language) {
        currentLang = language;
        localStorage.setItem('kurdish-snake-language', language);
        updateLanguage();
        this.playSound('select');
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('kurdish-snake-sound', this.soundEnabled);
        this.updateSoundToggle();
        
        // Stop all theme music if sound is disabled
        if (!this.soundEnabled) {
            stopThemeMusic();
            if (audioCtx) {
                audioCtx.suspend();
            }
        } else {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }
        
        this.saveData();
    }
    
    updateSoundToggle() {
        const toggle = document.getElementById('soundToggle');
        const slider = document.getElementById('soundToggleSlider');
        
        if (this.soundEnabled) {
            toggle.classList.remove('bg-gray-600');
            toggle.classList.add('bg-green-500');
            slider.style.transform = 'translateX(24px)';
        } else {
            toggle.classList.remove('bg-green-500');
            toggle.classList.add('bg-gray-600');
            slider.style.transform = 'translateX(0px)';
        }
    }
    
    // Game speed is now only set by difficulty level
    setSpeed(speed) {
        // This function is disabled as game speed is now controlled by difficulty only
        return;
    }
    
    showAbout() {
        document.getElementById('aboutModal').classList.remove('hidden');
    }
    
    closeAbout() {
        document.getElementById('aboutModal').classList.add('hidden');
    }
    
    showResetModal() {
        document.getElementById('resetModal').classList.remove('hidden');
    }
    
    closeResetModal() {
        document.getElementById('resetModal').classList.add('hidden');
    }
    
    confirmReset() {
        localStorage.clear();
        location.reload();
    }
    
    playSound(type) {
        if (!this.soundEnabled) return;
        playButtonSound();
    }
    
    saveData() {
        localStorage.setItem('kurdish-snake-high-score', this.highScore.toString());
        localStorage.setItem('kurdish-snake-classic-high-score', this.classicHighScore.toString());
        localStorage.setItem('kurdish-snake-modern-high-score', this.modernHighScore.toString());
        localStorage.setItem('kurdish-snake-coins', this.coins.toString());
        localStorage.setItem('kurdish-snake-difficulty', this.difficulty);
        localStorage.setItem('kurdish-snake-theme', this.currentTheme);
        localStorage.setItem('kurdish-snake-skin', this.currentSkin);
        localStorage.setItem('kurdish-snake-owned-themes', JSON.stringify(this.ownedThemes));
        localStorage.setItem('kurdish-snake-owned-skins', JSON.stringify(this.ownedSkins));
        localStorage.setItem('kurdish-snake-sound', this.soundEnabled.toString());
        localStorage.setItem('kurdish-snake-vip', this.vipStatus.toString());
    }
}

// Initialize the game
const game = new KurdishSnakeGame();
window.game = game;

// Event delegation for button sounds
document.addEventListener('click', function(e) {
    const button = e.target.closest('button');
    if (button && window.game && window.game.soundEnabled) {
        // Check if the button is a mobile control button
        if (button.closest('.mobile-controls')) {
            return; // Do not play sound for mobile controls
        }
        if (typeof playButtonSound === 'function') {
            playButtonSound();
        }
    }
});

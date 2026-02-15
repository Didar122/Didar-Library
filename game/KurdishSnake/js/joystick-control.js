// Joystick Control for Modern Mode
class JoystickController {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.setupJoystick();
        this.currentDirection = null;
        this.isActive = false;
        this.watchGameMode();
    }

    setupJoystick() {
        // Create joystick HTML
        const joystickHTML = `
            <div class="joystick-container">
                <div class="joystick-indicator indicator-up"></div>
                <div class="joystick-indicator indicator-right"></div>
                <div class="joystick-indicator indicator-down"></div>
                <div class="joystick-indicator indicator-left"></div>
                <div class="joystick-knob"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', joystickHTML);

        this.container = document.querySelector('.joystick-container');
        this.knob = document.querySelector('.joystick-knob');
        this.indicators = {
            up: document.querySelector('.indicator-up'),
            right: document.querySelector('.indicator-right'),
            down: document.querySelector('.indicator-down'),
            left: document.querySelector('.indicator-left')
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        let startX, startY, currentX, currentY;
        const sensitivity = 30; // Adjust this value to change joystick sensitivity

        const handleStart = (e) => {
            this.isActive = true;
            const touch = e.type === 'mousedown' ? e : e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            currentY = startY;
            
            // Reset indicators
            Object.values(this.indicators).forEach(ind => ind.classList.remove('active'));
        };

        const handleMove = (e) => {
            if (!this.isActive) return;
            e.preventDefault();
            
            const touch = e.type === 'mousemove' ? e : e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            // Calculate direction based on movement
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > sensitivity) {
                    this.currentDirection = deltaX > 0 ? 'right' : 'left';
                }
            } else {
                if (Math.abs(deltaY) > sensitivity) {
                    this.currentDirection = deltaY > 0 ? 'down' : 'up';
                }
            }

            // Update knob position (limited to container bounds)
            const maxDistance = 40;
            const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

            // Update direction indicators
            Object.values(this.indicators).forEach(ind => ind.classList.remove('active'));
            if (this.currentDirection) {
                this.indicators[this.currentDirection].classList.add('active');
            }

            // Trigger movement in game
            if (this.currentDirection && window.gameInstance) {
                if (window.gameInstance.gameMode === 'modern') {
                    // Use the appropriate control method for modern mode
                    switch (this.currentDirection) {
                        case 'up':
                            window.gameInstance.modernSnake.angle = -Math.PI / 2;
                            break;
                        case 'down':
                            window.gameInstance.modernSnake.angle = Math.PI / 2;
                            break;
                        case 'left':
                            window.gameInstance.modernSnake.angle = Math.PI;
                            break;
                        case 'right':
                            window.gameInstance.modernSnake.angle = 0;
                            break;
                    }
                } else {
                    const event = new KeyboardEvent('keydown', { key: this.getKeyForDirection(this.currentDirection) });
                    document.dispatchEvent(event);
                }
            }
        };

        const handleEnd = () => {
            this.isActive = false;
            this.currentDirection = null;
            this.knob.style.transform = 'translate(-50%, -50%)';
            Object.values(this.indicators).forEach(ind => ind.classList.remove('active'));
        };

        // Touch events
        this.container.addEventListener('touchstart', handleStart);
        this.container.addEventListener('touchmove', handleMove, { passive: false });
        this.container.addEventListener('touchend', handleEnd);

        // Mouse events (for testing)
        this.container.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }

    getKeyForDirection(direction) {
        const keyMap = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight'
        };
        return keyMap[direction];
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }
}

    watchGameMode() {
        // Check for game mode changes
        const checkGameMode = () => {
            const mobileControls = document.querySelector('.mobile-controls');
            if (mobileControls && window.gameInstance && window.gameInstance.gameMode === 'modern') {
                mobileControls.style.display = 'none';
                this.show();
            } else if (mobileControls) {
                mobileControls.style.display = 'block';
                this.hide();
            }
        };

        // Check initially and set up interval
        setTimeout(checkGameMode, 1000);
        setInterval(checkGameMode, 1000);
    }
}

// Initialize the joystick controller
const initJoystick = () => {
    window.joystickController = new JoystickController();
};

// Initialize when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJoystick);
} else {
    initJoystick();
}

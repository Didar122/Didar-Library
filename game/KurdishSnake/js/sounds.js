// Initialize Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Play a button click sound using Web Audio API
function playButtonSound() {
    if (!audioCtx || audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine'; // A smooth waveform
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // Lower, calmer frequency (A3 note)
    oscillator.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); // Softer volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
}

let themeInterval = null;
let snowMusicTimeout = null;

function createThemeMusic(theme) {
    if (!audioCtx || audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    stopThemeMusic(); // Stop any existing theme music

    if (theme === 'vip') {
        // Royal VIP theme - Majestic fanfare with magical elements
        const vipThemeNotes = [
            // Majestic opening
            { note: 523.25, duration: 300 }, // C5
            { note: 659.25, duration: 300 }, // E5
            { note: 783.99, duration: 600 }, // G5
            { note: 1046.50, duration: 900 }, // C6 (held)
            
            // Mystical bridge
            { note: 987.77, duration: 300 }, // B5
            { note: 880.00, duration: 300 }, // A5
            { note: 783.99, duration: 300 }, // G5
            { note: 739.99, duration: 600 }, // F#5
            
            // Royal flourish
            { note: 659.25, duration: 200 }, // E5
            { note: 739.99, duration: 200 }, // F#5
            { note: 880.00, duration: 200 }, // A5
            { note: 987.77, duration: 400 }, // B5
            { note: 1046.50, duration: 800 }, // C6
            
            // Magical sparkle descent
            { note: 1174.66, duration: 150 }, // D6
            { note: 1046.50, duration: 150 }, // C6
            { note: 987.77, duration: 150 }, // B5
            { note: 880.00, duration: 150 }, // A5
            { note: 783.99, duration: 150 }, // G5
            { note: 659.25, duration: 150 }, // E5
            { note: 523.25, duration: 600 }, // C5
        ];

        let noteIndex = 0;
        const playNote = () => {
            if (noteIndex >= vipThemeNotes.length) {
                noteIndex = 0;
            }

            const note = vipThemeNotes[noteIndex];
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            // Create a rich sound with multiple oscillators
            const osc2 = audioCtx.createOscillator(); // Harmony oscillator
            const gainNode2 = audioCtx.createGain();
            
            // Main note
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.note, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (note.duration / 1000));

            // Harmony note (perfect fifth above)
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(note.note * 1.5, audioCtx.currentTime);
            gainNode2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (note.duration / 1000));

            osc.connect(gainNode);
            osc2.connect(gainNode2);
            gainNode.connect(audioCtx.destination);
            gainNode2.connect(audioCtx.destination);

            osc.start();
            osc2.start();
            osc.stop(audioCtx.currentTime + (note.duration / 1000));
            osc2.stop(audioCtx.currentTime + (note.duration / 1000));

            noteIndex++;
            snowMusicTimeout = setTimeout(playNote, note.duration);
        };

        playNote();
        return;
    }
    
    if (theme === 'snow') {
        // Jingle Bells melody - Complete version
        const jingleBellsNotes = [
            // First verse
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 600 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 600 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 783.99, duration: 300 }, // G5
            { note: 523.25, duration: 400 }, // C5
            { note: 587.33, duration: 200 }, // D5
            { note: 659.25, duration: 600 }, // E5
            
            // Second verse
            { note: 698.46, duration: 300 }, // F5
            { note: 698.46, duration: 300 }, // F5
            { note: 698.46, duration: 300 }, // F5
            { note: 698.46, duration: 300 }, // F5
            { note: 698.46, duration: 300 }, // F5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 659.25, duration: 300 }, // E5
            { note: 587.33, duration: 300 }, // D5
            { note: 587.33, duration: 300 }, // D5
            { note: 659.25, duration: 300 }, // E5
            { note: 587.33, duration: 600 }, // D5
            { note: 783.99, duration: 600 }, // G5
        ];

        let noteIndex = 0;
        const playNote = () => {
            if (noteIndex >= jingleBellsNotes.length) {
                noteIndex = 0;
            }

            const note = jingleBellsNotes[noteIndex];
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.note, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (note.duration / 1000));

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + (note.duration / 1000));

            noteIndex++;
            snowMusicTimeout = setTimeout(playNote, note.duration);
        };

        playNote();
        return;
    }

    const notes = theme === 'galaxy'
        ? [220, 277.18, 329.63, 392.00, 440.00] // A minor pentatonic scale
        : [261.63, 329.63, 392.00, 466.16, 523.25]; // C major pentatonic scale

    let noteIndex = 0;
    themeInterval = setInterval(() => {
        const freq = notes[noteIndex];
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = theme === 'galaxy' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.detune.setValueAtTime(Math.random() * 4 - 2, audioCtx.currentTime); // slight detune

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);

        noteIndex = (noteIndex + 1) % notes.length;
    }, 2000);
}

function stopThemeMusic() {
    if (themeInterval) {
        clearInterval(themeInterval);
        themeInterval = null;
    }
    if (snowMusicTimeout) {
        clearTimeout(snowMusicTimeout);
        snowMusicTimeout = null;
    }
}

function playCheatSound() {
    if (!audioCtx || audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(100.5, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(805, audioCtx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.4);
    osc2.stop(audioCtx.currentTime + 0.4);
}

let snowAnimationInterval = null;

function createSnowAnimation() {
    // Remove any existing snow container and interval
    stopSnowAnimation();

    // Create snow container
    const container = document.createElement('div');
    container.className = 'snow-container';
    document.body.appendChild(container);

    const snowflakeChars = ['❄', '❅', '❆'];
    const maxSnowflakes = 50;
    const animationDurations = [8000, 10000, 12000]; // Slower durations
    const sizeSets = [
        { size: 4, scale: 1 },    // Tiny
        { size: 6, scale: 1.1 },  // Small
        { size: 8, scale: 1.2 },  // Medium
        { size: 10, scale: 1.3 }  // Large
    ];

    function createSnowflake() {
        const snowflake = document.createElement('div');
        
        // Random properties
        const char = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
        const startX = Math.random() * 100; // Random start position in viewport width %
        const variant = Math.ceil(Math.random() * 3); // Random animation variant
        const duration = animationDurations[Math.floor(Math.random() * animationDurations.length)];
        const delay = Math.random() * 4000; // Longer random start delay
        const sizeSet = sizeSets[Math.floor(Math.random() * sizeSets.length)];
        
        // Set snowflake properties
        snowflake.className = `snowflake variant-${variant}`;
        const span = document.createElement('span');
        span.textContent = char;
        span.style.transform = `scale(${sizeSet.scale})`; // Scale based on size set
        snowflake.appendChild(span);
        snowflake.style.left = `${startX}%`;
        snowflake.style.animationDuration = `${duration}ms`;
        snowflake.style.animationDelay = `${delay}ms`;
        snowflake.style.width = `${sizeSet.size}px`;
        snowflake.style.height = `${sizeSet.size}px`;
        
        // Fade in after a small delay
        setTimeout(() => {
            snowflake.style.opacity = '0.8';
        }, 50);

        // Add to container
        container.appendChild(snowflake);

        // Remove snowflake when animation completes
        setTimeout(() => {
            if (container.contains(snowflake)) {
                container.removeChild(snowflake);
            }
        }, duration + delay + 1000);
    }

    // Create initial batch of snowflakes
    for (let i = 0; i < maxSnowflakes; i++) {
        createSnowflake();
    }

    // Create new snowflakes periodically
    snowAnimationInterval = setInterval(() => {
        const container = document.querySelector('.snow-container');
        if (container) {
            createSnowflake();
        } else {
            stopSnowAnimation();
        }
    }, 300);
}

function stopSnowAnimation() {
    if (snowAnimationInterval) {
        clearInterval(snowAnimationInterval);
        snowAnimationInterval = null;
    }
    const container = document.querySelector('.snow-container');
    if (container) {
        container.remove();
    }
}

function playSnowSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const noise = audioCtx.createBufferSource();
    const bufferSize = audioCtx.sampleRate * 2.0;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    let data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 10000;
    bandpass.Q.value = 0.5;
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
    noise.stop(audioCtx.currentTime + 2);
}

function playCelestialSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}

function playLightningSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const noise = audioCtx.createBufferSource();
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    let data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'lowpass';
    bandpass.frequency.setValueAtTime(500, audioCtx.currentTime);
    bandpass.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.5);
}

// Play theme music when theme changes
window.setTheme = function(theme) {
    // Remove snow theme class if it exists
    document.body.classList.remove('snow-theme');
    
    if (theme === 'snow') {
        createThemeMusic('snow');
        createSnowAnimation();
        document.body.classList.add('snow-theme');
    } else {
        if (theme === 'galaxy' || theme === 'vip') {
            createThemeMusic(theme);
        } else {
            stopThemeMusic();
        }
        stopSnowAnimation();
    }
    // ...existing theme change logic...
}

// Unlock audio context on first user gesture
function unlockAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(e => console.error('Error resuming AudioContext:', e));
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
}

window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);
window.addEventListener('keydown', unlockAudio);

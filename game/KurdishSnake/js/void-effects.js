// Maximum number of particles allowed at once
const MAX_PARTICLES = 50;

// Function to create void energy particles
function createVoidParticle() {
    // Check current particle count
    const currentParticles = document.querySelectorAll('.void-energy-particle');
    if (currentParticles.length >= MAX_PARTICLES) {
        return; // Don't create more particles if at max
    }
    
    const particle = document.createElement('div');
    particle.className = 'void-energy-particle';
    
    // Random starting position
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    
    // Random float distance
    const floatX = (Math.random() - 0.5) * 200;
    const floatY = -100 - (Math.random() * 100); // Always float upwards
    
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty('--float-x', `${floatX}px`);
    particle.style.setProperty('--float-y', `${floatY}px`);
    
    document.body.appendChild(particle);
    
    // Remove particle after animation or timeout
    const cleanup = () => {
        if (document.body.contains(particle)) {
            particle.remove();
        }
    };

    // Remove particle after animation ends
    particle.addEventListener('animationend', cleanup);
    
    // Backup cleanup in case animation end doesn't fire
    setTimeout(cleanup, 4000); // 4 seconds matches our animation duration
}

let particleInterval = null;
let isVoidThemeActive = false;

// Function to start void effects
function startVoidEffects() {
    // Clear any existing interval
    if (particleInterval) {
        clearInterval(particleInterval);
    }
    
    isVoidThemeActive = true;
    
    // Create particles periodically with a slower interval
    particleInterval = setInterval(() => {
        if (isVoidThemeActive) {
            createVoidParticle();
        }
    }, 300); // Reduced frequency of particle creation
}

// Function to stop void effects
function stopVoidEffects() {
    isVoidThemeActive = false;
    
    if (particleInterval) {
        clearInterval(particleInterval);
        particleInterval = null;
    }
    
    // Remove any existing particles with a fade out effect
    const particles = document.querySelectorAll('.void-energy-particle');
    particles.forEach(particle => {
        particle.style.animation = 'none';
        particle.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(particle)) {
                particle.remove();
            }
        }, 500);
    });
}

// Function to handle theme changes
function handleThemeChange() {
    const body = document.body;
    if (body.classList.contains('theme-void')) {
        startVoidEffects();
    } else {
        stopVoidEffects();
    }
}

// Watch for theme changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
            handleThemeChange();
        }
    });
});

// Start observing the body element for class changes
observer.observe(document.body, {
    attributes: true
});

// Initial check
handleThemeChange();

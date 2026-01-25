/**
 * CHRONOS VISUAL ENGINE
 * Canvas-based particle system with physics simulation.
 */
const canvas = document.createElement('canvas');
canvas.id = 'fx-canvas';
document.body.prepend(canvas);

const ctx = canvas.getContext('2d', { alpha: true });
let particles = [];
let mouse = { x: -1000, y: -1000 };
let themeConfig = { color: '212, 175, 55', alpha: 0.5 }; // Default Gold

// Configuration
const PARTICLE_COUNT = 150;
const CONNECTION_DIST = 100;

class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        this.life = Math.random();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Mouse Repulsion
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 200) {
            const force = (200 - dist) / 200;
            this.vx -= (dx / dist) * force * 0.5;
            this.vy -= (dy / dist) * force * 0.5;
        }

        // Friction & Bounds
        this.vx *= 0.98;
        this.vy *= 0.98;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.reset();
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${themeConfig.color}, ${this.life * themeConfig.alpha})`;
        ctx.fill();
    }
}

function initVisuals() {
    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update Theme Color dynamically
    const isLight = document.body.classList.contains('light-mode');
    themeConfig.color = isLight ? '160, 126, 69' : '212, 175, 55'; // Dark Gold vs Bright Gold
    themeConfig.alpha = isLight ? 0.3 : 0.6;

    // Draw Connections
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
        let p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < CONNECTION_DIST) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${themeConfig.color}, ${1 - dist/CONNECTION_DIST})`;
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

initVisuals();

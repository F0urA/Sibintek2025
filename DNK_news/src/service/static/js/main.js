class CosmosScene {
    constructor() {
        this.starsContainer = null;
        this.init();
    }

    init() {
        this.createContainers();
        this.generateStars(150);
        this.startMeteorShower();
        this.addParallax();
        this.initFlashMessages();
    }

    createContainers() {
        const starsNear = document.createElement('div');
        starsNear.className = 'stars-near';
        document.body.insertBefore(starsNear, document.body.firstChild);
        this.starsContainer = starsNear;

        const starsFar = document.createElement('div');
        starsFar.className = 'stars-far';
        document.body.insertBefore(starsFar, document.body.firstChild);

        const nebulas = [
            { className: 'nebula nebula-1' },
            { className: 'nebula nebula-2' },
            { className: 'nebula nebula-3' }
        ];

        nebulas.forEach(nebula => {
            const nebulaEl = document.createElement('div');
            nebulaEl.className = nebula.className;
            document.body.insertBefore(nebulaEl, document.body.firstChild);
        });
    }

    generateStars(count) {
        const sizes = ['small', 'medium', 'large'];
        const twinkles = ['twinkle-1', 'twinkle-2', 'twinkle-3', 'twinkle-4'];

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';

            const x = Math.random() * 100;
            const y = Math.random() * 100;
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;

            const sizeRandom = Math.random();
            let size;
            if (sizeRandom < 0.7) {
                size = 'small';
            } else if (sizeRandom < 0.9) {
                size = 'medium';
            } else {
                size = 'large';
            }
            star.classList.add(`star-${size}`);

            const twinkle = twinkles[Math.floor(Math.random() * twinkles.length)];
            star.classList.add(twinkle);

            star.style.animationDelay = `${Math.random() * 5}s`;

            this.starsContainer.appendChild(star);
        }
    }

    startMeteorShower() {
        setInterval(() => {
            if (Math.random() < 0.3) {
                this.createMeteor();
            }
        }, 8000);

        setTimeout(() => this.createMeteor(), 3000);
    }

    createMeteor() {
        const meteor = document.createElement('div');
        meteor.className = 'meteor';

        const startX = Math.random() * 100 + 50;
        const startY = Math.random() * 30;

        meteor.style.left = `${startX}%`;
        meteor.style.top = `${startY}%`;

        const duration = 0.3 + Math.random() * 0.5;
        meteor.style.animation = `meteor-flash ${duration}s linear`;

        document.body.appendChild(meteor);

        setTimeout(() => {
            meteor.remove();
        }, duration * 1000);
    }

    addParallax() {
        const farStars = document.querySelector('.stars-far');
        const nearStars = document.querySelector('.stars-near');
        const nebulas = document.querySelectorAll('.nebula');

        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            if (farStars) {
                farStars.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            }

            if (nearStars) {
                nearStars.style.transform = `translate(${x * 0.5}px, ${y * 0.5}px)`;
            }

            nebulas.forEach((nebula, index) => {
                const speed = 0.3 + index * 0.1;
                nebula.style.transform = `translate(${x * speed}px, ${y * speed}px) scale(${1 + index * 0.05})`;
            });
        });
    }

    initFlashMessages() {
        const flashMessages = document.querySelectorAll('.flash');
        flashMessages.forEach(message => {
            setTimeout(() => {
                message.style.transition = 'opacity 0.5s';
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 500);
            }, 5000);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cosmosScene = new CosmosScene();
    console.log('🌌 DNK Space - Реалистичный космос загружен');
});
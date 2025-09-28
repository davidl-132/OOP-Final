document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.sakura-container');
        const numPetals = 40; // Number of petals

        for (let i = 0; i < numPetals; i++) {
            const petal = document.createElement('div');
            petal.classList.add('sakura-petal');
            
            // Create 3 layers of petals with different properties
            const layer = Math.floor(Math.random() * 3) + 1;
            
            if (layer === 1) {
                petal.style.transform = `scale(${Math.random() * 0.5 + 0.8})`;
                petal.style.animationDuration = `${Math.random() * 5 + 7}s`;
                petal.style.opacity = `${Math.random() * 0.3 + 0.7}`;
            } else if (layer === 2) {
                petal.style.transform = `scale(${Math.random() * 0.4 + 0.5})`;
                petal.style.animationDuration = `${Math.random() * 8 + 10}s`;
                petal.style.opacity = `${Math.random() * 0.3 + 0.4}`;
            } else {
                petal.style.transform = `scale(${Math.random() * 0.3 + 0.2})`;
                petal.style.animationDuration = `${Math.random() * 10 + 15}s`;
                petal.style.opacity = `${Math.random() * 0.2 + 0.2}`;
            }

            petal.style.left = `${Math.random() * 100}vw`;
            petal.style.animationDelay = `${Math.random() * 5}s`;
            
            container.appendChild(petal);
        }
    });
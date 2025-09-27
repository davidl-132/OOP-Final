document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.sakura-container');
        const numPetals = 50; // Tăng số lượng một chút

        for (let i = 0; i < numPetals; i++) {
            const petal = document.createElement('div');
            petal.classList.add('sakura-petal');
            
            // **THÊM MỚI**: Tạo 3 lớp hoa anh đào
            const layer = Math.floor(Math.random() * 3) + 1; // Ngẫu nhiên lớp 1, 2, hoặc 3
            
            if (layer === 1) { // Lớp gần nhất: to, nhanh, rõ
                petal.style.transform = `scale(${Math.random() * 0.5 + 0.8})`;
                petal.style.animationDuration = `${Math.random() * 5 + 7}s`;
                petal.style.opacity = `${Math.random() * 0.3 + 0.7}`;
            } else if (layer === 2) { // Lớp ở giữa
                petal.style.transform = `scale(${Math.random() * 0.4 + 0.5})`;
                petal.style.animationDuration = `${Math.random() * 8 + 10}s`;
                petal.style.opacity = `${Math.random() * 0.3 + 0.4}`;
            } else { // Lớp xa nhất: nhỏ, chậm, mờ
                petal.style.transform = `scale(${Math.random() * 0.3 + 0.2})`;
                petal.style.animationDuration = `${Math.random() * 10 + 15}s`;
                petal.style.opacity = `${Math.random() * 0.2 + 0.2}`;
            }

            petal.style.left = `${Math.random() * 100}vw`;
            petal.style.animationDelay = `${Math.random() * 5}s`;
            
            container.appendChild(petal);
        }
    });
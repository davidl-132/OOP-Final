// Lấy thông tin người dùng từ localStorage
const currentUserJSON = localStorage.getItem('currentUser');
const currentUser = currentUserJSON ? JSON.parse(currentUserJSON) : null;

// Lấy vai trò từ đối tượng người dùng, nếu không có thì là null
const userRole = currentUser ? currentUser.role : null;

console.log('Vai trò người dùng:', userRole); // Bây giờ sẽ in ra 'staff' hoặc 'guest'

if (userRole === 'staff') {
    console.log(`Chào mừng nhân viên ${currentUser.username}!`);
}

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// =============================================================================
// FOOD MANAGEMENT SYSTEM
// =============================================================================

// --- Food Base Class ---
class Food {
    static count = 0;
    constructor(name, nameVi, price, image, category, description = "") {
        this.name = name; // Tên tiếng Nhật
        this.nameVi = nameVi; // Tên tiếng Việt
        this.price = price;
        this.image = image;
        this.category = category;
        this.description = description;

        Food.count++;
        this.id = Food.count;
    }
}

class Ramen extends Food {
    constructor(name, nameVi, price, image, broth = "Tonkotsu", noodle = "Thin") {
        super(name, nameVi, price, image, "ramen", "Ramen truyền thống");
        this.broth = broth;
        this.noodle = noodle;
    }
}

class RiceDon extends Food {
    constructor(name, nameVi, price, image, riceType = "White Rice") {
        super(name, nameVi, price, image, "ricedon", "Cơm thịt Nhật Bản");
        this.riceType = riceType;
    }
}

class Drink extends Food {
    constructor(name, nameVi, price, image, size = "Regular") {
        super(name, nameVi, price, image, "drink", "Thức uống");
        this.size = size;
    }
}

class Topping extends Food {
    constructor(name, nameVi, price, image, toppingType = "Vegetable") {
        super(name, nameVi, price, image, "topping", "Topping thêm");
        this.toppingType = toppingType;
    }
}

class SideDish extends Food {
    constructor(name, nameVi, price, image, dishType = "Appetizer", isVegetarian = false) {
        super(name, nameVi, price, image, "sidedish", "Món ăn kèm");
        this.dishType = dishType;
        this.isVegetarian = isVegetarian;
    }
}

// --- Combo Class (Chỉ Staff mới có thể tạo/chỉnh sửa) ---
class Combo {
    static count = 0;
    constructor(comboName, comboNameVi, discount = 0.1, image = null) {
        this.comboName = comboName;
        this.comboNameVi = comboNameVi;
        this.discount = discount;
        this.items = [];
        this.image = image;
        this.category = "combo";
        
        Combo.count++;
        this.id = `combo_${Combo.count}`;
    }

    addFood(food) {
        if (food) {
            this.items.push(food);
        }
    }

    removeFood(foodId) {
        this.items = this.items.filter(f => f.id !== foodId);
    }


    calculatePrice() {
        const original = this.items.reduce((sum, f) => sum + f.price, 0);
        const discounted = Math.round(original * (1 - this.discount));
        return { original, discounted, save: original - discounted };
    }

    // Tạo object giống Food để hiển thị trong menu
    toMenuFormat() {
        const pricing = this.calculatePrice();
        const comboImage = this.image || this.items[0]?.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop';
        return {
            id: this.id,
            name: this.comboName,
            nameVi: this.comboNameVi,
            price: pricing.discounted,
            originalPrice: pricing.original,
            image: comboImage,
            category: "combo",
            description: `Combo gồm ${this.items.length} món - Tiết kiệm ${pricing.save.toLocaleString('vi-VN')}đ`,
            items: this.items
        };
    }
}

// --- Khởi tạo Menu với các loại món ---
const menuList = [
    // Ramen
    new Ramen("ラーメン特製", "Ramen Đặc Biệt", 85000, "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop", "Miso", "Thin"),
    new Ramen("とんこつラーメン", "Ramen Tonkotsu", 90000, "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", "Tonkotsu", "Thick"),
    new Ramen("みそラーメン", "Ramen Miso", 88000, "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop", "Miso", "Medium"),

    // Rice Don
    new RiceDon("牛丼", "Gyudon - Cơm Thịt Bò", 75000, "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop", "White Rice"),
    new RiceDon("親子丼", "Oyakodon - Cơm Gà Trứng", 70000, "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=300&fit=crop", "White Rice"),
    new RiceDon("カツ丼", "Katsudon - Cơm Thịt Chiên", 80000, "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop", "White Rice"),

    // Drinks
    new Drink("コーヒー", "Cà Phê Sữa Đá", 28000, "https://www.highlandscoffee.com.vn/vnt_upload/product/04_2023/New_product/HLC_New_logo_5.1_Products__PHIN_SUADA.jpg", "12oz"),
    new Drink("桃茶", "Trà Đào Cam Sả", 35000, "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop", "16oz"),
    new Drink("抹茶", "Trà Xanh Matcha", 40000, "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop", "12oz"),
    new Drink("緑茶", "Trà Xanh Nhật", 25000, "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop", "10oz"),

    // Side Dishes
    new SideDish("生春巻き", "Gỏi Cuốn Tôm Thịt", 45000, "https://images.unsplash.com/photo-1559847844-56f382c04d59?w=400&h=300&fit=crop", "Appetizer", false),
    new SideDish("どら焼き", "Bánh Dorayaki", 25000, "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop", "Dessert", true),
    new SideDish("餃子", "Gyoza - Bánh Potsticker", 50000, "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop", "Appetizer", false),
    new SideDish("枝豆", "Edamame - Đậu Nành", 30000, "https://images.unsplash.com/photo-1609501676725-7186f734b2e1?w=400&h=300&fit=crop", "Appetizer", true),

    // Toppings
    new Topping("チャーシュー", "Chashu - Thịt Xá Xíu", 15000, "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop", "Meat"),
    new Topping("半熟卵", "Ajitsuke Tamago - Trứng Lòng Đào", 8000, "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop", "Protein"),
    new Topping("のり", "Nori - Rong Biển", 5000, "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop", "Vegetable"),
    new Topping("ネギ", "Negi - Hành Lá", 3000, "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop", "Vegetable")
];

// --- Tạo sẵn một số Combo (Staff có thể tạo thêm) ---
const staffCombos = [];

// Combo 1: Ramen + Drink + Side
const combo1 = new Combo("ラーメンセット", "Combo Ramen Đặc Biệt", 0.15);
combo1.addFood(menuList.find(item => item.nameVi === "Ramen Đặc Biệt"));
combo1.addFood(menuList.find(item => item.nameVi === "Trà Xanh Matcha"));
combo1.addFood(menuList.find(item => item.nameVi === "Gyoza - Bánh Potsticker"));
staffCombos.push(combo1);

// Combo 2: Rice Don + Drink
const combo2 = new Combo("丼セット", "Combo Cơm Thịt", 0.12);
combo2.addFood(menuList.find(item => item.nameVi === "Gyudon - Cơm Thịt Bò"));
combo2.addFood(menuList.find(item => item.nameVi === "Trà Xanh Nhật"));
combo2.addFood(menuList.find(item => item.nameVi === "Edamame - Đậu Nành"));
staffCombos.push(combo2);

// --- Cart Management cho Guest ---
class GuestCart {
    constructor() {
        this.items = [];
    }

    addItem(food, quantity = 1) {
        const existingItem = this.items.find(item => item.id === food.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({ 
                ...food, 
                quantity: quantity,
                addedAt: new Date()
            });
        }
    }

    removeItem(foodId) {
        this.items = this.items.filter(item => item.id !== foodId);
    }

    updateQuantity(foodId, change) {
        const item = this.items.find(item => item.id === foodId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeItem(foodId);
            }
        }
    }

    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    getTotalPrice() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    clear() {
        this.items = [];
    }
}

// --- Menu Manager ---
class MenuManager {
    constructor() {
        this.allItems = [...menuList];
        this.combos = [...staffCombos];
    }

    // Lấy tất cả món theo category
    getItemsByCategory(category) {
        if (category === 'all') {
            return [...this.allItems, ...this.combos.map(combo => combo.toMenuFormat())];
        }
        
        if (category === 'combo') {
            return this.combos.map(combo => combo.toMenuFormat());
        }
        
        return this.allItems.filter(item => item.category === category);
    }

    // Tìm món theo ID
    findItemById(id) {
        // Tìm trong menu thường
        const regularItem = this.allItems.find(item => item.id === id);
        if (regularItem) return regularItem;
        
        // Tìm trong combo
        const combo = this.combos.find(c => c.id === id);
        if (combo) return combo.toMenuFormat();
        
        return null;
    }

    addFood(food) {
        if (this.isStaff()) {
            this.allItems.push(food);
        }
    }

    removeFood(foodId) {
        if (this.isStaff()) {
            this.allItems = this.allItems.filter(f => f.id !== foodId);
        }
    }

    // Chỉ Staff mới có thể dùng các method này
    addCombo(combo) {
        if (this.isStaff()) {
            this.combos.push(combo);
        }
    }

    removeCombo(comboId) {
        if (this.isStaff()) {
            this.combos = this.combos.filter(c => c.id !== comboId);
        }
    }

    updateCombo(comboId, newItems) {
        if (this.isStaff()) {
            const combo = this.combos.find(c => c.id === comboId);
            if (combo) {
                combo.items = newItems;
            }
        }
    }


    // Kiểm tra quyền Staff
    isStaff() {
        return userRole === 'staff';
    }
}

// --- Khởi tạo global objects ---
const menuManager = new MenuManager();
const guestCart = new GuestCart();

// =============================================================================
// APPLICATION LOGIC - Main App
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Sakura animation for black/white theme
    const container = document.querySelector('.sakura-container');
    if (container) {
        const numPetals = 30;

        for (let i = 0; i < numPetals; i++) {
            const petal = document.createElement('div');
            petal.classList.add('sakura-petal');
            
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
    }

    let currentCategory = 'all';

    // DOM Elements
    const menuContainer = document.getElementById('menu-items');
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartEmpty = document.getElementById('cart-empty');
    const cartSummary = document.getElementById('cart-summary');
    const cartTotal = document.getElementById('cart-total');
    const cartBadge = document.getElementById('cart-badge');
    const categoryBtns = document.querySelectorAll('.category-btn');

    // --- Menu Rendering ---
    function renderMenu(category = 'all') {
        if (!menuContainer) return;
        
        const menuItems = menuManager.getItemsByCategory(category);
        
        if (menuItems.length === 0) {
            menuContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">🍜</div>
                    <p class="text-gray-300 text-lg">Không có món nào trong danh mục này</p>
                </div>
            `;
            return;
        }
        
        menuContainer.innerHTML = menuItems.map(item => {
            const isCombo = item.category === 'combo';
            const priceDisplay = isCombo ? 
                `<div class="absolute top-4 right-4">
                    <div class="bg-white text-black px-3 py-1 rounded-full text-sm font-semibold mb-1">
                        ${item.price.toLocaleString('vi-VN')}đ
                    </div>
                    <div class="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        Tiết kiệm ${(item.originalPrice - item.price).toLocaleString('vi-VN')}đ
                    </div>
                </div>` :
                `<div class="absolute top-4 right-4 bg-white text-black px-3 py-1 rounded-full text-sm font-semibold">
                    ${item.price.toLocaleString('vi-VN')}đ
                </div>`;

            return `
                <div class="bg-gray-dark rounded-2xl overflow-hidden shadow-lg border border-gray-medium hover:border-white transition-all duration-300 hover:transform hover:scale-105">
                    <div class="relative">
                        <img src="${item.image}" alt="${item.nameVi}" class="w-full h-48 object-cover">
                        ${priceDisplay}
                        ${isCombo ? '<div class="absolute top-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">COMBO</div>' : ''}
                    </div>
                    <div class="p-6">
                        <h3 class="font-display text-xl font-bold text-white mb-2">${item.name}</h3>
                        <h4 class="text-lg font-semibold text-gray-300 mb-2">${item.nameVi}</h4>
                        <p class="text-gray-400 mb-4">${item.description}</p>
                        ${isCombo ? `
                            <div class="text-sm text-gray-400 mb-3">
                                Gồm: ${item.items.map(i => i.nameVi).join(', ')}
                            </div>
                        ` : ''}
                        <button onclick="addToCart('${item.id}')" class="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors border-2 border-white">
                            カートに追加 (Thêm vào giỏ)
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Cart Logic ---
    function addToCart(itemId) {
        // Convert string ID back to number/string for comparison
        let searchId = itemId;
        if (!isNaN(itemId) && itemId !== '') {
            searchId = parseInt(itemId);
        }
        
        const item = menuManager.findItemById(searchId);
        if (!item) {
            console.error('Không tìm thấy món:', itemId, searchId);
            return;
        }
        
        guestCart.addItem(item);
        updateCartDisplay();
        
        // Add bounce animation to cart button
        if (cartBtn) {
            cartBtn.classList.add('animate-bounce');
            setTimeout(() => cartBtn.classList.remove('animate-bounce'), 600);
        }

        console.log('Đã thêm vào giỏ:', item.nameVi);
    }

    // --- Update Cart Display ---
    function updateCartDisplay() {
        const totalItems = guestCart.getTotalItems();
        const totalPrice = guestCart.getTotalPrice();
        
        // Update badge
        if (cartBadge) {
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.classList.remove('hidden');
            } else {
                cartBadge.classList.add('hidden');
            }
        }
        
        // Update cart content
        if (guestCart.items.length === 0) {
            if (cartEmpty) cartEmpty.classList.remove('hidden');
            if (cartSummary) cartSummary.classList.add('hidden');
            if (cartItemsContainer) cartItemsContainer.innerHTML = '';
        } else {
            if (cartEmpty) cartEmpty.classList.add('hidden');
            if (cartSummary) cartSummary.classList.remove('hidden');
            
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = guestCart.items.map(item => {
                    const isCombo = item.category === 'combo';
                    return `
                        <div class="flex items-center justify-between py-4 border-b border-gray-medium">
                            <div class="flex items-center space-x-4">
                                <img src="${item.image}" alt="${item.nameVi}" class="w-16 h-16 rounded-lg object-cover border border-gray-medium">
                                <div>
                                    <h4 class="font-semibold text-white">${item.nameVi}</h4>
                                    ${isCombo ? '<span class="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full">COMBO</span>' : ''}
                                    <p class="text-sm text-gray-400">${item.quantity} x ${item.price.toLocaleString('vi-VN')}đ</p>
                                    ${isCombo && item.items ? `<p class="text-xs text-gray-500">Gồm: ${item.items.map(i => i.nameVi).join(', ')}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="updateQuantity('${item.id}', -1)" class="w-8 h-8 bg-gray-medium border border-white rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">-</button>
                                <span class="font-semibold text-lg text-white">${item.quantity}</span>
                                <button onclick="updateQuantity('${item.id}', 1)" class="w-8 h-8 bg-gray-medium border border-white rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">+</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        if (cartTotal) {
            cartTotal.textContent = `${totalPrice.toLocaleString('vi-VN')}đ`;
        }
    }

    // --- Update Quantity ---
    function updateQuantity(itemId, change) {
        // Convert string ID back to proper type
        let searchId = itemId;
        if (!isNaN(itemId) && itemId !== '') {
            searchId = parseInt(itemId);
        }
        
        guestCart.updateQuantity(searchId, change);
        updateCartDisplay();
    }

    // --- Category Navigation ---
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active state from all buttons
            categoryBtns.forEach(b => {
                b.classList.remove('text-white', 'border-b-2', 'border-white');
                b.classList.add('text-gray-light');
            });
            
            // Add active state to clicked button
            btn.classList.remove('text-gray-light');
            btn.classList.add('text-white', 'border-b-2', 'border-white');
            
            const category = btn.dataset.category;
            currentCategory = category;
            renderMenu(category);
        });
    });

    // --- Cart Modal Handlers ---
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            if (cartModal) {
                cartModal.classList.remove('hidden');
                cartModal.classList.add('flex');
            }
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => {
            if (cartModal) {
                cartModal.classList.add('hidden');
                cartModal.classList.remove('flex');
            }
        });
    }

    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.classList.add('hidden');
                cartModal.classList.remove('flex');
            }
        });
    }

    // --- Booking Modal Handler ---
    const bookingBtn = document.getElementById('open-booking-modal');
    if (bookingBtn) {
        bookingBtn.addEventListener('click', () => {
            alert('Tính năng đặt bàn sẽ sớm ra mắt! / 予約機能は近日公開予定です！');
        });
    }

    // --- Notification Handler ---
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            alert('Không có thông báo mới / 新しい通知はありません');
        });
    }

    // --- Payment Handler ---
    const paymentBtn = document.getElementById('payment-btn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            if (guestCart.getTotalItems() === 0) {
                alert('Giỏ hàng trống! Vui lòng thêm món trước khi thanh toán.');
                return;
            }

            const totalPrice = guestCart.getTotalPrice();
            const totalItems = guestCart.getTotalItems();
            
            const confirmPayment = confirm(`
Xác nhận thanh toán:
- Số lượng món: ${totalItems}
- Tổng tiền: ${totalPrice.toLocaleString('vi-VN')}đ

Bạn có muốn tiếp tục thanh toán không?
            `.trim());

            if (confirmPayment) {
                alert('Cảm ơn bạn! Đơn hàng đã được ghi nhận. Nhân viên sẽ chuẩn bị món cho bạn.');
                guestCart.clear();
                updateCartDisplay();
                
                // Close cart modal
                if (cartModal) {
                    cartModal.classList.add('hidden');
                    cartModal.classList.remove('flex');
                }
            }
        });
    }

    // --- Staff Functions (chỉ hiển thị khi role=staff) ---
    if (userRole === 'staff') {
        console.log('Loading Staff functions...');

        // Tìm container chứa các nút bên phải và nút giỏ hàng
        const headerActions = document.getElementById('header-right-actions');
        const cartButton = document.getElementById('cart-btn');

        if (headerActions && cartButton) {
            // Tạo nút Staff Panel với icon và style mới ✨
            const staffBtn = document.createElement('button');
            
            // Thêm icon SVG và text vào nút
            staffBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>Staff</span>
            `;
            
            // Áp dụng Tailwind CSS để nút trông đẹp hơn
            staffBtn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 border-2 border-red-400';
            
            // Gán sự kiện click
            staffBtn.addEventListener('click', () => {
                showStaffPanel();
            });
            
            // Chèn nút Staff vào trước nút giỏ hàng để có thứ tự đẹp: Chuông -> Staff -> Giỏ hàng
            headerActions.insertBefore(staffBtn, cartButton);
        }
    }

    // --- Staff Panel Function ---
    function showStaffPanel() {
        const panel = `
            <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-black border-2 border-red-500 rounded-2xl p-8 max-w-2xl w-full mx-4">
                    <h3 class="text-2xl font-bold text-white mb-6">🔧 Staff Panel</h3>

                    <!-- Form thêm món -->
                    <div class="mb-6">
                        <h4 class="text-xl font-semibold text-white mb-2">➕ Thêm Món Mới</h4>
                        <input id="food-nameVi" class="w-full mb-2 p-2 rounded text-black" placeholder="Tên món (tiếng Việt)">
                        <input id="food-price" type="number" class="w-full mb-2 p-2 rounded text-black" placeholder="Giá">
                        <input id="food-img" class="w-full mb-2 p-2 rounded text-black" placeholder="URL hình ảnh">
                        <select id="food-category" class="w-full mb-2 p-2 rounded text-black">
                            <option value="ramen">Ramen</option>
                            <option value="ricedon">Rice Don</option>
                            <option value="drink">Drink</option>
                            <option value="sidedish">Side Dish</option>
                            <option value="topping">Topping</option>
                        </select>
                        <button onclick="handleAddFood()" class="w-full bg-green-500 text-white py-2 rounded">Thêm vào Menu</button>
                    </div>

                    <!-- Quản lý combo -->
                    <div class="mb-6">
                        <h4 class="text-xl font-semibold text-white mb-2">🍱 Quản Lý Combo</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onclick="openAddComboModal()" 
                                class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors">
                                Thêm Combo Mới
                            </button>
                            <button onclick="openComboEditor()" 
                                class="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-600 transition-colors">
                                Chỉnh Sửa Combo
                            </button>
                        </div>
                        <button onclick="openRemoveComboModal()" 
                            class="w-full bg-red-700 text-white py-2 rounded hover:bg-red-800 transition-colors mt-4">
                            Xóa Combo
                        </button>
                    </div>

                    <button onclick="closeStaffPanel()" class="w-full bg-gray-500 text-white py-2 rounded">Đóng</button>
                </div>
            </div>
        `;
        
        const panelDiv = document.createElement('div');
        panelDiv.innerHTML = panel;
        panelDiv.id = 'staff-panel';
        document.body.appendChild(panelDiv);
    }

    // --- Close Staff Panel ---
    function closeStaffPanel() {
        const panel = document.getElementById('staff-panel');
        if (panel) {
            panel.remove();
        }
    }

    // ======================================================
    // == FUNCTIONS FOR COMBO EDITOR MODAL
    // ======================================================

    function openComboEditor() {
        // Ngăn việc mở nhiều modal cùng lúc
        if (document.getElementById('combo-editor-modal')) return;

        const allItems = menuManager.allItems;
        const allCombos = menuManager.combos;

        // Tạo HTML cho phần chọn combo
        const comboOptionsHtml = allCombos.map(combo => 
            `<option value="${combo.id}">${combo.comboNameVi}</option>`
        ).join('');

        // Tạo HTML cho phần chọn món ăn
        const itemsChecklistHtml = allItems.map(item => `
            <div class="p-2 hover:bg-gray-medium rounded">
                <label class="flex items-center space-x-3 text-white cursor-pointer">
                    <input type="checkbox" id="item-check-${item.id}" value="${item.id}" 
                        class="form-checkbox h-5 w-5 bg-gray-dark border-gray-light rounded text-yellow-500 focus:ring-yellow-600">
                    <span>${item.nameVi} - ${item.price.toLocaleString('vi-VN')}đ</span>
                </label>
            </div>
        `).join('');

        // Tạo cấu trúc HTML hoàn chỉnh cho Modal
        const modalHtml = `
            <div id="combo-editor-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-yellow-500 rounded-2xl p-6 md:p-8 max-w-3xl w-full mx-4 flex flex-col max-h-[90vh]">
                    <h3 class="text-2xl font-bold text-white mb-4 flex-shrink-0">🍱 Chỉnh sửa Combo</h3>
                    
                    <div class="mb-4 flex-shrink-0">
                        <label for="combo-select" class="block text-sm font-medium text-gray-300 mb-2">Chọn Combo để chỉnh sửa:</label>
                        <select id="combo-select" onchange="populateItemsForCombo(this.value)" class="w-full p-2 rounded text-black bg-white">
                            <option value="">-- Vui lòng chọn --</option>
                            ${comboOptionsHtml}
                        </select>
                    </div>

                    <div class="my-4">
                        <label for="edit-combo-image" class="block text-sm font-medium text-gray-300 mb-2">URL Ảnh đại diện (để trống nếu muốn dùng ảnh mặc định):</label>
                        <input type="text" id="edit-combo-image" class="w-full p-2 rounded text-black bg-white" placeholder="https://...">
                    </div>

                    <p class="text-sm text-gray-300 mb-2 flex-shrink-0">Chọn các món trong combo:</p>
                    <div id="items-checklist" class="flex-grow bg-black p-4 border border-gray-medium rounded-lg overflow-y-auto">
                        ${itemsChecklistHtml}
                    </div>

                    <div class="mt-6 flex justify-end space-x-4 flex-shrink-0">
                        <button onclick="closeComboEditor()" class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors">Đóng</button>
                        <button onclick="handleUpdateCombo()" class="bg-yellow-500 text-black px-6 py-2 rounded font-semibold hover:bg-yellow-600 transition-colors">Lưu thay đổi</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function populateItemsForCombo(comboId) {
        const allCheckboxes = document.querySelectorAll('#items-checklist input[type="checkbox"]');
        const imageInput = document.getElementById('edit-combo-image');
        
        // Bỏ check tất cả các ô trước
        allCheckboxes.forEach(checkbox => checkbox.checked = false);
        imageInput.value = '';

        if (!comboId) return;

        const combo = menuManager.combos.find(c => c.id === comboId);
        if (combo) {
            //Hiển thị ảnh hiện tại của combo
            if(combo.image) {
                imageInput.value = combo.image;
            }
            // Check các món đã có trong combo
            combo.items.forEach(itemInCombo => {
                const checkbox = document.getElementById(`item-check-${itemInCombo.id}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    }

    function closeComboEditor() {
        const modal = document.getElementById('combo-editor-modal');
        if (modal) {
            modal.remove();
        }
    }

    function handleUpdateCombo() {
        const comboSelect = document.getElementById('combo-select');
        const selectedComboId = comboSelect.value;
        const imageUrl = document.getElementById('edit-combo-image').value.trim();

        if (!selectedComboId) {
            alert("Vui lòng chọn một combo để cập nhật!");
            return;
        }

        // Tìm combo trong menuManager
        const comboToUpdate = menuManager.combos.find(c => c.id === selectedComboId);
        if (!comboToUpdate) {
            alert("Lỗi: Không tìm thấy combo!");
            return;
        }

        // Lấy ID của tất cả các món được chọn
        const selectedItemsCheckboxes = document.querySelectorAll('#items-checklist input[type="checkbox"]:checked');
        const selectedItemIds = Array.from(selectedItemsCheckboxes).map(cb => parseInt(cb.value));

        // Lấy đối tượng Food đầy đủ từ các ID đã chọn
        const newItemsForCombo = menuManager.allItems.filter(item => selectedItemIds.includes(item.id));
        
        if (newItemsForCombo.length === 0) {
            alert("Một combo cần có ít nhất một món ăn!");
            return;
        }

        // Cập nhật lại danh sách món ăn của combo
        comboToUpdate.items = newItemsForCombo;
        comboToUpdate.image = imageUrl || null;

        alert(`Combo "${comboToUpdate.comboNameVi}" đã được cập nhật thành công!`);
        
        closeComboEditor(); // Đóng modal
        closeStaffPanel(); // Đóng luôn cả Staff Panel
        renderMenu('combo'); // Tải lại giao diện menu, hiển thị tab combo để thấy thay đổi
        
        // Chuyển active state cho nút combo trên thanh nav
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('text-white', 'border-b-2', 'border-white');
            btn.classList.add('text-gray-light');
            if (btn.dataset.category === 'combo') {
                btn.classList.remove('text-gray-light');
                btn.classList.add('text-white', 'border-b-2', 'border-white');
            }
        });
    }

    // ======================================================
    // == FUNCTIONS FOR ADDING A NEW COMBO
    // ======================================================

    function openAddComboModal() {
        if (document.getElementById('add-combo-modal')) return;

        const allItems = menuManager.allItems;
        const itemsChecklistHtml = allItems.map(item => `
            <div class="p-2 hover:bg-gray-medium rounded">
                <label class="flex items-center space-x-3 text-white cursor-pointer">
                    <input type="checkbox" name="new-combo-item" value="${item.id}" 
                        class="form-checkbox h-5 w-5 bg-gray-dark border-gray-light rounded text-green-500 focus:ring-green-600">
                    <span>${item.nameVi}</span>
                </label>
            </div>
        `).join('');

        const modalHtml = `
            <div id="add-combo-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-green-500 rounded-2xl p-6 md:p-8 max-w-3xl w-full mx-4 flex flex-col max-h-[90vh]">
                    <h3 class="text-2xl font-bold text-white mb-4 flex-shrink-0">✨ Tạo Combo Mới</h3>
                    
                    <div class="mb-4">
                        <label for="new-combo-name" class="block text-sm font-medium text-gray-300 mb-2">Tên Combo (tiếng Việt):</label>
                        <input type="text" id="new-combo-name" class="w-full p-2 rounded text-black bg-white" placeholder="VD: Combo Trưa Vui Vẻ">
                    </div>

                    <div class="mb-4">
                        <label for="new-combo-image" class="block text-sm font-medium text-gray-300 mb-2">URL Hình Ảnh Combo (tùy chọn):</label>
                        <input type="text" id="new-combo-image" class="w-full p-2 rounded text-black bg-white" placeholder="VD: https://example.com/combo-image.jpg">
                    </div>
                    
                    <div class="mb-4">
                        <label for="new-combo-discount" class="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ giảm giá (ví dụ: 0.15 cho 15%):</label>
                        <input type="number" id="new-combo-discount" step="0.01" min="0.01" max="0.99" class="w-full p-2 rounded text-black bg-white" placeholder="0.15">
                    </div>

                    <p class="text-sm text-gray-300 mb-2 flex-shrink-0">Chọn các món trong combo:</p>
                    <div class="flex-grow bg-black p-4 border border-gray-medium rounded-lg overflow-y-auto">
                        ${itemsChecklistHtml}
                    </div>

                    <div class="mt-6 flex justify-end space-x-4 flex-shrink-0">
                        <button onclick="document.getElementById('add-combo-modal').remove()" class="bg-gray-500 text-white px-6 py-2 rounded">Hủy</button>
                        <button onclick="handleAddNewCombo()" class="bg-green-600 text-white px-6 py-2 rounded font-semibold">Tạo Combo</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function handleAddNewCombo() {
        const name = document.getElementById('new-combo-name').value.trim();
        const imageUrl = document.getElementById('new-combo-image').value.trim();
        const discountInput = document.getElementById('new-combo-discount').value;
        
        // --- Validation ---
        if (!name) {
            alert("Vui lòng nhập tên cho combo!");
            return;
        }
        const discount = parseFloat(discountInput);
        if (isNaN(discount) || discount <= 0 || discount >= 1) {
            alert("Tỷ lệ giảm giá không hợp lệ! Phải là một số từ 0.01 đến 0.99.");
            return;
        }
        const selectedItemsCheckboxes = document.querySelectorAll('input[name="new-combo-item"]:checked');
        if (selectedItemsCheckboxes.length === 0) {
            alert("Vui lòng chọn ít nhất một món ăn cho combo!");
            return;
        }

        // --- Process Data ---
        const selectedItemIds = Array.from(selectedItemsCheckboxes).map(cb => parseInt(cb.value));
        const newItemsForCombo = menuManager.allItems.filter(item => selectedItemIds.includes(item.id));

        // Tạo Combo mới (tên tiếng Nhật tạm để giống tên tiếng Việt)
        const newCombo = new Combo(name, name, discount, imageUrl || null);
        newItemsForCombo.forEach(item => newCombo.addFood(item));
        
        // Thêm vào trình quản lý
        menuManager.addCombo(newCombo);
        
        alert(`Đã thêm thành công combo: "${name}"`);
        document.getElementById('add-combo-modal').remove();
        renderMenu('combo'); // Cập nhật lại menu
    }

    // ======================================================
    // == FUNCTIONS FOR REMOVING A COMBO
    // ======================================================

    function openRemoveComboModal() {
        if (document.getElementById('remove-combo-modal')) return;

        const allCombos = menuManager.combos;
        const combosListHtml = allCombos.map(combo => `
            <div id="combo-row-${combo.id}" class="flex items-center justify-between p-3 bg-gray-dark rounded-lg hover:bg-gray-medium">
                <span class="text-white">${combo.comboNameVi}</span>
                <button onclick="handleRemoveCombo('${combo.id}')" class="bg-red-600 text-white px-4 py-1 text-sm rounded hover:bg-red-700">Xóa</button>
            </div>
        `).join('');

        const modalHtml = `
            <div id="remove-combo-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-red-500 rounded-2xl p-6 md:p-8 max-w-xl w-full mx-4 flex flex-col max-h-[90vh]">
                    <h3 class="text-2xl font-bold text-white mb-4">🗑️ Xóa Combo</h3>
                    <div id="remove-combo-list" class="flex-grow space-y-2 overflow-y-auto p-2 border border-gray-medium rounded-lg">
                        ${allCombos.length > 0 ? combosListHtml : '<p class="text-gray-400 text-center p-4">Không có combo nào để xóa.</p>'}
                    </div>
                    <div class="mt-6 flex justify-end">
                        <button onclick="document.getElementById('remove-combo-modal').remove()" class="bg-gray-500 text-white px-6 py-2 rounded">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function handleRemoveCombo(comboId) {
        const comboToRemove = menuManager.combos.find(c => c.id === comboId);
        if (!comboToRemove) return;

        const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa combo "${comboToRemove.comboNameVi}" không? Hành động này không thể hoàn tác.`);

        if (isConfirmed) {
            menuManager.removeCombo(comboId);
            
            // Xóa combo khỏi danh sách trong modal mà không cần tải lại
            const comboRow = document.getElementById(`combo-row-${comboId}`);
            if(comboRow) comboRow.remove();
            
            // Kiểm tra nếu danh sách rỗng
            const comboListContainer = document.getElementById('remove-combo-list');
            if(comboListContainer && comboListContainer.children.length === 0) {
                comboListContainer.innerHTML = '<p class="text-gray-400 text-center p-4">Không có combo nào để xóa.</p>';
            }

            renderMenu('combo'); // Cập nhật lại menu chính
            alert("Đã xóa combo thành công!");
        }
    }

    // --- Make functions global for onclick handlers ---
    window.addToCart = addToCart;
    window.updateQuantity = updateQuantity;
    window.closeStaffPanel = closeStaffPanel;
    window.openComboEditor = openComboEditor;
    window.closeComboEditor = closeComboEditor;
    window.populateItemsForCombo = populateItemsForCombo;
    window.handleUpdateCombo = handleUpdateCombo;
    window.openAddComboModal = openAddComboModal;
    window.handleAddNewCombo = handleAddNewCombo;
    window.openRemoveComboModal = openRemoveComboModal;
    window.handleRemoveCombo = handleRemoveCombo;

    function handleAddFood() {
        const nameVi = document.getElementById('food-nameVi').value;
        const price = parseInt(document.getElementById('food-price').value);
        const image = document.getElementById('food-img').value;
        const category = document.getElementById('food-category').value;

        if (!nameVi || !price || !image) {
            alert("Vui lòng nhập đầy đủ thông tin món!");
            return;
        }

        // Tạo Food mới (ở đây mình dùng class Food cho nhanh)
        const newFood = new Food(nameVi, nameVi, price, image, category, "Món staff thêm");
        menuManager.addFood(newFood);
        
        alert(`Đã thêm món: ${nameVi}`);
        closeStaffPanel();
        renderMenu(); // reload lại menu
    }
    window.handleAddFood = handleAddFood;

    // --- Initial Load ---
    renderMenu();
    updateCartDisplay();
    
    console.log('Fuji Kitchen app loaded successfully with integrated food system');
    console.log('Available categories:', ['all', 'ramen', 'ricedon', 'drink', 'sidedish', 'topping', 'combo']);
    console.log('Total menu items:', menuList.length);
    console.log('Total combos available:', staffCombos.length);
});
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
// NOTIFICATION MANAGEMENT SYSTEM
// =============================================================================
// --- Notification Manager Class ---
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.isSupported = 'Notification' in window;
        this.registrationReady = false;
        this.subscription = null;
    }

    // Kiểm tra hỗ trợ và yêu cầu quyền
    async initialize() {
        if (!this.isSupported) {
            console.log('Push notifications không được hỗ trợ trên trình duyệt này');
            return false;
        }

        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }

        if (this.permission !== 'granted') {
            console.log('Người dùng từ chối quyền thông báo');
            return false;
        }

        // Đợi service worker sẵn sàng
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            this.registrationReady = true;
            
            // Kiểm tra subscription hiện tại
            this.subscription = await registration.pushManager.getSubscription();
            console.log('Push notification đã sẵn sàng');
        }

        return true;
    }

    // Hiển thị thông báo local
    showNotification(title, options = {}) {
        if (this.permission !== 'granted') return;

        const defaultOptions = {
            icon: '/icon-192x192.png', // Icon của PWA
            badge: '/icon-72x72.png',
            tag: 'fuji-kitchen',
            renotify: false,
            requireInteraction: false,
            ...options
        };

        if (this.registrationReady && 'serviceWorker' in navigator) {
            // Sử dụng service worker để hiển thị
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, defaultOptions);
            });
        } else {
            // Fallback cho trình duyệt cũ
            new Notification(title, defaultOptions);
        }
    }

    // Thông báo cho đơn hàng
    notifyOrderUpdate(orderStatus, orderDetails = {}) {
        const notifications = {
            'pending': {
                title: '🍜 Đơn hàng đã xác nhận!',
                body: `Cảm ơn bạn! Chúng tôi đang chuẩn bị ${orderDetails.totalItems || ''} món cho bạn.`,
                icon: '/icon-192x192.png'
            },
            'preparing': {
                title: '👨‍🍳 Đang nấu nướng...',
                body: 'Bếp đang chuẩn bị món ăn của bạn.',
                icon: '/icon-192x192.png'
            },
            'completed': {
                title: '🔔 Đơn hàng đã sẵn sàng!',
                body: 'Món ăn của bạn đã hoàn thành.',
                icon: '/icon-192x192.png',
                requireInteraction: true,
                vibrate: [200, 100, 200]
            },
            'cancelled': {
                title: '✨ Đơn hàng đã hủy',
                body: ' Xin lỗi quý khách vì đã không làm hài lòng quý khách - Fuji Kitchen.',
                icon: '/icon-192x192.png'
            }
        };

        const notification = notifications[orderStatus];
        if (notification) {
            this.showNotification(notification.title, {
                body: notification.body,
                icon: notification.icon,
                requireInteraction: notification.requireInteraction,
                vibrate: notification.vibrate,
                data: { orderStatus, ...orderDetails }
            });
        }
    }

    // Thông báo khuyến mãi (chỉ Staff mới có thể gửi)
    notifyPromotion(title, message, imageUrl = null) {
        if (userRole !== 'staff') return;

        this.showNotification(`🎉 ${title}`, {
            body: message,
            icon: imageUrl || '/icon-192x192.png',
            image: imageUrl,
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: 'Xem menu',
                    icon: '/icon-72x72.png'
                }
            ]
        });
    }

    // Thông báo combo mới
    notifyNewCombo(comboName, discount) {
        this.showNotification('🍱 Combo mới ra mắt!', {
            body: `${comboName} - Tiết kiệm ${Math.round(discount * 100)}%`,
            icon: '/icon-192x192.png',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-combo',
                    title: 'Xem combo',
                    icon: '/icon-72x72.png'
                }
            ]
        });
    }
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

class Order {
    static count = 0;
    
    constructor(customer) {
        this.customer = customer; // User object
        this.foodItems = [];
        this.combos = [];
        this.totalPrice = 0;
        this.status = "Pending"; // Pending, Preparing, Completed, Cancelled
        this.createdAt = new Date();
        
        Order.count++;
        this.orderId = `O${String(Order.count).padStart(3, '0')}`;
    }

    addFood(food, quantity = 1) {
        const existingItem = this.foodItems.find(item => item.id === food.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.foodItems.push({ 
                ...food, 
                quantity: quantity,
                addedAt: new Date()
            });
        }
        this.calculateTotal();
    }

    addCombo(combo, quantity = 1) {
        const existingCombo = this.combos.find(c => c.id === combo.id);
        
        if (existingCombo) {
            existingCombo.quantity += quantity;
        } else {
            this.combos.push({
                ...combo,
                quantity: quantity,
                addedAt: new Date()
            });
        }
        this.calculateTotal();
    }

    removeFood(foodId) {
        this.foodItems = this.foodItems.filter(item => item.id !== foodId);
        this.calculateTotal();
    }

    removeCombo(comboId) {
        this.combos = this.combos.filter(combo => combo.id !== comboId);
        this.calculateTotal();
    }

    updateFoodQuantity(foodId, change) {
        const item = this.foodItems.find(item => item.id === foodId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFood(foodId);
            } else {
                this.calculateTotal();
            }
        }
    }

    updateComboQuantity(comboId, change) {
        const combo = this.combos.find(combo => combo.id === comboId);
        if (combo) {
            combo.quantity += change;
            if (combo.quantity <= 0) {
                this.removeCombo(comboId);
            } else {
                this.calculateTotal();
            }
        }
    }

    calculateTotal() {
        const foodTotal = this.foodItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const comboTotal = this.combos.reduce((sum, combo) => sum + (combo.price * combo.quantity), 0);
        this.totalPrice = foodTotal + comboTotal;
    }

    getTotalItems() {
        const foodCount = this.foodItems.reduce((sum, item) => sum + item.quantity, 0);
        const comboCount = this.combos.reduce((sum, combo) => sum + combo.quantity, 0);
        return foodCount + comboCount;
    }

    getTotalPrice() {
        return this.totalPrice;
    }

    setStatus(newStatus) {
        const validStatuses = ["Pending", "Preparing", "Completed", "Cancelled"];
        if (validStatuses.includes(newStatus)) {
            this.status = newStatus;
        }
    }

    /**
     * Chuyển đổi đối tượng Order thành một object thuần túy để lưu trữ.
     * @returns {object}
     */
    toJSON() {
        return {
            orderId: this.orderId,
            customer: this.customer,
            foodItems: this.foodItems,
            combos: this.combos,
            totalPrice: this.totalPrice,
            status: this.status,
            createdAt: this.createdAt.toISOString() // Chuyển Date thành chuỗi ISO
        };
    }

    /**
     * Tạo lại một đối tượng Order từ dữ liệu thuần túy.
     * @param {object} data - Dữ liệu đọc từ localStorage.
     * @returns {Order}
     */
    static fromJSON(data) {
        // Tạo một Order trống với customer
        const order = new Order(data.customer);
        
        // Gán lại các thuộc tính
        order.orderId = data.orderId;
        order.foodItems = data.foodItems;
        order.combos = data.combos;
        order.totalPrice = data.totalPrice;
        order.status = data.status;
        order.createdAt = new Date(data.createdAt); // Chuyển chuỗi ISO về lại Date
        
        // Cập nhật biến đếm static để tránh trùng ID khi tải lại trang
        const idNumber = parseInt(data.orderId.replace('O', ''));
        Order.count = Math.max(Order.count, idNumber);

        return order;
    }
}

// --- Order Manager (cho Staff quản lý đơn hàng) ---
class OrderManager {
    constructor() {
        this.orders = [];
        this._loadOrdersFromStorage();
    }

    _loadOrdersFromStorage() {
        const ordersJSON = localStorage.getItem('fujiKitchenOrders');
        if (ordersJSON) {
            const ordersData = JSON.parse(ordersJSON);
            // Dùng Order.fromJSON để tạo lại các đối tượng Order đầy đủ phương thức
            this.orders = ordersData.map(data => Order.fromJSON(data));
        }
    }

    _saveOrdersToStorage() {
        // Dùng order.toJSON() để chuyển đổi đối tượng trước khi lưu
        const ordersData = this.orders.map(order => order.toJSON());
        localStorage.setItem('fujiKitchenOrders', JSON.stringify(ordersData));
    }

    createOrder(customer) {
        const order = new Order(customer);
        this.orders.push(order);
        return order;
    }

    findOrderById(orderId) {
        return this.orders.find(order => order.orderId === orderId);
    }

    getOrdersByCustomer(username) {
        return this.orders.filter(order => order.customer && order.customer.username === username);
    }
    
    getOrdersByStatus(status) {
        return this.orders.filter(order => order.status === status);
    }

    updateOrderStatus(orderId, newStatus) {
        // if (userRole !== 'staff') return false;
        
        const order = this.findOrderById(orderId);
        if (order) {
            order.setStatus(newStatus);
            this._saveOrdersToStorage();
            return true;
        }
        return false;
    }

    getTotalRevenue() {
        return this.orders
            .filter(order => order.status === "Completed")
            .reduce((sum, order) => sum + order.totalPrice, 0);
    }

    getOrderCountByStatus() {
        const statusCount = {};
        this.orders.forEach(order => {
            statusCount[order.status] = (statusCount[order.status] || 0) + 1;
        });
        return statusCount;
    }
}

// --- Cart Management ---
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

    // Chuyển giỏ hàng thành đơn hàng (khi khách thanh toán)
    createOrder(customer) {
        if (this.items.length === 0) return null;
        
        const order = orderManager.createOrder(customer);
        
        this.items.forEach(item => {
            if (item.category === 'combo') {
                order.addCombo(item, item.quantity);
            } else {
                order.addFood(item, item.quantity);
            }
        });

        orderManager._saveOrdersToStorage();
        
        return order;
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
const orderManager = new OrderManager();
const notificationManager = new NotificationManager();

// =============================================================================
// APPLICATION LOGIC - Main App
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // --- Animation cho Nav Bar ---
    const navButtons = document.querySelectorAll('#category-nav .category-btn');
    navButtons.forEach((button, index) => {
        // Thêm class để kích hoạt animation
        button.classList.add('nav-item-animate');
        button.style.animationDelay = `${index * 100}ms`;
    });

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

    // // --- Booking Modal Handler ---
    // const bookingBtn = document.getElementById('open-booking-modal');
    // if (bookingBtn) {
    //     bookingBtn.addEventListener('click', () => {
    //         alert('Tính năng đặt bàn sẽ sớm ra mắt! / 予約機能は近日公開予定です！');
    //     });
    // }

    // --- Notification Handler ---
    const notificationInitialized = await notificationManager.initialize();
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            if (notificationInitialized) {
                showNotificationCenter();
            } else {
                alert('Push notification chưa được kích hoạt hoặc không được hỗ trợ.');
            }
        });
    }

    // --- Payment Handler ---
    const paymentBtn = document.getElementById('payment-btn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', async () => {
            if (guestCart.getTotalItems() === 0) {
                alert('Giỏ hàng trống! Vui lòng thêm món trước khi thanh toán.');
                return;
            }

            if (!currentUser) {
                alert('Vui lòng đăng nhập để đặt hàng!');
                return;
            }

            const confirmPayment = confirm(`Xác nhận đặt hàng với tổng số tiền ${guestCart.getTotalPrice().toLocaleString('vi-VN')}đ?`);

            if (confirmPayment) {
                // BƯỚC 1: TẠO ĐƠN HÀNG THỰC SỰ
                const newOrder = guestCart.createOrder(currentUser);
                if (newOrder) {
                    // BƯỚC 2: GỬI CÁC THÔNG BÁO TƯƠNG ỨNG
                    // Gửi thông báo "Đã xác nhận" ngay lập tức
                    notificationManager.notifyOrderUpdate('pending', {
                        totalItems: newOrder.getTotalItems(),
                        totalPrice: newOrder.getTotalPrice()
                    });

                    // BƯỚC 3: HOÀN TẤT VÀ DỌN DẸP
                    alert(`Đặt hàng thành công! Mã đơn hàng của bạn là: ${newOrder.orderId}. Bạn sẽ nhận được thông báo về tiến trình đơn hàng.`);
                    guestCart.clear();
                    updateCartDisplay();
                    
                    if (cartModal) {
                        cartModal.classList.add('hidden');
                        cartModal.classList.remove('flex');
                    }
                } else {
                    alert('Đã có lỗi xảy ra khi tạo đơn hàng, vui lòng thử lại.');
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
            // TẠO NÚT QUẢN LÝ ĐƠN HÀNG MỚI
            const orderBtn = document.createElement('button');
            orderBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                <span>Order</span>
            `;
            orderBtn.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 breathing-effect';
            orderBtn.addEventListener('click', () => {
                showStaffOrderHistory();
            });
            
            // Tạo nút Staff Panel
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
            staffBtn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 border-2 border-red-400 breathing-effect';
            // Gán sự kiện click
            staffBtn.addEventListener('click', () => {
                showStaffPanel();
            });
            // Chèn các nút vào header, trước nút giỏ hàng
            headerActions.insertBefore(orderBtn, cartButton);
            headerActions.insertBefore(staffBtn, cartButton);
        }
    }

    // --- Staff Panel Function ---
    function showStaffPanel() {
        if (document.getElementById('staff-panel')) return;

        const panel = `
            <div id="staff-panel" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-black border-2 border-red-500 rounded-2xl p-6 md:p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content-slide-in">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-white">🔧 Quản Lý Thực Đơn</h3>
                        <button onclick="closeStaffPanel()" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="p-4 bg-gray-900 rounded-lg border border-gray-600 flex flex-col">
                            <h4 class="text-xl font-semibold text-white mb-4">🍽️ Món Ăn</h4>
                            <div class="space-y-2 mb-4">
                                <input id="food-name" class="w-full p-2 rounded text-black" placeholder="Tên món (tiếng Nhật)">
                                <input id="food-nameVi" class="w-full p-2 rounded text-black" placeholder="Tên món (tiếng Việt)">
                                <input id="food-price" type="number" class="w-full p-2 rounded text-black" placeholder="Giá">
                                <input id="food-img" class="w-full p-2 rounded text-black" placeholder="URL hình ảnh">
                                <select id="food-category" class="w-full p-2 rounded text-black">
                                    <option value="ramen">Ramen</option>
                                    <option value="ricedon">Rice Don</option>
                                    <option value="drink">Drink</option>
                                    <option value="sidedish">Side Dish</option>
                                    <option value="topping">Topping</option>
                                </select>
                            </div>
                            <div class="mt-auto grid grid-cols-2 gap-4">
                                <button onclick="handleAddFood()" class="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition-colors">Thêm Món</button>
                                <button onclick="openRemoveFoodModal()" class="w-full bg-red-700 text-white py-3 rounded hover:bg-red-800 transition-colors">Xóa Món</button>
                            </div>
                        </div>

                        <div class="p-4 bg-gray-900 rounded-lg border border-gray-600 flex flex-col">
                            <h4 class="text-xl font-semibold text-white mb-4">🍱 Combo</h4>
                            <div class="space-y-4 mt-auto">
                                <button onclick="openAddComboModal()" class="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition-colors text-lg">Thêm Combo Mới</button>
                                <button onclick="openComboEditor()" class="w-full bg-yellow-500 text-black py-3 rounded hover:bg-yellow-600 transition-colors text-lg">Chỉnh Sửa Combo</button>
                                <button onclick="openRemoveComboModal()" class="w-full bg-red-700 text-white py-3 rounded hover:bg-red-800 transition-colors text-lg">Xóa Combo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', panel);
    }

    // --- Close Staff Panel ---
    function closeStaffPanel() {
        const panel = document.getElementById('staff-panel');
        if (panel) {
            panel.remove();
        }
    }

    function showStaffOrderHistory() {
        // Ngăn mở nhiều panel
        if (document.getElementById('staff-order-history-panel')) return;

        const totalOrders = orderManager.orders.length;
        const revenue = orderManager.getTotalRevenue();
        const statusCount = orderManager.getOrderCountByStatus();
        
        const panel = `
            <div id="staff-order-history-panel" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-black border-2 border-blue-500 rounded-2xl p-6 md:p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content-slide-in">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-white">📋 Quản Lý Đơn Hàng</h3>
                        <button onclick="closeStaffOrderHistory()" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>

                    <div class="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-600">
                        <h4 class="text-xl font-semibold text-white mb-3">📊 Thống Kê</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div><div class="text-lg font-bold">${totalOrders}</div><div class="text-sm text-gray-400">Tổng Đơn</div></div>
                            <div><div class="text-lg font-bold">${revenue.toLocaleString('vi-VN')}đ</div><div class="text-sm text-gray-400">Doanh Thu</div></div>
                            <div><div class="text-lg font-bold">${statusCount['Pending'] || 0}</div><div class="text-sm text-gray-400">Chờ Xử Lý</div></div>
                            <div><div class="text-lg font-bold">${statusCount['Completed'] || 0}</div><div class="text-sm text-gray-400">Đã Hoàn Thành</div></div>
                        </div>
                    </div>

                    <div class="p-4 bg-gray-900 rounded-lg border border-gray-600">
                        <h4 class="text-xl font-semibold text-white mb-3">Danh Sách Đơn Hàng</h4>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <button onclick="showOrdersByStatus('all')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Tất cả</button>
                            <button onclick="showOrdersByStatus('Pending')" class="bg-yellow-600 text-white px-3 py-1 rounded text-sm">Chờ xử lý</button>
                            <button onclick="showOrdersByStatus('Preparing')" class="bg-orange-600 text-white px-3 py-1 rounded text-sm">Đang chuẩn bị</button>
                            <button onclick="showOrdersByStatus('Completed')" class="bg-green-600 text-white px-3 py-1 rounded text-sm">Đã hoàn thành</button>
                            <button onclick="showOrdersByStatus('Cancelled')" class="bg-red-600 text-white px-3 py-1 rounded text-sm">Đã hủy</button>
                        </div>
                        <div id="orders-display" class="max-h-72 overflow-y-auto p-2 bg-black rounded">
                            <p class="text-gray-500 text-center">Chọn một tùy chọn để xem đơn hàng</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', panel);
    }

    // Close Order History Panel
    function closeStaffOrderHistory() {
        const panel = document.getElementById('staff-order-history-panel');
        if (panel) {
            panel.remove();
        }
    }

    // ======================================================
    // == FUNCTIONS FOR REMOVING A FOOD ITEM
    // ======================================================

    function openRemoveFoodModal() {
        if (document.getElementById('remove-food-modal')) return;

        const allFoodItems = menuManager.allItems;
        // Tạo danh sách món ăn với checkbox
        const foodListHtml = allFoodItems.map(item => `
            <div class="p-2 hover:bg-gray-medium rounded">
                <label class="flex items-center space-x-3 text-white cursor-pointer">
                    <input type="checkbox" name="food-to-delete" value="${item.id}"
                        class="form-checkbox h-5 w-5 bg-gray-dark border-gray-light rounded text-red-500 focus:ring-red-600">
                    <span>${item.nameVi} (${item.category})</span>
                </label>
            </div>
        `).join('');

        const modalHtml = `
            <div id="remove-food-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-red-500 rounded-2xl p-6 md:p-8 max-w-xl w-full mx-4 flex flex-col max-h-[90vh]">
                    <h3 class="text-2xl font-bold text-white mb-4">🗑️ Xóa Món Ăn</h3>
                    <div class="flex-grow space-y-1 overflow-y-auto p-2 border border-gray-medium rounded-lg">
                        ${allFoodItems.length > 0 ? foodListHtml : '<p class="text-gray-400 text-center p-4">Không có món nào để xóa.</p>'}
                    </div>
                    <div class="mt-6 flex justify-between items-center">
                        <button onclick="document.getElementById('remove-food-modal').remove()" class="bg-gray-500 text-white px-6 py-2 rounded">Đóng</button>
                        <button onclick="handleRemoveSelectedFoods()" class="bg-red-700 text-white px-6 py-2 rounded font-semibold hover:bg-red-800">Xóa các món đã chọn</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function handleRemoveSelectedFoods() {
        // 1. Lấy tất cả các checkbox đã được chọn
        const selectedCheckboxes = document.querySelectorAll('#remove-food-modal input[name="food-to-delete"]:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert("Vui lòng chọn ít nhất một món ăn để xóa.");
            return;
        }

        // 2. Lấy danh sách ID từ các checkbox
        const foodIdsToDelete = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        
        // 3. Hỏi xác nhận
        const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa ${foodIdsToDelete.length} món ăn đã chọn không?`);

        if (isConfirmed) {
            // 4. Thực hiện xóa
            foodIdsToDelete.forEach(id => {
                menuManager.removeFood(id);
            });
            
            alert("Đã xóa các món ăn đã chọn thành công!");
            
            // 5. Đóng modal và cập nhật lại giao diện
            document.getElementById('remove-food-modal').remove();
            renderMenu();
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

        if (newCombo) {
        // Thông báo combo mới cho tất cả khách hàng
        notificationManager.notifyNewCombo(newCombo.comboNameVi, newCombo.discount);
        }
        
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

    function handleAddFood() {
        const name = document.getElementById('food-name').value;
        const nameVi = document.getElementById('food-nameVi').value;
        const price = parseInt(document.getElementById('food-price').value);
        const image = document.getElementById('food-img').value;
        const category = document.getElementById('food-category').value;

        if (!name || !nameVi || !price || !image) {
            alert("Vui lòng nhập đầy đủ thông tin món!");
            return;
        }

        // Tạo Food mới (ở đây mình dùng class Food cho nhanh)
        const newFood = new Food(name, nameVi, price, image, category, "Món mới");
        menuManager.addFood(newFood);
        
        alert(`Đã thêm món: ${nameVi}`);
        closeStaffPanel();
        renderMenu(); // reload lại menu
    }

    // --- Staff Order Management Functions ---
    function showOrdersByStatus(status) {
        const ordersDisplay = document.getElementById('orders-display');
        if (!ordersDisplay) return;

        let orders = status === 'all' ? orderManager.orders : orderManager.getOrdersByStatus(status);
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (orders.length === 0) {
            ordersDisplay.innerHTML = `<p class="text-gray-400 text-center p-4">Không có đơn hàng nào.</p>`;
            return;
        }

        ordersDisplay.innerHTML = orders.map(order => {
            const statusColors = {
                'Pending': 'bg-yellow-600',
                'Preparing': 'bg-orange-600',
                'Completed': 'bg-green-600',
                'Cancelled': 'bg-red-600'
            };
            const statusOptions = ['Pending', 'Preparing', 'Completed', 'Cancelled']
                .map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('');

            const itemsList = [
                ...order.foodItems.map(item => `${item.nameVi} x${item.quantity}`),
                ...order.combos.map(combo => `[C] ${combo.nameVi} x${combo.quantity}`)
            ].join(', ');

            return `
                <div class="border border-gray-700 rounded-lg p-3 mb-2 bg-gray-800 text-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <h5 class="text-white font-semibold">${order.orderId} - ${order.customer.username}</h5>
                            <p class="text-gray-400 text-xs">${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-white font-bold">${order.totalPrice.toLocaleString('vi-VN')}đ</div>
                            <span class="px-2 py-1 text-xs rounded ${statusColors[order.status]}">${order.status}</span>
                        </div>
                    </div>
                    <p class="text-gray-300 text-xs my-2 truncate">Gồm: ${itemsList}</p>
                    <div class="flex space-x-2">
                        <select onchange="updateOrderStatus('${order.orderId}', this.value)" class="text-black px-2 py-1 rounded text-xs flex-grow">${statusOptions}</select>
                        <button onclick="showOrderDetails('${order.orderId}')" class="bg-blue-600 text-white px-3 py-1 text-xs rounded">Chi Tiết</button>
                    </div>
                </div>`;
        }).join('');
    }

    // --- Code mới ---
    function updateOrderStatus(orderId, newStatus) {
        // Lấy thông tin đơn hàng TRƯỚC khi cập nhật
        const order = orderManager.findOrderById(orderId);
        if (!order) return;

        // Cập nhật trạng thái
        if (orderManager.updateOrderStatus(orderId, newStatus)) {
            console.log(`Updated order ${orderId} to ${newStatus}`);

            // GỬI THÔNG BÁO THEO TRẠNG THÁI MỚI
            notificationManager.notifyOrderUpdate(newStatus.toLowerCase(), {
                totalItems: order.getTotalItems(),
                totalPrice: order.getTotalPrice()
            });

            // Tải lại panel của Staff
            closeStaffOrderHistory();
            showStaffOrderHistory();
            setTimeout(() => {
                const allButton = document.querySelector('#staff-order-history-panel button[onclick*="all"]');
                if (allButton) allButton.click();
            }, 100);
        }
    }

    function showOrderDetails(orderId) {
        const order = orderManager.findOrderById(orderId);
        if (!order) return;

        const itemsDetail = order.foodItems.map(item => `
            <div class="flex justify-between items-center py-2 border-b border-gray-600">
                <div>
                    <span class="text-white">${item.nameVi}</span>
                    <span class="text-gray-400 text-sm ml-2">x${item.quantity}</span>
                </div>
                <span class="text-white">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
            </div>
        `).join('');

        const combosDetail = order.combos.map(combo => `
            <div class="flex justify-between items-center py-2 border-b border-gray-600">
                <div>
                    <span class="text-yellow-400">[COMBO] ${combo.nameVi}</span>
                    <span class="text-gray-400 text-sm ml-2">x${combo.quantity}</span>
                </div>
                <span class="text-white">${(combo.price * combo.quantity).toLocaleString('vi-VN')}đ</span>
            </div>
        `).join('');

        const detailModal = `
            <div id="order-detail-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-blue-500 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold text-white">Chi Tiết Đơn Hàng ${order.orderId}</h3>
                        <button onclick="closeOrderDetail()" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-gray-300">Khách hàng: <span class="text-white">${order.customer.username}</span></p>
                        <p class="text-gray-300">Thời gian: <span class="text-white">${order.createdAt.toLocaleString('vi-VN')}</span></p>
                        <p class="text-gray-300">Trạng thái: <span class="text-white">${order.status}</span></p>
                    </div>

                    <div class="mb-4">
                        <h4 class="text-lg font-semibold text-white mb-2">Danh Sách Món</h4>
                        <div class="bg-gray-900 rounded-lg p-4">
                            ${itemsDetail}
                            ${combosDetail}
                            <div class="flex justify-between items-center pt-3 mt-3 border-t border-gray-500">
                                <span class="text-lg font-semibold text-white">Tổng Cộng:</span>
                                <span class="text-lg font-bold text-white">${order.totalPrice.toLocaleString('vi-VN')}đ</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button onclick="closeOrderDetail()" class="bg-gray-500 text-white px-6 py-2 rounded">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', detailModal);
    }

    function closeOrderDetail() {
        const modal = document.getElementById('order-detail-modal');
        if (modal) modal.remove();
    }

    // --- Guest Order History Functions ---
    function showGuestOrderHistory() {
        if (!currentUser) {
            alert('Vui lòng đăng nhập để xem lịch sử đơn hàng!');
            return;
        }

        const guestOrders = orderManager.getOrdersByCustomer(currentUser.username);
        
        const historyModal = `
            <div id="guest-order-history-modal" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-blue-500 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content-slide-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold text-white">Lịch Sử Đơn Hàng của ${currentUser.username}</h3>
                        <button onclick="closeGuestOrderHistory()" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>
                    
                    ${guestOrders.length === 0 ? 
                        `<div class="text-center py-12">
                            <div class="text-6xl mb-4">📝</div>
                            <p class="text-gray-300 text-lg">Bạn chưa có đơn hàng nào</p>
                            <p class="text-gray-400 text-sm mt-2">Hãy đặt món đầu tiên của bạn!</p>
                        </div>` 
                        : 
                        `<div class="space-y-4">
                            ${guestOrders.map(order => {
                                const statusColors = {
                                    'Pending': 'bg-yellow-600',
                                    'Preparing': 'bg-orange-600',
                                    'Completed': 'bg-green-600',
                                    'Cancelled': 'bg-red-600'
                                };
                                
                                const statusTexts = {
                                    'Pending': 'Chờ Xử Lý',
                                    'Preparing': 'Đang Chuẩn Bị',
                                    'Completed': 'Đã Hoàn Thành',
                                    'Cancelled': 'Đã Hủy'
                                };

                                const itemsList = [
                                    ...order.foodItems.map(item => `${item.nameVi} x${item.quantity}`),
                                    ...order.combos.map(combo => `[COMBO] ${combo.nameVi} x${combo.quantity}`)
                                ].join(', ');

                                return `
                                    <div class="border border-gray-600 rounded-lg p-4 bg-gray-800">
                                        <div class="flex justify-between items-start mb-3">
                                            <div>
                                                <h5 class="text-white font-semibold text-lg">${order.orderId}</h5>
                                                <p class="text-gray-400 text-sm">${order.createdAt.toLocaleString('vi-VN')}</p>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-white font-bold text-lg mb-2">${order.totalPrice.toLocaleString('vi-VN')}đ</div>
                                                <span class="px-3 py-1 text-sm rounded ${statusColors[order.status]} text-white">
                                                    ${statusTexts[order.status]}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <p class="text-gray-300 text-sm">${itemsList}</p>
                                            <p class="text-gray-400 text-xs mt-1">Tổng: ${order.getTotalItems()} món</p>
                                        </div>
                                        <div class="flex justify-end space-x-4">
                                            ${order.status === 'Pending' ? 
                                            `<button onclick="handleGuestCancelOrder('${order.orderId}')" 
                                                    class="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition-colors">
                                                Hủy Đơn
                                            </button>` : ''}

                                            <button onclick="showGuestOrderDetail('${order.orderId}')" 
                                                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                                                Xem Chi Tiết
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>`
                    }

                    <div class="flex justify-end mt-6">
                        <button onclick="closeGuestOrderHistory()" class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', historyModal);
    }

    function showGuestOrderDetail(orderId) {
        const order = orderManager.findOrderById(orderId);
        if (!order || order.customer.username !== currentUser.username) {
            alert('Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này!');
            return;
        }

        const statusTexts = {
            'Pending': 'Chờ Xử Lý',
            'Preparing': 'Đang Chuẩn Bị',
            'Completed': 'Đã Hoàn Thành',
            'Cancelled': 'Đã Hủy'
        };

        const itemsDetail = order.foodItems.map(item => `
            <div class="flex justify-between items-center py-3 border-b border-gray-600">
                <div class="flex items-center space-x-4">
                    <img src="${item.image}" alt="${item.nameVi}" class="w-16 h-16 rounded-lg object-cover border border-gray-medium">
                    <div>
                        <h6 class="text-white font-semibold">${item.nameVi}</h6>
                        <p class="text-gray-400 text-sm">${item.description || item.name}</p>
                        <span class="text-gray-400 text-sm">Số lượng: ${item.quantity}</span>
                    </div>
                </div>
                <span class="text-white font-semibold">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
            </div>
        `).join('');

        const combosDetail = order.combos.map(combo => `
            <div class="flex justify-between items-center py-3 border-b border-gray-600">
                <div class="flex items-center space-x-4">
                    <img src="${combo.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop'}" 
                         alt="${combo.nameVi}" class="w-16 h-16 rounded-lg object-cover border border-gray-medium">
                    <div>
                        <h6 class="text-yellow-400 font-semibold">[COMBO] ${combo.nameVi}</h6>
                        <p class="text-gray-400 text-sm">${combo.description}</p>
                        <span class="text-gray-400 text-sm">Số lượng: ${combo.quantity}</span>
                    </div>
                </div>
                <span class="text-white font-semibold">${(combo.price * combo.quantity).toLocaleString('vi-VN')}đ</span>
            </div>
        `).join('');

        const detailModal = `
            <div id="guest-order-detail-modal" class="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-blue-500 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content-slide-in">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-white">Chi Tiết Đơn Hàng ${order.orderId}</h3>
                        <button onclick="closeGuestOrderDetail()" class="text-white hover:text-gray-300 text-2xl">&times;</button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-900 p-4 rounded-lg">
                            <h4 class="text-lg font-semibold text-white mb-3">Thông Tin Đơn Hàng</h4>
                            <p class="text-gray-300 mb-2">Mã đơn: <span class="text-white font-semibold">${order.orderId}</span></p>
                            <p class="text-gray-300 mb-2">Thời gian: <span class="text-white">${order.createdAt.toLocaleString('vi-VN')}</span></p>
                            <p class="text-gray-300 mb-2">Trạng thái: <span class="text-white font-semibold">${statusTexts[order.status]}</span></p>
                            <p class="text-gray-300">Tổng món: <span class="text-white font-semibold">${order.getTotalItems()}</span></p>
                        </div>
                        
                        <div class="bg-gray-900 p-4 rounded-lg">
                            <h4 class="text-lg font-semibold text-white mb-3">Thanh Toán</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Tổng cộng:</span>
                                    <span class="text-white font-bold text-xl">${order.totalPrice.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="text-lg font-semibold text-white mb-4">Danh Sách Món Ăn</h4>
                        <div class="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                            ${itemsDetail}
                            ${combosDetail}
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button onclick="closeGuestOrderDetail()" class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', detailModal);
    }

    function closeGuestOrderHistory() {
        const modal = document.getElementById('guest-order-history-modal');
        if (modal) modal.remove();
    }

    function closeGuestOrderDetail() {
        const modal = document.getElementById('guest-order-detail-modal');
        if (modal) modal.remove();
    }

    function handleGuestCancelOrder(orderId) {
        if (!currentUser) return;

        // 1. Tìm đơn hàng
        const order = orderManager.findOrderById(orderId);

        // 2. Kiểm tra các điều kiện an toàn
        if (!order) {
            alert("Không tìm thấy đơn hàng!");
            return;
        }
        if (order.customer.username !== currentUser.username) {
            alert("Bạn không có quyền hủy đơn hàng này.");
            return;
        }
        if (order.status !== 'Pending') {
            alert("Đơn hàng đã được xử lý, bạn không thể hủy nữa.");
            return;
        }

        // 3. Hỏi xác nhận
        const isConfirmed = confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?");

        if (isConfirmed) {
            // 4. Cập nhật trạng thái và lưu lại
            order.setStatus('Cancelled');
            orderManager._saveOrdersToStorage(); // Gọi hàm lưu nội bộ
            
            // 5. Gửi thông báo (tùy chọn)
            notificationManager.notifyOrderUpdate('cancelled');

            alert("Đã hủy đơn hàng thành công!");

            // 6. Cập nhật lại giao diện lịch sử đơn hàng
            closeGuestOrderHistory();
            showGuestOrderHistory();
        }
    }

    // ======================================================
    // NOTIFICATION CENTER - THÊM FUNCTION MỚI
    // ======================================================

    function showNotificationCenter() {
        // Kiểm tra xem modal đã tồn tại chưa
        if (document.getElementById('notification-center')) return;

        const notificationCenterHtml = `
            <div id="notification-center" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <div class="bg-gray-dark border-2 border-white rounded-2xl p-6 max-w-md w-full mx-4 modal-content-slide-in">
                    <h3 class="text-2xl font-bold text-white mb-6">🔔 Thông báo</h3>
                    
                    <div class="space-y-4 mb-6">
                        <div class="p-4 bg-black rounded-lg border border-gray-medium">
                            <h4 class="font-semibold text-white mb-2">Push Notifications</h4>
                            <p class="text-sm text-gray-300 mb-3">Nhận thông báo về trạng thái đơn hàng và khuyến mãi</p>
                            <div class="flex items-center justify-between">
                                <span class="text-sm ${notificationManager.permission === 'granted' ? 'text-green-400' : 'text-gray-400'}">
                                    ${getNotificationStatusText()}
                                </span>
                                ${notificationManager.permission !== 'granted' ? 
                                    '<button onclick="requestNotificationPermission()" class="bg-white text-black px-3 py-1 text-sm rounded">Kích hoạt</button>' :
                                    '<span class="text-green-400">✓</span>'
                                }
                            </div>
                        </div>
                    </div>

                    <button onclick="closeNotificationCenter()" class="w-full bg-gray-500 text-white py-2 rounded">Đóng</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', notificationCenterHtml);
    }

    function getNotificationStatusText() {
        switch (notificationManager.permission) {
            case 'granted':
                return 'Đã kích hoạt';
            case 'denied':
                return 'Bị từ chối';
            default:
                return 'Chưa kích hoạt';
        }
    }

    async function requestNotificationPermission() {
        const initialized = await notificationManager.initialize();
        
        // Cập nhật giao diện
        const modal = document.getElementById('notification-center');
        if (modal && initialized) {
            modal.remove();
            showNotificationCenter(); // Hiển thị lại với trạng thái mới
        }
    }

    function closeNotificationCenter() {
        const modal = document.getElementById('notification-center');
        if (modal) modal.remove();
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
    window.openRemoveFoodModal = openRemoveFoodModal;
    window.handleRemoveSelectedFoods = handleRemoveSelectedFoods;
    window.openRemoveComboModal = openRemoveComboModal;
    window.handleAddFood = handleAddFood;
    window.showOrdersByStatus = showOrdersByStatus;
    window.updateOrderStatus = updateOrderStatus;
    window.showOrderDetails = showOrderDetails;
    window.closeOrderDetail = closeOrderDetail;
    window.showGuestOrderHistory = showGuestOrderHistory;
    window.showGuestOrderDetail = showGuestOrderDetail;
    window.closeGuestOrderHistory = closeGuestOrderHistory;
    window.closeGuestOrderDetail = closeGuestOrderDetail;
    window.showStaffOrderHistory = showStaffOrderHistory;
    window.closeStaffOrderHistory = closeStaffOrderHistory;
    window.showNotificationCenter = showNotificationCenter;
    window.requestNotificationPermission = requestNotificationPermission;
    window.closeNotificationCenter = closeNotificationCenter;
    window.handleGuestCancelOrder = handleGuestCancelOrder;

    // --- Initial Load ---
    renderMenu();
    updateCartDisplay();
    
    console.log('Fuji Kitchen app loaded successfully with integrated food system');
    console.log('Available categories:', ['all', 'ramen', 'ricedon', 'drink', 'sidedish', 'topping', 'combo']);
    console.log('Total menu items:', menuList.length);
    console.log('Total combos available:', staffCombos.length);
});
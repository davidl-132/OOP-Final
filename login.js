class User{
    constructor(username, password){
        this._username = username;
        this._password = password;
    }

    getUsername(){return this._username;}
    getPassword(){return this._password;}

    /**
     * Xác thực thông tin đăng nhập.
     * @param {string} username - Tên người dùng để kiểm tra.
     * @param {string} password - Mật khẩu để kiểm tra.
     * @returns {boolean} - Trả về true nếu thông tin hợp lệ.
     */
    login(username, password){
        return this._username === username && this._password === password;
    }
    
    /**
     * Lấy vai trò của người dùng.
     * @returns {string} - Vai trò (ví dụ: "guest" hoặc "staff").
     */
    getRole(){
        throw new Error("Method 'getRole()' must be implemented.");
    }
}

class Guest extends User{
    constructor(username, password){
        super(username, password);
    }

    getRole(){return "guest";}
}

class Staff extends User{
    constructor(username, password){
        super(username, password);
    }

    getRole(){return "staff";}
}

class AccountManager{
    constructor(){
        this._staffAccount = new Staff("admin","123");
        this._guests = new Map();
        this._loadGuestsFromStorage();
    }

     /**
     * Tải danh sách tài khoản guest từ localStorage.
     * @private
     */
    _loadGuestsFromStorage() {
        const guestsJSON = localStorage.getItem('guestAccounts');
        if (guestsJSON) {
            const guestDataArray = JSON.parse(guestsJSON);
            guestDataArray.forEach(data => {
                const guest = new Guest(data.username, data.password);
                this._guests.set(data.username, guest);
            });
        }
    }

    /**
     * Lưu danh sách tài khoản guest hiện tại vào localStorage.
     * @private
     */
    _saveGuestsToStorage() {
        const guestDataArray = [];
        // Chuyển đổi Map sang một mảng các đối tượng đơn giản để lưu trữ
        for (let guest of this._guests.values()) {
            guestDataArray.push({
                username: guest.getUsername(),
                password: guest._password // Truy cập trực tiếp để lưu
            });
        }
        localStorage.setItem('guestAccounts', JSON.stringify(guestDataArray));
    }

    /**
     * Đăng ký một tài khoản Guest mới.
     * @param {string} username - Tên đăng ký.
     * @param {string} password - Mật khẩu.
     * @returns {{success: boolean, message?: string, user?: Guest}} - Kết quả đăng ký.
     */
    registerGuest(username, password) {
        if (this._guests.has(username)) {
            return { success: false, message: "Tên đăng nhập này đã tồn tại." };
        }
        if (username === this._staffAccount.getUsername()) {
            return { success: false, message: "Tên đăng nhập này đã được sử dụng." };
        }

        const newGuest = new Guest(username, password);
        this._guests.set(username, newGuest);
        this._saveGuestsToStorage(); // Lưu lại danh sách mới vào localStorage
        return { success: true, user: newGuest };
    }

    /**
     * Đăng nhập cho cả Staff và Guest.
     * @param {string} username - Tên đăng nhập.
     * @param {string} password - Mật khẩu.
     * @returns {User|null} - Trả về đối tượng User nếu thành công, ngược lại trả về null.
     */
    login(username, password) {
        // Ưu tiên kiểm tra Staff
        if (this._staffAccount.login(username, password)) {
            return this._staffAccount;
        }

        // Kiểm tra Guest
        if (this._guests.has(username)) {
            const guest = this._guests.get(username);
            if (guest.login(username, password)) {
                return guest;
            }
        }
        
        return null; // Đăng nhập thất bại
    }


}
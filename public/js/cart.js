// Cart management using localStorage
const Cart = {
    KEY: 'nadhi_cart',

    getAll() {
        try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
        catch { return []; }
    },

    save(items) {
        localStorage.setItem(this.KEY, JSON.stringify(items));
        this.updateBadge();
    },

    add(product, weight, qty = 1) {
        const items = this.getAll();
        // Prices per weight
        const multipliers = { '100g': 0.1, '250g': 0.25, '500g': 0.5, '1kg': 1.0 };
        const multiplier = multipliers[weight] || 1;
        const unitPrice = parseFloat((product.price * multiplier).toFixed(2));

        const existing = items.find(i => i.productId === product.id && i.weight === weight);
        if (existing) {
            existing.qty += qty;
        } else {
            items.push({
                productId: product.id,
                name: product.name,
                image: product.image,
                category: product.category,
                weight,
                unitPrice,
                qty
            });
        }
        this.save(items);
        this.showToast(`${product.name} added to cart!`);
    },

    remove(productId, weight) {
        const items = this.getAll().filter(i => !(i.productId === productId && i.weight === weight));
        this.save(items);
    },

    updateQty(productId, weight, qty) {
        const items = this.getAll();
        const item = items.find(i => i.productId === productId && i.weight === weight);
        if (item) {
            item.qty = Math.max(1, qty);
            this.save(items);
        }
    },

    clear() {
        localStorage.removeItem(this.KEY);
        this.updateBadge();
    },

    total() {
        return this.getAll().reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    },

    count() {
        return this.getAll().reduce((sum, i) => sum + i.qty, 0);
    },

    updateBadge() {
        const el = document.getElementById('cart-count');
        if (el) {
            const n = this.count();
            el.textContent = n;
            el.style.display = n > 0 ? 'flex' : 'none';
        }
    },

    showToast(msg) {
        const existing = document.getElementById('cart-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'cart-toast';
        toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      background:#2d5a27; color:#fff; padding:12px 20px;
      border-radius:8px; font-size:0.9rem; font-weight:500;
      box-shadow:0 4px 20px rgba(0,0,0,0.2);
      animation:fadeIn 0.3s ease;
    `;
        toast.textContent = '🛒 ' + msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
};

// Product emoji fallback map (used only if image fails to load)
const PRODUCT_EMOJI = {
    'almonds.jpg': '🥜', 'cashew.jpg': '🌰', 'pistachio.jpg': '🫘',
    'amla.jpg': '🟤', 'dates.jpg': '🍬', 'sunflower.jpg': '🌻',
    'chia.jpg': '⚫', 'sabja.jpg': '🌿', 'pumpkin.jpg': '🎃',
    'default.jpg': '🌿'
};

// Returns an <img> or emoji div depending on image availability
function getProductImageTag(image, cssClass = 'product-card-img') {
    if (!image || image === 'default.jpg') {
        return `<div class="product-card-img-placeholder">${PRODUCT_EMOJI['default.jpg']}</div>`;
    }

    // 1. Check if it's already a full URL (from Supabase Cloud)
    if (image.startsWith('http')) {
        return `<img src="${image}" alt="Product" class="${cssClass}" onerror="this.outerHTML='<div class=\\'product-card-img-placeholder\\'>${PRODUCT_EMOJI['default.jpg']}</div>'">`;
    }

    // 2. Otherwise handle local seed items or user uploads
    const emoji = PRODUCT_EMOJI[image] || '🌿';

    // Try /images/ first (for professional stock), then /uploads/
    const primarySrc = `/images/${image}`;
    const secondarySrc = `/uploads/${image}`;

    return `<img src="${primarySrc}" alt="${image}" class="${cssClass}" 
        onerror="this.onerror=null; this.src='${secondarySrc}'; this.onerror=()=>this.outerHTML='<div class=\\'product-card-img-placeholder\\'>${emoji}</div>'">`;
}

// Legacy helper – returns emoji for fallback use
function getProductEmoji(image) {
    return PRODUCT_EMOJI[image] || '🌿';
}

function formatPrice(p) {
    return '₹' + parseFloat(p).toFixed(2);
}

// Shared navbar init
function initNavbar() {
    Cart.updateBadge();
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
}

// CSS animation keyframes
const style = document.createElement('style');
style.textContent = `@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`;
document.head.appendChild(style);

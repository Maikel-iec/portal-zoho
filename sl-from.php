<?php
/**iption: 
 * Plugin Name: sl plugin from
 * shortcode del plugin.
 */

function mi_plugin_enqueue_scripts()
{
    $asset_file = include(plugin_dir_path(__FILE__) . 'build/index.asset.php');

    wp_enqueue_script(
        'mi-plugin-script',
        plugin_dir_url(__FILE__) . 'build/index.js',
        $asset_file['dependencies'],
        $asset_file['version'],
        true
    );

    wp_enqueue_style(
        'mi-plugin-style',
        plugin_dir_url(__FILE__) . 'build/index.css',
        array(),
        $asset_file['version']
    );
}
add_action('wp_enqueue_scripts', 'mi_plugin_enqueue_scripts');

function mi_plugin_render_react_app()
{
    ob_start();
    ?>
    <div id="mi-plugin-root">
        <h3>  </h3>
    </div>
    <?php

    return ob_get_clean();
}

function rende_tx_xd()
{
    return '<h1>hola ángel xd :/ xd</h1>';
}

add_shortcode('sl-payment-form', 'mi_plugin_render_react_app');
add_shortcode('tx-ent-xd', 'rende_tx_xd');

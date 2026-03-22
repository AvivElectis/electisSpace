package com.electisspace.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fix black screen on emulator: force software rendering layer
        // for the WebView when hardware acceleration causes blank display
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
        }
    }
}

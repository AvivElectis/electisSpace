package com.electisspace.app;

import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure WebView has a white background (prevents black screen on emulator)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(Color.WHITE);
        }
    }
}

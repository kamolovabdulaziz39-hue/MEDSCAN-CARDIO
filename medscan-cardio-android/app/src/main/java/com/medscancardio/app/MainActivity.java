package com.medscancardio.app;

import android.Manifest;
import android.annotation.TargetApi;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "MedscanCardioPrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "https://medscancardio-bekend.onrender.com";

    private WebView webView;
    private LinearLayout configLayout;
    private EditText urlInput;
    private Button btnConnect;

    private boolean hasError = false;
    private int tapCount = 0;
    private long lastTapTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request runtime Camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 100);
        }

        webView = findViewById(R.id.webview);
        configLayout = findViewById(R.id.config_layout);
        urlInput = findViewById(R.id.server_url_input);
        btnConnect = findViewById(R.id.btn_connect);

        WebSettings webSettings = webView.getSettings();
        
        // Essential settings for PWA web apps
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        // Native app look & feel optimizations
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        
        // Custom User-Agent suffix for backend/frontend analytics
        String defaultUserAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(defaultUserAgent + " MedscanCardioAndroid/1.0");

        // Enable Hardware Acceleration for smooth animations and performance
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Enable file downloads via system browser
        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                    intent.setData(android.net.Uri.parse(url));
                    MainActivity.this.startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

        // Configure WebViewClient to handle page loading and connection errors
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                hasError = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!hasError) {
                    webView.setVisibility(View.VISIBLE);
                    configLayout.setVisibility(View.GONE);
                }
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                hasError = true;
                showConfigLayout();
            }

            @TargetApi(android.os.Build.VERSION_CODES.M)
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    hasError = true;
                    showConfigLayout();
                }
            }
        });

        // WebChromeClient to handle camera/media permission requests inside the WebView
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        // Setup save and connect button click
        btnConnect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String inputUrl = urlInput.getText().toString();
                if (!inputUrl.trim().isEmpty()) {
                    String formattedUrl = formatUrl(inputUrl);
                    saveServerUrl(formattedUrl);
                    
                    // Hide keyboard
                    View view = MainActivity.this.getCurrentFocus();
                    if (view != null) {
                        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                        imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
                    }
                    
                    // Reload web view
                    configLayout.setVisibility(View.GONE);
                    webView.setVisibility(View.VISIBLE);
                    webView.loadUrl(formattedUrl);
                }
            }
        });

        // Triple-tap shortcut to open server settings at any time
        webView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) {
                    long pressTime = System.currentTimeMillis();
                    if (pressTime - lastTapTime < 500) {
                        tapCount++;
                    } else {
                        tapCount = 1;
                    }
                    lastTapTime = pressTime;
                    if (tapCount == 3) {
                        tapCount = 0;
                        showConfigLayout();
                        return true;
                    }
                }
                return false;
            }
        });

        // Load saved URL or fallback to default
        String serverUrl = getServerUrl();
        urlInput.setText(serverUrl);
        webView.loadUrl(serverUrl);
    }

    private void showConfigLayout() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.setVisibility(View.GONE);
                configLayout.setVisibility(View.VISIBLE);
                urlInput.setText(getServerUrl());
            }
        });
    }

    private String getServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        return prefs.getString(KEY_SERVER_URL, DEFAULT_URL);
    }

    private void saveServerUrl(String url) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_SERVER_URL, url).apply();
    }

    private String formatUrl(String url) {
        url = url.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
        }
        return url;
    }

    @Override
    public void onBackPressed() {
        if (configLayout.getVisibility() == View.VISIBLE) {
            if (webView.getUrl() != null && !hasError) {
                configLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            } else {
                super.onBackPressed();
            }
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

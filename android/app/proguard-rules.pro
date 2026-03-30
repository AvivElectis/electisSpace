# electisSpace ProGuard Rules

# Capacitor core — keep plugin bridge classes
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Capacitor plugin annotations
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Cordova compatibility layer
-keep class org.apache.cordova.** { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

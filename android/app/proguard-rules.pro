# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in proguard-android.txt

# Keep React Native core & Hermes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Keep React Methods & Props annotations
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.bridge.DoNotStrip <methods>;
}

-keep @com.facebook.react.bridge.DoNotStrip class * { *; }

# Custom Native Modules
-keep class com.pravisti.** { *; }
-keepclassmembers class com.pravisti.** {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# React Native Image Picker
-keep class com.imagepicker.** { *; }

# React Native Voice & TTS
-keep class com.wenkesj.voice.** { *; }
-keep class net.no_mad.tts.** { *; }

# React Native Contacts
-keep class com.rt2zz.reactnativecontacts.** { *; }

# Socket.io & OkHttp
-dontwarn io.socket.**
-keep class io.socket.** { *; }
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-dontwarn okio.**
-keep class okio.** { *; }

# ══════════════════════════════════════════════════════════════
# Wise Accounts - ProGuard/R8 Rules
# ══════════════════════════════════════════════════════════════

# ── Preserve generic signatures (CRITICAL for Gson/Retrofit) ──
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*
-keepattributes InnerClasses,EnclosingMethod

# ── Razorpay ──
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# ── Hilt (app-generated classes) ──
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.internal.** { *; }
-keep class **_*Factory { *; }
-keep class **_*MembersInjector { *; }
-keep class **_*Module { *; }
-keep class **_*EntryPoint { *; }
-keep class * extends dagger.hilt.android.lifecycle.HiltViewModel { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }
-keep class **_HiltModules* { *; }
-keep class **_GeneratedInjector { *; }
-keep class com.gstbilling.app.Hilt_* { *; }
-keep class com.gstbilling.app.di.** { *; }
-dontwarn dagger.hilt.**

# ── Room ──
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }
-dontwarn androidx.room.paging.**

# ── Retrofit (NO allowshrinking - must preserve generic signatures) ──
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepclassmembers,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement

# ── OkHttp ──
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-dontwarn okio.**
-keep class okio.** { *; }

# ── Gson (CRITICAL - must preserve TypeToken for generic resolution) ──
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken

# ── Keep ALL API data classes with generic signatures ──
-keep class com.gstbilling.app.data.remote.api.** { *; }

# ── Keep ALL app classes ──
-keep class com.gstbilling.app.** { *; }

# ── Compose ──
-dontwarn androidx.compose.**

# ── Coroutines ──
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# ── DataStore ──
-dontwarn androidx.datastore.**

# ── Security Crypto (EncryptedSharedPreferences) ──
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# ── ML Kit ──
-dontwarn com.google.mlkit.**

# ── Vico Charts ──
-dontwarn com.patrykandpatrick.vico.**

# ── Apache POI ──
-dontwarn org.apache.batik.**
-dontwarn org.apache.xmlbeans.**
-dontwarn org.apache.poi.xslf.draw.**
-dontwarn org.osgi.framework.**
-dontwarn aQute.bnd.annotation.**
-dontwarn org.apache.logging.log4j.**
-dontwarn javax.xml.stream.**
-dontwarn org.apache.commons.compress.**
-dontwarn org.apache.commons.collections4.**
-dontwarn org.apache.commons.lang3.**
-dontwarn aQute.bnd.annotation.spi.ServiceConsumer
-dontwarn aQute.bnd.annotation.spi.ServiceProvider
-dontwarn org.apache.batik.anim.dom.SAXSVGDocumentFactory
-dontwarn org.apache.batik.bridge.BridgeContext
-dontwarn org.apache.batik.bridge.DocumentLoader
-dontwarn org.apache.batik.bridge.GVTBuilder
-dontwarn org.apache.batik.bridge.UserAgent
-dontwarn org.apache.batik.bridge.UserAgentAdapter
-dontwarn org.apache.batik.util.XMLResourceDescriptor
-dontwarn org.osgi.framework.Bundle
-dontwarn org.osgi.framework.BundleContext
-dontwarn org.osgi.framework.FrameworkUtil
-dontwarn org.osgi.framework.ServiceReference

# ── CameraX ──
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ── General safety ──
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

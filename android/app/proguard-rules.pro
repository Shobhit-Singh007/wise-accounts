# Razorpay
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Hilt
-dontwarn dagger.hilt.**
-keep class dagger.hilt.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }

# Gson
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Keep data classes for API
-keep class com.gstbilling.app.data.remote.api.** { *; }

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

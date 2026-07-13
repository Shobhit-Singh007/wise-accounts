# Performance Optimization Guide - Wise Accounts Android

## Image Loading
- Use Coil's `crossfade` and `size` modifiers to avoid loading full-size images
- Cache decoded bitmaps with `MemoryCache` and `DiskCache`

## LazyColumn Optimization
- Always use `key` parameter in `LazyColumn` items for stable recomposition
- Use `derivedStateOf` for scroll state calculations
- Avoid creating objects inside `@Composable` functions

## Network Optimization
- Enable response caching in OkHttp interceptor
- Use `@Immutable` and `@Stable` data classes for Compose stability
- Debounce search inputs (300ms recommended)

## Database Optimization
- Use Room `@Transaction` for multi-table operations
- Create proper indexes for frequently queried columns
- Use `Paging 3` for large lists

## Memory Management
- Cancel coroutine scopes in ViewModel onCleared()
- Use `WeakReference` for callbacks that outlive their scope
- Profile with Android Studio Memory Profiler

## Build Optimization
- Enable R8 full mode in `gradle.properties`: `android.enableR8.fullMode=true`
- Use `buildFeatures { compose true }` with proper compiler options
- Enable Gradle build cache: `org.gradle.caching=true`

## Recommended gradle.properties additions
```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.caching=true
android.useAndroidX=true
kotlin.code.style=official
```

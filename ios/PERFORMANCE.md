# Performance Optimization Guide - Wise Accounts iOS

## Image Loading
- Use `AsyncImage` with `.resizable()` and `.frame()` for efficient image loading
- Cache images using `NSCache` or a library like Kingfisher

## List Optimization
- Always provide `id` in `ForEach` for stable list rendering
- Use `LazyVStack` and `LazyHStack` instead of `VStack`/`HStack` for large lists
- Avoid expensive computations in `body` — move to `@State` or ViewModel

## Network Optimization
- Use `URLSession` with proper caching policies
- Implement request deduplication for repeated API calls
- Use `async/await` with proper error handling

## Core Data / SwiftData Optimization
- Use batch fetch requests for large datasets
- Create indexes on frequently queried properties
- Use `@FetchDescriptor` with `fetchLimit` for pagination

## Memory Management
- Use `[weak self]` in closures to avoid retain cycles
- Profile with Instruments (Leaks, Allocations)
- Cancel tasks in `onDisappear` or `task` modifier

## SwiftUI Performance
- Use `@StateObject` for owned objects, `@EnvironmentObject` for shared
- Minimize `@State` changes to reduce recomposition
- Use `.equatable()` modifier for custom types

## Build Optimization
- Enable Whole Module Optimization in Release builds
- Use `-Osize` flag for App Store builds
- Enable Link Time Optimization (LTO)

import SwiftUI

@main
struct GSTBillingApp: App {
    @StateObject private var authManager = AuthManager()
    @AppStorage("colorScheme") private var colorSchemeOption = "system"
    
    private var resolvedColorScheme: ColorScheme? {
        switch colorSchemeOption {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .preferredColorScheme(resolvedColorScheme)
        }
    }
}

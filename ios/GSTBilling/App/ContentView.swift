import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                AppNavigation()
            } else {
                LoginView()
            }
        }
        .onAppear {
            Task { await authManager.checkAuth() }
        }
    }
}

import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var phone = ""
    @Published var password = ""
    @Published var name = ""
    @Published var email = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var isRegistering = false

    private let authManager: AuthManager

    init(authManager: AuthManager = .shared) {
        self.authManager = authManager
    }

    func login() async {
        guard !phone.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter phone and password"
            showError = true
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await authManager.login(phone: phone, password: password)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }

    func register() async {
        guard !phone.isEmpty, !password.isEmpty, !name.isEmpty else {
            errorMessage = "Please fill all required fields"
            showError = true
            return
        }
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            showError = true
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await authManager.register(phone: phone, password: password, name: name, email: email.isEmpty ? nil : email)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }

    func toggleMode() {
        isRegistering.toggle()
        errorMessage = nil
    }
}

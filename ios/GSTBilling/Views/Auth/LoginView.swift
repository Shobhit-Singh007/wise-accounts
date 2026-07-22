import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = AuthViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 60)

                Image("splash_logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 80, height: 80)

                Text(viewModel.isRegistering ? "Create your account" : "Sign in to continue")
                    .foregroundColor(.secondary)

                VStack(spacing: 16) {
                    if viewModel.isRegistering {
                        TextField("Full Name", text: $viewModel.name)
                            .textContentType(.name)
                            .autocapitalization(.words)
                    }

                    if viewModel.isRegistering {
                        TextField("Phone Number", text: $viewModel.phone)
                            .keyboardType(.phonePad)
                            .textContentType(.telephoneNumber)
                        TextField("Email (for login & notifications)", text: $viewModel.email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .autocapitalization(.none)
                    } else {
                        Picker("", selection: $viewModel.loginMethod) {
                            Text("Phone").tag("phone")
                            Text("Email").tag("email")
                        }
                        .pickerStyle(.segmented)

                        if viewModel.loginMethod == "email" {
                            TextField("Email Address", text: $viewModel.email)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                        } else {
                            TextField("Phone Number", text: $viewModel.phone)
                                .keyboardType(.phonePad)
                                .textContentType(.telephoneNumber)
                        }
                    }

                    SecureField("Password", text: $viewModel.password)
                        .textContentType(viewModel.isRegistering ? .newPassword : .password)

                    if viewModel.showError, let err = viewModel.errorMessage {
                        Text(err)
                            .foregroundColor(.red)
                            .font(.caption)
                            .multilineTextAlignment(.center)
                    }

                    Button(action: handleAction) {
                        if viewModel.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text(viewModel.isRegistering ? "Register" : "Login")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .disabled(viewModel.isLoading)

                    Button(action: { viewModel.toggleMode() }) {
                        Text(viewModel.isRegistering ? "Already have an account? Login" : "Don't have an account? Register")
                            .font(.callout)
                    }
                }
                .padding(.horizontal, 24)

                Spacer()
            }
        }
    }

    private func handleAction() {
        Task {
            if viewModel.isRegistering {
                await viewModel.register()
            } else {
                await viewModel.login()
            }
        }
    }
}

import SwiftUI

struct SettingsView: View {
    let business: Business
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false
    @State private var showBusinessSwitcher = false
    @State private var businessName: String
    @State private var gstin: String
    @State private var phone: String
    @State private var email: String
    @State private var address: String
    @State private var city: String
    @State private var state: String
    @State private var pincode: String
    @State private var isLoading = false
    @State private var toastMessage: String?
    @AppStorage("colorScheme") private var colorSchemeOption = "system"

    init(business: Business) {
        self.business = business
        _businessName = State(initialValue: business.name)
        _gstin = State(initialValue: business.gstin ?? "")
        _phone = State(initialValue: business.phone ?? "")
        _email = State(initialValue: business.email ?? "")
        _address = State(initialValue: business.address ?? "")
        _city = State(initialValue: business.city ?? "")
        _state = State(initialValue: business.state ?? "")
        _pincode = State(initialValue: business.pincode ?? "")
    }

    var body: some View {
        List {
            Section("User") {
                if let user = authManager.currentUser {
                    LabeledContent("Name", value: user.name)
                    LabeledContent("Phone", value: user.phone)
                    if let email = user.email { LabeledContent("Email", value: email) }
                }
            }

            Section("Business") {
                if authManager.businesses.count > 1 {
                    Button("Switch Business") { showBusinessSwitcher = true }
                }
                TextField("Business Name", text: $businessName)
                TextField("GSTIN", text: $gstin)
                    .autocapitalization(.allCharacters)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                TextField("Address", text: $address)
                HStack {
                    TextField("City", text: $city)
                    TextField("State", text: $state)
                }
                TextField("Pincode", text: $pincode)
                    .keyboardType(.numberPad)
            }

            Section {
                Button("Update Business") {
                    Task { await updateBusiness() }
                }
                .disabled(isLoading)
                if isLoading { ProgressView() }
            }

            Section("Invoice") {
                NavigationLink(value: AppRoute.invoiceSettings) {
                    Label("Invoice Settings", systemImage: "doc.text")
                }
            }

            Section("Preferences") {
                NavigationLink(destination: LanguageSettingsView()) {
                    Label("Language", systemImage: "globe")
                }
            }

            Section("Appearance") {
                Picker("Dark Mode", selection: $colorSchemeOption) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .pickerStyle(.segmented)
            }

            Section("Team") {
                NavigationLink(value: AppRoute.staff) {
                    Label("Staff Management", systemImage: "person.3.sequence.fill")
                }
            }

            Section("Data") {
                NavigationLink(value: AppRoute.inventoryDashboard) {
                    Label("Inventory Dashboard", systemImage: "cube")
                }
                NavigationLink(value: AppRoute.customerGroups) {
                    Label("Customer Groups", systemImage: "person.3")
                }
                NavigationLink(destination: ConflictResolutionView(business: business)) {
                    Label("Conflict Resolution", systemImage: "arrow.triangle.2.circlepath")
                }
            }

            Section {
                Button("Logout", role: .destructive) { showLogoutAlert = true }
            }
        }
        .navigationTitle("Settings")
        .alert("Logout", isPresented: $showLogoutAlert) {
            Button("Logout", role: .destructive) { Task { await authManager.logout() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to logout?")
        }
        .sheet(isPresented: $showBusinessSwitcher) {
            BusinessSwitcherView()
        }
        .overlay {
            if let msg = toastMessage {
                VStack {
                    Spacer()
                    Text(msg)
                        .padding()
                        .background(Color.black.opacity(0.75))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 32)
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: toastMessage)
                .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { toastMessage = nil } }
            }
        }
    }

    private func updateBusiness() async {
        isLoading = true
        let dto = UpdateBusinessRequest(
            name: businessName.isEmpty ? nil : businessName,
            gstin: gstin.isEmpty ? nil : gstin,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            address: address.isEmpty ? nil : address,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state,
            pincode: pincode.isEmpty ? nil : pincode
        )
        do {
            let updated = try await APIService.shared.updateBusiness(id: business.id, dto)
            authManager.selectBusiness(updated)
            toastMessage = "Business updated"
        } catch {
            toastMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct BusinessSwitcherView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(authManager.businesses) { business in
                Button {
                    authManager.selectBusiness(business)
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(business.name).font(.body)
                            if let gstin = business.gstin {
                                Text(gstin).font(.caption).foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        if business.id == authManager.currentBusiness?.id {
                            Image(systemName: "checkmark").foregroundColor(.blue)
                        }
                    }
                }
                .foregroundColor(.primary)
            }
            .navigationTitle("Switch Business")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

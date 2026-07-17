import SwiftUI

struct BusinessProfileView: View {
    let business: Business
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    @State private var businessName: String
    @State private var ownerName: String
    @State private var phone: String
    @State private var email: String
    @State private var address: String
    @State private var gstin: String
    @State private var businessType: String
    @State private var isLoading = false
    @State private var toastMessage: String?

    private let businessTypes = ["Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "HUF", "Others"]

    init(business: Business) {
        self.business = business
        _businessName = State(initialValue: business.name)
        _ownerName = State(initialValue: "")
        _phone = State(initialValue: business.phone ?? "")
        _email = State(initialValue: business.email ?? "")
        _address = State(initialValue: business.address ?? "")
        _gstin = State(initialValue: business.gstin ?? "")
        _businessType = State(initialValue: "Proprietorship")
    }

    var body: some View {
        Form {
            Section("Business Information") {
                TextField("Business Name", text: $businessName)
                TextField("Owner Name", text: $ownerName)
                    .autocapitalization(.words)
                Picker("Business Type", selection: $businessType) {
                    ForEach(businessTypes, id: \.self) { Text($0) }
                }
            }

            Section("Contact Details") {
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                TextField("Address", text: $address)
            }

            Section("Tax Information") {
                TextField("GSTIN", text: $gstin)
                    .autocapitalization(.allCharacters)
            }

            Section {
                Button("Save Profile") {
                    Task { await save() }
                }
                .disabled(isLoading)
                if isLoading { ProgressView() }
            }
        }
        .navigationTitle("Business Profile")
        .navigationBarTitleDisplayMode(.inline)
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

    private func save() async {
        isLoading = true
        let dto = UpdateBusinessRequest(
            name: businessName.isEmpty ? nil : businessName,
            gstin: gstin.isEmpty ? nil : gstin,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            address: address.isEmpty ? nil : address,
            city: nil, state: nil, pincode: nil
        )
        do {
            let updated = try await APIService.shared.updateBusiness(id: business.id, dto)
            authManager.selectBusiness(updated)
            toastMessage = "Profile updated"
        } catch {
            toastMessage = error.localizedDescription
        }
        isLoading = false
    }
}

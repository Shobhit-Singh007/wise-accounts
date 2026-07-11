import SwiftUI

struct AddCustomerView: View {
    let business: Business
    let customer: Customer?
    @StateObject private var viewModel = CustomerViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var gstin = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var pincode = ""
    @State private var creditLimit = ""
    @State private var openingBalance = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var isEditing: Bool { customer != nil }

    var body: some View {
        Form {
            Section("Basic Information") {
                TextField("Name *", text: $name)
                    .autocapitalization(.words)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
            }

            Section("GST Details") {
                TextField("GSTIN", text: $gstin)
                    .autocapitalization(.allCharacters)
                    .onChange(of: gstin) { _ in
                        if !gstin.isEmpty, let err = gstinError {
                            errorMessage = err
                        } else if errorMessage == "Invalid GSTIN format" {
                            errorMessage = nil
                        }
                    }
                if !gstin.isEmpty, let err = gstinError {
                    Text(err).foregroundColor(.red).font(.caption)
                }
            }

            Section("Address") {
                TextField("Address", text: $address)
                HStack {
                    TextField("City", text: $city)
                    TextField("State", text: $state)
                }
                TextField("Pincode", text: $pincode)
                    .keyboardType(.numberPad)
            }

            Section("Financial") {
                TextField("Credit Limit", text: $creditLimit)
                    .keyboardType(.decimalPad)
                TextField("Opening Balance", text: $openingBalance)
                    .keyboardType(.decimalPad)
            }

            if let err = errorMessage {
                Section {
                    Text(err).foregroundColor(.red).font(.caption)
                }
            }
        }
        .navigationTitle(isEditing ? "Edit Customer" : "Add Customer")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(isEditing ? "Update" : "Save") {
                    Task { await save() }
                }
                .disabled(name.isEmpty || isLoading)
            }
        }
        .onAppear {
            if let c = customer {
                name = c.name
                phone = c.phone ?? ""
                email = c.email ?? ""
                gstin = c.gstin ?? ""
                address = c.address ?? ""
                city = c.city ?? ""
                state = c.state ?? ""
                pincode = c.pincode ?? ""
                creditLimit = c.creditLimit.map { "\($0)" } ?? ""
                openingBalance = c.openingBalance.map { "\($0)" } ?? ""
            }
        }
        .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
    }

    private var gstinError: String? {
        let gstin = gstin.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !gstin.isEmpty else { return nil }
        let pattern = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$"
        let predicate = NSPredicate(format: "SELF MATCHES %@", pattern)
        return predicate.evaluate(with: gstin) ? nil : "Invalid GSTIN format"
    }

    private func save() async {
        isLoading = true
        errorMessage = nil

        if let gstinErr = gstinError {
            errorMessage = gstinErr
            isLoading = false
            return
        }

        let dto = CreateCustomerRequest(
            name: name,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            gstin: gstin.isEmpty ? nil : gstin,
            address: address.isEmpty ? nil : address,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state,
            pincode: pincode.isEmpty ? nil : pincode,
            creditLimit: Double(creditLimit),
            openingBalance: Double(openingBalance),
            groupId: nil
        )
        do {
            if isEditing, let c = customer {
                _ = try await viewModel.updateCustomer(businessId: business.id, customerId: c.id, dto)
            } else {
                _ = try await viewModel.createCustomer(businessId: business.id, dto)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

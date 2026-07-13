import SwiftUI

struct SupplierManagementView: View {
    let business: Business
    @StateObject private var viewModel = SupplierViewModel()
    @State private var showAddSheet = false

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.suppliers.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.suppliers.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No suppliers", systemImage: "person.2", description: Text("Add your first supplier"))
            } else {
                ForEach(viewModel.suppliers) { supplier in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(supplier.name).font(.body)
                        HStack {
                            if let phone = supplier.phone {
                                Label(phone, systemImage: "phone")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                            if let email = supplier.email {
                                Label(email, systemImage: "envelope")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        }
                        if let gstin = supplier.gstin {
                            Text("GSTIN: \(gstin)").font(.caption2).foregroundColor(.secondary)
                        }
                        if let addr = supplier.address {
                            Text(addr).font(.caption2).foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Suppliers")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await viewModel.loadSuppliers(businessId: business.id) }
        .refreshable { await viewModel.loadSuppliers(businessId: business.id) }
        .sheet(isPresented: $showAddSheet) {
            NavigationStack {
                AddSupplierSheet(business: business, viewModel: viewModel)
            }
        }
        .overlay { if viewModel.isLoading { ProgressView().scaleEffect(1.5) } }
    }
}

struct AddSupplierSheet: View {
    let business: Business
    @ObservedObject var viewModel: SupplierViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var gstin = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

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

            Section("GST") {
                TextField("GSTIN", text: $gstin)
                    .autocapitalization(.allCharacters)
            }

            Section("Address") {
                TextField("Address", text: $address)
                HStack {
                    TextField("City", text: $city)
                    TextField("State", text: $state)
                }
            }

            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }
        }
        .navigationTitle("Add Supplier")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task { await save() }
                }
                .disabled(name.isEmpty || isLoading)
            }
        }
    }

    private func save() async {
        isLoading = true
        errorMessage = nil
        let dto = CreateSupplierRequest(
            name: name,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            gstin: gstin.isEmpty ? nil : gstin,
            address: address.isEmpty ? nil : address,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state
        )
        do {
            _ = try await viewModel.createSupplier(businessId: business.id, dto)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class SupplierViewModel: ObservableObject {
    @Published var suppliers: [Supplier] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadSuppliers(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            suppliers = try await APIService.shared.getSuppliers(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createSupplier(businessId: String, _ dto: CreateSupplierRequest) async throws {
        let supp = try await APIService.shared.createSupplier(businessId: businessId, dto)
        suppliers.insert(supp, at: 0)
    }
}

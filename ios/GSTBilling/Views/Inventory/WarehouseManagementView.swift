import SwiftUI

struct WarehouseManagementView: View {
    let business: Business
    @StateObject private var viewModel = WarehouseViewModel()
    @State private var showAddSheet = false

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.warehouses.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.warehouses.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No warehouses", systemImage: "building.2", description: Text("Add your first warehouse"))
            } else {
                ForEach(viewModel.warehouses) { warehouse in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(warehouse.name).font(.body)
                        if let addr = warehouse.address {
                            Text(addr).font(.caption).foregroundColor(.secondary)
                        }
                        if let city = warehouse.city, let state = warehouse.state {
                            Text("\(city), \(state)").font(.caption2).foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Warehouses")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await viewModel.loadWarehouses(businessId: business.id) }
        .refreshable { await viewModel.loadWarehouses(businessId: business.id) }
        .sheet(isPresented: $showAddSheet) {
            NavigationStack {
                AddWarehouseSheet(business: business, viewModel: viewModel)
            }
        }
        .overlay { if viewModel.isLoading { ProgressView().scaleEffect(1.5) } }
    }
}

struct AddWarehouseSheet: View {
    let business: Business
    @ObservedObject var viewModel: WarehouseViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section("Warehouse Details") {
                TextField("Name *", text: $name)
                    .autocapitalization(.words)
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
        .navigationTitle("Add Warehouse")
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
        let dto = CreateWarehouseRequest(
            name: name,
            address: address.isEmpty ? nil : address,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state
        )
        do {
            _ = try await APIService.shared.createWarehouse(businessId: business.id, dto)
            await viewModel.loadWarehouses(businessId: business.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class WarehouseViewModel: ObservableObject {
    @Published var warehouses: [Warehouse] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadWarehouses(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            warehouses = try await APIService.shared.getWarehouses(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

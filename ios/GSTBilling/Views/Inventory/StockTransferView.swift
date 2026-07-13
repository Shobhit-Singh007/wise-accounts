import SwiftUI

struct StockTransferView: View {
    let business: Business
    @StateObject private var viewModel = StockTransferViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var selectedProductId: String?
    @State private var fromWarehouseId: String?
    @State private var toWarehouseId: String?
    @State private var quantity = ""
    @State private var batchNo = ""
    @State private var notes = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        Form {
            Section("Product") {
                if viewModel.products.isEmpty {
                    Text("No products").foregroundColor(.secondary)
                } else {
                    Picker("Product", selection: $selectedProductId) {
                        Text("Select").tag(nil as String?)
                        ForEach(viewModel.products) { p in
                            Text(p.name).tag(p.id as String?)
                        }
                    }
                }
            }

            Section("Warehouses") {
                if viewModel.warehouses.count < 2 {
                    Text("Need at least 2 warehouses").foregroundColor(.secondary)
                } else {
                    Picker("From Warehouse", selection: $fromWarehouseId) {
                        Text("Select").tag(nil as String?)
                        ForEach(viewModel.warehouses) { wh in
                            Text(wh.name).tag(wh.id as String?)
                        }
                    }
                    Picker("To Warehouse", selection: $toWarehouseId) {
                        Text("Select").tag(nil as String?)
                        ForEach(viewModel.warehouses) { wh in
                            Text(wh.name).tag(wh.id as String?)
                        }
                    }
                }
            }

            Section("Details") {
                TextField("Quantity", text: $quantity)
                    .keyboardType(.numberPad)
                TextField("Batch No (optional)", text: $batchNo)
                TextField("Notes (optional)", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }

            if let msg = successMessage {
                Section { Text(msg).foregroundColor(.green).font(.caption) }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    Text("Transfer Stock")
                        .frame(maxWidth: .infinity)
                }
                .disabled(selectedProductId == nil || fromWarehouseId == nil || toWarehouseId == nil || quantity.isEmpty || isLoading)
            }
        }
        .navigationTitle("Stock Transfer")
        .task {
            await viewModel.loadProducts(businessId: business.id)
            await viewModel.loadWarehouses(businessId: business.id)
        }
        .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
    }

    private func submit() async {
        guard let prodId = selectedProductId, let fromId = fromWarehouseId, let toId = toWarehouseId else {
            errorMessage = "Select all fields"
            return
        }
        guard let qty = Int(quantity), qty > 0 else {
            errorMessage = "Enter a valid quantity"
            return
        }
        guard fromId != toId else {
            errorMessage = "Source and destination warehouses must differ"
            return
        }
        isLoading = true
        errorMessage = nil
        successMessage = nil
        let dto = StockTransferRequest(
            productId: prodId,
            fromWarehouseId: fromId,
            toWarehouseId: toId,
            quantity: qty,
            batchNo: batchNo.isEmpty ? nil : batchNo,
            notes: notes.isEmpty ? nil : notes
        )
        do {
            _ = try await APIService.shared.transferStock(businessId: business.id, dto)
            successMessage = "Transfer completed"
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class StockTransferViewModel: ObservableObject {
    @Published var products: [Product] = []
    @Published var warehouses: [Warehouse] = []

    func loadProducts(businessId: String) async {
        do {
            products = try await APIService.shared.getProducts(businessId: businessId)
        } catch {}
    }

    func loadWarehouses(businessId: String) async {
        do {
            warehouses = try await APIService.shared.getWarehouses(businessId: businessId)
        } catch {}
    }
}

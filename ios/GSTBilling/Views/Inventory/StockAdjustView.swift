import SwiftUI

struct StockAdjustView: View {
    let business: Business
    let productId: String
    @StateObject private var viewModel = StockAdjustViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var adjustmentType = "PURCHASE"
    @State private var quantity = ""
    @State private var batchNo = ""
    @State private var notes = ""
    @State private var selectedWarehouseId: String?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let adjustmentTypes = ["PURCHASE", "SALE", "ADJUSTMENT", "RETURN"]

    var body: some View {
        Form {
            Section("Current Stock") {
                if let product = viewModel.product {
                    LabeledContent("Product", value: product.name)
                    if let qty = product.stockQuantity {
                        LabeledContent("Current Stock", value: "\(qty)")
                    }
                } else {
                    ProgressView()
                }
            }

            Section("Adjustment") {
                Picker("Type", selection: $adjustmentType) {
                    ForEach(adjustmentTypes, id: \.self) { Text($0).tag($0) }
                }
                TextField("Quantity", text: $quantity)
                    .keyboardType(.numberPad)
                TextField("Batch No (optional)", text: $batchNo)
            }

            Section("Warehouse (optional)") {
                if viewModel.warehouses.isEmpty {
                    Text("No warehouses").foregroundColor(.secondary)
                } else {
                    Picker("Warehouse", selection: $selectedWarehouseId) {
                        Text("None").tag(nil as String?)
                        ForEach(viewModel.warehouses) { wh in
                            Text(wh.name).tag(wh.id as String?)
                        }
                    }
                }
            }

            Section("Notes (optional)") {
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    Text("Submit Adjustment")
                        .frame(maxWidth: .infinity)
                }
                .disabled(quantity.isEmpty || isLoading)
            }
        }
        .navigationTitle("Adjust Stock")
        .task {
            await viewModel.loadProduct(businessId: business.id, productId: productId)
            await viewModel.loadWarehouses(businessId: business.id)
        }
        .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
    }

    private func submit() async {
        guard let qty = Int(quantity), qty > 0 else {
            errorMessage = "Enter a valid quantity"
            return
        }
        isLoading = true
        errorMessage = nil
        let dto = StockAdjustRequest(
            type: adjustmentType,
            quantity: qty,
            warehouseId: selectedWarehouseId,
            batchNo: batchNo.isEmpty ? nil : batchNo,
            notes: notes.isEmpty ? nil : notes
        )
        do {
            _ = try await APIService.shared.adjustStock(businessId: business.id, productId: productId, dto)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class StockAdjustViewModel: ObservableObject {
    @Published var product: Product?
    @Published var warehouses: [Warehouse] = []

    func loadProduct(businessId: String, productId: String) async {
        do {
            product = try await APIService.shared.getProduct(businessId: businessId, productId: productId)
        } catch {}
    }

    func loadWarehouses(businessId: String) async {
        do {
            warehouses = try await APIService.shared.getWarehouses(businessId: businessId)
        } catch {}
    }
}

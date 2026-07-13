import SwiftUI

struct PurchaseOrderView: View {
    let business: Business
    @StateObject private var viewModel = PurchaseOrderViewModel()
    @State private var showCreateSheet = false

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.purchaseOrders.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.purchaseOrders.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No purchase orders", systemImage: "doc.plaintext", description: Text("Create your first purchase order"))
            } else {
                ForEach(viewModel.purchaseOrders) { po in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(po.orderNo).font(.headline)
                            Spacer()
                            StatusBadge(status: po.status)
                        }
                        if let supplierName = po.supplier?.name {
                            Text(supplierName).font(.caption).foregroundColor(.secondary)
                        }
                        if let date = po.orderDate {
                            Text(Helpers.formatDate(date)).font(.caption2).foregroundColor(.secondary)
                        }
                        if let total = po.grandTotal {
                            Text(Helpers.formatCurrency(total)).font(.callout)
                        }
                        if po.status != "RECEIVED" {
                            Button {
                                Task { await viewModel.receiveOrder(businessId: business.id, orderId: po.id) }
                            } label: {
                                Label("Mark Received", systemImage: "checkmark.circle")
                                    .font(.caption)
                            }
                            .buttonStyle(.bordered)
                            .tint(.green)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Purchase Orders")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showCreateSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await viewModel.loadPurchaseOrders(businessId: business.id) }
        .refreshable { await viewModel.loadPurchaseOrders(businessId: business.id) }
        .sheet(isPresented: $showCreateSheet) {
            NavigationStack {
                CreatePurchaseOrderSheet(business: business, viewModel: viewModel)
            }
        }
        .overlay { if viewModel.isLoading { ProgressView().scaleEffect(1.5) } }
    }
}

struct StatusBadge: View {
    let status: String?
    var body: some View {
        Text(status ?? "PENDING")
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.15))
            .foregroundColor(statusColor)
            .clipShape(Capsule())
    }

    private var statusColor: Color {
        switch status {
        case "RECEIVED": return .green
        case "CANCELLED": return .red
        case "CONFIRMED": return .blue
        default: return .orange
        }
    }
}

struct CreatePurchaseOrderSheet: View {
    let business: Business
    @ObservedObject var viewModel: PurchaseOrderViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedSupplierId: String?
    @State private var productId: String?
    @State private var quantity = ""
    @State private var unitPrice = ""
    @State private var notes = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var suppliers: [Supplier] = []
    @State private var products: [Product] = []

    var body: some View {
        Form {
            Section("Supplier") {
                Picker("Supplier (optional)", selection: $selectedSupplierId) {
                    Text("None").tag(nil as String?)
                    ForEach(suppliers) { s in
                        Text(s.name).tag(s.id as String?)
                    }
                }
            }

            Section("Item") {
                Picker("Product", selection: $productId) {
                    Text("Select").tag(nil as String?)
                    ForEach(products) { p in
                        Text(p.name).tag(p.id as String?)
                    }
                }
                TextField("Quantity", text: $quantity)
                    .keyboardType(.numberPad)
                TextField("Unit Price", text: $unitPrice)
                    .keyboardType(.decimalPad)
            }

            Section("Notes (optional)") {
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }

            Section {
                Button {
                    Task { await create() }
                } label: {
                    Text("Create Purchase Order")
                        .frame(maxWidth: .infinity)
                }
                .disabled(productId == nil || quantity.isEmpty || unitPrice.isEmpty || isLoading)
            }
        }
        .navigationTitle("New Purchase Order")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .task {
            async let s: () = loadSuppliers()
            async let p: () = loadProducts()
            _ = await (s, p)
        }
    }

    private func loadSuppliers() async {
        do {
            suppliers = try await APIService.shared.getSuppliers(businessId: business.id)
        } catch {}
    }

    private func loadProducts() async {
        do {
            products = try await APIService.shared.getProducts(businessId: business.id)
        } catch {}
    }

    private func create() async {
        guard let prodId = productId, let qty = Int(quantity), let price = Double(unitPrice) else {
            errorMessage = "Fill all required fields"
            return
        }
        isLoading = true
        errorMessage = nil
        let item = PurchaseOrderItemRequest(productId: prodId, quantity: qty, unitPrice: price, batchNo: nil)
        let dto = CreatePurchaseOrderRequest(
            supplierId: selectedSupplierId,
            expectedDate: nil,
            items: [item],
            notes: notes.isEmpty ? nil : notes
        )
        do {
            _ = try await viewModel.createPurchaseOrder(businessId: business.id, dto)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class PurchaseOrderViewModel: ObservableObject {
    @Published var purchaseOrders: [PurchaseOrder] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadPurchaseOrders(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            purchaseOrders = try await APIService.shared.getPurchaseOrders(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createPurchaseOrder(businessId: String, _ dto: CreatePurchaseOrderRequest) async throws {
        let po = try await APIService.shared.createPurchaseOrder(businessId: businessId, dto)
        purchaseOrders.insert(po, at: 0)
    }

    func receiveOrder(businessId: String, orderId: String) async {
        do {
            let po = try await APIService.shared.receivePurchaseOrder(businessId: businessId, orderId: orderId)
            if let idx = purchaseOrders.firstIndex(where: { $0.id == orderId }) {
                purchaseOrders[idx] = po
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

import SwiftUI

struct BulkInvoiceView: View {
    let business: Business
    @StateObject private var viewModel = BulkInvoiceViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            Section("Bulk Invoice Entries") {
                ForEach(viewModel.entries.indices, id: \.self) { index in
                    BulkInvoiceEntryRow(entry: $viewModel.entries[index], customers: viewModel.customers)
                }
                .onDelete { viewModel.removeEntry(at: $0) }

                Button {
                    viewModel.addEntry()
                } label: {
                    Label("Add Entry", systemImage: "plus.circle")
                }
            }

            if !viewModel.results.isEmpty {
                Section("Results") {
                    ForEach(viewModel.results) { result in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(result.customerName)
                                    .font(.callout)
                                Text(result.status)
                                    .font(.caption)
                                    .foregroundColor(result.success ? .green : .red)
                            }
                            Spacer()
                            if result.success {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
            }

            if let err = viewModel.errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }
        }
        .navigationTitle("Bulk Invoices")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Create All") { Task { await createAll() } }
                    .disabled(viewModel.entries.isEmpty || viewModel.isCreating)
            }
        }
        .task {
            let bizId = authManager.businessId
            await viewModel.loadCustomers(businessId: bizId)
        }
        .overlay { if viewModel.isCreating { ProgressView().scaleEffect(1.5) } }
    }

    private func createAll() async {
        let bizId = authManager.businessId
        await viewModel.createAllInvoices(businessId: bizId)
    }
}

struct BulkInvoiceEntryRow: View {
    @Binding var entry: BulkInvoiceEntry
    let customers: [Customer]

    var body: some View {
        VStack(spacing: 8) {
            Picker("Customer", selection: $entry.customerId) {
                Text("Walk-in").tag(String?.none)
                ForEach(customers) { cust in
                    Text(cust.name).tag(Optional(cust.id))
                }
            }
            TextField("Item Name", text: $entry.itemName)
            HStack {
                TextField("Qty", value: $entry.quantity, format: .number)
                    .keyboardType(.decimalPad)
                    .frame(width: 60)
                Spacer()
                TextField("Rate", value: $entry.rate, format: .number)
                    .keyboardType(.decimalPad)
                    .frame(width: 80)
            }
        }
        .padding(.vertical, 4)
    }
}

struct BulkInvoiceEntry: Identifiable {
    let id = UUID()
    var customerId: String?
    var itemName = ""
    var quantity: Double = 1
    var rate: Double = 0
}

struct BulkCreateResult: Identifiable {
    let id = UUID()
    let customerName: String
    let success: Bool
    let invoiceNo: String?
    let error: String?
}

@MainActor
class BulkInvoiceViewModel: ObservableObject {
    @Published var entries: [BulkInvoiceEntry] = []
    @Published var results: [BulkCreateResult] = []
    @Published var customers: [Customer] = []
    @Published var isCreating = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    func loadCustomers(businessId: String) async {
        do {
            customers = try await apiService.getCustomers(businessId: businessId)
        } catch {}
    }

    func addEntry() {
        entries.append(BulkInvoiceEntry())
    }

    func removeEntry(at offsets: IndexSet) {
        entries.remove(atOffsets: offsets)
    }

    func createAllInvoices(businessId: String) async {
        isCreating = true
        results = []

        for entry in entries {
            let custName = customers.first(where: { $0.id == entry.customerId })?.name ?? "Walk-in"
            let items = [CreateInvoiceItemRequest(
                productId: nil,
                itemName: entry.itemName,
                quantity: entry.quantity,
                unit: "piece",
                rate: entry.rate,
                discount: nil,
                taxRate: 18,
                batchNo: nil,
                expiryDate: nil
            )]
            let dto = CreateInvoiceRequest(
                type: "B2C",
                direction: "SALE",
                customerId: entry.customerId,
                supplierId: nil,
                invoiceDate: Helpers.isoString(from: Date()),
                dueDate: nil,
                discount: nil,
                notes: nil,
                terms: nil,
                items: items,
                referenceId: nil
            )
            do {
                let invoice = try await apiService.createInvoice(businessId: businessId, dto)
                results.append(BulkCreateResult(customerName: custName, success: true, invoiceNo: invoice.invoiceNo, error: nil))
            } catch {
                results.append(BulkCreateResult(customerName: custName, success: false, invoiceNo: nil, error: error.localizedDescription))
            }
        }
        isCreating = false
    }
}

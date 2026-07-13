import SwiftUI

struct RecordPaymentFullView: View {
    let business: Business
    var preselectedInvoiceId: String?
    var preselectedCustomerId: String?
    var onSave: (() -> Void)?

    @StateObject private var viewModel = RecordPaymentViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            Section("Payment Details") {
                TextField("Amount *", text: $viewModel.amount)
                    .keyboardType(.decimalPad)
                Picker("Method", selection: $viewModel.method) {
                    ForEach(Constants.paymentMethods, id: \.self) { m in
                        Text(m.replacingOccurrences(of: "_", with: " ").capitalized).tag(m)
                    }
                }
            }

            Section("Reference") {
                if !viewModel.invoices.isEmpty {
                    Picker("Invoice", selection: $viewModel.invoiceId) {
                        Text("None").tag("")
                        ForEach(viewModel.invoices) { inv in
                            Text("\(inv.invoiceNo) - \(Helpers.formatCurrency(inv.grandTotal ?? 0))").tag(inv.id)
                        }
                    }
                }
                if !viewModel.customers.isEmpty {
                    Picker("Customer", selection: $viewModel.customerId) {
                        Text("None").tag("")
                        ForEach(viewModel.customers) { cust in
                            Text(cust.name).tag(cust.id)
                        }
                    }
                }
                TextField("Reference Number", text: $viewModel.reference)
                TextField("Notes", text: $viewModel.notes, axis: .vertical)
                    .lineLimit(3)
            }

            if let err = viewModel.errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }
        }
        .navigationTitle("Record Payment")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { Task { await save() } }
                    .disabled(viewModel.amount.isEmpty || viewModel.isSaving)
            }
        }
        .task {
            let bizId = authManager.businessId
            await viewModel.loadData(businessId: bizId)
            if let invId = preselectedInvoiceId { viewModel.invoiceId = invId }
            if let custId = preselectedCustomerId { viewModel.customerId = custId }
        }
        .overlay { if viewModel.isSaving { ProgressView().scaleEffect(1.5) } }
    }

    private func save() async {
        let bizId = authManager.businessId
        await viewModel.savePayment(businessId: bizId)
        if viewModel.saved {
            onSave?()
            dismiss()
        }
    }
}

@MainActor
class RecordPaymentViewModel: ObservableObject {
    @Published var amount = ""
    @Published var method = "CASH"
    @Published var invoiceId = ""
    @Published var customerId = ""
    @Published var reference = ""
    @Published var notes = ""
    @Published var invoices: [Invoice] = []
    @Published var customers: [Customer] = []
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var saved = false

    private let apiService = APIService.shared

    func loadData(businessId: String) async {
        do {
            async let invs: [Invoice] = apiService.getInvoices(businessId: businessId, status: "CONFIRMED")
            async let custs: [Customer] = apiService.getCustomers(businessId: businessId)
            (invoices, customers) = try await (invs, custs)
        } catch {}
    }

    func savePayment(businessId: String) async {
        guard let amt = Double(amount), amt > 0 else {
            errorMessage = "Enter a valid amount"
            return
        }
        isSaving = true
        errorMessage = nil
        let dto = CreatePaymentRequest(
            invoiceId: invoiceId.isEmpty ? nil : invoiceId,
            customerId: customerId.isEmpty ? nil : customerId,
            amount: amt,
            method: method,
            reference: reference.isEmpty ? nil : reference,
            notes: notes.isEmpty ? nil : notes
        )
        do {
            _ = try await apiService.recordPayment(businessId: businessId, dto)
            saved = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}

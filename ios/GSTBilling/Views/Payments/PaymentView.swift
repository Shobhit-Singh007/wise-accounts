import SwiftUI

struct PaymentView: View {
    let business: Business
    @State private var payments: [Payment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRecordPayment = false

    private let apiService = APIService.shared

    var body: some View {
        List {
            if let err = errorMessage, payments.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(err))
            } else if payments.isEmpty && !isLoading {
                ContentUnavailableView("No payments", systemImage: "creditcard", description: Text("Record your first payment"))
            } else {
                ForEach(payments) { payment in
                    PaymentRow(payment: payment)
                }
            }
        }
        .task { await loadPayments() }
        .refreshable { await loadPayments() }
        .navigationTitle("Payments")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Record") { showRecordPayment = true }
            }
        }
        .sheet(isPresented: $showRecordPayment) {
            RecordPaymentView(business: business, onSave: { Task { await loadPayments() } })
        }
    }

    private func loadPayments() async {
        isLoading = true
        errorMessage = nil
        do {
            let data: [Payment] = try await apiService.getPayments(businessId: business.id)
            payments = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct PaymentRow: View {
    let payment: Payment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: Helpers.paymentMethodIcon(payment.method))
                .foregroundColor(.blue)
                .frame(width: 32)

            VStack(alignment: .leading) {
                Text(payment.method.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.callout)
                if let ref = payment.reference {
                    Text(ref).font(.caption2).foregroundColor(.secondary)
                }
                Text(Helpers.formatDate(payment.paidAt))
                    .font(.caption2).foregroundColor(.secondary)
                if let customer = payment.customer {
                    Text(customer.name).font(.caption).foregroundColor(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(Helpers.formatCurrency(payment.amount))
                    .font(.callout).fontWeight(.semibold)
                if let inv = payment.invoice {
                    Text(inv.invoiceNo).font(.caption2).foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct RecordPaymentView: View {
    let business: Business
    let onSave: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var amount = ""
    @State private var method = "CASH"
    @State private var invoiceId = ""
    @State private var customerId = ""
    @State private var reference = ""
    @State private var notes = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    @State private var invoices: [Invoice] = []
    @State private var customers: [Customer] = []

    private let apiService = APIService.shared

    var body: some View {
        NavigationStack {
            Form {
                Section("Payment Details") {
                    TextField("Amount *", text: $amount)
                        .keyboardType(.decimalPad)
                    Picker("Method", selection: $method) {
                        ForEach(Constants.paymentMethods, id: \.self) { m in
                            Text(m.replacingOccurrences(of: "_", with: " ").capitalized).tag(m)
                        }
                    }
                }

                Section("Reference") {
                    if !invoices.isEmpty {
                        Picker("Invoice", selection: $invoiceId) {
                            Text("None").tag("")
                            ForEach(invoices) { inv in
                                Text("\(inv.invoiceNo) - \(Helpers.formatCurrency(inv.grandTotal ?? 0))").tag(inv.id)
                            }
                        }
                    }
                    if !customers.isEmpty {
                        Picker("Customer", selection: $customerId) {
                            Text("None").tag("")
                            ForEach(customers) { cust in
                                Text(cust.name).tag(cust.id)
                            }
                        }
                    }
                    TextField("Reference No", text: $reference)
                    TextField("Notes", text: $notes, axis: .vertical).lineLimit(3)
                }

                if let err = errorMessage {
                    Section { Text(err).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Record Payment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(amount.isEmpty || isLoading)
                }
            }
            .task {
                async let invs: [Invoice] = apiService.getInvoices(businessId: business.id, status: "CONFIRMED")
                async let custs: [Customer] = apiService.getCustomers(businessId: business.id)
                (invoices, customers) = try await (invs, custs)
            }
            .overlay { if isLoading { ProgressView() } }
        }
    }

    private func save() async {
        guard let amt = Double(amount), amt > 0 else {
            errorMessage = "Enter valid amount"
            return
        }
        isLoading = true
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
            _ = try await apiService.recordPayment(businessId: business.id, dto)
            onSave()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

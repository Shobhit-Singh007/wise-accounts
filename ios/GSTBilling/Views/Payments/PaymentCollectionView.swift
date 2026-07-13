import SwiftUI

struct PaymentCollectionView: View {
    let business: Business
    @StateObject private var viewModel = PaymentCollectionViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            Section {
                Picker("Customer", selection: $viewModel.selectedCustomerId) {
                    Text("All Customers").tag(String?.none)
                    ForEach(viewModel.customers) { cust in
                        Text(cust.name).tag(Optional(cust.id))
                    }
                }
                .onChange(of: viewModel.selectedCustomerId) { _ in
                    Task { await viewModel.loadPayments(businessId: authManager.businessId) }
                }
            }

            if let err = viewModel.errorMessage, viewModel.payments.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(err))
            } else if viewModel.payments.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No payments", systemImage: "creditcard", description: Text("Record your first payment"))
            } else {
                Section("Payments (\(viewModel.payments.count))") {
                    ForEach(viewModel.payments) { payment in
                        PaymentCollectionRow(payment: payment)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .task { await viewModel.loadPayments(businessId: authManager.businessId) }
        .refreshable { await viewModel.loadPayments(businessId: authManager.businessId) }
        .navigationTitle("Payments")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink("Record") {
                    RecordPaymentFullView(business: business)
                }
            }
        }
    }
}

struct PaymentCollectionRow: View {
    let payment: Payment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: Helpers.paymentMethodIcon(payment.method))
                .foregroundColor(.blue)
                .frame(width: 32)

            VStack(alignment: .leading) {
                Text(payment.method.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.callout).fontWeight(.medium)
                if let customer = payment.customer {
                    Text(customer.name).font(.caption).foregroundColor(.secondary)
                }
                Text(Helpers.formatDate(payment.paidAt))
                    .font(.caption2).foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(Helpers.formatCurrency(payment.amount))
                    .font(.callout).fontWeight(.semibold)
                if let inv = payment.invoice {
                    Text(inv.invoiceNo).font(.caption2).foregroundColor(.secondary)
                }
                if let ref = payment.reference, !ref.isEmpty {
                    Text(ref).font(.caption2).foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

@MainActor
class PaymentCollectionViewModel: ObservableObject {
    @Published var payments: [Payment] = []
    @Published var customers: [Customer] = []
    @Published var selectedCustomerId: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    func loadPayments(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let allPayments: [Payment] = try await apiService.getPayments(businessId: businessId)
            if let custId = selectedCustomerId {
                payments = allPayments.filter { $0.customerId == custId }
            } else {
                payments = allPayments
            }
            if customers.isEmpty {
                customers = try await apiService.getCustomers(businessId: businessId)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

import SwiftUI

struct PaymentHistoryView: View {
    let business: Business
    @StateObject private var viewModel = PaymentHistoryViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            Section {
                DatePicker("From", selection: $viewModel.startDate, displayedComponents: .date)
                DatePicker("To", selection: $viewModel.endDate, displayedComponents: .date)
                Picker("Method", selection: $viewModel.selectedMethod) {
                    Text("All Methods").tag(String?.none)
                    ForEach(Constants.paymentMethods, id: \.self) { m in
                        Text(m.replacingOccurrences(of: "_", with: " ").capitalized).tag(Optional(m))
                    }
                }
                .onChange(of: viewModel.selectedMethod) { _, _ in
                    Task { await viewModel.loadPayments(businessId: authManager.businessId) }
                }
            }

            if let err = viewModel.errorMessage, viewModel.payments.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(err))
            } else if viewModel.payments.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No payments", systemImage: "creditcard", description: Text("No payments found for selected filters"))
            } else {
                Section("Payments (\(viewModel.filteredPayments.count))") {
                    ForEach(viewModel.filteredPayments) { payment in
                        PaymentHistoryRow(payment: payment) {
                            Task { await downloadReceipt(paymentId: payment.id) }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .task { await viewModel.loadPayments(businessId: authManager.businessId) }
        .refreshable { await viewModel.loadPayments(businessId: authManager.businessId) }
        .navigationTitle("Payment History")
    }

    private func downloadReceipt(paymentId: String) async {
        let bizId = authManager.businessId
        let urlString = "\(Constants.baseURL)/businesses/\(bizId)/payments/\(paymentId)/receipt"
        guard let url = URL(string: urlString) else { return }
        do {
            var urlRequest = URLRequest(url: url)
            urlRequest.httpMethod = "GET"
            if let token = authManager.accessToken {
                urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let (data, response) = try await URLSession.shared.data(for: urlRequest)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return }
            await MainActor.run {
                let tmpUrl = FileManager.default.temporaryDirectory.appendingPathComponent("receipt-\(paymentId).pdf")
                try? data.write(to: tmpUrl)
                let activityVC = UIActivityViewController(activityItems: [tmpUrl], applicationActivities: nil)
                if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let root = scene.windows.first?.rootViewController {
                    root.present(activityVC, animated: true)
                }
            }
        } catch {}
    }
}

struct PaymentHistoryRow: View {
    let payment: Payment
    let onDownloadReceipt: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: Helpers.paymentMethodIcon(payment.method))
                    .foregroundColor(.blue)
                Text(payment.method.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.callout).fontWeight(.medium)
                Spacer()
                Text(Helpers.formatCurrency(payment.amount))
                    .font(.callout).fontWeight(.semibold)
            }
            if let customer = payment.customer {
                Text(customer.name).font(.caption).foregroundColor(.secondary)
            }
            if let inv = payment.invoice {
                Text("Invoice: \(inv.invoiceNo)").font(.caption).foregroundColor(.secondary)
            }
            if let ref = payment.reference, !ref.isEmpty {
                Text("Ref: \(ref)").font(.caption2).foregroundColor(.secondary)
            }
            if let notes = payment.notes, !notes.isEmpty {
                Text(notes).font(.caption2).foregroundColor(.secondary).lineLimit(2)
            }
            HStack {
                Text(Helpers.formatDate(payment.paidAt))
                    .font(.caption2).foregroundColor(.secondary)
                Spacer()
                Button {
                    onDownloadReceipt()
                } label: {
                    Label("Receipt", systemImage: "arrow.down.doc")
                        .font(.caption)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

@MainActor
class PaymentHistoryViewModel: ObservableObject {
    @Published var payments: [Payment] = []
    @Published var startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published var endDate = Date()
    @Published var selectedMethod: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    var filteredPayments: [Payment] {
        payments.filter { payment in
            if let method = selectedMethod, payment.method != method { return false }
            if let paidAt = payment.paidAt, let payDate = Helpers.dateFromISO(paidAt) {
                let cal = Calendar.current
                let start = cal.startOfDay(for: startDate)
                let end = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: endDate)) ?? endDate
                return payDate >= start && payDate < end
            }
            return true
        }
    }

    func loadPayments(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            payments = try await apiService.getPayments(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

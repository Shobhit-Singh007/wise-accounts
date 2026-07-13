import SwiftUI

struct InvoiceShareView: View {
    let business: Business
    let invoiceId: String
    let invoiceNo: String
    let grandTotal: Double
    let paidAmount: Double

    @StateObject private var viewModel = InvoiceShareViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Invoice Summary") {
                    LabeledContent("Invoice No", value: invoiceNo)
                    LabeledContent("Total", value: Helpers.formatCurrency(grandTotal))
                    LabeledContent("Balance", value: Helpers.formatCurrency(grandTotal - paidAmount))
                }

                Section("Share Via") {
                    ForEach(InvoiceShareViewModel.ShareMethod.allCases, id: \.self) { method in
                        Button {
                            viewModel.selectedMethod = method
                        } label: {
                            HStack {
                                Label(method.title, systemImage: method.icon)
                                    .foregroundColor(.primary)
                                Spacer()
                                if viewModel.selectedMethod == method {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }

                Section("Custom Message (Optional)") {
                    TextEditor(text: $viewModel.message)
                        .frame(minHeight: 80)
                }

                if let err = viewModel.errorMessage {
                    Section { Text(err).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Share Invoice")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Share") { Task { await share() } }
                        .disabled(viewModel.selectedMethod == nil || viewModel.isSending)
                }
            }
            .overlay { if viewModel.isSending { ProgressView().scaleEffect(1.5) } }
            .alert("Success", isPresented: $viewModel.showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Invoice shared successfully.")
            }
        }
    }

    private func share() async {
        let bizId = authManager.businessId
        await viewModel.shareInvoice(businessId: bizId, invoiceId: invoiceId)
    }
}

@MainActor
class InvoiceShareViewModel: ObservableObject {
    @Published var selectedMethod: ShareMethod?
    @Published var message = ""
    @Published var isSending = false
    @Published var errorMessage: String?
    @Published var showSuccess = false

    enum ShareMethod: String, CaseIterable {
        case sms
        case email
        case whatsapp

        var title: String {
            switch self {
            case .sms: return "SMS"
            case .email: return "Email"
            case .whatsapp: return "WhatsApp"
            }
        }

        var icon: String {
            switch self {
            case .sms: return "message"
            case .email: return "envelope"
            case .whatsapp: return "phone"
            }
        }
    }

    func shareInvoice(businessId: String, invoiceId: String) async {
        guard let method = selectedMethod else { return }
        isSending = true
        errorMessage = nil

        struct ShareRequest: Codable {
            let method: String
            let message: String?
        }

        do {
            let _: [String: AnyCodable] = try await APIService.shared.request(
                .billing(businessId),
                endpoint: "\(invoiceId)/share",
                method: "POST",
                body: ShareRequest(method: method.rawValue, message: message.isEmpty ? nil : message)
            )
            showSuccess = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isSending = false
    }
}

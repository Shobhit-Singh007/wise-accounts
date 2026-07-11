import SwiftUI

struct InvoiceSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss
    @State private var settings = InvoiceSettings()
    @State private var isLoading = false
    @State private var isSaving = false
    @State private var toastMessage: String?

    var body: some View {
        Form {
            Section("Invoice Numbering") {
                TextField("Invoice Prefix", text: $settings.invoicePrefix)
                TextField("Starting Number", value: $settings.startingNumber, format: .number)
                    .keyboardType(.numberPad)
            }

            Section("Defaults") {
                TextField("Default Notes", text: $settings.defaultNotes, axis: .vertical)
                    .lineLimit(3)
                TextField("Default Terms & Conditions", text: $settings.defaultTerms, axis: .vertical)
                    .lineLimit(3)
            }

            Section("Bank Details") {
                TextField("Bank Name", text: $settings.bankName)
                TextField("Account Number", text: $settings.bankAccountNo)
                    .keyboardType(.numberPad)
                TextField("IFSC Code", text: $settings.bankIfsc)
                    .autocapitalization(.allCharacters)
                TextField("Branch", text: $settings.bankBranch)
                TextField("UPI ID", text: $settings.upiId)
                    .autocapitalization(.none)
            }

            Section("Display") {
                Toggle("Show GSTIN", isOn: $settings.showGstin)
                Toggle("Show Bank Details", isOn: $settings.showBankDetails)
                Toggle("Show QR Code", isOn: $settings.showQrCode)
            }

            Section {
                Button(isSaving ? "Saving..." : "Save Settings") {
                    Task { await save() }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Invoice Settings")
        .task { await load() }
        .overlay {
            if isLoading { ProgressView().scaleEffect(1.5) }
        }
        .overlay(alignment: .bottom) {
            if let msg = toastMessage {
                Text(msg)
                    .padding()
                    .background(Color.black.opacity(0.75))
                    .foregroundColor(.white)
                    .cornerRadius(8)
                    .padding(.bottom, 16)
                    .transition(.move(edge: .bottom))
                    .animation(.easeInOut, value: toastMessage)
            }
        }
    }

    private func load() async {
        isLoading = true
        do {
            settings = try await APIService.shared.getInvoiceSettings(businessId: business.id)
        } catch {
            toastMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        let req = InvoiceSettingsRequest(
            invoicePrefix: settings.invoicePrefix,
            startingNumber: settings.startingNumber,
            defaultNotes: settings.defaultNotes,
            defaultTerms: settings.defaultTerms,
            bankName: settings.bankName,
            bankAccountNo: settings.bankAccountNo,
            bankIfsc: settings.bankIfsc,
            bankBranch: settings.bankBranch,
            upiId: settings.upiId,
            showGstin: settings.showGstin,
            showBankDetails: settings.showBankDetails,
            showQrCode: settings.showQrCode
        )
        do {
            try await APIService.shared.updateInvoiceSettings(businessId: business.id, data: req)
            toastMessage = "Settings saved"
        } catch {
            toastMessage = error.localizedDescription
        }
        isSaving = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { toastMessage = nil }
    }
}

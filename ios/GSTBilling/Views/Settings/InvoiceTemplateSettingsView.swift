import SwiftUI

struct InvoiceTemplateSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var invoicePrefix = "INV"
    @State private var startingNumber = 1001
    @State private var termsAndConditions = ""
    @State private var bankAccountName = ""
    @State private var bankAccountNumber = ""
    @State private var bankIFSC = ""
    @State private var bankName = ""
    @State private var toastMessage: String?

    var body: some View {
        Form {
            Section("Invoice Numbering") {
                TextField("Invoice Prefix", text: $invoicePrefix)
                    .autocapitalization(.allCharacters)
                HStack {
                    Text("Starting Number")
                    Spacer()
                    TextField("1001", value: $startingNumber, format: .number)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                }
            }

            Section("Terms & Conditions") {
                TextEditor(text: $termsAndConditions)
                    .frame(minHeight: 100)
            }

            Section("Bank Details") {
                TextField("Account Name", text: $bankAccountName)
                    .autocapitalization(.words)
                TextField("Account Number", text: $bankAccountNumber)
                    .keyboardType(.numberPad)
                TextField("IFSC Code", text: $bankIFSC)
                    .autocapitalization(.allCharacters)
                TextField("Bank Name", text: $bankName)
                    .autocapitalization(.words)
            }

            Section {
                Button("Save Template Settings") {
                    toastMessage = "Template settings saved"
                }
            }
        }
        .navigationTitle("Invoice Template")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if let msg = toastMessage {
                VStack {
                    Spacer()
                    Text(msg)
                        .padding()
                        .background(Color.black.opacity(0.75))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 32)
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: toastMessage)
                .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { toastMessage = nil } }
            }
        }
    }
}

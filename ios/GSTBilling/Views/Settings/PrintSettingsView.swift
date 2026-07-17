import SwiftUI

struct PrintSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var bluetoothPrinterEnabled = false
    @State private var autoPrintAfterInvoice = false
    @State private var numberOfCopies = 1
    @State private var paperSize = "A4"
    @State private var toastMessage: String?

    private let paperSizes = ["A4", "58mm", "80mm"]

    var body: some View {
        Form {
            Section("Printer") {
                Toggle("Bluetooth Printer", isOn: $bluetoothPrinterEnabled)
                Toggle("Auto-Print After Invoice", isOn: $autoPrintAfterInvoice)
            }

            Section("Print Options") {
                Stepper("Copies: \(numberOfCopies)", value: $numberOfCopies, in: 1...5)
                Picker("Paper Size", selection: $paperSize) {
                    ForEach(paperSizes, id: \.self) { Text($0) }
                }
            }

            Section {
                Button("Save Print Settings") {
                    toastMessage = "Print settings saved"
                }
            }
        }
        .navigationTitle("Print Settings")
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

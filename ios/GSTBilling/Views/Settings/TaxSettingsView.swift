import SwiftUI

struct TaxSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var defaultGSTRate: Double = 18.0
    @State private var cgstEnabled = true
    @State private var sgstEnabled = true
    @State private var igstEnabled = true
    @State private var defaultHSNCode = ""
    @State private var defaultSACCode = ""
    @State private var toastMessage: String?

    private let gstRates: [Double] = [0, 5, 12, 18, 28]

    var body: some View {
        Form {
            Section("Default GST Rate") {
                Picker("GST Rate", selection: $defaultGSTRate) {
                    ForEach(gstRates, id: \.self) { rate in
                        Text("\(Int(rate))%").tag(rate)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Tax Components") {
                Toggle("CGST (Central GST)", isOn: $cgstEnabled)
                Toggle("SGST (State GST)", isOn: $sgstEnabled)
                Toggle("IGST (Integrated GST)", isOn: $igstEnabled)
            }

            Section("Default Codes") {
                TextField("Default HSN Code", text: $defaultHSNCode)
                    .autocapitalization(.allCharacters)
                TextField("Default SAC Code", text: $defaultSACCode)
                    .autocapitalization(.allCharacters)
            }

            Section {
                Button("Save Tax Settings") {
                    toastMessage = "Tax settings saved"
                }
            }
        }
        .navigationTitle("Tax Settings")
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

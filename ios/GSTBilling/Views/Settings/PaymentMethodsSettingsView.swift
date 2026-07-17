import SwiftUI

struct PaymentMethodsSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var upiId = ""
    @State private var razorpayKeyId = ""
    @State private var razorpayKeySecret = ""
    @State private var bankAccountName = ""
    @State private var bankAccountNumber = ""
    @State private var bankIFSC = ""
    @State private var bankName = ""
    @State private var toastMessage: String?

    var body: some View {
        Form {
            Section("UPI") {
                TextField("UPI ID", text: $upiId)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
            }

            Section("Razorpay") {
                TextField("Key ID", text: $razorpayKeyId)
                    .autocapitalization(.none)
                SecureField("Key Secret", text: $razorpayKeySecret)
                    .autocapitalization(.none)
            }

            Section("Bank Transfer Details") {
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
                Button("Save Payment Settings") {
                    toastMessage = "Payment settings saved"
                }
            }
        }
        .navigationTitle("Payment Methods")
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

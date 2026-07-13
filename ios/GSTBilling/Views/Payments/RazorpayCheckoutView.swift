import SwiftUI

// MARK: - Razorpay iOS SDK Integration Note
// In production, integrate the Razorpay iOS SDK via CocoaPods:
//   pod 'Razorpay'
// Or via Swift Package Manager by adding:
//   https://github.com/razorpay/razorpay-pod
// Then import Razorpay and use RazorpayCheckout.open() in the startPayment method.
// The current implementation simulates the payment flow for development/testing.
// To use real Razorpay, set the key ID in your business settings and replace
// the simulation in RazorpayCheckoutViewModel.startPayment() with actual SDK calls.

struct RazorpayCheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: RazorpayCheckoutViewModel
    
    let amount: Double
    let invoiceNo: String?
    let customerName: String
    let razorpayKeyId: String
    var onPaymentSuccess: (String) -> Void
    var onPaymentError: (String) -> Void
    
    init(amount: Double, invoiceNo: String?, customerName: String, razorpayKeyId: String, onPaymentSuccess: @escaping (String) -> Void, onPaymentError: @escaping (String) -> Void) {
        self.amount = amount
        self.invoiceNo = invoiceNo
        self.customerName = customerName
        self.razorpayKeyId = razorpayKeyId
        self.onPaymentSuccess = onPaymentSuccess
        self.onPaymentError = onPaymentError
        _viewModel = StateObject(wrappedValue: RazorpayCheckoutViewModel())
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Amount Card
                    VStack(spacing: 8) {
                        Text("Amount to Pay")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Text("₹\(String(format: "%.2f", amount))")
                            .font(.system(size: 42, weight: .bold))
                        
                        if let invoice = invoiceNo {
                            Text("Invoice: \(invoice)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("To: \(customerName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    
                    // Razorpay Key ID display
                    HStack {
                        Text("Key ID")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(razorpayKeyId)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .textSelection(.enabled)
                    }
                    .padding(.horizontal)
                    
                    switch viewModel.paymentState {
                    case .idle:
                        // Payment Details
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Payment Details")
                                .font(.headline)
                            
                            Divider()
                            
                            HStack {
                                Text("Customer")
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(customerName)
                                    .fontWeight(.medium)
                            }
                            
                            if let invoice = invoiceNo {
                                HStack {
                                    Text("Invoice")
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    Text(invoice)
                                        .fontWeight(.medium)
                                }
                            }
                            
                            HStack {
                                Text("Amount")
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("₹\(String(format: "%.2f", amount))")
                                    .fontWeight(.medium)
                            }
                            
                            HStack {
                                Text("Gateway")
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("Razorpay")
                                    .fontWeight(.medium)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        
                        // Supported methods
                        Text("Supported Payment Methods")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack(spacing: 12) {
                            MethodChip(text: "UPI")
                            MethodChip(text: "Cards")
                            MethodChip(text: "Netbanking")
                            MethodChip(text: "Wallets")
                        }
                        
                        // Pay Button
                        Button(action: {
                            viewModel.startPayment(
                                amount: amount,
                                invoiceNo: invoiceNo,
                                razorpayKeyId: razorpayKeyId,
                                onSuccess: onPaymentSuccess,
                                onError: onPaymentError
                            )
                        }) {
                            HStack {
                                Image(systemName: "lock.fill")
                                Text("Pay ₹\(String(format: "%.2f", amount))")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        
                        Text("Secured by Razorpay")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    
                    case .processing:
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Connecting to Razorpay...")
                                .foregroundColor(.secondary)
                            Text("Creating order...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                    
                    case .success(let paymentId):
                        VStack(spacing: 16) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 64))
                                .foregroundColor(.green)
                                .transition(.scale.combined(with: .opacity))
                            
                            Text("Payment Successful!")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                            
                            VStack(spacing: 4) {
                                Text("Payment ID")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(paymentId)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .textSelection(.enabled)
                            }
                            
                            Button("Continue") {
                                onPaymentSuccess(paymentId)
                                dismiss()
                            }
                            .buttonStyle(.borderedProminent)
                            .padding(.top, 8)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 32)
                    
                    case .failed(let error):
                        VStack(spacing: 16) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 64))
                                .foregroundColor(.red)
                                .transition(.scale.combined(with: .opacity))
                            
                            Text("Payment Failed")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                            
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            HStack(spacing: 16) {
                                Button("Cancel") {
                                    dismiss()
                                }
                                .buttonStyle(.bordered)
                                
                                Button("Retry") {
                                    withAnimation {
                                        viewModel.paymentState = .idle
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 32)
                    }
                }
                .padding()
            }
            .navigationTitle("Razorpay Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct MethodChip: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.tertiarySystemBackground))
            .cornerRadius(8)
    }
}

enum PaymentState {
    case idle
    case processing
    case success(String)
    case failed(String)
}

class RazorpayCheckoutViewModel: ObservableObject {
    @Published var paymentState: PaymentState = .idle
    
    func startPayment(amount: Double, invoiceNo: String?, razorpayKeyId: String, onSuccess: @escaping (String) -> Void, onError: @escaping (String) -> Void) {
        withAnimation {
            paymentState = .processing
        }
        
        // Create order via backend
        guard let url = URL(string: "\(Constants.baseURL)/payments/razorpay-order") else {
            paymentState = .failed("Invalid URL")
            onError("Invalid URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "amount": amount,
            "invoiceId": invoiceNo as Any
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    withAnimation {
                        self?.paymentState = .failed(error.localizedDescription)
                    }
                    onError(error.localizedDescription)
                    return
                }
                
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let dataDict = json["data"] as? [String: Any] ?? json as? [String: Any],
                      let orderId = dataDict["razorpayOrderId"] as? String ?? dataDict["order_id"] as? String else {
                    withAnimation {
                        self?.paymentState = .failed("Failed to create order")
                    }
                    onError("Failed to create order")
                    return
                }
                
                // MARK: - Production Razorpay SDK Integration
                // In production, uncomment and use the Razorpay SDK here:
                //
                // import Razorpay
                //
                // let razorpay = RazorpayCheckout.initWithKey(razorpayKeyId, delegate: self)
                // razorpay.open(amount: Int(amount * 100), currency: "INR", orderId: orderId)
                //
                // Then handle callbacks:
                // func onPaymentSuccess(_ paymentId: String, andData data: [AnyHashable: Any]?) { ... }
                // func onPaymentError(_ code: Int32, description: String, andData data: [AnyHashable: Any]?) { ... }
                
                // Simulation: simulate realistic payment flow
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    let paymentId = "pay_\(orderId.prefix(10))_\(Int.random(in: 100000...999999))"
                    withAnimation {
                        self?.paymentState = .success(paymentId)
                    }
                    onSuccess(paymentId)
                }
            }
        }.resume()
    }
}

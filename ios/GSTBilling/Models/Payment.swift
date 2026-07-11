import Foundation

struct Payment: Codable, Identifiable {
    let id: String
    let businessId: String?
    let customerId: String?
    let invoiceId: String?
    let amount: Double
    let method: String
    let status: String?
    let reference: String?
    let notes: String?
    let paidAt: String?
    let createdAt: String?
    let updatedAt: String?
    let customer: Customer?
    let invoice: Invoice?
}

struct CreatePaymentRequest: Codable {
    let invoiceId: String?
    let customerId: String?
    let amount: Double
    let method: String
    let reference: String?
    let notes: String?
}

struct RazorpayOrder: Codable {
    let id: String?
    let businessId: String?
    let invoiceId: String?
    let razorpayOrderId: String?
    let amount: Double
    let currency: String?
    let status: String?
    let receipt: String?
    let createdAt: String?
    let updatedAt: String?
}

struct CreateRazorpayOrderRequest: Codable {
    let amount: Double
    let invoiceId: String?
    let receipt: String?
}

struct UpiLinkResponse: Codable {
    let upiLink: String
    let qrCode: String?
}

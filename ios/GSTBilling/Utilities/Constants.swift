import Foundation

enum Constants {
    #if DEBUG
    static let baseURL = "http://localhost:3000/api/v1"
    #else
    static let baseURL = "https://api.wiseaccs.com/api/v1"
    #endif

    static let keychainService = "com.gstbilling"
    static let keychainAccessGroup: String? = nil

    static let defaultCurrencyCode = "INR"
    static let defaultLocale = Locale(identifier: "en_IN")

    static let gstRateOptions: [Double] = [0, 0.25, 1, 1.5, 3, 5, 6, 18, 28, 40]
    static let defaultTaxRate: Double = 18
    static let defaultTaxType = "exclusive"

    static let invoiceStatusColors: [String: String] = [
        "DRAFT": "gray",
        "CONFIRMED": "blue",
        "CANCELLED": "red",
        "CREDITED": "orange"
    ]

    static let paymentMethods = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "RAZORPAY", "CHEQUE"]

    static let bgTaskId = "com.gstbilling.sync"
}

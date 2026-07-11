import Foundation

struct Customer: Codable, Identifiable, Hashable {
    let id: String
    let businessId: String?
    let groupId: String?
    let name: String
    let phone: String?
    let email: String?
    let gstin: String?
    let address: String?
    let city: String?
    let state: String?
    let pincode: String?
    let creditLimit: Double?
    let balance: Double?
    let openingBalance: Double?
    let notes: String?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Customer, rhs: Customer) -> Bool {
        lhs.id == rhs.id
    }
}

struct CreateCustomerRequest: Codable {
    let name: String
    let phone: String?
    let email: String?
    let gstin: String?
    let address: String?
    let city: String?
    let state: String?
    let pincode: String?
    let creditLimit: Double?
    let openingBalance: Double?
    let groupId: String?
}

struct LedgerCustomer: Codable {
    let id: String
    let name: String
    let phone: String
    let email: String
    let gstin: String?
    let address: String?
    let city: String?
    let state: String?
    let creditLimit: Double
    let currentBalance: Double
}

struct LedgerSummary: Codable {
    let openingBalance: Double
    let totalDebit: Double
    let totalCredit: Double
    let closingBalance: Double
    let totalEntries: Int
}

struct LedgerEntryItem: Codable, Identifiable {
    let id: String
    let date: String
    let type: String
    let description: String
    let invoiceNo: String?
    let debit: Double
    let credit: Double
    let balanceAfter: Double
    let imageUrl: String?
}

struct LedgerResponse: Codable {
    let customer: LedgerCustomer
    let summary: LedgerSummary
    let entries: [LedgerEntryItem]
}

struct RecordCustomerPaymentRequest: Codable {
    let amount: Double
    let method: String
    let notes: String?
}

// -- Ledger Entry Creation --
struct CreateLedgerEntryRequest: Codable {
    let amount: Double
    let type: String
    let paymentMode: String?
    let description: String?
    let date: String?
    let reference: String?
    let imageUrl: String?
}

struct LedgerEntryResponse: Codable {
    let transaction: AnyCodable?
    let newBalance: Double
}

// -- SMS --
struct SendLedgerSmsRequest: Codable {
    let phone: String?
    let message: String?
}

struct LedgerSmsResponse: Codable {
    let success: Bool
    let phone: String
    let message: String
    let ledgerUrl: String
    let sentAt: String
}

struct LedgerImageUploadResponse: Codable {
    let url: String
    let filename: String
    let size: Int
    let mimetype: String
}

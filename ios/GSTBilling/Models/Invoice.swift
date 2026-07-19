import Foundation

struct Invoice: Codable, Identifiable, Hashable {
    let id: String
    let businessId: String?
    let customerId: String?
    let invoiceNo: String
    let type: String?
    let invoiceDate: String?
    let dueDate: String?
    let subtotal: Double?
    let taxAmount: Double?
    let discount: Double?
    let roundOff: Double?
    let grandTotal: Double?
    let paidAmount: Double?
    let status: String?
    let notes: String?
    let terms: String?
    let ewayBillNo: String?
    let ewayBillDate: String?
    let transporterId: String?
    let transporterName: String?
    let vehicleNo: String?
    let distanceKm: Int?
    let supplyType: String?
    let docType: String?
    let valueOfGoods: Double?
    let irn: String?
    let irnDate: String?
    let ackNo: String?
    let ackDate: String?
    let qrCode: String?
    let referenceId: String?
    let createdById: String?
    let createdAt: String?
    let updatedAt: String?
    let items: [InvoiceItem]?
    let customer: Customer?
    let direction: String
    let supplierId: String?
    let supplier: Supplier?
    let customerAddress: String?
    let customerPhone: String?
    let customerState: String?
    let placeOfSupply: String?
    let reverseCharge: Bool?
    let poNo: String?
    let poDate: String?
    let challanNo: String?
    let challanDate: String?
    let lrNo: String?
    let paymentType: String?
    let paymentNote: String?
    let cessTotal: Double?
    let totalInWords: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Invoice, rhs: Invoice) -> Bool {
        lhs.id == rhs.id
    }
}

enum SalePurchaseTab: String, CaseIterable {
    case sale = "SALE"
    case purchase = "PURCHASE"

    var displayName: String {
        switch self {
        case .sale: return "Sale Invoices"
        case .purchase: return "Purchase Invoices"
        }
    }
}

struct InvoiceItem: Codable, Identifiable, Hashable {
    let id: String?
    let invoiceId: String?
    let productId: String?
    let itemName: String
    let quantity: Double
    let unit: String?
    let rate: Double
    let discount: Double?
    let taxableValue: Double?
    let taxRate: Double?
    let cgst: Double?
    let sgst: Double?
    let igst: Double?
    let total: Double?
    let batchNo: String?
    let expiryDate: String?
    let productNote: String?
    let cgstRate: Double?
    let sgstRate: Double?
    let igstRate: Double?
    let cessRate: Double?
    let cessAmount: Double?
    let serialNo: Int?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id ?? UUID().uuidString)
    }

    static func == (lhs: InvoiceItem, rhs: InvoiceItem) -> Bool {
        lhs.id == rhs.id && lhs.itemName == rhs.itemName
    }
}

struct CreateInvoiceRequest: Codable {
    let type: String
    let direction: String?
    let customerId: String?
    let supplierId: String?
    let invoiceDate: String?
    let dueDate: String?
    let discount: Double?
    let notes: String?
    let terms: String?
    let items: [CreateInvoiceItemRequest]
    let referenceId: String?
}

struct CreateInvoiceItemRequest: Codable {
    let productId: String?
    let itemName: String
    let quantity: Double
    let unit: String?
    let rate: Double
    let discount: Double?
    let taxRate: Double?
    let batchNo: String?
    let expiryDate: String?
}

struct CreateCreditNoteRequest: Codable {
    let invoiceId: String
    let items: [CreditNoteItemRequest]
    let reason: String?
}

struct CreditNoteItemRequest: Codable {
    let invoiceItemId: String
    let quantity: Double
    let reason: String?
}

// MARK: - Invoice Settings

struct InvoiceSettings: Codable {
    var invoicePrefix: String = "INV-"
    var startingNumber: Int = 1
    var defaultNotes: String = ""
    var defaultTerms: String = ""
    var bankName: String = ""
    var bankAccountNo: String = ""
    var bankIfsc: String = ""
    var bankBranch: String = ""
    var upiId: String = ""
    var showGstin: Bool = true
    var showBankDetails: Bool = false
    var showQrCode: Bool = false
    var signatureUrl: String = ""
    var activeTemplate: String = "classic"
}

struct InvoiceSettingsRequest: Codable {
    var invoicePrefix: String?
    var startingNumber: Int?
    var defaultNotes: String?
    var defaultTerms: String?
    var bankName: String?
    var bankAccountNo: String?
    var bankIfsc: String?
    var bankBranch: String?
    var upiId: String?
    var showGstin: Bool?
    var showBankDetails: Bool?
    var showQrCode: Bool?
}

// MARK: - E-Way Bill

struct EwayBillRequest: Codable {
    var transporterId: String?
    var transporterName: String?
    var vehicleNo: String
    var distanceKm: Int
    var supplyType: String?
    var docType: String?
    var transportMode: String?
}

struct EwayBillResponse: Codable {
    var ewayBillNo: String
    var ewayBillDate: String
    var vehicleNo: String
    var distanceKm: Int
    var transporterName: String?
    var message: String
}

// MARK: - e-Invoice

struct EinvoiceRequest: Codable {
    var generateViaApi: Bool?
    var irn: String?
    var ackNo: String?
    var ackDate: String?
}

struct EinvoiceResponse: Codable {
    var irn: String
    var irnDate: String
    var ackNo: String?
    var ackDate: String?
    var qrCode: String?
    var message: String
}

// MARK: - Update Invoice

struct UpdateInvoiceRequest: Codable {
    var type: String?
    var direction: String?
    var customerId: String?
    var supplierId: String?
    var invoiceDate: String?
    var dueDate: String?
    var discount: Double?
    var notes: String?
    var terms: String?
    var items: [CreateInvoiceItemRequest]?
}

// MARK: - Generate Both (One-Click)

struct GenerateBothRequest: Codable {
    var vehicleNo: String
    var distanceKm: Int
    var transporterId: String?
    var transporterName: String?
    var supplyType: String?
    var docType: String?
    var generateEinvoice: Bool?
    var irn: String?
    var ackNo: String?
    var ackDate: String?
}

struct GenerateBothResponse: Codable {
    var ewayBill: EwayBillResponse?
    var einvoice: EinvoiceResponse?
    var errors: [GenerateError]?
    var invoice: Invoice?
}

struct GenerateError: Codable {
    var type: String
    var message: String
}

// MARK: - Invoice Template

struct InvoiceTemplate: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let layout: String
    let accentColor: String
    let headerStyle: String
    let tableStyle: String
    let font: String
    let isActive: Bool
}

// MARK: - Staff Management

struct StaffMember: Codable, Identifiable {
    var id: String { userId }
    let userId: String
    let name: String
    let phone: String
    let email: String?
    let avatarUrl: String?
    let role: String
    let permissions: [String]
    let isDefault: Bool
    let joinedAt: String
}

struct StaffInvite: Codable, Identifiable {
    let id: String
    let phone: String
    let email: String?
    let name: String?
    let role: String
    let permissions: [String]
    let token: String
    let invitedBy: String
    let expiresAt: String
    let createdAt: String
}

struct InviteStaffRequest: Codable {
    let phone: String
    let email: String?
    let name: String?
    let rolePreset: String?
    let permissions: [String]?
    let role: String?
}

struct UpdatePermissionsRequest: Codable {
    let permissions: [String]
    let role: String?
}

// MARK: - Customer Group

struct CustomerGroup: Codable, Identifiable {
    let id: String
    let name: String
    let discount: Double?
    let customerCount: Int?
}

struct CreateCustomerGroupRequest: Codable {
    let name: String
    let discount: Double?
}

struct UpdateCustomerGroupRequest: Codable {
    let name: String?
    let discount: Double?
}

import Foundation

struct Gstr1Report: Codable {
    let fromDate: String
    let toDate: String
    let summary: Gstr1Summary
    let b2b: [Gstr1B2bEntry]
    let b2cLarge: [Gstr1B2cLargeEntry]
    let b2cSmall: [Gstr1B2cSmallEntry]
    let hsnSummary: [Gstr1HsnEntry]
    let documents: Gstr1DocumentSummary?
    let b2c: Gstr1B2cSummary?
}

struct Gstr1Summary: Codable {
    let totalInvoices: Int
    let totalTaxableValue: Double
    let totalTax: Double
}

struct Gstr1B2bEntry: Codable, Identifiable {
    let invoiceNo: String
    let date: String
    let customerName: String?
    let customerGstin: String?
    let placeOfSupply: String?
    let reverseCharge: Bool?
    let invoiceValue: Double?
    let taxableValue: Double
    let cgst: Double?
    let sgst: Double?
    let igst: Double?
    let taxAmount: Double
    let grandTotal: Double

    var id: String { invoiceNo }
}

struct Gstr1B2cLargeEntry: Codable, Identifiable {
    let placeOfSupply: String
    let rate: Double
    let taxableValue: Double
    let cgst: Double
    let sgst: Double
    let igst: Double

    var id: String { "\(placeOfSupply)-\(rate)" }
}

struct Gstr1B2cSmallEntry: Codable, Identifiable {
    let placeOfSupply: String
    let rate: Double
    let taxableValue: Double
    let cgst: Double
    let sgst: Double
    let igst: Double

    var id: String { "\(placeOfSupply)-\(rate)-\(taxableValue)" }
}

struct Gstr1HsnEntry: Codable, Identifiable {
    let hsnCode: String
    let description: String
    let uqc: String
    let quantity: Double
    let totalValue: Double
    let taxableValue: Double
    let cgst: Double
    let sgst: Double
    let igst: Double

    var id: String { hsnCode }
}

struct Gstr1DocumentSummary: Codable {
    let invoicesIssued: Gstr1DocEntry?
    let creditNotes: Gstr1DocEntry?
}
struct Gstr1DocEntry: Codable {
    let count: Int
    let totalValue: Double
}

struct Gstr1B2cSummary: Codable {
    let count: Int
    let totalTaxableValue: Double
    let totalTax: Double
}

struct Gstr3bReport: Codable {
    let month: Int
    let year: Int
    let summary: Gstr3bSummary
    let outwardSupplies: [Gstr3bLabeledSupply]?
    let interStateSupplies: [Gstr3bInterStateSupply]?
    let eligibleItc: [Gstr3bLabeledItc]?
    let exemptNilNonGst: [Gstr3bLabeledExempt]?
    let paymentOfTax: [Gstr3bPaymentRow]?
}

struct Gstr3bSummary: Codable {
    let totalInvoices: Int
    let totalTaxableValue: Double
    let totalTax: Double
    let totalPaid: Double
    let outstanding: Double
}

struct Gstr3bLabeledSupply: Codable, Identifiable {
    let label: String
    let taxableValue: Double
    let igst: Double
    let cgst: Double
    let sgst: Double
    let cess: Double
    var id: String { label }
}

struct Gstr3bLabeledItc: Codable, Identifiable {
    let label: String
    let igst: Double
    let cgst: Double
    let sgst: Double
    let cess: Double
    var id: String { label }
}

struct Gstr3bLabeledExempt: Codable, Identifiable {
    let label: String
    let taxableValue: Double
    let igst: Double
    let cgst: Double
    let sgst: Double
    let cess: Double
    var id: String { label }
}

struct Gstr3bPaymentRow: Codable, Identifiable {
    let label: String
    let cgst: Double
    let sgst: Double
    let igst: Double
    let cess: Double
    let interest: Double
    let lateFee: Double
    let total: Double
    var id: String { label }
}

struct Gstr3bInterStateSupply: Codable, Identifiable {
    let placeOfSupply: String
    let taxableValue: Double
    let igst: Double

    var id: String { placeOfSupply }
}

struct SalesReport: Codable {
    let period: SalesPeriod
    let summary: SalesSummary
    let categorySales: [CategorySale]
}

struct SalesPeriod: Codable {
    let startDate: String?
    let endDate: String?
}

struct SalesSummary: Codable {
    let totalSales: Double
    let totalTax: Double
    let totalInvoices: Int
    let averageInvoice: Double
}

struct CategorySale: Codable, Identifiable {
    let name: String
    let count: Double
    let total: Double
    var id: String { name }
}

struct CustomerReport: Codable {
    let customers: [CustomerSalesEntry]?
    let totalOutstanding: Double
    let totalBilled: Double
    let totalCollected: Double
}

struct CustomerSalesEntry: Codable, Identifiable {
    var id: String { customerId }
    let customerId: String
    let customerName: String
    let amount: Double
    let invoiceCount: Int
}

struct ProfitLossReport: Codable {
    let totalRevenue: Double
    let totalCost: Double
    let grossProfit: Double
    let grossMargin: Double
    let expenses: Double?
    let netProfit: Double?
    let period: String?
}

struct StockMovementItem: Codable, Identifiable {
    let id: String
    let productId: String?
    let productName: String
    let warehouseId: String?
    let warehouseName: String?
    let type: String
    let quantity: Int
    let batchNo: String?
    let notes: String?
    let date: String
}

struct StockMovementsReport: Codable {
    let movements: [StockMovementItem]
    let monthlySummary: [MonthlyStockSummary]?
}

struct MonthlyStockSummary: Codable, Identifiable {
    let month: String
    let purchases: Int
    let sales: Int
    let transfers: Int
    let adjustments: Int
    let returns: Int

    var id: String { month }
}

struct InventoryDashboard: Codable {
    let totalProducts: Int
    let stockValue: Double
    let retailValue: Double
    let potentialProfit: Double
    let lowStockCount: Int
    let outOfStockCount: Int
    let stockByWarehouse: [WarehouseStock]
    let recentMovements: [StockMovementItem]
    let lowStockAlerts: [Product]
}

struct WarehouseStock: Codable, Identifiable {
    let warehouse: String
    let value: Double

    var id: String { warehouse }
}

struct SyncRequest: Codable {
    let deviceId: String
    let changes: [SyncChange]
}

struct SyncChange: Codable {
    let table: String
    let action: String
    let entityId: String
    let data: [String: AnyCodable]?
}

struct SyncResponse: Codable {
    let changes: [SyncChange]
    let serverTime: String
    let lastSyncAt: String?
}

import Foundation

struct Gstr1Report: Codable {
    let fromDate: String
    let toDate: String
    let summary: Gstr1Summary
    let b2b: [Gstr1B2bEntry]
    let b2c: Gstr1B2cSummary
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
    let taxableValue: Double
    let taxAmount: Double
    let grandTotal: Double

    var id: String { invoiceNo }
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
}

struct Gstr3bSummary: Codable {
    let totalInvoices: Int
    let totalTaxableValue: Double
    let totalTax: Double
    let totalPaid: Double
    let outstanding: Double
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

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            value = doubleVal
        } else if let boolVal = try? container.decode(Bool.self) {
            value = boolVal
        } else if let stringVal = try? container.decode(String.self) {
            value = stringVal
        } else if let dictVal = try? container.decode([String: AnyCodable].self) {
            value = dictVal
        } else if let arrayVal = try? container.decode([AnyCodable].self) {
            value = arrayVal
        } else {
            value = ""
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intVal = value as? Int {
            try container.encode(intVal)
        } else if let doubleVal = value as? Double {
            try container.encode(doubleVal)
        } else if let boolVal = value as? Bool {
            try container.encode(boolVal)
        } else if let stringVal = value as? String {
            try container.encode(stringVal)
        } else if let dictVal = value as? [String: AnyCodable] {
            try container.encode(dictVal)
        } else if let arrayVal = value as? [AnyCodable] {
            try container.encode(arrayVal)
        }
    }
}

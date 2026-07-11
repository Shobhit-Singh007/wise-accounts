import Foundation

struct Business: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let gstin: String?
    let phone: String?
    let email: String?
    let address: String?
    let city: String?
    let state: String?
    let pincode: String?
    let logoUrl: String?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Business, rhs: Business) -> Bool {
        lhs.id == rhs.id
    }
}

struct CreateBusinessRequest: Codable {
    let name: String
    let gstin: String?
    let phone: String?
    let email: String?
    let address: String?
    let city: String?
    let state: String?
    let pincode: String?
}

struct UpdateBusinessRequest: Codable {
    let name: String?
    let gstin: String?
    let phone: String?
    let email: String?
    let address: String?
    let city: String?
    let state: String?
    let pincode: String?
}

struct Warehouse: Codable, Identifiable {
    let id: String
    let businessId: String
    let name: String
    let address: String?
    let city: String?
    let state: String?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?
}

struct CreateWarehouseRequest: Codable {
    let name: String
    let address: String?
    let city: String?
    let state: String?
}

struct DashboardData: Codable {
    let totalSales: Double?
    let totalInvoices: Int?
    let totalCustomers: Int?
    let totalProducts: Int?
    let pendingAmount: Double?
    let overdueAmount: Double?
    let todaySales: Double?
    let weeklySales: [DailySales]?
    let recentInvoices: [Invoice]?
    let lowStockProducts: Int?
}

struct DailySales: Codable {
    let date: String
    let amount: Double
}

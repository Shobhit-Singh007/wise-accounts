import Foundation

struct Product: Codable, Identifiable, Hashable {
    let id: String
    let businessId: String?
    let categoryId: String?
    let name: String
    let sku: String?
    let hsnCode: String?
    let unit: String?
    let sellingPrice: Double
    let purchasePrice: Double?
    let mrp: Double?
    let taxRate: Double?
    let taxType: String?
    let trackBatch: Bool?
    let trackExpiry: Bool?
    let lowStockThreshold: Int?
    let imageUrl: String?
    let barcode: String?
    let isService: Bool?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?
    let stockQuantity: Int?
    let category: Category?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Product, rhs: Product) -> Bool {
        lhs.id == rhs.id
    }
}

struct CreateProductRequest: Codable {
    let name: String
    let sku: String?
    let hsnCode: String?
    let unit: String?
    let sellingPrice: Double
    let purchasePrice: Double?
    let mrp: Double?
    let taxRate: Double?
    let taxType: String?
    let trackBatch: Bool?
    let trackExpiry: Bool?
    let lowStockThreshold: Int?
    let isService: Bool?
    let categoryId: String?
    let barcode: String?
}

struct StockBatch: Codable, Identifiable {
    let id: String
    let productId: String
    let warehouseId: String
    let batchNo: String?
    let quantity: Int
    let expiryDate: String?
    let purchasePrice: Double?
    let createdAt: String?
    let updatedAt: String?
}

struct Category: Codable, Identifiable {
    let id: String
    let businessId: String?
    let name: String
    let parentId: String?
    let createdAt: String?
    let updatedAt: String?
}

struct CreateCategoryRequest: Codable {
    let name: String
    let parentId: String?
}

struct Supplier: Codable, Identifiable {
    let id: String
    let businessId: String?
    let name: String
    let phone: String?
    let email: String?
    let gstin: String?
    let address: String?
    let city: String?
    let state: String?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?
}

struct CreateSupplierRequest: Codable {
    let name: String
    let phone: String?
    let email: String?
    let gstin: String?
    let address: String?
    let city: String?
    let state: String?
}

struct StockAdjustRequest: Codable {
    let type: String
    let quantity: Int
    let warehouseId: String?
    let batchNo: String?
    let notes: String?
}

struct StockTransferRequest: Codable {
    let productId: String
    let fromWarehouseId: String
    let toWarehouseId: String
    let quantity: Int
    let batchNo: String?
    let notes: String?
}

struct PurchaseOrder: Codable, Identifiable {
    let id: String
    let businessId: String?
    let supplierId: String?
    let orderNo: String
    let orderDate: String?
    let expectedDate: String?
    let subtotal: Double?
    let taxAmount: Double?
    let discount: Double?
    let grandTotal: Double?
    let status: String?
    let notes: String?
    let createdAt: String?
    let updatedAt: String?
    let items: [PurchaseOrderItem]?
    let supplier: Supplier?
}

struct PurchaseOrderItem: Codable, Identifiable {
    let id: String
    let purchaseOrderId: String?
    let productId: String
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double?
    let batchNo: String?
}

struct PurchaseOrderItemRequest: Codable {
    let productId: String
    let quantity: Int
    let unitPrice: Double
    let batchNo: String?
}

struct CreatePurchaseOrderRequest: Codable {
    let supplierId: String?
    let expectedDate: String?
    let items: [PurchaseOrderItemRequest]
    let notes: String?
}

import Foundation
import SwiftUI

@MainActor
class ProductViewModel: ObservableObject {
    @Published var products: [Product] = []
    @Published var categories: [Category] = []
    @Published var suppliers: [Supplier] = []
    @Published var purchaseOrders: [PurchaseOrder] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    private let localStorage = LocalStorage.shared

    func loadProducts(businessId: String) async {
        isLoading = true
        errorMessage = nil
        products = localStorage.getCachedProducts()
        do {
            let data: [Product] = try await apiService.getProducts(businessId: businessId)
            products = data
            localStorage.cacheProducts(data)
        } catch {
            if products.isEmpty { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func searchProducts(businessId: String) async {
        isLoading = true
        do {
            let data: [Product] = try await apiService.getProducts(businessId: businessId, search: searchText)
            products = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createProduct(businessId: String, _ dto: CreateProductRequest) async throws -> Product {
        do {
            let product = try await apiService.createProduct(businessId: businessId, dto)
            products.insert(product, at: 0)
            return product
        } catch {
            if case AppError.networkError = error {
                savePendingOperation(type: .createProduct, businessId: businessId, entityId: nil, dto: dto)
            }
            throw error
        }
    }

    func updateProduct(businessId: String, productId: String, _ dto: CreateProductRequest) async throws -> Product {
        do {
            let product = try await apiService.updateProduct(businessId: businessId, productId: productId, dto)
            if let idx = products.firstIndex(where: { $0.id == productId }) {
                products[idx] = product
            }
            return product
        } catch {
            if case AppError.networkError = error {
                savePendingOperation(type: .updateProduct, businessId: businessId, entityId: productId, dto: dto)
            }
            throw error
        }
    }

    private func savePendingOperation(type: PendingOperationType, businessId: String, entityId: String?, dto: Codable) {
        var ops = localStorage.getPendingOperations()
        let opData = try? JSONEncoder().encode(AnyEncodable(dto))
        let op = PendingOperation(id: UUID().uuidString, type: type.rawValue, businessId: businessId, entityId: entityId, data: opData, createdAt: Date())
        ops.append(op)
        localStorage.savePendingOperations(ops)
    }

    func deleteProduct(businessId: String, productId: String) async throws {
        try await apiService.deleteProduct(businessId: businessId, productId: productId)
        products.removeAll { $0.id == productId }
    }

    func adjustStock(businessId: String, productId: String, _ dto: StockAdjustRequest) async throws -> Product {
        let product = try await apiService.adjustStock(businessId: businessId, productId: productId, dto)
        if let idx = products.firstIndex(where: { $0.id == productId }) {
            products[idx] = product
        }
        return product
    }

    func loadCategories(businessId: String) async {
        do {
            let data: [Category] = try await apiService.getCategories(businessId: businessId)
            categories = data
            localStorage.cacheCategories(data)
        } catch {
            categories = localStorage.getCachedCategories()
        }
    }

    func createCategory(businessId: String, _ dto: CreateCategoryRequest) async throws -> Category {
        let cat = try await apiService.createCategory(businessId: businessId, dto)
        categories.append(cat)
        return cat
    }

    func loadSuppliers(businessId: String) async {
        do {
            let data: [Supplier] = try await apiService.getSuppliers(businessId: businessId)
            suppliers = data
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createSupplier(businessId: String, _ dto: CreateSupplierRequest) async throws -> Supplier {
        let supp = try await apiService.createSupplier(businessId: businessId, dto)
        suppliers.append(supp)
        return supp
    }

    func loadPurchaseOrders(businessId: String) async {
        do {
            let data: [PurchaseOrder] = try await apiService.getPurchaseOrders(businessId: businessId)
            purchaseOrders = data
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createPurchaseOrder(businessId: String, _ dto: CreatePurchaseOrderRequest) async throws -> PurchaseOrder {
        let po = try await apiService.createPurchaseOrder(businessId: businessId, dto)
        purchaseOrders.insert(po, at: 0)
        return po
    }

    func receivePurchaseOrder(businessId: String, orderId: String) async throws -> PurchaseOrder {
        let po = try await apiService.receivePurchaseOrder(businessId: businessId, orderId: orderId)
        if let idx = purchaseOrders.firstIndex(where: { $0.id == orderId }) {
            purchaseOrders[idx] = po
        }
        return po
    }

    var filteredProducts: [Product] {
        if searchText.isEmpty { return products }
        return products.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.sku?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.hsnCode?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
}

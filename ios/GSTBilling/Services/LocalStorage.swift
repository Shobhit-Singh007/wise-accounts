import Foundation

final class LocalStorage {
    static let shared = LocalStorage()

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let fileManager = FileManager.default

    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    }

    private init() {}

    private func fileURL(forKey key: String) -> URL {
        let fileName = "\(key.replacingOccurrences(of: "/", with: "_")).json"
        return documentsDirectory.appendingPathComponent(fileName)
    }

    // MARK: - Generic Cache
    func cache<T: Codable>(_ value: T, forKey key: String) {
        do {
            let data = try encoder.encode(value)
            try data.write(to: fileURL(forKey: key), options: .atomic)
        } catch {
            print("LocalStorage cache error for key \(key): \(error.localizedDescription)")
        }
    }

    func retrieve<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        let url = fileURL(forKey: key)
        guard fileManager.fileExists(atPath: url.path) else { return nil }
        do {
            let data = try Data(contentsOf: url)
            return try decoder.decode(type, from: data)
        } catch {
            print("LocalStorage retrieve error for key \(key): \(error.localizedDescription)")
            return nil
        }
    }

    func remove(forKey key: String) {
        let url = fileURL(forKey: key)
        guard fileManager.fileExists(atPath: url.path) else { return }
        do {
            try fileManager.removeItem(at: url)
        } catch {
            print("LocalStorage remove error for key \(key): \(error.localizedDescription)")
        }
    }

    func cacheList<T: Codable>(_ items: [T], forKey key: String) {
        cache(items, forKey: key)
    }

    func retrieveList<T: Codable>(_ type: T.Type, forKey key: String) -> [T] {
        retrieve([T].self, forKey: key) ?? []
    }

    // MARK: - Specific Caches
    func cacheCustomers(_ customers: [Customer]) {
        cacheList(customers, forKey: "cached_customers")
    }

    func getCachedCustomers() -> [Customer] {
        retrieveList(Customer.self, forKey: "cached_customers")
    }

    func cacheProducts(_ products: [Product]) {
        cacheList(products, forKey: "cached_products")
    }

    func getCachedProducts() -> [Product] {
        retrieveList(Product.self, forKey: "cached_products")
    }

    func cacheInvoices(_ invoices: [Invoice]) {
        cacheList(invoices, forKey: "cached_invoices")
    }

    func getCachedInvoices() -> [Invoice] {
        retrieveList(Invoice.self, forKey: "cached_invoices")
    }

    func cacheCategories(_ categories: [Category]) {
        cacheList(categories, forKey: "cached_categories")
    }

    func getCachedCategories() -> [Category] {
        retrieveList(Category.self, forKey: "cached_categories")
    }

    func cacheDashboard(_ dashboard: DashboardData) {
        cache(dashboard, forKey: "cached_dashboard")
    }

    func getCachedDashboard() -> DashboardData? {
        retrieve(DashboardData.self, forKey: "cached_dashboard")
    }

    // MARK: - Pending Operations
    func savePendingOperations(_ operations: [PendingOperation]) {
        cacheList(operations, forKey: "pending_operations")
    }

    func getPendingOperations() -> [PendingOperation] {
        retrieveList(PendingOperation.self, forKey: "pending_operations")
    }

    func clearAll() {
        guard let enumerator = fileManager.enumerator(at: documentsDirectory, includingPropertiesForKeys: nil) else { return }
        for case let fileURL as URL in enumerator where fileURL.pathExtension == "json" {
            try? fileManager.removeItem(at: fileURL)
        }
    }
}

struct PendingOperation: Codable {
    let id: String
    let type: String
    let businessId: String
    let entityId: String?
    let data: Data?
    let createdAt: Date
}

enum PendingOperationType: String {
    case createCustomer
    case updateCustomer
    case createProduct
    case updateProduct
    case createInvoice
}

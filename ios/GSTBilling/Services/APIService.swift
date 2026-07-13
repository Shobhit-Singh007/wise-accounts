import Foundation

enum APIEndpoint {
    case auth
    case business
    case customers(String)
    case inventory(String)
    case billing(String)
    case payments(String)
    case reports(String)
    case sync(String)

    var basePath: String {
        switch self {
        case .auth: return ""
        case .business: return "businesses"
        case .customers(let bizId): return "businesses/\(bizId)/customers"
        case .inventory(let bizId): return "businesses/\(bizId)"
        case .billing(let bizId): return "businesses/\(bizId)/invoices"
        case .payments(let bizId): return "businesses/\(bizId)/payments"
        case .reports(let bizId): return "businesses/\(bizId)/reports"
        case .sync(let bizId): return "businesses/\(bizId)/sync"
        }
    }
}

actor TokenRefresher {
    private var refreshTask: Task<String, Error>?

    func refresh() async throws -> String {
        if let task = refreshTask {
            return try await task.value
        }
        let task = Task { () throws -> String in
            defer { refreshTask = nil }
            return try await AuthManager.shared.refreshAccessToken()
        }
        refreshTask = task
        return try await task.value
    }
}

struct UpiLinkRequest: Encodable {
    let amount: Double
    let description: String
}

struct PushChangesRequest: Encodable {
    let deviceId: String
    let changes: [SyncChange]
}

final class APIService {
    static let shared = APIService()

    private let session: URLSession
    private var authToken: String?
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let tokenRefresher = TokenRefresher()

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    func setAuthToken(_ token: String) {
        authToken = token
    }

    func clearAuthToken() {
        authToken = nil
    }

    private func buildURL(endpoint: APIEndpoint, path: String, queryItems: [URLQueryItem]? = nil) throws -> URL {
        let base = Constants.baseURL
        let endpointPath = endpoint.basePath
        let fullPath = endpointPath.isEmpty ? path : "\(endpointPath)/\(path)"
        var components = URLComponents(string: "\(base)/\(fullPath)")
        if let q = queryItems, !q.isEmpty {
            components?.queryItems = q
        }
        guard let url = components?.url else {
            throw AppError.networkError("Invalid URL")
        }
        return url
    }

    private func buildRequest(url: URL, method: String, body: Data? = nil) -> URLRequest {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body
        return req
    }

    private func perform<T: Codable>(_ request: URLRequest, skipAuthRetry: Bool = false) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw AppError.networkError("Connection failed: \(error.localizedDescription)")
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.message ?? "Unknown error"
            if httpResponse.statusCode == 401 {
                if skipAuthRetry {
                    throw AppError.unauthorized
                }
                do {
                    let newToken = try await tokenRefresher.refresh()
                    var retryReq = request
                    retryReq.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                    return try await perform(retryReq, skipAuthRetry: true)
                } catch {
                    throw AppError.unauthorized
                }
            }
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        if T.self == Data.self, let data = data as? T {
            return data
        }

        if data.isEmpty {
            guard let emptyValue = (T.self as? ExpressibleByNilLiteral.Type)?.init(nilLiteral: ()) as? T else {
                throw APIError.invalidResponse
            }
            return emptyValue
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    func request<T: Codable>(_ endpoint: APIEndpoint, endpoint path: String = "", method: String = "GET", body: Codable? = nil, queryItems: [URLQueryItem]? = nil) async throws -> T {
        let url = try buildURL(endpoint: endpoint, path: path, queryItems: queryItems)
        let bodyData = body != nil ? try encoder.encode(AnyEncodable(body!)) : nil
        let req = buildRequest(url: url, method: method, body: bodyData)
        return try await perform(req)
    }

    func requestNoAuth<T: Codable>(endpoint: String, method: String = "GET", body: Codable? = nil) async throws -> T {
        let url = try buildURL(endpoint: .auth, path: endpoint)
        let bodyData = body != nil ? try encoder.encode(AnyEncodable(body!)) : nil
        var req = buildRequest(url: url, method: method, body: bodyData)
        req.setValue(nil, forHTTPHeaderField: "Authorization")
        return try await perform(req, skipAuthRetry: true)
    }

    func requestRaw<T: Codable>(path: String, method: String = "GET", body: Codable? = nil) async throws -> T {
        let url: URL
        if path.hasPrefix("http") {
            guard let u = URL(string: path) else { throw AppError.networkError("Invalid URL") }
            url = u
        } else {
            url = try buildURL(endpoint: .auth, path: path)
        }
        let bodyData = body != nil ? try encoder.encode(AnyEncodable(body!)) : nil
        let req = buildRequest(url: url, method: method, body: bodyData)
        return try await perform(req)
    }

    func requestVoid(path: String, method: String = "GET", body: Codable? = nil) async throws {
        let url: URL
        if path.hasPrefix("http") {
            guard let u = URL(string: path) else { throw AppError.networkError("Invalid URL") }
            url = u
        } else {
            url = try buildURL(endpoint: .auth, path: path)
        }
        let bodyData = body != nil ? try encoder.encode(AnyEncodable(body!)) : nil
        let req = buildRequest(url: url, method: method, body: bodyData)
        let (data, response) = try await session.data(for: req)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.message ?? "Request failed"
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: errorBody)
        }
    }

    func delete<T: Codable>(_ endpoint: APIEndpoint, path: String) async throws -> T {
        try await request(endpoint, endpoint: path, method: "DELETE")
    }

    func deleteNoContent(_ endpoint: APIEndpoint, path: String) async throws {
        let url = try buildURL(endpoint: endpoint, path: path)
        let req = buildRequest(url: url, method: "DELETE")
        let (data, response) = try await session.data(for: req)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.message ?? "Unknown error"
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: errorBody)
        }
    }

    // MARK: - Business
    func createBusiness(_ dto: CreateBusinessRequest) async throws -> Business {
        try await request(.business, endpoint: "businesses", method: "POST", body: dto)
    }

    func getBusinesses() async throws -> [Business] {
        try await request(.business, endpoint: "businesses")
    }

    func getBusiness(id: String) async throws -> Business {
        try await request(.business, endpoint: "businesses/\(id)")
    }

    func updateBusiness(id: String, _ dto: UpdateBusinessRequest) async throws -> Business {
        try await request(.business, endpoint: "businesses/\(id)", method: "PUT", body: dto)
    }

    func deleteBusiness(id: String) async throws {
        try await deleteNoContent(.business, path: "businesses/\(id)")
    }

    func getDashboard(businessId: String) async throws -> DashboardData {
        try await request(.business, endpoint: "businesses/\(businessId)/dashboard")
    }

    func getWarehouses(businessId: String) async throws -> [Warehouse] {
        try await request(.business, endpoint: "businesses/\(businessId)/warehouses")
    }

    func createWarehouse(businessId: String, _ dto: CreateWarehouseRequest) async throws -> Warehouse {
        try await request(.business, endpoint: "businesses/\(businessId)/warehouses", method: "POST", body: dto)
    }

    // MARK: - Customers
    func getCustomers(businessId: String, search: String? = nil) async throws -> [Customer] {
        var qi: [URLQueryItem] = []
        if let s = search, !s.isEmpty { qi.append(URLQueryItem(name: "search", value: s)) }
        return try await request(.customers(businessId), endpoint: "", queryItems: qi.isEmpty ? nil : qi)
    }

    func getCustomer(businessId: String, customerId: String) async throws -> Customer {
        try await request(.customers(businessId), endpoint: customerId)
    }

    func createCustomer(businessId: String, _ dto: CreateCustomerRequest) async throws -> Customer {
        try await request(.customers(businessId), endpoint: "", method: "POST", body: dto)
    }

    func updateCustomer(businessId: String, customerId: String, _ dto: CreateCustomerRequest) async throws -> Customer {
        try await request(.customers(businessId), endpoint: customerId, method: "PUT", body: dto)
    }

    func deleteCustomer(businessId: String, customerId: String) async throws {
        try await deleteNoContent(.customers(businessId), path: customerId)
    }

    func getCustomerLedger(businessId: String, customerId: String) async throws -> LedgerResponse {
        try await request(.customers(businessId), endpoint: "\(customerId)/ledger")
    }

    func recordCustomerPayment(businessId: String, customerId: String, _ dto: RecordCustomerPaymentRequest) async throws -> LedgerEntryItem {
        try await request(.customers(businessId), endpoint: "\(customerId)/payments", method: "POST", body: dto)
    }

    // MARK: - Inventory
    func getProducts(businessId: String, search: String? = nil) async throws -> [Product] {
        var qi: [URLQueryItem] = []
        if let s = search, !s.isEmpty { qi.append(URLQueryItem(name: "search", value: s)) }
        return try await request(.inventory(businessId), endpoint: "products", queryItems: qi.isEmpty ? nil : qi)
    }

    func getProduct(businessId: String, productId: String) async throws -> Product {
        try await request(.inventory(businessId), endpoint: "products/\(productId)")
    }

    func createProduct(businessId: String, _ dto: CreateProductRequest) async throws -> Product {
        try await request(.inventory(businessId), endpoint: "products", method: "POST", body: dto)
    }

    func updateProduct(businessId: String, productId: String, _ dto: CreateProductRequest) async throws -> Product {
        try await request(.inventory(businessId), endpoint: "products/\(productId)", method: "PUT", body: dto)
    }

    func deleteProduct(businessId: String, productId: String) async throws {
        try await deleteNoContent(.inventory(businessId), path: "products/\(productId)")
    }

    func adjustStock(businessId: String, productId: String, _ dto: StockAdjustRequest) async throws -> Product {
        try await request(.inventory(businessId), endpoint: "products/\(productId)/stock-adjust", method: "POST", body: dto)
    }

    func transferStock(businessId: String, _ dto: StockTransferRequest) async throws -> AnyCodable? {
        try await request(.inventory(businessId), endpoint: "stock-transfer", method: "POST", body: dto)
    }

    func getLowStockAlerts(businessId: String) async throws -> [Product] {
        try await request(.inventory(businessId), endpoint: "low-stock-alerts")
    }

    func getExpiringBatches(businessId: String, days: Int = 30) async throws -> [StockBatch] {
        try await request(.inventory(businessId), endpoint: "expiring-batches", queryItems: [URLQueryItem(name: "days", value: "\(days)")])
    }

    func getCategories(businessId: String) async throws -> [Category] {
        try await request(.inventory(businessId), endpoint: "categories")
    }

    func createCategory(businessId: String, _ dto: CreateCategoryRequest) async throws -> Category {
        try await request(.inventory(businessId), endpoint: "categories", method: "POST", body: dto)
    }

    func getSuppliers(businessId: String) async throws -> [Supplier] {
        try await request(.inventory(businessId), endpoint: "suppliers")
    }

    func createSupplier(businessId: String, _ dto: CreateSupplierRequest) async throws -> Supplier {
        try await request(.inventory(businessId), endpoint: "suppliers", method: "POST", body: dto)
    }

    func getPurchaseOrders(businessId: String) async throws -> [PurchaseOrder] {
        try await request(.inventory(businessId), endpoint: "purchase-orders")
    }

    func createPurchaseOrder(businessId: String, _ dto: CreatePurchaseOrderRequest) async throws -> PurchaseOrder {
        try await request(.inventory(businessId), endpoint: "purchase-orders", method: "POST", body: dto)
    }

    func receivePurchaseOrder(businessId: String, orderId: String) async throws -> PurchaseOrder {
        try await request(.inventory(businessId), endpoint: "purchase-orders/\(orderId)/receive", method: "POST")
    }

    func getStockMovements(businessId: String, startDate: String? = nil, endDate: String? = nil, productId: String? = nil) async throws -> StockMovementsReport {
        var qi: [URLQueryItem] = []
        if let s = startDate { qi.append(URLQueryItem(name: "startDate", value: s)) }
        if let e = endDate { qi.append(URLQueryItem(name: "endDate", value: e)) }
        if let p = productId { qi.append(URLQueryItem(name: "productId", value: p)) }
        return try await request(.inventory(businessId), endpoint: "stock-movements", queryItems: qi.isEmpty ? nil : qi)
    }

    func getInventoryDashboard(businessId: String) async throws -> InventoryDashboard {
        try await request(.inventory(businessId), endpoint: "inventory-dashboard")
    }

    // MARK: - Billing
    func getInvoices(businessId: String, status: String? = nil, customerId: String? = nil, direction: String? = nil) async throws -> [Invoice] {
        var qi: [URLQueryItem] = []
        if let s = status, !s.isEmpty { qi.append(URLQueryItem(name: "status", value: s)) }
        if let c = customerId, !c.isEmpty { qi.append(URLQueryItem(name: "customerId", value: c)) }
        if let d = direction, !d.isEmpty { qi.append(URLQueryItem(name: "direction", value: d)) }
        return try await request(.billing(businessId), endpoint: "", queryItems: qi.isEmpty ? nil : qi)
    }

    func getInvoice(businessId: String, invoiceId: String) async throws -> Invoice {
        try await request(.billing(businessId), endpoint: invoiceId)
    }

    func createInvoice(businessId: String, _ dto: CreateInvoiceRequest) async throws -> Invoice {
        try await request(.billing(businessId), endpoint: "", method: "POST", body: dto)
    }

    func cancelInvoice(businessId: String, invoiceId: String) async throws -> Invoice {
        try await request(.billing(businessId), endpoint: "\(invoiceId)/cancel", method: "POST")
    }

    func createCreditNote(businessId: String, _ dto: CreateCreditNoteRequest) async throws -> Invoice {
        try await request(.billing(businessId), endpoint: "credit-note", method: "POST", body: dto)
    }

    // Invoice PDF
    func getInvoicePdfData(businessId: String, invoiceId: String) async throws -> Data {
        let url = URL(string: "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)/pdf")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    func getInvoicePrintUrl(businessId: String, invoiceId: String) -> URL? {
        return URL(string: "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)/print")
    }

    // Invoice Settings
    func getInvoiceSettings(businessId: String) async throws -> InvoiceSettings {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/settings"
        return try await requestRaw(path: url)
    }

    func updateInvoiceSettings(businessId: String, data: InvoiceSettingsRequest) async throws {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/settings"
        try await requestVoid(path: url, method: "PUT", body: data)
    }

    // Update Invoice
    func updateInvoice(businessId: String, invoiceId: String, data: UpdateInvoiceRequest) async throws -> Invoice {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)"
        return try await requestRaw(path: url, method: "PUT", body: data)
    }

    // Delete Invoice
    func deleteInvoice(businessId: String, invoiceId: String) async throws {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)"
        try await requestVoid(path: url, method: "DELETE")
    }

    // E-Way Bill
    func generateEwayBill(businessId: String, invoiceId: String, data: EwayBillRequest) async throws -> EwayBillResponse {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)/eway-bill"
        return try await requestRaw(path: url, method: "POST", body: data)
    }

    // e-Invoice
    func generateEinvoice(businessId: String, invoiceId: String, data: EinvoiceRequest) async throws -> EinvoiceResponse {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)/e-invoice"
        return try await requestRaw(path: url, method: "POST", body: data)
    }

    // Generate Both (One-Click)
    func generateBoth(businessId: String, invoiceId: String, data: GenerateBothRequest) async throws -> GenerateBothResponse {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/\(invoiceId)/generate-both"
        return try await requestRaw(path: url, method: "POST", body: data)
    }

    // Invoice Templates
    func getInvoiceTemplates(businessId: String) async throws -> [InvoiceTemplate] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/invoices/templates"
        return try await requestRaw(path: url)
    }

    // MARK: - Staff Management

    func getStaff(businessId: String) async throws -> [StaffMember] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff"
        return try await requestRaw(path: url)
    }

    func inviteStaff(businessId: String, data: InviteStaffRequest) async throws -> [String: Any] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff/invite"
        return try await requestRaw(path: url, method: "POST", body: data)
    }

    func updateStaffPermissions(businessId: String, userId: String, data: UpdatePermissionsRequest) async throws -> [String: Any] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff/\(userId)/permissions"
        return try await requestRaw(path: url, method: "PUT", body: data)
    }

    func removeStaff(businessId: String, userId: String) async throws -> [String: Any] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff/\(userId)"
        return try await requestRaw(path: url, method: "DELETE")
    }

    func getStaffInvites(businessId: String) async throws -> [StaffInvite] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff/invites"
        return try await requestRaw(path: url)
    }

    func cancelStaffInvite(businessId: String, inviteId: String) async throws -> [String: Any] {
        let url = "\(Constants.baseURL)/businesses/\(businessId)/staff/invites/\(inviteId)"
        return try await requestRaw(path: url, method: "DELETE")
    }

    // MARK: - Payments
    func getPayments(businessId: String) async throws -> [Payment] {
        try await request(.payments(businessId), endpoint: "")
    }

    func recordPayment(businessId: String, _ dto: CreatePaymentRequest) async throws -> Payment {
        try await request(.payments(businessId), endpoint: "", method: "POST", body: dto)
    }

    func createRazorpayOrder(businessId: String, _ dto: CreateRazorpayOrderRequest) async throws -> RazorpayOrder {
        try await request(.payments(businessId), endpoint: "razorpay-order", method: "POST", body: dto)
    }

    func generateUpiLink(businessId: String, amount: Double, description: String? = nil) async throws -> UpiLinkResponse {
        try await request(.payments(businessId), endpoint: "upi-link", method: "POST", body: UpiLinkRequest(amount: amount, description: description ?? ""))
    }

    // MARK: - Reports
    func getSalesReport(businessId: String, startDate: String? = nil, endDate: String? = nil) async throws -> SalesReport {
        var qi: [URLQueryItem] = []
        if let s = startDate { qi.append(URLQueryItem(name: "startDate", value: s)) }
        if let e = endDate { qi.append(URLQueryItem(name: "endDate", value: e)) }
        return try await request(.reports(businessId), endpoint: "sales", queryItems: qi.isEmpty ? nil : qi)
    }

    func getGstr1(businessId: String, fromDate: String, toDate: String) async throws -> Gstr1Report {
        let qi = [URLQueryItem(name: "fromDate", value: fromDate), URLQueryItem(name: "toDate", value: toDate)]
        return try await request(.reports(businessId), endpoint: "gstr-1", queryItems: qi)
    }

    func getGstr3b(businessId: String, month: Int, year: Int) async throws -> Gstr3bReport {
        let qi = [URLQueryItem(name: "month", value: "\(month)"), URLQueryItem(name: "year", value: "\(year)")]
        return try await request(.reports(businessId), endpoint: "gstr-3b", queryItems: qi)
    }

    func getCustomerReport(businessId: String) async throws -> CustomerReport {
        try await request(.reports(businessId), endpoint: "customers")
    }

    func getProfitLoss(businessId: String, startDate: String? = nil, endDate: String? = nil) async throws -> ProfitLossReport {
        var qi: [URLQueryItem] = []
        if let s = startDate { qi.append(URLQueryItem(name: "startDate", value: s)) }
        if let e = endDate { qi.append(URLQueryItem(name: "endDate", value: e)) }
        return try await request(.reports(businessId), endpoint: "profit-loss", queryItems: qi.isEmpty ? nil : qi)
    }

    // MARK: - Ledger Entries
    
    func createLedgerEntry(businessId: String, customerId: String, entryRequest: CreateLedgerEntryRequest) async throws -> LedgerEntryResponse {
        try await requestRaw(path: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger", method: "POST", body: entryRequest)
    }
    
    func deleteLedgerEntry(businessId: String, customerId: String, transactionId: String) async throws {
        let url = URL(string: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger/\(transactionId)")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "DELETE"
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (_, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
    }
    
    func sendLedgerSms(businessId: String, customerId: String, smsRequest: SendLedgerSmsRequest) async throws -> LedgerSmsResponse {
        try await requestRaw(path: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger/sms", method: "POST", body: smsRequest)
    }
    
    func getLedgerPrintUrl(businessId: String, customerId: String) -> URL? {
        return URL(string: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger/print")
    }
    
    func getLedgerPdfData(businessId: String, customerId: String) async throws -> Data {
        let url = URL(string: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger/pdf")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(authToken ?? "")", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return data
    }
    
    func uploadLedgerImage(businessId: String, customerId: String, imageData: Data, filename: String) async throws -> LedgerImageUploadResponse {
        let url = URL(string: "\(Constants.baseURL)/businesses/\(businessId)/customers/\(customerId)/ledger/upload")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        if let token = authToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let boundary = UUID().uuidString
        urlRequest.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        
        urlRequest.httpBody = body
        
        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        let decoded = try JSONDecoder().decode(LedgerImageUploadResponse.self, from: data)
        return decoded
    }
    
    // MARK: - Sync
    func pushChanges(businessId: String, deviceId: String, changes: [SyncChange]) async throws -> SyncResponse {
        try await request(.sync(businessId), endpoint: "push", method: "POST", body: PushChangesRequest(deviceId: deviceId, changes: changes))
    }

    func pullChanges(businessId: String, lastSyncAt: String? = nil, deviceId: String = "unknown") async throws -> SyncResponse {
        var qi: [URLQueryItem] = []
        if let l = lastSyncAt { qi.append(URLQueryItem(name: "lastSyncAt", value: l)) }
        qi.append(URLQueryItem(name: "deviceId", value: deviceId))
        return try await request(.sync(businessId), endpoint: "pull", queryItems: qi)
    }

    // MARK: - Customer Groups
    func getCustomerGroups(businessId: String) async throws -> [CustomerGroup] {
        try await request(.customers(businessId), endpoint: "groups")
    }

    func createCustomerGroup(businessId: String, name: String, discount: Double?) async throws -> CustomerGroup {
        let dto = CreateCustomerGroupRequest(name: name, discount: discount)
        return try await request(.customers(businessId), endpoint: "groups", method: "POST", body: dto)
    }

    func updateCustomerGroup(businessId: String, groupId: String, name: String?, discount: Double?) async throws -> CustomerGroup {
        let dto = UpdateCustomerGroupRequest(name: name, discount: discount)
        return try await request(.customers(businessId), endpoint: "groups/\(groupId)", method: "PUT", body: dto)
    }

    func deleteCustomerGroup(businessId: String, groupId: String) async throws {
        try await deleteNoContent(.customers(businessId), path: "groups/\(groupId)")
    }
}

struct ErrorBody: Codable {
    let message: String
    let statusCode: Int?
    let error: String?
}

struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) {
        self.value = value
    }
    func encode(to encoder: Encoder) throws {
        try value.encode(to: encoder)
    }
}

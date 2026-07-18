import Foundation
import SwiftUI

@MainActor
class InvoiceViewModel: ObservableObject {
    @Published var invoices: [Invoice] = []
    @Published var selectedInvoice: Invoice?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var statusFilter: String?
    @Published var selectedDirection: String = "SALE"

    @Published var customerId: String?
    @Published var invoiceType = "B2C"
    @Published var invoiceDate = Date()
    @Published var dueDate: Date?
    @Published var notes = ""
    @Published var terms = ""
    @Published var items: [InvoiceItemInput] = []

    @Published var isSaving = false
    @Published var saveError: String?

    @Published var editingInvoiceId: String?
    @Published var salePurchaseTab: SalePurchaseTab = .sale
    @Published var selectedCustomer: Customer?
    @Published var discountAmount: Double = 0
    @Published var lineItems: [InvoiceItemInput] = []

    var businessState: String?

    private let apiService = APIService.shared
    private let localStorage = LocalStorage.shared

    var customers: [Customer] = []

    func loadInvoices(businessId: String) async {
        isLoading = true
        errorMessage = nil
        invoices = localStorage.getCachedInvoices()
        do {
            let data: [Invoice] = try await apiService.getInvoices(businessId: businessId, status: statusFilter, direction: selectedDirection)
            invoices = data
            localStorage.cacheInvoices(data)
        } catch {
            if invoices.isEmpty { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func loadInvoicesForCustomer(businessId: String, customerId: String) async {
        isLoading = true
        do {
            let data: [Invoice] = try await apiService.getInvoices(businessId: businessId, customerId: customerId)
            invoices = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createInvoice(businessId: String) async throws -> Invoice {
        isSaving = true
        defer { isSaving = false }

        let invoiceItems: [CreateInvoiceItemRequest] = items.map { input in
            CreateInvoiceItemRequest(
                productId: input.productId,
                itemName: input.itemName,
                quantity: input.quantity,
                unit: input.unit,
                rate: input.rate,
                discount: input.discount,
                taxRate: input.taxRate,
                batchNo: nil,
                expiryDate: nil
            )
        }

        let dto = CreateInvoiceRequest(
            type: invoiceType,
            direction: salePurchaseTab.rawValue,
            customerId: customerId,
            supplierId: nil,
            invoiceDate: Helpers.isoString(from: invoiceDate),
            dueDate: dueDate.map { Helpers.isoString(from: $0) },
            discount: nil,
            notes: notes.isEmpty ? nil : notes,
            terms: terms.isEmpty ? nil : terms,
            items: invoiceItems,
            referenceId: nil
        )

        do {
            let invoice = try await apiService.createInvoice(businessId: businessId, dto)
            invoices.insert(invoice, at: 0)
            resetForm()
            return invoice
        } catch {
            if case AppError.networkError = error {
                savePendingOperation(type: .createInvoice, businessId: businessId, data: dto)
            }
            throw error
        }
    }

    func updateInvoice(businessId: String, invoiceId: String) async throws -> Invoice {
        isSaving = true
        defer { isSaving = false }

        let request = UpdateInvoiceRequest(
            type: invoiceType,
            direction: salePurchaseTab.rawValue,
            customerId: customerId,
            supplierId: nil,
            invoiceDate: Helpers.isoString(from: invoiceDate),
            dueDate: dueDate.map { Helpers.isoString(from: $0) },
            discount: discountAmount,
            notes: notes.isEmpty ? nil : notes,
            terms: terms.isEmpty ? nil : terms,
            items: items.map { input in
                CreateInvoiceItemRequest(
                    productId: input.productId,
                    itemName: input.itemName,
                    quantity: input.quantity,
                    unit: input.unit,
                    rate: input.rate,
                    discount: input.discount,
                    taxRate: input.taxRate,
                    batchNo: nil,
                    expiryDate: nil
                )
            }
        )

        let updated = try await apiService.updateInvoice(businessId: businessId, invoiceId: invoiceId, data: request)
        if let idx = invoices.firstIndex(where: { $0.id == invoiceId }) {
            invoices[idx] = updated
        }
        resetForm()
        return updated
    }

    func deleteInvoice(businessId: String, invoiceId: String) async throws {
        try await apiService.deleteInvoice(businessId: businessId, invoiceId: invoiceId)
        invoices.removeAll { $0.id == invoiceId }
    }

    func generateEwayBill(businessId: String, invoiceId: String, request: EwayBillRequest) async throws -> EwayBillResponse {
        let response = try await apiService.generateEwayBill(businessId: businessId, invoiceId: invoiceId, data: request)
        await loadInvoices(businessId: businessId)
        return response
    }

    func generateEinvoice(businessId: String, invoiceId: String, request: EinvoiceRequest) async throws -> EinvoiceResponse {
        let response = try await apiService.generateEinvoice(businessId: businessId, invoiceId: invoiceId, data: request)
        await loadInvoices(businessId: businessId)
        return response
    }

    func generateBoth(businessId: String, invoiceId: String, request: GenerateBothRequest) async throws -> GenerateBothResponse {
        let response = try await apiService.generateBoth(businessId: businessId, invoiceId: invoiceId, data: request)
        await loadInvoices(businessId: businessId)
        return response
    }

    func loadInvoiceForEdit(businessId: String, invoiceId: String) async {
        isLoading = true
        do {
            let invoice = try await apiService.getInvoice(businessId: businessId, invoiceId: invoiceId)
            await MainActor.run {
                self.editingInvoiceId = invoiceId
                self.invoiceType = invoice.type ?? "B2C"
                self.salePurchaseTab = invoice.direction == "PURCHASE" ? .purchase : .sale
                self.customerId = invoice.customerId
                self.selectedCustomer = invoice.customer
                if let dateStr = invoice.invoiceDate, let d = ISO8601DateFormatter().date(from: dateStr) {
                    self.invoiceDate = d
                }
                if let dueStr = invoice.dueDate, let d = ISO8601DateFormatter().date(from: dueStr) {
                    self.dueDate = d
                }
                self.notes = invoice.notes ?? ""
                self.terms = invoice.terms ?? ""
                self.discountAmount = invoice.discount ?? 0
                self.items = invoice.items?.map { item in
                    InvoiceItemInput(
                        productId: item.productId,
                        itemName: item.itemName,
                        quantity: item.quantity,
                        unit: item.unit ?? "piece",
                        rate: item.rate,
                        discount: item.discount ?? 0,
                        taxRate: item.taxRate ?? 18
                    )
                } ?? []
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
        isLoading = false
    }

    func cancelInvoice(businessId: String, invoiceId: String) async throws -> Invoice {
        let invoice = try await apiService.cancelInvoice(businessId: businessId, invoiceId: invoiceId)
        if let idx = invoices.firstIndex(where: { $0.id == invoiceId }) {
            invoices[idx] = invoice
        }
        return invoice
    }

    func createCreditNote(businessId: String, _ dto: CreateCreditNoteRequest) async throws -> Invoice {
        let invoice = try await apiService.createCreditNote(businessId: businessId, dto)
        if let idx = invoices.firstIndex(where: { $0.id == dto.invoiceId }) {
            invoices[idx] = invoice
        }
        return invoice
    }

    func resetForm() {
        customerId = nil
        invoiceType = "B2C"
        invoiceDate = Date()
        dueDate = nil
        notes = ""
        terms = ""
        items = []
        editingInvoiceId = nil
        salePurchaseTab = .sale
        selectedCustomer = nil
        discountAmount = 0
        lineItems = []
    }

    func addItem() {
        items.append(InvoiceItemInput(itemName: "", quantity: 1, unit: "piece", rate: 0, discount: 0, taxRate: 18))
    }

    func removeItem(at index: Int) {
        guard items.indices.contains(index) else { return }
        items.remove(at: index)
    }

    var subtotal: Double {
        items.reduce(0) { $0 + ($1.rate * $1.quantity) }
    }

    var grandTotal: Double {
        items.reduce(0) { $0 + $1.total }
    }

    var isIntraState: Bool {
        guard let bs = businessState, let cs = customerState else { return true }
        return bs.lowercased() == cs.lowercased()
    }

    private var customerState: String? {
        guard let custId = customerId else { return nil }
        return customers.first(where: { $0.id == custId })?.state
    }

    var gstSummary: (cgst: Double, sgst: Double, igst: Double) {
        var totalCgst = 0.0
        var totalSgst = 0.0
        var totalIgst = 0.0
        let intra = isIntraState
        for item in items {
            let result = GSTCalculator.calculate(rate: item.rate, quantity: item.quantity, discount: item.discount, taxRate: item.taxRate, isIntraState: intra)
            totalCgst += result.cgst
            totalSgst += result.sgst
            totalIgst += result.igst
        }
        return (totalCgst, totalSgst, totalIgst)
    }

    var statusFilterOptions: [String?] {
        [nil, "DRAFT", "CONFIRMED", "CANCELLED", "CREDITED"]
    }

    var statusFilterLabel: String {
        statusFilter ?? "All"
    }

    private func savePendingOperation(type: PendingOperationType, businessId: String, data: Codable?) {
        var ops = localStorage.getPendingOperations()
        let opData = data.flatMap { try? JSONEncoder().encode(AnyEncodable($0)) }
        let op = PendingOperation(id: UUID().uuidString, type: type.rawValue, businessId: businessId, entityId: nil, data: opData, createdAt: Date())
        ops.append(op)
        localStorage.savePendingOperations(ops)
    }
}

struct InvoiceItemInput: Identifiable {
    let id = UUID()
    var productId: String?
    var itemName: String
    var quantity: Double
    var unit: String
    var rate: Double
    var discount: Double
    var taxRate: Double

    var total: Double {
        let result = GSTCalculator.calculate(rate: rate, quantity: quantity, discount: discount, taxRate: taxRate, isIntraState: true)
        return result.taxableValue + result.cgst + result.sgst + result.igst
    }

    mutating func updateFromAmount(_ amount: Double) {
        let disc = discount / 100.0
        let gross = quantity > 0 ? amount / (1 - disc) : 0
        rate = quantity > 0 ? gross / quantity : 0
    }
}

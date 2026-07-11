import Foundation
import SwiftUI

@MainActor
class CustomerViewModel: ObservableObject {
    @Published var customers: [Customer] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var selectedCustomer: Customer?
    @Published var ledgerResponse: LedgerResponse?
    @Published var ledgerLoading = false
    var deleteTransactionId: String? = nil

    private let apiService = APIService.shared
    private let localStorage = LocalStorage.shared

    func loadCustomers(businessId: String) async {
        isLoading = true
        errorMessage = nil
        customers = localStorage.getCachedCustomers()
        do {
            let data: [Customer] = try await apiService.getCustomers(businessId: businessId)
            customers = data
            localStorage.cacheCustomers(data)
        } catch {
            if customers.isEmpty { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }

    func searchCustomers(businessId: String) async {
        isLoading = true
        do {
            let data: [Customer] = try await apiService.getCustomers(businessId: businessId, search: searchText)
            customers = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createCustomer(businessId: String, _ dto: CreateCustomerRequest) async throws -> Customer {
        do {
            let customer = try await apiService.createCustomer(businessId: businessId, dto)
            customers.insert(customer, at: 0)
            return customer
        } catch {
            if case AppError.networkError = error {
                savePendingOperation(type: .createCustomer, businessId: businessId, entityId: nil, dto: dto)
            }
            throw error
        }
    }

    func updateCustomer(businessId: String, customerId: String, _ dto: CreateCustomerRequest) async throws -> Customer {
        do {
            let customer = try await apiService.updateCustomer(businessId: businessId, customerId: customerId, dto)
            if let idx = customers.firstIndex(where: { $0.id == customerId }) {
                customers[idx] = customer
            }
            return customer
        } catch {
            if case AppError.networkError = error {
                savePendingOperation(type: .updateCustomer, businessId: businessId, entityId: customerId, dto: dto)
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

    func deleteCustomer(businessId: String, customerId: String) async throws {
        try await apiService.deleteCustomer(businessId: businessId, customerId: customerId)
        customers.removeAll { $0.id == customerId }
    }

    func loadLedger(businessId: String, customerId: String) async {
        ledgerLoading = true
        errorMessage = nil
        do {
            let data: LedgerResponse = try await apiService.getCustomerLedger(businessId: businessId, customerId: customerId)
            ledgerResponse = data
        } catch {
            errorMessage = error.localizedDescription
        }
        ledgerLoading = false
    }

    func recordPayment(businessId: String, customerId: String, _ dto: RecordCustomerPaymentRequest) async throws -> LedgerEntryItem {
        let entry = try await apiService.recordCustomerPayment(businessId: businessId, customerId: customerId, dto)
        await loadLedger(businessId: businessId, customerId: customerId)
        return entry
    }

    func deleteLedgerEntry(businessId: String, customerId: String, transactionId: String) async {
        do {
            try await apiService.deleteLedgerEntry(
                businessId: businessId,
                customerId: customerId,
                transactionId: transactionId
            )
            deleteTransactionId = nil
        } catch {
            print("Failed to delete entry: \(error)")
        }
    }

    var filteredCustomers: [Customer] {
        if searchText.isEmpty { return customers }
        return customers.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.phone?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.gstin?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
}

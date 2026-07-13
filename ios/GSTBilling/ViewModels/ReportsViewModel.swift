import Foundation
import SwiftUI

@MainActor
class ReportsViewModel: ObservableObject {
    @Published var salesReport: SalesReport?
    @Published var gstr1Report: Gstr1Report?
    @Published var gstr3bReport: Gstr3bReport?
    @Published var customerReport: CustomerReport?
    @Published var profitLoss: ProfitLossReport?
    @Published var inventoryDashboard: InventoryDashboard?
    @Published var stockMovements: StockMovementsReport?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedTab = 0

    @Published var startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published var endDate = Date()
    @Published var selectedMonth = Calendar.current.component(.month, from: Date())
    @Published var selectedYear = Calendar.current.component(.year, from: Date())
    @Published var gstr1FromDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published var gstr1ToDate = Date()
    @Published var selectedMovementProductId: String?

    private let apiService = APIService.shared

    func loadSalesReport(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: SalesReport = try await apiService.getSalesReport(
                businessId: businessId,
                startDate: Helpers.isoString(from: startDate),
                endDate: Helpers.isoString(from: endDate)
            )
            salesReport = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadGstr1(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: Gstr1Report = try await apiService.getGstr1(
                businessId: businessId,
                fromDate: Helpers.isoString(from: gstr1FromDate),
                toDate: Helpers.isoString(from: gstr1ToDate)
            )
            gstr1Report = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadGstr3b(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: Gstr3bReport = try await apiService.getGstr3b(
                businessId: businessId,
                month: selectedMonth,
                year: selectedYear
            )
            gstr3bReport = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadCustomerReport(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: CustomerReport = try await apiService.getCustomerReport(businessId: businessId)
            customerReport = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadProfitLoss(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: ProfitLossReport = try await apiService.getProfitLoss(
                businessId: businessId,
                startDate: Helpers.isoString(from: startDate),
                endDate: Helpers.isoString(from: endDate)
            )
            profitLoss = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadAll(businessId: String) async {
        isLoading = true
        errorMessage = nil
        async let sales: SalesReport? = try? await apiService.getSalesReport(
            businessId: businessId,
            startDate: Helpers.isoString(from: startDate),
            endDate: Helpers.isoString(from: endDate)
        )
        async let gstr1: Gstr1Report? = try? await apiService.getGstr1(
            businessId: businessId,
            fromDate: Helpers.isoString(from: gstr1FromDate),
            toDate: Helpers.isoString(from: gstr1ToDate)
        )
        async let gstr3b: Gstr3bReport? = try? await apiService.getGstr3b(
            businessId: businessId,
            month: selectedMonth,
            year: selectedYear
        )
        async let customers: CustomerReport? = try? await apiService.getCustomerReport(businessId: businessId)
        async let pl: ProfitLossReport? = try? await apiService.getProfitLoss(
            businessId: businessId,
            startDate: Helpers.isoString(from: startDate),
            endDate: Helpers.isoString(from: endDate)
        )
        let results = await (sales, gstr1, gstr3b, customers, pl)
        salesReport = results.0
        gstr1Report = results.1
        gstr3bReport = results.2
        customerReport = results.3
        profitLoss = results.4
        isLoading = false
    }

    func loadInventoryDashboard(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            inventoryDashboard = try await apiService.getInventoryDashboard(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadStockMovements(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: StockMovementsReport = try await apiService.getStockMovements(
                businessId: businessId,
                startDate: Helpers.isoString(from: startDate),
                endDate: Helpers.isoString(from: endDate),
                productId: selectedMovementProductId
            )
            stockMovements = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    var monthNames: [String] {
        let fmt = DateFormatter()
        fmt.dateFormat = "MMMM"
        return (1...12).map {
            let d = Calendar.current.date(from: DateComponents(year: 2000, month: $0, day: 1))!
            return fmt.string(from: d)
        }
    }
}

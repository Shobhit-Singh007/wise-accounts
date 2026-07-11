import Foundation
import SwiftUI

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var dashboard: DashboardData?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    private let localStorage = LocalStorage.shared

    func loadDashboard(businessId: String) async {
        isLoading = true
        errorMessage = nil
        dashboard = localStorage.getCachedDashboard()
        do {
            let data: DashboardData = try await apiService.getDashboard(businessId: businessId)
            dashboard = data
            localStorage.cacheDashboard(data)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

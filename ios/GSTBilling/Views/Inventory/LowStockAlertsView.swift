import SwiftUI

struct LowStockAlertsView: View {
    let business: Business
    @StateObject private var viewModel = LowStockAlertsViewModel()

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.products.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.products.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("All good", systemImage: "checkmark.circle", description: Text("No products are running low on stock"))
            } else {
                ForEach(viewModel.products) { product in
                    NavigationLink(value: AppRoute.editProduct(product)) {
                        HStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.red.opacity(0.1))
                                .frame(width: 44, height: 44)
                                .overlay(Image(systemName: "exclamationmark.triangle").foregroundColor(.red))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(product.name).font(.body)
                                if let sku = product.sku {
                                    Text(sku).font(.caption2).foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                if let qty = product.stockQuantity {
                                    Text("\(qty)")
                                        .font(.headline)
                                        .foregroundColor(.red)
                                }
                                if let threshold = product.lowStockThreshold {
                                    Text("Min: \(threshold)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .navigationTitle("Low Stock Alerts")
        .task { await viewModel.loadLowStock(businessId: business.id) }
        .refreshable { await viewModel.loadLowStock(businessId: business.id) }
        .overlay { if viewModel.isLoading { ProgressView().scaleEffect(1.5) } }
    }
}

@MainActor
class LowStockAlertsViewModel: ObservableObject {
    @Published var products: [Product] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadLowStock(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            products = try await APIService.shared.getLowStockAlerts(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

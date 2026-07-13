import SwiftUI

struct ProductReportView: View {
    let business: Business
    @StateObject private var viewModel = ProductReportViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                dateRangeSection
                summaryCards
                productSalesTable
                topProductsSection
            }
            .padding()
        }
        .refreshable { await viewModel.loadReport(businessId: business.id) }
        .task { await viewModel.loadReport(businessId: business.id) }
        .navigationTitle("Product Report")
    }

    private var dateRangeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Date Range").font(.headline)
            HStack {
                DatePicker("From", selection: $viewModel.startDate, displayedComponents: .date)
                    .labelsHidden()
                DatePicker("To", selection: $viewModel.endDate, displayedComponents: .date)
                    .labelsHidden()
            }
            Button("Load Report") {
                Task { await viewModel.loadReport(businessId: business.id) }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var summaryCards: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Summary").font(.headline)
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if let report = viewModel.report {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ReportCard(title: "Products Sold", value: "\(report.totalQuantitySold)", icon: "cube.fill", color: .blue)
                    ReportCard(title: "Revenue", value: Helpers.formatCurrency(report.totalRevenue), icon: "rupeesign.square.fill", color: .green)
                    ReportCard(title: "Total Tax", value: Helpers.formatCurrency(report.totalTax), icon: "percent", color: .orange)
                    ReportCard(title: "Products", value: "\(report.productSales.count)", icon: "list.bullet", color: .purple)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var productSalesTable: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Product Sales").font(.headline).padding(.horizontal).padding(.bottom, 8)

            if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No data", systemImage: "cube.box", description: Text("No product sales for this period"))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("Product").frame(width: 130, alignment: .leading)
                            Text("Qty").frame(width: 50, alignment: .center)
                            Text("Revenue").frame(width: 90, alignment: .trailing)
                            Text("Tax").frame(width: 75, alignment: .trailing)
                        }
                        .font(.system(size: 11)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(viewModel.filteredProducts) { entry in
                            HStack(spacing: 0) {
                                Text(entry.productName)
                                    .frame(width: 130, alignment: .leading)
                                    .lineLimit(1)
                                Text("\(Int(entry.quantitySold))")
                                    .frame(width: 50, alignment: .center)
                                Text(Helpers.formatCurrency(entry.revenue))
                                    .frame(width: 90, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.tax))
                                    .frame(width: 75, alignment: .trailing)
                            }
                            .font(.system(size: 11))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            Divider().padding(.leading, 12)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var topProductsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Top Products by Revenue").font(.headline)
            if let report = viewModel.report, !report.topProducts.isEmpty {
                ForEach(report.topProducts) { product in
                    HStack {
                        Circle()
                            .fill(Color.purple.opacity(0.2))
                            .frame(width: 32, height: 32)
                            .overlay(Text(String(product.productName.prefix(1))).font(.caption).fontWeight(.semibold))
                        VStack(alignment: .leading) {
                            Text(product.productName).font(.callout)
                            Text("\(Int(product.quantitySold)) units sold").font(.caption2).foregroundColor(.secondary)
                        }
                        Spacer()
                        Text(Helpers.formatCurrency(product.revenue)).font(.callout).fontWeight(.medium)
                    }
                    if product.id != report.topProducts.last?.id { Divider() }
                }
            } else {
                Text("No data available").foregroundColor(.secondary).font(.callout)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

@MainActor
class ProductReportViewModel: ObservableObject {
    @Published var report: ProductSalesReport?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchText = ""
    @Published var startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published var endDate = Date()

    private let apiService = APIService.shared

    func loadReport(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: ProductSalesReport = try await apiService.request(
                .reports(businessId),
                endpoint: "products",
                queryItems: [
                    URLQueryItem(name: "startDate", value: Helpers.isoString(from: startDate)),
                    URLQueryItem(name: "endDate", value: Helpers.isoString(from: endDate))
                ]
            )
            report = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    var filteredProducts: [ProductSalesEntry] {
        guard let products = report?.productSales else { return [] }
        if searchText.isEmpty { return products }
        return products.filter {
            $0.productName.localizedCaseInsensitiveContains(searchText)
        }
    }
}

struct ProductSalesReport: Codable {
    let startDate: String?
    let endDate: String?
    let totalQuantitySold: Int
    let totalRevenue: Double
    let totalTax: Double
    let productSales: [ProductSalesEntry]
    let topProducts: [ProductSalesEntry]
}

struct ProductSalesEntry: Codable, Identifiable {
    let productId: String
    let productName: String
    let quantitySold: Double
    let revenue: Double
    let tax: Double

    var id: String { productId }
}

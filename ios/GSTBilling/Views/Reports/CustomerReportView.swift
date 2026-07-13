import SwiftUI

struct CustomerReportView: View {
    let business: Business
    @StateObject private var viewModel = CustomerReportViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                summaryCards
                customerTable
            }
            .padding()
        }
        .refreshable { await viewModel.loadReport(businessId: business.id) }
        .task { await viewModel.loadReport(businessId: business.id) }
        .searchable(text: $viewModel.searchText, prompt: "Search by customer name")
        .navigationTitle("Customer Report")
    }

    private var summaryCards: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Summary").font(.headline)
            if let report = viewModel.report {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ReportCard(title: "Total Billed", value: Helpers.formatCurrency(report.totalBilled), icon: "rupeesign.square", color: .green)
                    ReportCard(title: "Collected", value: Helpers.formatCurrency(report.totalCollected), icon: "checkmark.circle", color: .blue)
                    ReportCard(title: "Outstanding", value: Helpers.formatCurrency(report.totalOutstanding), icon: "clock.fill", color: .red)
                    ReportCard(title: "Customers", value: "\(report.customers?.count ?? 0)", icon: "person.2.fill", color: .purple)
                }
            } else if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var customerTable: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Customer Details").font(.headline).padding(.horizontal).padding(.bottom, 8)

            if viewModel.filteredCustomers.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No customers found", systemImage: "person.slash", description: Text("No data available for the selected period"))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("Customer").frame(width: 120, alignment: .leading)
                            Text("Invoices").frame(width: 60, alignment: .center)
                            Text("Total Billed").frame(width: 90, alignment: .trailing)
                            Text("Outstanding").frame(width: 90, alignment: .trailing)
                        }
                        .font(.system(size: 11)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(viewModel.filteredCustomers) { entry in
                            HStack(spacing: 0) {
                                Text(entry.customerName)
                                    .frame(width: 120, alignment: .leading)
                                    .lineLimit(1)
                                Text("\(entry.invoiceCount)")
                                    .frame(width: 60, alignment: .center)
                                Text(Helpers.formatCurrency(entry.amount))
                                    .frame(width: 90, alignment: .trailing)
                                Text("-")
                                    .frame(width: 90, alignment: .trailing)
                                    .foregroundColor(.secondary)
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
}

@MainActor
class CustomerReportViewModel: ObservableObject {
    @Published var report: CustomerReport?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchText = ""

    private let apiService = APIService.shared

    func loadReport(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: CustomerReport = try await apiService.getCustomerReport(businessId: businessId)
            report = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    var filteredCustomers: [CustomerSalesEntry] {
        guard let customers = report?.customers else { return [] }
        if searchText.isEmpty { return customers }
        return customers.filter {
            $0.customerName.localizedCaseInsensitiveContains(searchText)
        }
    }
}

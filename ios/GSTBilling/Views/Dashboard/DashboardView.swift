import SwiftUI

struct DashboardView: View {
    let business: Business
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var viewModel: DashboardViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                businessHeader
                summaryCards
                if let sales = viewModel.dashboard?.weeklySales, !sales.isEmpty {
                    salesChart
                }
                if let invoices = viewModel.dashboard?.recentInvoices, !invoices.isEmpty {
                    recentInvoicesSection(invoices)
                }
            }
            .padding()
        }
        .refreshable { await viewModel.loadDashboard(businessId: business.id) }
        .task { await viewModel.loadDashboard(businessId: business.id) }
        .navigationTitle(business.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(value: AppRoute.settings) {
                    Image(systemName: "gearshape")
                }
            }
        }
    }

    private var businessHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let gstin = business.gstin {
                Text("GSTIN: \(gstin)").font(.caption).foregroundColor(.secondary)
            }
            HStack {
                if let city = business.city, let state = business.state {
                    Text("\(city), \(state)").font(.caption).foregroundColor(.secondary)
                }
                Spacer()
                Text(Helpers.formatDate(business.createdAt)).font(.caption2).foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var summaryCards: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            SummaryCard(title: "Total Sales", value: Helpers.formatCurrency(viewModel.dashboard?.totalSales ?? 0), icon: "rupeesign.square.fill", color: .green)
            SummaryCard(title: "Invoices", value: "\(viewModel.dashboard?.totalInvoices ?? 0)", icon: "doc.text.fill", color: .blue)
            SummaryCard(title: "Customers", value: "\(viewModel.dashboard?.totalCustomers ?? 0)", icon: "person.2.fill", color: .orange)
            SummaryCard(title: "Products", value: "\(viewModel.dashboard?.totalProducts ?? 0)", icon: "cube.fill", color: .purple)
            SummaryCard(title: "Pending", value: Helpers.formatCurrency(viewModel.dashboard?.pendingAmount ?? 0), icon: "clock.fill", color: .red)
            SummaryCard(title: "Today", value: Helpers.formatCurrency(viewModel.dashboard?.todaySales ?? 0), icon: "chart.bar.fill", color: .teal)
        }
    }

    private var salesChart: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Weekly Sales").font(.headline)
            HStack(alignment: .bottom, spacing: 4) {
                if let sales = viewModel.dashboard?.weeklySales {
                    ForEach(sales, id: \.date) { day in
                        VStack(spacing: 4) {
                            Text(Helpers.formatCurrency(day.amount)).font(.system(size: 8))
                            Rectangle()
                                .fill(Color.blue.opacity(0.6))
                                .frame(height: max(4, CGFloat(day.amount / (sales.map(\.amount).max() ?? 1)) * 80))
                                .cornerRadius(4)
                            Text(formatDay(day.date)).font(.system(size: 8))
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .frame(height: 120)
            .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func recentInvoicesSection(_ invoices: [Invoice]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recent Invoices").font(.headline)
            ForEach(invoices.prefix(5)) { invoice in
                NavigationLink(value: AppRoute.invoiceDetail(invoice)) {
                    HStack {
                        Text(invoice.invoiceNo).font(.callout).foregroundColor(.blue)
                        Spacer()
                        Text(Helpers.formatCurrency(invoice.grandTotal ?? 0)).font(.callout)
                    }
                    .padding(.vertical, 4)
                }
                if invoice.id != invoices.prefix(5).last?.id {
                    Divider()
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func formatDay(_ iso: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        if let d = Helpers.dateFromISO(iso) {
            return f.string(from: d)
        }
        return String(iso.suffix(5).prefix(2))
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon).foregroundColor(color)
                Spacer()
            }
            Text(value).font(.title3).bold()
            Text(title).font(.caption).foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

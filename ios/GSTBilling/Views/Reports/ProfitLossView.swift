import SwiftUI

struct ProfitLossView: View {
    let business: Business
    @StateObject private var viewModel = ProfitLossViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                dateRangeSection
                summarySection
                breakdownSection
            }
            .padding()
        }
        .refreshable { await viewModel.loadReport(businessId: business.id) }
        .task { await viewModel.loadReport(businessId: business.id) }
        .navigationTitle("Profit & Loss")
    }

    private var dateRangeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Period").font(.headline)
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

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Summary").font(.headline)

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if let report = viewModel.report {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    PLCard(title: "Revenue", value: report.totalRevenue, icon: "arrow.up.right.circle.fill", color: .green)
                    PLCard(title: "Cost of Goods", value: report.totalCost, icon: "arrow.down.right.circle.fill", color: .orange)
                    PLCard(title: "Gross Profit", value: report.grossProfit, icon: "chart.line.uptrend.xyaxis", color: report.grossProfit >= 0 ? .green : .red)
                    PLCard(title: "Expenses", value: report.expenses ?? 0, icon: "minus.circle.fill", color: .red)
                    PLCard(title: "Net Profit", value: report.netProfit ?? report.grossProfit, icon: "indianrupeesign.circle.fill", color: (report.netProfit ?? report.grossProfit) >= 0 ? .green : .red)
                    PLCard(title: "Margin", valueText: "\(Helpers.formatNumber(report.grossMargin))%", icon: "percent", color: .purple)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Gross Margin").font(.subheadline).fontWeight(.semibold)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(.systemGray5))
                                .frame(height: 8)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(report.grossMargin >= 0 ? Color.green : Color.red)
                                .frame(width: geo.size.width * min(max(report.grossMargin / 100, 0), 1), height: 8)
                        }
                    }
                    .frame(height: 8)
                    Text("\(Helpers.formatNumber(max(min(report.grossMargin, 100), 0)))% of revenue")
                        .font(.caption).foregroundColor(.secondary)
                }
                .padding(10)
                .background(Color(.systemBackground))
                .cornerRadius(8)
            } else {
                Text("No data available").foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var breakdownSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Breakdown").font(.headline)
            if let report = viewModel.report {
                Group {
                    LabeledContent("Total Revenue", value: Helpers.formatCurrency(report.totalRevenue))
                    LabeledContent("Cost of Goods Sold", value: Helpers.formatCurrency(report.totalCost))
                    Divider()
                    LabeledContent("Gross Profit", value: Helpers.formatCurrency(report.grossProfit))
                        .foregroundColor(report.grossProfit >= 0 ? .green : .red)
                    if let expenses = report.expenses {
                        LabeledContent("Operating Expenses", value: Helpers.formatCurrency(expenses))
                    }
                    Divider()
                    if let net = report.netProfit {
                        LabeledContent("Net Profit", value: Helpers.formatCurrency(net))
                            .fontWeight(.bold)
                            .foregroundColor(net >= 0 ? .green : .red)
                    }
                    LabeledContent("Gross Margin", value: "\(Helpers.formatNumber(report.grossMargin))%")
                }
                .font(.callout)

                if let period = report.period {
                    Text("Period: \(period)")
                        .font(.caption).foregroundColor(.secondary)
                        .padding(.top, 4)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct PLCard: View {
    let title: String
    let value: Double
    let icon: String
    let color: Color
    var valueText: String? = nil

    var body: some View {
        HStack {
            Image(systemName: icon).foregroundColor(color)
            VStack(alignment: .leading) {
                Text(valueText ?? Helpers.formatCurrency(value))
                    .font(.callout).bold()
                Text(title).font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

@MainActor
class ProfitLossViewModel: ObservableObject {
    @Published var report: ProfitLossReport?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published var endDate = Date()

    private let apiService = APIService.shared

    func loadReport(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: ProfitLossReport = try await apiService.getProfitLoss(
                businessId: businessId,
                startDate: Helpers.isoString(from: startDate),
                endDate: Helpers.isoString(from: endDate)
            )
            report = data
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

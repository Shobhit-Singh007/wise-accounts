import SwiftUI

struct ReportsView: View {
    let business: Business
    @StateObject private var viewModel = ReportsViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                salesSummary
                gstr1Section
                gstr3bSection
                if let pl = viewModel.profitLoss {
                    profitLossSection(pl)
                }
            }
            .padding()
        }
        .refreshable { await viewModel.loadAll(businessId: business.id) }
        .task { await viewModel.loadAll(businessId: business.id) }
        .navigationTitle("Reports")
    }

    private var salesSummary: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sales Summary").font(.headline)
            if let sr = viewModel.salesReport {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ReportCard(title: "Total Sales", value: Helpers.formatCurrency(sr.summary.totalSales), icon: "rupeesign.square", color: .green)
                    ReportCard(title: "Invoices", value: "\(sr.summary.totalInvoices)", icon: "doc.text", color: .blue)
                    ReportCard(title: "Total Tax", value: Helpers.formatCurrency(sr.summary.totalTax), icon: "percent", color: .orange)
                    ReportCard(title: "Avg Invoice", value: Helpers.formatCurrency(sr.summary.averageInvoice), icon: "chart.bar.xaxis", color: .purple)
                }
                if !sr.categorySales.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Category Sales").font(.subheadline).fontWeight(.semibold)
                        ForEach(sr.categorySales) { cat in
                            HStack {
                                Text(cat.name).font(.caption)
                                Spacer()
                                Text("\(Int(cat.count))")
                                    .font(.caption).foregroundColor(.secondary)
                                Text(Helpers.formatCurrency(cat.total))
                                    .font(.caption).fontWeight(.medium)
                            }
                            if cat.id != sr.categorySales.last?.id { Divider() }
                        }
                    }
                }
            } else if viewModel.isLoading {
                ProgressView()
            } else {
                Text("No data available").foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var gstr1Section: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("GSTR-1").font(.headline)
                Spacer()
                HStack(spacing: 6) {
                    Picker("Month", selection: $viewModel.selectedMonth) {
                        ForEach(1...12, id: \.self) { m in
                            Text(viewModel.monthNames[m - 1]).tag(m)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 110)
                    Picker("Year", selection: $viewModel.selectedYear) {
                        ForEach(2023...2026, id: \.self) { y in
                            Text(String(y)).tag(y)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 70)
                    Button("Load") {
                        Task { await viewModel.loadGstr1(businessId: business.id) }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }

            if let gstr1 = viewModel.gstr1Report {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ReportCard(title: "Total Invoices", value: "\(gstr1.summary.totalInvoices)", icon: "doc.text", color: .blue)
                    ReportCard(title: "Taxable Value", value: Helpers.formatCurrency(gstr1.summary.totalTaxableValue), icon: "rupeesign.square", color: .green)
                    ReportCard(title: "Total Tax", value: Helpers.formatCurrency(gstr1.summary.totalTax), icon: "percent", color: .orange)
                    ReportCard(title: "B2C Count", value: "\(gstr1.b2c.count)", icon: "person.2", color: .purple)
                }

                if !gstr1.b2b.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("B2B Invoices").font(.subheadline).fontWeight(.semibold)
                        ScrollView(.horizontal, showsIndicators: false) {
                            VStack(spacing: 0) {
                                HStack(spacing: 0) {
                                    Text("Invoice").frame(width: 80, alignment: .leading)
                                    Text("Customer").frame(width: 100, alignment: .leading)
                                    Text("GSTIN").frame(width: 110, alignment: .leading)
                                    Text("Taxable").frame(width: 75, alignment: .trailing)
                                    Text("Tax").frame(width: 65, alignment: .trailing)
                                    Text("Total").frame(width: 80, alignment: .trailing)
                                }
                                .font(.system(size: 10)).fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                                ForEach(gstr1.b2b) { entry in
                                    HStack(spacing: 0) {
                                        Text(entry.invoiceNo).frame(width: 80, alignment: .leading)
                                        Text(entry.customerName ?? "-").frame(width: 100, alignment: .leading).lineLimit(1)
                                        Text(entry.customerGstin ?? "-").frame(width: 110, alignment: .leading).font(.system(size: 9)).lineLimit(1)
                                        Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 75, alignment: .trailing)
                                        Text(Helpers.formatCurrency(entry.taxAmount)).frame(width: 65, alignment: .trailing)
                                        Text(Helpers.formatCurrency(entry.grandTotal)).frame(width: 80, alignment: .trailing).fontWeight(.medium)
                                    }
                                    .font(.system(size: 10))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    Divider().padding(.leading, 8)
                                }
                            }
                        }
                    }
                }

                if gstr1.b2c.count > 0 {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("B2C Summary").font(.subheadline).fontWeight(.semibold)
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Count").font(.caption).foregroundColor(.secondary)
                                Text("\(gstr1.b2c.count)").font(.callout).fontWeight(.medium)
                            }
                            Spacer()
                            VStack(alignment: .leading) {
                                Text("Taxable Value").font(.caption).foregroundColor(.secondary)
                                Text(Helpers.formatCurrency(gstr1.b2c.totalTaxableValue)).font(.callout).fontWeight(.medium)
                            }
                            Spacer()
                            VStack(alignment: .leading) {
                                Text("Tax").font(.caption).foregroundColor(.secondary)
                                Text(Helpers.formatCurrency(gstr1.b2c.totalTax)).font(.callout).fontWeight(.medium)
                            }
                        }
                    }
                    .padding(10)
                    .background(Color(.systemBackground))
                    .cornerRadius(8)
                }
            } else {
                Text("Select month/year and tap Load").foregroundColor(.secondary).font(.callout)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var gstr3bSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("GSTR-3B").font(.headline)
                Spacer()
                HStack(spacing: 6) {
                    Picker("Month", selection: $viewModel.selectedMonth) {
                        ForEach(1...12, id: \.self) { m in
                            Text(viewModel.monthNames[m - 1]).tag(m)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 110)
                    Picker("Year", selection: $viewModel.selectedYear) {
                        ForEach(2023...2026, id: \.self) { y in
                            Text(String(y)).tag(y)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 70)
                    Button("Load") {
                        Task { await viewModel.loadGstr3b(businessId: business.id) }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }

            if let gstr3b = viewModel.gstr3bReport {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ReportCard(title: "Total Invoices", value: "\(gstr3b.summary.totalInvoices)", icon: "doc.text", color: .blue)
                    ReportCard(title: "Taxable Value", value: Helpers.formatCurrency(gstr3b.summary.totalTaxableValue), icon: "rupeesign.square", color: .green)
                    ReportCard(title: "Tax Liability", value: Helpers.formatCurrency(gstr3b.summary.totalTax), icon: "exclamationmark.triangle", color: .red)
                    ReportCard(title: "Amount Paid", value: Helpers.formatCurrency(gstr3b.summary.totalPaid), icon: "checkmark.circle", color: .green)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Outstanding").font(.subheadline).fontWeight(.semibold)
                    Text(Helpers.formatCurrency(gstr3b.summary.outstanding))
                        .font(.title3).fontWeight(.bold)
                        .foregroundColor(gstr3b.summary.outstanding > 0 ? .red : .green)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(8)
            } else {
                Text("Select month/year and tap Load").foregroundColor(.secondary).font(.callout)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func profitLossSection(_ pl: ProfitLossReport) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Profit & Loss").font(.headline)
            LabeledContent("Revenue", value: Helpers.formatCurrency(pl.totalRevenue))
            LabeledContent("Cost", value: Helpers.formatCurrency(pl.totalCost))
            LabeledContent("Gross Profit", value: Helpers.formatCurrency(pl.grossProfit))
                .foregroundColor(pl.grossProfit >= 0 ? .green : .red)
            LabeledContent("Margin", value: "\(Helpers.formatNumber(pl.grossMargin))%")
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct ReportCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon).foregroundColor(color)
            VStack(alignment: .leading) {
                Text(value).font(.callout).bold()
                Text(title).font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

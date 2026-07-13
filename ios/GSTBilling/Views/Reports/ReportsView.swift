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

    // MARK: - GSTR-1

    private var gstr1Section: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("GSTR-1").font(.headline)
                Spacer()
                Button("Load") {
                    Task { await viewModel.loadGstr1(businessId: business.id) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }

            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("From").font(.caption2).foregroundColor(.secondary)
                    DatePicker("", selection: $viewModel.gstr1FromDate, displayedComponents: .date)
                        .labelsHidden()
                        .scaleEffect(0.85)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("To").font(.caption2).foregroundColor(.secondary)
                    DatePicker("", selection: $viewModel.gstr1ToDate, displayedComponents: .date)
                        .labelsHidden()
                        .scaleEffect(0.85)
                }
            }

            if let gstr1 = viewModel.gstr1Report {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ReportCard(title: "Total Invoices", value: "\(gstr1.summary.totalInvoices)", icon: "doc.text", color: .blue)
                    ReportCard(title: "Taxable Value", value: Helpers.formatCurrency(gstr1.summary.totalTaxableValue), icon: "rupeesign.square", color: .green)
                    ReportCard(title: "Total Tax", value: Helpers.formatCurrency(gstr1.summary.totalTax), icon: "percent", color: .orange)
                    ReportCard(title: "B2C Count", value: "\(gstr1.b2c.count)", icon: "person.2", color: .purple)
                }

                gstr1Table4Section(gstr1.b2b)
                gstr1Table5Section(gstr1.b2cLarge)
                gstr1Table6Section(gstr1.b2cSmall)
                gstr1Table7Section(gstr1.hsnSummary)
                gstr1Table8Section(gstr1.documents)
            } else {
                Text("Select date range and tap Load").foregroundColor(.secondary).font(.callout)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // Table 4: B2B Invoices
    private func gstr1Table4Section(_ entries: [Gstr1B2bEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 4: B2B Invoices").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No B2B invoices").foregroundColor(.secondary).font(.caption)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("GSTIN").frame(width: 110, alignment: .leading)
                            Text("Invoice No").frame(width: 80, alignment: .leading)
                            Text("Date").frame(width: 65, alignment: .leading)
                            Text("Value").frame(width: 75, alignment: .trailing)
                            Text("Supply").frame(width: 55, alignment: .leading)
                            Text("Rev").frame(width: 35, alignment: .center)
                            Text("Taxable").frame(width: 75, alignment: .trailing)
                            Text("CGST").frame(width: 60, alignment: .trailing)
                            Text("SGST").frame(width: 60, alignment: .trailing)
                            Text("IGST").frame(width: 60, alignment: .trailing)
                        }
                        .font(.system(size: 9)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(entries) { entry in
                            HStack(spacing: 0) {
                                Text(entry.customerGstin ?? "-").frame(width: 110, alignment: .leading).font(.system(size: 8)).lineLimit(1)
                                Text(entry.invoiceNo).frame(width: 80, alignment: .leading).font(.system(size: 9))
                                Text(Helpers.formatDateShort(entry.date)).frame(width: 65, alignment: .leading).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.invoiceValue ?? entry.grandTotal)).frame(width: 75, alignment: .trailing).font(.system(size: 9))
                                Text(entry.placeOfSupply ?? "-").frame(width: 55, alignment: .leading).font(.system(size: 8)).lineLimit(1)
                                Text(entry.reverseCharge == true ? "Y" : "N").frame(width: 35, alignment: .center).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 75, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.cgst ?? 0)).frame(width: 60, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.sgst ?? 0)).frame(width: 60, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.igst ?? 0)).frame(width: 60, alignment: .trailing).font(.system(size: 9))
                            }
                            .font(.system(size: 9))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            Divider().padding(.leading, 8)
                        }
                    }
                }
            }
        }
    }

    // Table 5: B2C Large
    private func gstr1Table5Section(_ entries: [Gstr1B2cLargeEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 5: B2C Large").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No B2C Large entries").foregroundColor(.secondary).font(.caption)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("Place of Supply").frame(width: 90, alignment: .leading)
                            Text("Rate").frame(width: 50, alignment: .trailing)
                            Text("Taxable").frame(width: 80, alignment: .trailing)
                            Text("CGST").frame(width: 65, alignment: .trailing)
                            Text("SGST").frame(width: 65, alignment: .trailing)
                            Text("IGST").frame(width: 65, alignment: .trailing)
                        }
                        .font(.system(size: 10)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(entries) { entry in
                            HStack(spacing: 0) {
                                Text(entry.placeOfSupply).frame(width: 90, alignment: .leading).lineLimit(1)
                                Text("\(Int(entry.rate))%").frame(width: 50, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 80, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.cgst)).frame(width: 65, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.sgst)).frame(width: 65, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.igst)).frame(width: 65, alignment: .trailing)
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
    }

    // Table 6: B2C Small
    private func gstr1Table6Section(_ entries: [Gstr1B2cSmallEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 6: B2C Small").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No B2C Small entries").foregroundColor(.secondary).font(.caption)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("Place of Supply").frame(width: 90, alignment: .leading)
                            Text("Rate").frame(width: 50, alignment: .trailing)
                            Text("Taxable").frame(width: 80, alignment: .trailing)
                            Text("CGST").frame(width: 65, alignment: .trailing)
                            Text("SGST").frame(width: 65, alignment: .trailing)
                            Text("IGST").frame(width: 65, alignment: .trailing)
                        }
                        .font(.system(size: 10)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(entries) { entry in
                            HStack(spacing: 0) {
                                Text(entry.placeOfSupply).frame(width: 90, alignment: .leading).lineLimit(1)
                                Text("\(Int(entry.rate))%").frame(width: 50, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 80, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.cgst)).frame(width: 65, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.sgst)).frame(width: 65, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.igst)).frame(width: 65, alignment: .trailing)
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
    }

    // Table 7: HSN Summary
    private func gstr1Table7Section(_ entries: [Gstr1HsnEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 7: HSN Summary").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No HSN entries").foregroundColor(.secondary).font(.caption)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("HSN").frame(width: 70, alignment: .leading)
                            Text("Description").frame(width: 85, alignment: .leading)
                            Text("UQC").frame(width: 45, alignment: .leading)
                            Text("Qty").frame(width: 50, alignment: .trailing)
                            Text("Value").frame(width: 70, alignment: .trailing)
                            Text("Taxable").frame(width: 70, alignment: .trailing)
                            Text("CGST").frame(width: 55, alignment: .trailing)
                            Text("SGST").frame(width: 55, alignment: .trailing)
                            Text("IGST").frame(width: 55, alignment: .trailing)
                        }
                        .font(.system(size: 9)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(entries) { entry in
                            HStack(spacing: 0) {
                                Text(entry.hsnCode).frame(width: 70, alignment: .leading).font(.system(size: 9))
                                Text(entry.description).frame(width: 85, alignment: .leading).font(.system(size: 8)).lineLimit(1)
                                Text(entry.uqc).frame(width: 45, alignment: .leading).font(.system(size: 9))
                                Text("\(Int(entry.quantity))").frame(width: 50, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.totalValue)).frame(width: 70, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 70, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.cgst)).frame(width: 55, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.sgst)).frame(width: 55, alignment: .trailing).font(.system(size: 9))
                                Text(Helpers.formatCurrency(entry.igst)).frame(width: 55, alignment: .trailing).font(.system(size: 9))
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            Divider().padding(.leading, 8)
                        }
                    }
                }
            }
        }
    }

    // Table 8: Documents
    private func gstr1Table8Section(_ docs: Gstr1DocumentSummary?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 8: Documents Summary").font(.subheadline).fontWeight(.semibold)
            if let docs = docs {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text("Document").frame(width: 110, alignment: .leading)
                        Text("Count").frame(width: 60, alignment: .trailing)
                        Text("Value").frame(width: 90, alignment: .trailing)
                    }
                    .font(.system(size: 10)).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                    HStack(spacing: 0) {
                        Text("Invoices Issued").frame(width: 110, alignment: .leading).font(.system(size: 10))
                        Text("\(docs.invoicesIssued?.count ?? 0)").frame(width: 60, alignment: .trailing).font(.system(size: 10))
                        Text(Helpers.formatCurrency(docs.invoicesIssued?.totalValue ?? 0)).frame(width: 90, alignment: .trailing).font(.system(size: 10))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    Divider().padding(.leading, 8)
                    HStack(spacing: 0) {
                        Text("Credit Notes").frame(width: 110, alignment: .leading).font(.system(size: 10))
                        Text("\(docs.creditNotes?.count ?? 0)").frame(width: 60, alignment: .trailing).font(.system(size: 10))
                        Text(Helpers.formatCurrency(docs.creditNotes?.totalValue ?? 0)).frame(width: 90, alignment: .trailing).font(.system(size: 10))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                }
            } else {
                Text("No document data").foregroundColor(.secondary).font(.caption)
            }
        }
    }

    // MARK: - GSTR-3B

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

                gstr3bTable31Section(gstr3b.outwardSupplies ?? [])
                gstr3bTable32Section(gstr3b.interStateSupplies ?? [])
                gstr3bTable4Section(gstr3b.eligibleItc ?? [])
                gstr3bTable5Section(gstr3b.exemptNilNonGst ?? [])
                gstr3bTable6Section(gstr3b.paymentOfTax ?? [])
            } else {
                Text("Select month/year and tap Load").foregroundColor(.secondary).font(.callout)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // Table 3.1: Outward Supplies
    private func gstr3bTable31Section(_ entries: [Gstr3bLabeledSupply]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 3.1: Outward Supplies").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No data available").foregroundColor(.secondary).font(.caption)
            } else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text("Description").frame(width: 100, alignment: .leading)
                        Text("Taxable").frame(width: 80, alignment: .trailing)
                        Text("IGST").frame(width: 65, alignment: .trailing)
                        Text("CGST").frame(width: 65, alignment: .trailing)
                        Text("SGST").frame(width: 65, alignment: .trailing)
                        Text("Cess").frame(width: 55, alignment: .trailing)
                    }
                    .font(.system(size: 10)).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                    ForEach(entries) { entry in
                        HStack(spacing: 0) {
                            Text(entry.label).frame(width: 100, alignment: .leading).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 80, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.igst)).frame(width: 65, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cgst)).frame(width: 65, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.sgst)).frame(width: 65, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cess)).frame(width: 55, alignment: .trailing).font(.system(size: 10))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        Divider().padding(.leading, 8)
                    }
                }
            }
        }
    }

    // Table 3.2: Inter-state Supplies
    private func gstr3bTable32Section(_ entries: [Gstr3bInterStateSupply]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 3.2: Inter-State Supplies").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No inter-state supplies").foregroundColor(.secondary).font(.caption)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Text("Place of Supply").frame(width: 110, alignment: .leading)
                            Text("Taxable Value").frame(width: 90, alignment: .trailing)
                            Text("IGST").frame(width: 80, alignment: .trailing)
                        }
                        .font(.system(size: 10)).fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                        ForEach(entries) { entry in
                            HStack(spacing: 0) {
                                Text(entry.placeOfSupply).frame(width: 110, alignment: .leading).lineLimit(1)
                                Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 90, alignment: .trailing)
                                Text(Helpers.formatCurrency(entry.igst)).frame(width: 80, alignment: .trailing)
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
    }

    // Table 4: Eligible ITC
    private func gstr3bTable4Section(_ entries: [Gstr3bLabeledItc]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 4: Eligible ITC").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No ITC data available").foregroundColor(.secondary).font(.caption)
            } else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text("Description").frame(width: 100, alignment: .leading)
                        Text("IGST").frame(width: 70, alignment: .trailing)
                        Text("CGST").frame(width: 70, alignment: .trailing)
                        Text("SGST").frame(width: 70, alignment: .trailing)
                        Text("Cess").frame(width: 60, alignment: .trailing)
                    }
                    .font(.system(size: 10)).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                    ForEach(entries) { entry in
                        HStack(spacing: 0) {
                            Text(entry.label).frame(width: 100, alignment: .leading).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.igst)).frame(width: 70, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cgst)).frame(width: 70, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.sgst)).frame(width: 70, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cess)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        Divider().padding(.leading, 8)
                    }
                }
            }
        }
    }

    // Table 5: Exempt/Nil/Non-GST
    private func gstr3bTable5Section(_ entries: [Gstr3bLabeledExempt]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 5: Exempt/Nil/Non-GST").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No exempt data available").foregroundColor(.secondary).font(.caption)
            } else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text("Description").frame(width: 70, alignment: .leading)
                        Text("Value").frame(width: 70, alignment: .trailing)
                        Text("IGST").frame(width: 60, alignment: .trailing)
                        Text("CGST").frame(width: 60, alignment: .trailing)
                        Text("SGST").frame(width: 60, alignment: .trailing)
                        Text("Cess").frame(width: 55, alignment: .trailing)
                    }
                    .font(.system(size: 9)).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                    ForEach(entries) { entry in
                        HStack(spacing: 0) {
                            Text(entry.label).frame(width: 70, alignment: .leading).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.taxableValue)).frame(width: 70, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.igst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cgst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.sgst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cess)).frame(width: 55, alignment: .trailing).font(.system(size: 10))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        Divider().padding(.leading, 8)
                    }
                }
            }
        }
    }

    // Table 6: Payment of Tax
    private func gstr3bTable6Section(_ entries: [Gstr3bPaymentRow]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Table 6: Payment of Tax").font(.subheadline).fontWeight(.semibold)
            if entries.isEmpty {
                Text("No payment data available").foregroundColor(.secondary).font(.caption)
            } else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text("Description").frame(width: 75, alignment: .leading)
                        Text("CGST").frame(width: 60, alignment: .trailing)
                        Text("SGST").frame(width: 60, alignment: .trailing)
                        Text("IGST").frame(width: 60, alignment: .trailing)
                        Text("Cess").frame(width: 55, alignment: .trailing)
                        Text("Interest").frame(width: 60, alignment: .trailing)
                        Text("Late Fee").frame(width: 55, alignment: .trailing)
                        Text("Total").frame(width: 70, alignment: .trailing)
                    }
                    .font(.system(size: 9)).fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.35))

                    ForEach(entries) { entry in
                        HStack(spacing: 0) {
                            Text(entry.label).frame(width: 75, alignment: .leading).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cgst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.sgst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.igst)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.cess)).frame(width: 55, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.interest)).frame(width: 60, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.lateFee)).frame(width: 55, alignment: .trailing).font(.system(size: 10))
                            Text(Helpers.formatCurrency(entry.total)).frame(width: 70, alignment: .trailing).font(.system(size: 10))
                                .foregroundColor(entry.total > 0 ? .red : .green)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        Divider().padding(.leading, 8)
                    }
                }
            }
        }
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

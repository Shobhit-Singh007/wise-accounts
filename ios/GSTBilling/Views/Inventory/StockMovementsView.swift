import SwiftUI

struct StockMovementsView: View {
    let business: Business
    @StateObject private var viewModel = ReportsViewModel()
    @State private var products: [Product] = []
    @State private var selectedProductId: String?
    @State private var isLoadingProducts = false

    var body: some View {
        VStack(spacing: 0) {
            filtersSection
            Divider()
            if let report = viewModel.stockMovements {
                movementsList(report)
            } else if viewModel.isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                Spacer()
                ContentUnavailableView("No Movements", systemImage: "arrow.left.arrow.right", description: Text("Select filters and tap Search"))
                Spacer()
            }
        }
        .navigationTitle("Stock Movements")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: exportCsv) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .task {
            await loadProducts()
            await viewModel.loadStockMovements(businessId: business.id)
        }
    }

    private var filtersSection: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("From").font(.caption2).foregroundColor(.secondary)
                    DatePicker("", selection: $viewModel.startDate, displayedComponents: .date)
                        .labelsHidden()
                        .scaleEffect(0.85)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("To").font(.caption2).foregroundColor(.secondary)
                    DatePicker("", selection: $viewModel.endDate, displayedComponents: .date)
                        .labelsHidden()
                        .scaleEffect(0.85)
                }
            }

            HStack {
                Picker("Product", selection: $selectedProductId) {
                    Text("All Products").tag(nil as String?)
                    ForEach(products) { product in
                        Text(product.name).tag(product.id as String?)
                    }
                }
                .pickerStyle(.menu)

                Spacer()

                Button("Search") {
                    viewModel.selectedMovementProductId = selectedProductId
                    Task { await viewModel.loadStockMovements(businessId: business.id) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }

    private func movementsList(_ report: StockMovementsReport) -> some View {
        List {
            if !report.monthlySummary.isEmpty {
                Section("Monthly Summary") {
                    ForEach(report.monthlySummary) { summary in
                        HStack {
                            Text(summary.month).font(.subheadline)
                            Spacer()
                            HStack(spacing: 12) {
                                Label("\(summary.purchases)", systemImage: "arrow.down.circle")
                                    .font(.caption).foregroundColor(.green)
                                Label("\(summary.sales)", systemImage: "arrow.up.circle")
                                    .font(.caption).foregroundColor(.red)
                                Label("\(summary.adjustments)", systemImage: "arrow.left.arrow.right")
                                    .font(.caption).foregroundColor(.orange)
                            }
                        }
                    }
                }
            }

            Section("Movements (\(report.movements.count))") {
                ForEach(report.movements) { movement in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(movement.productName).font(.subheadline).fontWeight(.medium)
                            Spacer()
                            movementTypeBadge(movement.type)
                        }
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                if let warehouse = movement.warehouseName {
                                    Label(warehouse, systemImage: "building.2")
                                        .font(.caption2).foregroundColor(.secondary)
                                }
                                if let batch = movement.batchNo {
                                    Text("Batch: \(batch)").font(.caption2).foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(movement.type == "SALE" ? "-\(movement.quantity)" : "+\(movement.quantity)")
                                    .font(.callout).fontWeight(.semibold)
                                    .foregroundColor(movement.type == "SALE" ? .red : .green)
                                Text(Helpers.formatDateShort(movement.date))
                                    .font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        if let notes = movement.notes, !notes.isEmpty {
                            Text(notes).font(.caption2).foregroundColor(.secondary).italic()
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.plain)
    }

    private func movementTypeBadge(_ type: String) -> some View {
        Text(type)
            .font(.caption2).fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(typeColor(type).opacity(0.15))
            .foregroundColor(typeColor(type))
            .cornerRadius(4)
    }

    private func typeColor(_ type: String) -> Color {
        switch type {
        case "PURCHASE": return .green
        case "SALE": return .red
        case "ADJUSTMENT": return .orange
        case "RETURN": return .blue
        case "TRANSFER": return .purple
        default: return .gray
        }
    }

    private func loadProducts() async {
        isLoadingProducts = true
        do {
            products = try await APIService.shared.getProducts(businessId: business.id)
        } catch {}
        isLoadingProducts = false
    }

    private func exportCsv() {
        guard let report = viewModel.stockMovements else { return }
        let headers = ["Date", "Product", "Warehouse", "Type", "Quantity", "Batch", "Notes"]
        let data: [[String: String]] = report.movements.map { m in
            [
                "Date": Helpers.formatDateShort(m.date),
                "Product": m.productName,
                "Warehouse": m.warehouseName ?? "",
                "Type": m.type,
                "Quantity": "\(m.quantity)",
                "Batch": m.batchNo ?? "",
                "Notes": m.notes ?? ""
            ]
        }
        if let url = ExportService.shared.exportToCsv(data: data, headers: headers, fileName: "stock_movements_\(Int(Date().timeIntervalSince1970))") {
            ExportService.shared.shareFile(url)
        }
    }
}

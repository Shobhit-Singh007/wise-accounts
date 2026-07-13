import SwiftUI

struct InventoryDashboardView: View {
    let business: Business
    @StateObject private var viewModel = ReportsViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                summaryCards
                stockByWarehouseSection
                recentMovementsSection
                lowStockAlertsSection
            }
            .padding()
        }
        .refreshable { await viewModel.loadInventoryDashboard(businessId: business.id) }
        .task { await viewModel.loadInventoryDashboard(businessId: business.id) }
        .navigationTitle("Inventory Dashboard")
    }

    private var summaryCards: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Overview").font(.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                SummaryCard(title: "Total Products", value: "\(viewModel.inventoryDashboard?.totalProducts ?? 0)", icon: "cube.fill", color: .blue)
                SummaryCard(title: "Stock Value", value: Helpers.formatCurrency(viewModel.inventoryDashboard?.stockValue ?? 0), icon: "rupeesign.square.fill", color: .green)
                SummaryCard(title: "Retail Value", value: Helpers.formatCurrency(viewModel.inventoryDashboard?.retailValue ?? 0), icon: "tag.fill", color: .orange)
                SummaryCard(title: "Potential Profit", value: Helpers.formatCurrency(viewModel.inventoryDashboard?.potentialProfit ?? 0), icon: "chart.line.uptrend.xyaxis", color: .purple)
                SummaryCard(title: "Low Stock", value: "\(viewModel.inventoryDashboard?.lowStockCount ?? 0)", icon: "exclamationmark.triangle.fill", color: .yellow)
                SummaryCard(title: "Out of Stock", value: "\(viewModel.inventoryDashboard?.outOfStockCount ?? 0)", icon: "xmark.circle.fill", color: .red)
            }
        }
    }

    private var stockByWarehouseSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Stock by Warehouse").font(.headline)
            if let warehouses = viewModel.inventoryDashboard?.stockByWarehouse, !warehouses.isEmpty {
                let maxValue = warehouses.map(\.value).max() ?? 1
                ForEach(warehouses) { wh in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(wh.warehouse).font(.subheadline)
                            Spacer()
                            Text(Helpers.formatCurrency(wh.value)).font(.caption).foregroundColor(.secondary)
                        }
                        GeometryReader { geo in
                            let width = maxValue > 0 ? CGFloat(wh.value) / CGFloat(maxValue) * geo.size.width : 0
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.blue.opacity(0.7))
                                .frame(width: width, height: 8)
                        }
                        .frame(height: 8)
                    }
                    if wh.id != viewModel.inventoryDashboard?.stockByWarehouse.last?.id {
                        Divider()
                    }
                }
            } else {
                Text("No warehouse data").foregroundColor(.secondary).font(.caption)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var recentMovementsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Recent Stock Movements").font(.headline)
                Spacer()
                NavigationLink(value: AppRoute.stockMovements) {
                    Text("View All").font(.caption)
                }
            }
            if let movements = viewModel.inventoryDashboard?.recentMovements, !movements.isEmpty {
                ForEach(movements.prefix(5)) { movement in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(movement.productName).font(.subheadline)
                            HStack(spacing: 4) {
                                Text(movement.type).font(.caption2).fontWeight(.medium)
                                    .foregroundColor(typeColor(movement.type))
                                if let batch = movement.batchNo {
                                    Text("• \(batch)").font(.caption2).foregroundColor(.secondary)
                                }
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(movement.type == "SALE" ? "-\(movement.quantity)" : "+\(movement.quantity)")
                                .font(.callout).fontWeight(.medium)
                                .foregroundColor(movement.type == "SALE" ? .red : .green)
                            Text(Helpers.formatDateShort(movement.date))
                                .font(.caption2).foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                    if movement.id != movements.prefix(5).last?.id { Divider() }
                }
            } else {
                Text("No recent movements").foregroundColor(.secondary).font(.caption)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var lowStockAlertsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Low Stock Alerts").font(.headline)
                Spacer()
                NavigationLink(value: AppRoute.lowStockAlerts) {
                    Text("View All").font(.caption)
                }
            }
            if let alerts = viewModel.inventoryDashboard?.lowStockAlerts, !alerts.isEmpty {
                ForEach(alerts.prefix(5)) { product in
                    HStack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.red.opacity(0.1))
                            .frame(width: 36, height: 36)
                            .overlay(Image(systemName: "exclamationmark.triangle").font(.caption).foregroundColor(.red))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(product.name).font(.subheadline)
                            if let sku = product.sku {
                                Text(sku).font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            if let qty = product.stockQuantity {
                                Text("\(qty)").font(.callout).fontWeight(.medium).foregroundColor(.red)
                            }
                            if let threshold = product.lowStockThreshold {
                                Text("Min: \(threshold)").font(.caption2).foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                    if product.id != alerts.prefix(5).last?.id { Divider() }
                }
            } else {
                HStack {
                    Image(systemName: "checkmark.circle").foregroundColor(.green)
                    Text("All products are well stocked").foregroundColor(.secondary).font(.caption)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
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
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Spacer()
            }
            HStack {
                Text(value)
                    .font(.title3)
                    .fontWeight(.bold)
                Spacer()
            }
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
    }
}

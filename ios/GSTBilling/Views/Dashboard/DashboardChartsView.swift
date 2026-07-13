import SwiftUI
import Charts

struct ChartDailySales: Identifiable {
    let id = UUID()
    let day: String
    let amount: Double
}

struct ProductSales: Identifiable {
    let id = UUID()
    let name: String
    let amount: Double
}

struct SalesBarChartView: View {
    let data: [ChartDailySales]
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Sales (Last 7 Days)")
                .font(.headline)
            
            if data.isEmpty {
                Text("No sales data")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 180)
            } else {
                Chart(data) { item in
                    BarMark(
                        x: .value("Day", item.day),
                        y: .value("Amount", item.amount)
                    )
                    .foregroundStyle(Color.blue.gradient)
                    .cornerRadius(4)
                }
                .frame(height: 180)
                .chartYAxis {
                    AxisMarks(position: .leading)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct InvoiceStatusChartView: View {
    let draft: Int
    let confirmed: Int
    let cancelled: Int
    let credited: Int
    
    private var total: Int { draft + confirmed + cancelled + credited }
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Invoice Status")
                .font(.headline)
            
            if total == 0 {
                Text("No invoices")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else {
                Chart {
                    SectorMark(angle: .value("Draft", draft))
                        .foregroundStyle(.gray)
                    SectorMark(angle: .value("Confirmed", confirmed))
                        .foregroundStyle(.blue)
                    SectorMark(angle: .value("Cancelled", cancelled))
                        .foregroundStyle(.red)
                    SectorMark(angle: .value("Credited", credited))
                        .foregroundStyle(.orange)
                }
                .frame(height: 180)
                .chartLegend(position: .bottom)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct TopProductsChartView: View {
    let products: [ProductSales]
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Top Products")
                .font(.headline)
            
            if products.isEmpty {
                Text("No product data")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 180)
            } else {
                Chart(products) { item in
                    BarMark(
                        x: .value("Product", item.name),
                        y: .value("Amount", item.amount)
                    )
                    .foregroundStyle(Color.purple.gradient)
                    .cornerRadius(4)
                }
                .frame(height: 180)
                .chartXAxis {
                    AxisMarks { value in
                        AxisValueLabel()
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

import SwiftUI

struct ExportDataView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isExporting = false
    @State private var exportMessage: String?
    
    private let apiService = APIService.shared
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    Text("Export your data as CSV files")
                        .foregroundColor(.secondary)
                }
                
                Section("Export") {
                    ExportRow(
                        title: "Customers",
                        subtitle: "Export all customer contacts and details",
                        icon: "person.2.fill"
                    ) {
                        exportCustomers()
                    }
                    
                    ExportRow(
                        title: "Products",
                        subtitle: "Export product catalog with prices",
                        icon: "cube.box.fill"
                    ) {
                        exportProducts()
                    }
                    
                    ExportRow(
                        title: "Invoices",
                        subtitle: "Export all invoices and billing history",
                        icon: "doc.text.fill"
                    ) {
                        exportInvoices()
                    }
                }
                
                if isExporting {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView()
                            Text("Exporting...")
                                .foregroundColor(.secondary)
                                .padding(.leading, 8)
                            Spacer()
                        }
                    }
                }
                
                if let message = exportMessage {
                    Section {
                        Text(message)
                            .foregroundColor(.green)
                    }
                }
            }
            .navigationTitle("Export Data")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
    
    private func exportCustomers() {
        guard let businessId = SessionManager.shared.businessId else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let customers = try await apiService.getCustomers(businessId: businessId)
                let csv = buildCsv(
                    headers: ["Name", "Phone", "Email", "GSTIN", "Address", "City", "State", "Pincode", "Balance", "Credit Limit"],
                    rows: customers.map { c in
                        [c.name, c.phone, c.email ?? "", c.gstin ?? "", c.address ?? "", c.city ?? "", c.state ?? "", c.pincode ?? "", "\(c.balance ?? 0)", "\(c.creditLimit ?? 0)"]
                    }
                )
                shareCsv(content: csv, fileName: "customers.csv")
                await MainActor.run {
                    exportMessage = "Exported \(customers.size) customers"
                    isExporting = false
                }
            } catch {
                await MainActor.run {
                    exportMessage = "Export failed: \(error.localizedDescription)"
                    isExporting = false
                }
            }
        }
    }
    
    private func exportProducts() {
        guard let businessId = SessionManager.shared.businessId else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let products = try await apiService.getProducts(businessId: businessId)
                let csv = buildCsv(
                    headers: ["Name", "SKU", "HSN", "Unit", "Selling Price", "Purchase Price", "Tax Rate"],
                    rows: products.map { p in
                        [p.name, p.sku ?? "", p.hsnCode, p.unit, "\(p.sellingPrice)", "\(p.purchasePrice ?? 0)", "\(p.taxRate)%"]
                    }
                )
                shareCsv(content: csv, fileName: "products.csv")
                await MainActor.run {
                    exportMessage = "Exported \(products.size) products"
                    isExporting = false
                }
            } catch {
                await MainActor.run {
                    exportMessage = "Export failed: \(error.localizedDescription)"
                    isExporting = false
                }
            }
        }
    }
    
    private func exportInvoices() {
        guard let businessId = SessionManager.shared.businessId else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let invoices = try await apiService.getInvoices(businessId: businessId)
                let csv = buildCsv(
                    headers: ["Invoice No", "Date", "Type", "Subtotal", "Tax", "Total", "Paid", "Status"],
                    rows: invoices.map { inv in
                        [inv.invoiceNo ?? "", inv.invoiceDate?.prefix(10).description ?? "", inv.type ?? "", "\(inv.subtotal ?? 0)", "\(inv.taxAmount ?? 0)", "\(inv.grandTotal ?? 0)", "\(inv.paidAmount ?? 0)", inv.status ?? ""]
                    }
                )
                shareCsv(content: csv, fileName: "invoices.csv")
                await MainActor.run {
                    exportMessage = "Exported \(invoices.size) invoices"
                    isExporting = false
                }
            } catch {
                await MainActor.run {
                    exportMessage = "Export failed: \(error.localizedDescription)"
                    isExporting = false
                }
            }
        }
    }
    
    private func buildCsv(headers: [String], rows: [[String]]) -> String {
        var csv = headers.joined(separator: ",") + "\n"
        for row in rows {
            csv += row.map { cell in
                if cell.contains(",") || cell.contains("\"") || cell.contains("\n") {
                    return "\"\(cell.replacingOccurrences(of: "\"", with: "\"\""))\""
                }
                return cell
            }.joined(separator: ",") + "\n"
        }
        return csv
    }
    
    private func shareCsv(content: String, fileName: String) {
        let tempUrl = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try? content.write(to: tempUrl, atomically: true, encoding: .utf8)
        
        DispatchQueue.main.async {
            let activityVC = UIActivityViewController(activityItems: [tempUrl], applicationActivities: nil)
            if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootVC = scene.windows.first?.rootViewController {
                rootVC.present(activityVC, animated: true)
            }
        }
    }
}

struct ExportRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.blue)
                    .frame(width: 32)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Image(systemName: "square.and.arrow.up")
                    .foregroundColor(.blue)
            }
        }
    }
}

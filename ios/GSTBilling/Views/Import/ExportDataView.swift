import SwiftUI

enum ExportFormat: String, CaseIterable, Identifiable {
    case csv = "CSV"
    case json = "JSON"
    
    var id: String { rawValue }
    var extension: String { rawValue.lowercased() }
    var mimeType: String {
        switch self {
        case .csv: return "text/csv"
        case .json: return "application/json"
        }
    }
}

struct ExportDataView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isExporting = false
    @State private var exportMessage: String?
    @State private var selectedFormat: ExportFormat = .csv
    
    private let apiService = APIService.shared
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack {
                        Text("Export format:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Picker("Format", selection: $selectedFormat) {
                            ForEach(ExportFormat.allCases) { format in
                                Text(format.rawValue).tag(format)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 160)
                    }
                }
                
                Section("Export") {
                    ExportRow(
                        title: "Customers",
                        subtitle: "Export all customer contacts and details",
                        icon: "person.2.fill",
                        enabled: !isExporting
                    ) {
                        exportCustomers()
                    }
                    
                    ExportRow(
                        title: "Products",
                        subtitle: "Export product catalog with prices",
                        icon: "cube.box.fill",
                        enabled: !isExporting
                    ) {
                        exportProducts()
                    }
                    
                    ExportRow(
                        title: "Invoices",
                        subtitle: "Export all invoices and billing history",
                        icon: "doc.text.fill",
                        enabled: !isExporting
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
        guard let businessId = AuthManager.shared.currentBusiness?.id else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let customers = try await apiService.getCustomers(businessId: businessId)
                let headers = ["Name", "Phone", "Email", "GSTIN", "Address", "City", "State", "Pincode", "Balance", "Credit Limit"]
                let rows = customers.map { c in
                    [c.name, c.phone ?? "", c.email ?? "", c.gstin ?? "", c.address ?? "", c.city ?? "", c.state ?? "", c.pincode ?? "", "\(c.balance ?? 0)", "\(c.creditLimit ?? 0)"]
                }
                let content: String
                let fileName: String
                let mimeType: String
                
                switch selectedFormat {
                case .csv:
                    content = ExportFormatter.buildCsv(headers: headers, rows: rows)
                    fileName = "customers.csv"
                    mimeType = "text/csv"
                case .json:
                    content = ExportFormatter.buildJson(headers: headers, rows: rows)
                    fileName = "customers.json"
                    mimeType = "application/json"
                }
                
                shareFile(content: content, fileName: fileName, mimeType: mimeType)
                await MainActor.run {
                    exportMessage = "Exported \(customers.count) customers as \(selectedFormat.rawValue)"
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
        guard let businessId = AuthManager.shared.currentBusiness?.id else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let products = try await apiService.getProducts(businessId: businessId)
                let headers = ["Name", "SKU", "HSN", "Unit", "Selling Price", "Purchase Price", "Tax Rate"]
                let rows = products.map { p in
                    [p.name, p.sku ?? "", p.hsnCode ?? "", p.unit ?? "", "\(p.sellingPrice)", "\(p.purchasePrice ?? 0)", "\(p.taxRate ?? 0)%"]
                }
                let content: String
                let fileName: String
                let mimeType: String
                
                switch selectedFormat {
                case .csv:
                    content = ExportFormatter.buildCsv(headers: headers, rows: rows)
                    fileName = "products.csv"
                    mimeType = "text/csv"
                case .json:
                    content = ExportFormatter.buildJson(headers: headers, rows: rows)
                    fileName = "products.json"
                    mimeType = "application/json"
                }
                
                shareFile(content: content, fileName: fileName, mimeType: mimeType)
                await MainActor.run {
                    exportMessage = "Exported \(products.count) products as \(selectedFormat.rawValue)"
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
        guard let businessId = AuthManager.shared.currentBusiness?.id else { return }
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let invoices = try await apiService.getInvoices(businessId: businessId)
                let headers = ["Invoice No", "Date", "Type", "Subtotal", "Tax", "Total", "Paid", "Status"]
                let rows = invoices.map { inv in
                    [inv.invoiceNo, inv.invoiceDate?.prefix(10).description ?? "", inv.type ?? "", "\(inv.subtotal ?? 0)", "\(inv.taxAmount ?? 0)", "\(inv.grandTotal ?? 0)", "\(inv.paidAmount ?? 0)", inv.status ?? ""]
                }
                let content: String
                let fileName: String
                let mimeType: String
                
                switch selectedFormat {
                case .csv:
                    content = ExportFormatter.buildCsv(headers: headers, rows: rows)
                    fileName = "invoices.csv"
                    mimeType = "text/csv"
                case .json:
                    content = ExportFormatter.buildJson(headers: headers, rows: rows)
                    fileName = "invoices.json"
                    mimeType = "application/json"
                }
                
                shareFile(content: content, fileName: fileName, mimeType: mimeType)
                await MainActor.run {
                    exportMessage = "Exported \(invoices.count) invoices as \(selectedFormat.rawValue)"
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
    
    private func shareFile(content: String, fileName: String, mimeType: String) {
        let tempDir = FileManager.default.temporaryDirectory
        let timestamp = Int(Date().timeIntervalSince1970)
        let tempUrl = tempDir.appendingPathComponent("\(timestamp)_\(fileName)")
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
    var enabled: Bool = true
    let action: () -> Void
    
    var body: some View {
        Button(action: { if enabled { action() } }) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(enabled ? .blue : .gray)
                    .frame(width: 32)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundColor(enabled ? .primary : .secondary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Image(systemName: "square.and.arrow.up")
                    .foregroundColor(enabled ? .blue : .gray)
            }
        }
        .disabled(!enabled)
    }
}

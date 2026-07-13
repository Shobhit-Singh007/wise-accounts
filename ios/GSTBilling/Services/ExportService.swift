import SwiftUI
import PDFKit

class ExportService {
    static let shared = ExportService()
    
    func exportInvoiceToPdf(
        businessName: String,
        invoiceNo: String,
        customerName: String,
        items: [ExportItem],
        subtotal: Double,
        tax: Double,
        total: Double
    ) -> Data? {
        let renderer = UIMarkupTextPrintFormatter(markupText: buildInvoiceHtml(
            businessName: businessName,
            invoiceNo: invoiceNo,
            customerName: customerName,
            items: items,
            subtotal: subtotal,
            tax: tax,
            total: total
        ))
        
        let printRenderer = UIPrintPageRenderer()
        printRenderer.addPrintFormatter(renderer, startingAtPageAt: 0)
        
        let rect = CGRect(x: 0, y: 0, width: 595, height: 842)
        let printRect = printRenderer.rect(for: 0)
        let scale = rect.width / printRect.width
        printRenderer.setValue(NSValue(cgRect: rect), forKey: "paperRect")
        printRenderer.setValue(NSValue(cgRect: rect), forKey: "printableRect")
        
        let data = NSMutableData()
        UIGraphicsBeginPDFContextToData(data, rect, nil)
        printRenderer.prepare(forDrawingPages: NSMakeRange(0, printRenderer.numberOfPages))
        
        for i in 0..<printRenderer.numberOfPages {
            UIGraphicsBeginPDFPage()
            printRenderer.drawPage(at: i, in: UIGraphicsGetPDFContextBounds())
        }
        
        UIGraphicsEndPDFContext()
        return data as Data
    }
    
    func exportToCsv(data: [[String: String]], headers: [String], fileName: String) -> URL? {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let fileUrl = documentsPath.appendingPathComponent("\(fileName).csv")
        
        var csvString = headers.joined(separator: ",") + "\n"
        for row in data {
            let rowString = headers.map { header in
                "\"\(row[header]?.replacingOccurrences(of: "\"", with: "\"\"") ?? "")\""
            }.joined(separator: ",")
            csvString += rowString + "\n"
        }
        
        try? csvString.write(to: fileUrl, atomically: true, encoding: .utf8)
        return fileUrl
    }
    
    func shareFile(_ url: URL, sourceView: UIView? = nil) {
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let sourceView = sourceView {
            activityVC.popoverPresentationController?.sourceView = sourceView
        }
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
    
    private func buildInvoiceHtml(
        businessName: String,
        invoiceNo: String,
        customerName: String,
        items: [ExportItem],
        subtotal: Double,
        tax: Double,
        total: Double
    ) -> String {
        var html = """
        <html><head><style>
        body { font-family: -apple-system; font-size: 12px; }
        h1 { color: #1565C0; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
        .total { font-size: 16px; font-weight: bold; text-align: right; }
        </style></head><body>
        <h1>\(businessName)</h1>
        <p><strong>Invoice:</strong> \(invoiceNo)<br>
        <strong>Customer:</strong> \(customerName)<br>
        <strong>Date:</strong> \(DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short))</p>
        <table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        """
        
        for item in items {
            html += "<tr><td>\(item.name)</td><td>\(item.quantity)</td><td>₹\(String(format: "%.2f", item.rate))</td><td>₹\(String(format: "%.2f", item.amount))</td></tr>"
        }
        
        html += "</table>"
        html += "<p class=\"total\">Subtotal: ₹\(String(format: "%.2f", subtotal))</p>"
        html += "<p class=\"total\">Tax: ₹\(String(format: "%.2f", tax))</p>"
        html += "<p class=\"total\" style=\"font-size:18px\">Total: ₹\(String(format: "%.2f", total))</p>"
        html += "</body></html>"
        
        return html
    }
}

struct ExportItem {
    let name: String
    let quantity: Int
    let rate: Double
    let amount: Double
}

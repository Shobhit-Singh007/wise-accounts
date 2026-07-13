import SwiftUI

class AirPrintService {
    static let shared = AirPrintService()
    
    func printInvoice(
        businessName: String,
        invoiceNo: String,
        customerName: String,
        items: [(name: String, qty: Int, amount: Double)],
        subtotal: Double,
        tax: Double,
        total: Double
    ) -> UIPrintInteractionController? {
        let printController = UIPrintInteractionController.shared
        
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = "Invoice \(invoiceNo)"
        printController.printInfo = printInfo
        
        let renderer = InvoicePrintRenderer(
            businessName: businessName,
            invoiceNo: invoiceNo,
            customerName: customerName,
            items: items,
            subtotal: subtotal,
            tax: tax,
            total: total
        )
        printController.printingItem = nil
        printController.printRenderer = renderer
        
        return printController
    }
}

class InvoicePrintRenderer: NSObject, UIPrintInteractionControllerDelegate {
    private let businessName: String
    private let invoiceNo: String
    private let customerName: String
    private let items: [(name: String, qty: Int, amount: Double)]
    private let subtotal: Double
    private let tax: Double
    private let total: Double
    
    init(businessName: String, invoiceNo: String, customerName: String, items: [(name: String, qty: Int, amount: Double)], subtotal: Double, tax: Double, total: Double) {
        self.businessName = businessName
        self.invoiceNo = invoiceNo
        self.customerName = customerName
        self.items = items
        self.subtotal = subtotal
        self.tax = tax
        self.total = total
    }
}

extension InvoicePrintRenderer: UIPrintPageRenderer {
    func numberOfPages() -> Int { 1 }
    
    override func drawFooterForPage(at index: Int, in footerRect: CGRect) {}
    override func drawHeaderForPage(at index: Int, in headerRect: CGRect) {}
}

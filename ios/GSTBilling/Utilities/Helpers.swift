import Foundation

struct Helpers {

    static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = Constants.defaultCurrencyCode
        f.locale = Constants.defaultLocale
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    static let numberFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Constants.defaultLocale
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    static let quantityFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 3
        return f
    }()

    static func formatCurrency(_ amount: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: amount)) ?? "₹0.00"
    }

    static func formatNumber(_ value: Double) -> String {
        numberFormatter.string(from: NSNumber(value: value)) ?? "0.00"
    }

    static func formatQuantity(_ value: Double) -> String {
        quantityFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    static func formatDate(_ isoString: String?) -> String {
        guard let isoString = isoString else { return "-" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let display = DateFormatter()
            display.dateFormat = "dd MMM yyyy"
            return display.string(from: date)
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            let display = DateFormatter()
            display.dateFormat = "dd MMM yyyy"
            return display.string(from: date)
        }
        return isoString
    }

    static func formatDateShort(_ isoString: String?) -> String {
        guard let isoString = isoString else { return "-" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let display = DateFormatter()
            display.dateFormat = "dd/MM/yy"
            return display.string(from: date)
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            let display = DateFormatter()
            display.dateFormat = "dd/MM/yy"
            return display.string(from: date)
        }
        return isoString
    }

    static func isoString(from date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    static func dateFromISO(_ isoString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: isoString)
    }

}

struct GSTCalculator {
    struct GSTResult {
        let taxableValue: Double
        let cgst: Double
        let sgst: Double
        let igst: Double
        let total: Double
    }

    static func calculate(rate: Double, quantity: Double, discount: Double = 0, taxRate: Double, isIntraState: Bool = true, taxType: String = "exclusive") -> GSTResult {
        let baseAmount = rate * quantity
        let discountAmount = baseAmount * discount / 100
        let afterDiscount = baseAmount - discountAmount

        let taxableValue: Double
        let taxAmount: Double

        if taxType == "inclusive" {
            taxableValue = afterDiscount / (1 + taxRate / 100)
            taxAmount = afterDiscount - taxableValue
        } else {
            taxableValue = afterDiscount
            taxAmount = taxableValue * taxRate / 100
        }

        if isIntraState {
            let half = taxAmount / 2
            return GSTResult(taxableValue: taxableValue, cgst: half, sgst: half, igst: 0, total: taxableValue + taxAmount)
        } else {
            return GSTResult(taxableValue: taxableValue, cgst: 0, sgst: 0, igst: taxAmount, total: taxableValue + taxAmount)
        }
    }
}

extension Helpers {
    static func calculateGST(amount: Double, taxRate: Double, isIntraState: Bool = true) -> (cgst: Double, sgst: Double, igst: Double) {
        let result = GSTCalculator.calculate(rate: amount, quantity: 1, discount: 0, taxRate: taxRate, isIntraState: isIntraState)
        return (result.cgst, result.sgst, result.igst)
    }

    static func calculateTaxableValue(rate: Double, quantity: Double, discount: Double = 0, taxRate: Double, taxType: String = "exclusive") -> (taxableValue: Double, cgst: Double, sgst: Double, igst: Double, total: Double) {
        let result = GSTCalculator.calculate(rate: rate, quantity: quantity, discount: discount, taxRate: taxRate, isIntraState: true, taxType: taxType)
        return (result.taxableValue, result.cgst, result.sgst, result.igst, result.total)
    }

    static func isIntraState(businessState: String?, customerState: String?) -> Bool {
        guard let bs = businessState, let cs = customerState else { return true }
        return bs.lowercased() == cs.lowercased()
    }

    static func invoiceStatusColor(_ status: String?) -> String {
        guard let s = status else { return "gray" }
        return Constants.invoiceStatusColors[s] ?? "gray"
    }

    static func paymentMethodIcon(_ method: String?) -> String {
        guard let m = method else { return "creditcard" }
        switch m {
        case "CASH": return "banknote"
        case "UPI": return "qrcode"
        case "BANK_TRANSFER": return "building.columns"
        case "CARD": return "creditcard"
        case "RAZORPAY": return "bolt"
        case "CHEQUE": return "doc.text"
        default: return "creditcard"
        }
    }

    static func generateInvoiceNumber(prefix: String = "INV", lastNumber: Int = 0) -> String {
        let num = lastNumber + 1
        return "\(prefix)-\(String(format: "%04d", num))"
    }

    static func generateOrderNumber(prefix: String = "PO") -> String {
        let num = Int(Date().timeIntervalSince1970) % 100000
        return "\(prefix)-\(String(format: "%05d", num))"
    }
}

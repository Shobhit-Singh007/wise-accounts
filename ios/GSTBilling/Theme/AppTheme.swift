import SwiftUI

enum AppTheme {
    static let primary = Color("PrimaryColor")
    static let accent = Color("AccentColor")
    
    static let customerColor = Color.orange
    static let productColor = Color.purple
    static let invoiceColor = Color.blue
    static let paymentColor = Color.green
    static let reportColor = Color.teal
    static let alertColor = Color.red
    
    static let statusPaid = Color.green
    static let statusPending = Color.orange
    static let statusOverdue = Color.red
    static let statusDraft = Color.gray
    
    static let chartGreen = Color.green
    static let chartRed = Color.red
    static let chartBlue = Color.blue
    
    static let headerBackground = Color(red: 0.1, green: 0.15, blue: 0.35)
    static let cardBackground = Color(.systemGray6)
    
    static func statusColor(for status: String) -> Color {
        switch status.uppercased() {
        case "PAID": return .green
        case "CONFIRMED": return .blue
        case "PARTIAL": return .orange
        case "PENDING": return .orange
        case "OVERDUE": return .red
        case "DRAFT": return .gray
        case "CANCELLED": return .red
        case "CREDITED": return .orange
        default: return .gray
        }
    }
}

import SwiftUI

struct BatchInfo: Identifiable {
    let id = UUID()
    let productName: String
    let batchNumber: String
    let quantity: Int
    let manufacturingDate: String?
    let expiryDate: String?
    let costPrice: Double
    
    var daysUntilExpiry: Int? {
        guard let expiry = expiryDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: expiry) else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: date).day
    }
    
    var isExpired: Bool {
        (daysUntilExpiry ?? 1) < 0
    }
    
    var isExpiringSoon: Bool {
        guard let days = daysUntilExpiry else { return false }
        return days >= 0 && days <= 30
    }
}

struct BatchExpiryView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss
    @State private var batches: [BatchInfo] = []
    @State private var showExpiringOnly = false
    
    private var displayedBatches: [BatchInfo] {
        if showExpiringOnly {
            return batches.filter { $0.isExpiringSoon || $0.isExpired }
        }
        return batches
    }
    
    var body: some View {
        NavigationView {
            Group {
                if displayedBatches.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "archivebox")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No batches found")
                            .foregroundColor(.secondary)
                    }
                } else {
                    List(displayedBatches) { batch in
                        BatchRow(batch: batch)
                    }
                }
            }
            .navigationTitle("Batch & Expiry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Toggle("Expiring", isOn: $showExpiringOnly)
                        .toggleStyle(.switch)
                        .labelsHidden()
                }
            }
        }
    }
}

struct BatchRow: View {
    let batch: BatchInfo
    
    var statusColor: Color {
        if batch.isExpired { return .red }
        if batch.isExpiringSoon { return .orange }
        return .green
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(batch.productName)
                    .font(.headline)
                Spacer()
                if batch.isExpired || batch.isExpiringSoon {
                    Text(batch.isExpired ? "EXPIRED" : "EXPIRING")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(statusColor)
                        .cornerRadius(4)
                }
            }
            
            Text("Batch: \(batch.batchNumber)")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            HStack {
                Text("Qty: \(batch.quantity)")
                Spacer()
                Text("Cost: ₹\(String(format: "%.2f", batch.costPrice))")
            }
            .font(.subheadline)
            
            if let expiry = batch.expiryDate {
                Text("Expiry: \(expiry)")
                    .font(.caption)
                    .foregroundColor(batch.isExpired ? .red : .secondary)
            }
            
            if let mfg = batch.manufacturingDate {
                Text("Mfg: \(mfg)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

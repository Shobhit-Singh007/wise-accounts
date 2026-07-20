import SwiftUI

struct PaymentReminderItem: Identifiable {
    let id: String
    let customerName: String
    let invoiceNo: String
    let amount: Double
    let daysOverdue: Int
    let lastReminderDate: String?
    let phone: String
    let invoiceId: String
}

struct PaymentRemindersView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss
    @State private var reminders: [PaymentReminderItem] = []
    @State private var isLoading = false
    @State private var isSendingAll = false
    @State private var toastMessage: String?
    @State private var sendingId: String?
    
    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading reminders...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if reminders.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No pending reminders")
                            .foregroundColor(.secondary)
                    }
                } else {
                    List(reminders) { reminder in
                        ReminderRow(reminder: reminder, isSending: sendingId == reminder.id) {
                            Task { await sendReminder(for: reminder) }
                        }
                    }
                }
            }
            .navigationTitle("Payment Reminders")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Send All") {
                        Task { await sendAllReminders() }
                    }
                    .disabled(isSendingAll || reminders.isEmpty)
                }
            }
            .task { await loadReminders() }
            .overlay {
                if isSendingAll {
                    ProgressView("Sending all reminders...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.3))
                }
            }
            .overlay(alignment: .bottom) {
                if let msg = toastMessage {
                    Text(msg)
                        .padding()
                        .background(Color.black.opacity(0.75))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 16)
                        .transition(.move(edge: .bottom))
                        .animation(.easeInOut, value: toastMessage)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                                toastMessage = nil
                            }
                        }
                }
            }
        }
    }
    
    private func loadReminders() async {
        isLoading = true
        do {
            let url = "\(Constants.baseURL)/businesses/\(business.id)/invoices?status=CONFIRMED"
            guard let requestUrl = URL(string: url) else { return }
            var request = URLRequest(url: requestUrl)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            if let token = UserDefaults.standard.string(forKey: "accessToken") {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let (data, _) = try await URLSession.shared.data(for: request)
            let invoices = try JSONDecoder().decode([Invoice].self, from: data)
            
            reminders = invoices.compactMap { invoice -> PaymentReminderItem? in
                guard let dueDate = invoice.dueDate,
                      let due = Helpers.dateFromISO(dueDate),
                      let grandTotal = invoice.grandTotal,
                      let paidAmount = invoice.paidAmount else { return nil }
                let balance = grandTotal - paidAmount
                guard balance > 0 else { return nil }
                let daysOverdue = Calendar.current.dateComponents([.day], from: due, to: Date()).day ?? 0
                guard daysOverdue > 0 else { return nil }
                return PaymentReminderItem(
                    id: invoice.id,
                    customerName: invoice.customer?.name ?? "Walk-in",
                    invoiceNo: invoice.invoiceNo,
                    amount: balance,
                    daysOverdue: daysOverdue,
                    lastReminderDate: nil,
                    phone: invoice.customer?.phone ?? "",
                    invoiceId: invoice.id
                )
            }
        } catch {}
        isLoading = false
    }
    
    private func sendReminder(for reminder: PaymentReminderItem) async {
        sendingId = reminder.id
        do {
            let url = "\(Constants.baseURL)/businesses/\(business.id)/notifications/payment-reminder"
            guard let requestUrl = URL(string: url) else { return }
            var request = URLRequest(url: requestUrl)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let token = UserDefaults.standard.string(forKey: "accessToken") {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let body: [String: Any] = ["invoiceId": reminder.invoiceId, "customerId": ""]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                toastMessage = "Reminder sent to \(reminder.customerName)"
            } else {
                toastMessage = "Failed to send reminder"
            }
        } catch {
            toastMessage = "Failed: \(error.localizedDescription)"
        }
        sendingId = nil
    }
    
    private func sendAllReminders() async {
        isSendingAll = true
        var successCount = 0
        for reminder in reminders {
            do {
                let url = "\(Constants.baseURL)/businesses/\(business.id)/notifications/payment-reminder"
                guard let requestUrl = URL(string: url) else { continue }
                var request = URLRequest(url: requestUrl)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let token = UserDefaults.standard.string(forKey: "accessToken") {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                let body: [String: Any] = ["invoiceId": reminder.invoiceId, "customerId": ""]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                let (_, response) = try await URLSession.shared.data(for: request)
                if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                    successCount += 1
                }
            } catch {}
        }
        isSendingAll = false
        toastMessage = "Sent \(successCount) of \(reminders.count) reminders"
    }
}

struct ReminderRow: View {
    let reminder: PaymentReminderItem
    let isSending: Bool
    let onSend: () -> Void
    
    var urgencyColor: Color {
        if reminder.daysOverdue > 30 { return .red }
        if reminder.daysOverdue > 7 { return .orange }
        return .blue
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(reminder.customerName)
                    .font(.headline)
                Spacer()
                Text("\(reminder.daysOverdue)d overdue")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(urgencyColor)
                    .cornerRadius(4)
            }
            
            Text("Invoice: \(reminder.invoiceNo)")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            HStack {
                Text(Helpers.formatCurrency(reminder.amount))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(urgencyColor)
                
                Spacer()
                
                if let lastDate = reminder.lastReminderDate {
                    Text("Last: \(lastDate)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Button(action: onSend) {
                    if isSending {
                        ProgressView()
                            .scaleEffect(0.7)
                    } else {
                        Label("Remind", systemImage: "paperplane.fill")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
                .disabled(isSending)
            }
        }
        .padding(.vertical, 4)
    }
}

private enum Helper {
    static func formatCurrency(_ amount: Double) -> String {
        Helpers.formatCurrency(amount)
    }
}

import SwiftUI

struct NotificationsView: View {
    let business: Business
    @StateObject private var viewModel = NotificationsViewModel()

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.notifications.isEmpty {
                ContentUnavailableView("Error loading notifications", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.notifications.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No notifications", systemImage: "bell.slash", description: Text("You're all caught up"))
            } else {
                ForEach(viewModel.notifications) { notification in
                    NotificationRow(notification: notification)
                        .listRowBackground(
                            notification.isRead ? Color.clear : Color.blue.opacity(0.03)
                        )
                        .onTapGesture {
                            if !notification.isRead {
                                Task { await viewModel.markAsRead(businessId: business.id, notificationId: notification.id) }
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteNotification(businessId: business.id, notificationId: notification.id) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
        }
        .task { await viewModel.loadNotifications(businessId: business.id) }
        .refreshable { await viewModel.loadNotifications(businessId: business.id) }
        .navigationTitle("Notifications")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if viewModel.unreadCount > 0 {
                    Button("Mark all read") {
                        Task { await viewModel.markAllAsRead(businessId: business.id) }
                    }
                    .font(.subheadline)
                }
            }
        }
    }
}

struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(typeColor.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: typeIcon)
                    .foregroundColor(typeColor)
                    .font(.system(size: 16))
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(notification.title)
                        .font(.callout)
                        .fontWeight(notification.isRead ? .regular : .semibold)
                    Spacer()
                    if !notification.isRead {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 8, height: 8)
                    }
                }
                Text(notification.message)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                Text(timeAgo(notification.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var typeIcon: String {
        switch notification.type {
        case "LOW_STOCK": return "exclamationmark.triangle.fill"
        case "PAYMENT_RECEIVED": return "checkmark.circle.fill"
        case "INVOICE_CREATED": return "doc.text.fill"
        case "DUE_DATE": return "calendar.badge.exclamationmark"
        case "STOCK_ADJUSTED": return "cube.fill"
        default: return "bell.fill"
        }
    }

    private var typeColor: Color {
        switch notification.type {
        case "LOW_STOCK": return .orange
        case "PAYMENT_RECEIVED": return .green
        case "INVOICE_CREATED": return .blue
        case "DUE_DATE": return .red
        case "STOCK_ADJUSTED": return .purple
        default: return .blue
        }
    }

    private func timeAgo(_ isoString: String?) -> String {
        guard let isoString = isoString, let date = Helpers.dateFromISO(isoString) else { return "" }
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "Just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        return Helpers.formatDateShort(isoString)
    }
}

@MainActor
class NotificationsViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var unreadCount = 0

    private let apiService = APIService.shared

    func loadNotifications(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let data: NotificationResponse = try await apiService.request(
                .business,
                endpoint: "businesses/\(businessId)/notifications"
            )
            notifications = data.notifications
            unreadCount = data.unreadCount
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func markAsRead(businessId: String, notificationId: String) async {
        do {
            try await apiService.requestVoid(
                path: "\(Constants.baseURL)/businesses/\(businessId)/notifications/\(notificationId)/read",
                method: "POST"
            )
            if let idx = notifications.firstIndex(where: { $0.id == notificationId }) {
                notifications[idx] = AppNotification(
                    id: notifications[idx].id,
                    type: notifications[idx].type,
                    title: notifications[idx].title,
                    message: notifications[idx].message,
                    isRead: true,
                    createdAt: notifications[idx].createdAt,
                    metadata: notifications[idx].metadata
                )
                unreadCount = max(0, unreadCount - 1)
            }
        } catch {
            print("Failed to mark as read: \(error)")
        }
    }

    func markAllAsRead(businessId: String) async {
        do {
            try await apiService.requestVoid(
                path: "\(Constants.baseURL)/businesses/\(businessId)/notifications/read-all",
                method: "POST"
            )
            notifications = notifications.map {
                AppNotification(
                    id: $0.id,
                    type: $0.type,
                    title: $0.title,
                    message: $0.message,
                    isRead: true,
                    createdAt: $0.createdAt,
                    metadata: $0.metadata
                )
            }
            unreadCount = 0
        } catch {
            print("Failed to mark all as read: \(error)")
        }
    }

    func deleteNotification(businessId: String, notificationId: String) async {
        do {
            try await apiService.requestVoid(
                path: "\(Constants.baseURL)/businesses/\(businessId)/notifications/\(notificationId)",
                method: "DELETE"
            )
            if let idx = notifications.firstIndex(where: { $0.id == notificationId }) {
                if !notifications[idx].isRead { unreadCount = max(0, unreadCount - 1) }
                notifications.remove(at: idx)
            }
        } catch {
            print("Failed to delete notification: \(error)")
        }
    }
}

struct AppNotification: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let message: String
    let isRead: Bool
    let createdAt: String?
    let metadata: [String: String]?
}

struct NotificationResponse: Codable {
    let notifications: [AppNotification]
    let unreadCount: Int
}

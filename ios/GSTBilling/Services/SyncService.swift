import Foundation
import BackgroundTasks

@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var isSyncing = false
    @Published var lastSyncAt: Date?
    @Published var pendingChangesCount = 0
    @Published var currentBusinessId: String?

    private let apiService = APIService.shared
    private let defaults = UserDefaults.standard
    private let lastSyncKey = "last_sync_at"
    private let pendingChangesKey = "pending_sync_changes"
    private let businessIdKey = "sync_business_id"

    nonisolated init() {}

    func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Constants.bgTaskId, using: nil) { task in
            Task {
                await self.handleBackgroundTask(task as! BGProcessingTask)
            }
        }
    }

    func scheduleBackgroundSync(businessId: String) {
        currentBusinessId = businessId
        defaults.set(businessId, forKey: businessIdKey)
        let request = BGProcessingTaskRequest(identifier: Constants.bgTaskId)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private func handleBackgroundTask(_ task: BGProcessingTask) {
        task.expirationHandler = { task.setTaskCompleted(success: false) }
        Task {
            do {
                try await performSync()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
            if let bizId = currentBusinessId {
                scheduleBackgroundSync(businessId: bizId)
            }
        }
    }

    func performSync() async throws {
        isSyncing = true
        defer { isSyncing = false }

        let businessId = currentBusinessId ?? defaults.string(forKey: businessIdKey) ?? ""
        guard !businessId.isEmpty else { return }

        let lastSync = defaults.object(forKey: lastSyncKey) as? Date
        let pending = getPendingChanges()

        if !pending.isEmpty {
            let deviceId = await UIDevice.current.identifierForVendor?.uuidString ?? "ios"
            let _ = try await apiService.pushChanges(
                businessId: businessId,
                deviceId: deviceId,
                changes: pending
            )
            clearPendingChanges()
        }

        defaults.set(Date(), forKey: lastSyncKey)
        lastSyncAt = Date()
    }

    func queueChange(_ change: SyncChange) {
        var pending = getPendingChanges()
        pending.append(change)
        if let data = try? JSONEncoder().encode(pending) {
            defaults.set(data, forKey: pendingChangesKey)
        }
        pendingChangesCount = pending.count
    }

    private func getPendingChanges() -> [SyncChange] {
        guard let data = defaults.data(forKey: pendingChangesKey),
              let changes = try? JSONDecoder().decode([SyncChange].self, from: data) else {
            return []
        }
        return changes
    }

    private func clearPendingChanges() {
        defaults.removeObject(forKey: pendingChangesKey)
        pendingChangesCount = 0
    }
}

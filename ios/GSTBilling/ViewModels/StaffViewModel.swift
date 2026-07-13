import Foundation

@MainActor
class StaffViewModel: ObservableObject {
    @Published var staffMembers: [StaffMember] = []
    @Published var pendingInvites: [StaffInvite] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published var selectedTab = 0

    private let apiService = APIService.shared

    func loadStaff(businessId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            async let staffCall = apiService.getStaff(businessId: businessId)
            async let invitesCall = apiService.getStaffInvites(businessId: businessId)
            let (staff, invites) = try await (staffCall, invitesCall)
            staffMembers = staff
            pendingInvites = invites
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func inviteStaff(businessId: String, name: String, phone: String, email: String?, preset: String?) async {
        isLoading = true
        errorMessage = nil
        do {
            let request = InviteStaffRequest(
                phone: phone,
                email: email?.isEmpty == true ? nil : email,
                name: name.isEmpty ? nil : name,
                rolePreset: preset,
                permissions: nil,
                role: nil
            )
            _ = try await apiService.inviteStaff(businessId: businessId, data: request)
            successMessage = "Invitation sent to \(phone)"
            await loadStaff(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func removeStaff(businessId: String, userId: String, name: String) async {
        isLoading = true
        errorMessage = nil
        do {
            _ = try await apiService.removeStaff(businessId: businessId, userId: userId)
            successMessage = "\(name) removed from staff"
            await loadStaff(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func cancelInvite(businessId: String, inviteId: String, phone: String) async {
        errorMessage = nil
        do {
            _ = try await apiService.cancelStaffInvite(businessId: businessId, inviteId: inviteId)
            successMessage = "Invite to \(phone) cancelled"
            await loadStaff(businessId: businessId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updatePermissions(businessId: String, userId: String, permissions: [String]) async -> Bool {
        isLoading = true
        errorMessage = nil
        do {
            let request = UpdatePermissionsRequest(permissions: permissions, role: nil)
            _ = try await apiService.updateStaffPermissions(businessId: businessId, userId: userId, data: request)
            successMessage = "Permissions updated"
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
}

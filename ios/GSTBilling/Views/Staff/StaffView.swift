import SwiftUI

private let roleColors: [String: Color] = [
    "OWNER": .blue,
    "ADMIN": .purple,
    "MANAGER": .green,
    "ACCOUNTANT": .orange,
    "SALES": .teal,
    "BUSINESS_VIEWER": .gray,
    "BUSINESS_EDITOR": .gray
]

private let roleLabels: [String: String] = [
    "OWNER": "Owner",
    "ADMIN": "Admin",
    "MANAGER": "Manager",
    "ACCOUNTANT": "Accountant",
    "SALES": "Sales",
    "BUSINESS_VIEWER": "Viewer",
    "BUSINESS_EDITOR": "Editor"
]

private let rolePresets: [(key: String, label: String)] = [
    ("admin", "Admin"),
    ("manager", "Manager"),
    ("accountant", "Accountant"),
    ("sales", "Sales"),
    ("viewer", "Viewer")
]

struct StaffView: View {
    let business: Business
    @StateObject private var viewModel = StaffViewModel()
    @State private var showInviteSheet = false
    @State private var showRemoveAlert = false
    @State private var memberToRemove: StaffMember?

    var body: some View {
        List {
            Section {
                Picker("Tab", selection: $viewModel.selectedTab) {
                    Text("Active Staff (\(viewModel.staffMembers.count))").tag(0)
                    Text("Pending Invites (\(viewModel.pendingInvites.count))").tag(1)
                }
                .pickerStyle(.segmented)
            }

            if viewModel.selectedTab == 0 {
                if viewModel.staffMembers.isEmpty && !viewModel.isLoading {
                    Section {
                        VStack(spacing: 12) {
                            Image(systemName: "person.3.sequence.fill")
                                .font(.largeTitle)
                                .foregroundColor(.secondary.opacity(0.5))
                            Text("No staff members yet")
                                .font(.headline)
                            Text("Invite your first team member")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                    }
                } else {
                    ForEach(viewModel.staffMembers) { member in
                        StaffRow(
                            member: member,
                            onEditPermissions: { },
                            onRemove: {
                                memberToRemove = member
                                showRemoveAlert = true
                            }
                        )
                    }
                }
            } else {
                if viewModel.pendingInvites.isEmpty && !viewModel.isLoading {
                    Section {
                        VStack(spacing: 12) {
                            Image(systemName: "envelope.open")
                                .font(.largeTitle)
                                .foregroundColor(.secondary.opacity(0.5))
                            Text("No pending invites")
                                .font(.headline)
                            Text("Invitations will appear here until accepted")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                    }
                } else {
                    ForEach(viewModel.pendingInvites) { invite in
                        InviteRow(invite: invite, onCancel: {
                            Task { await viewModel.cancelInvite(businessId: business.id, inviteId: invite.id, phone: invite.phone) }
                        })
                    }
                }
            }
        }
        .navigationTitle("Staff Management")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { showInviteSheet = true } label: {
                    Image(systemName: "person.badge.plus")
                }
            }
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteStaffSheet(business: business, viewModel: viewModel)
        }
        .alert("Remove Staff", isPresented: $showRemoveAlert) {
            Button("Remove", role: .destructive) {
                if let member = memberToRemove {
                    Task { await viewModel.removeStaff(businessId: business.id, userId: member.userId, name: member.name) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let member = memberToRemove {
                Text("Are you sure you want to remove \(member.name) from your staff?")
            }
        }
        .overlay {
            if let msg = viewModel.successMessage {
                ToastView(message: msg)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { viewModel.successMessage = nil } }
            }
        }
        .task { await viewModel.loadStaff(businessId: business.id) }
    }
}

// MARK: - Staff Row

private struct StaffRow: View {
    let member: StaffMember
    let onEditPermissions: () -> Void
    let onRemove: () -> Void
    @State private var showPermissions = false

    var body: some View {
        NavigationLink {
            EditPermissionsView(
                businessId: member.isDefault ? "" : "",
                userId: member.userId,
                currentName: member.name,
                currentPermissions: member.permissions
            )
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(.systemGray5))
                        .frame(width: 44, height: 44)
                    Text(member.name.prefix(1).uppercased())
                        .font(.headline)
                        .foregroundColor(.primary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(member.name.isEmpty ? "Unknown" : member.name)
                        .font(.body).bold()
                    Text(member.phone)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(roleLabels[member.role] ?? member.role)
                    .font(.caption2).bold()
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((roleColors[member.role] ?? .gray).opacity(0.15))
                    .foregroundColor(roleColors[member.role] ?? .gray)
                    .cornerRadius(6)
            }
        }
        .swipeActions(edge: .trailing) {
            if member.role != "OWNER" {
                Button(role: .destructive, action: onRemove) {
                    Label("Remove", systemImage: "person.badge.minus")
                }
            }
        }
    }
}

// MARK: - Invite Row

private struct InviteRow: View {
    let invite: StaffInvite
    let onCancel: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: "envelope")
                    .foregroundColor(.orange)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(invite.name ?? invite.phone)
                    .font(.body).bold()
                Text(invite.phone)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("Expires \(invite.expiresAt.prefix(10))")
                    .font(.caption2)
                    .foregroundColor(.secondary.opacity(0.6))
            }

            Spacer()

            Text(roleLabels[invite.role] ?? invite.role)
                .font(.caption2).bold()
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.red.opacity(0.1))
                .foregroundColor(.red)
                .cornerRadius(6)

            Button(action: onCancel) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.red)
            }
            .buttonStyle(.borderless)
        }
    }
}

// MARK: - Invite Staff Sheet

private struct InviteStaffSheet: View {
    let business: Business
    @ObservedObject var viewModel: StaffViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var selectedPreset = "viewer"
    @State private var phoneError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Staff Details") {
                    TextField("Name", text: $name)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Email (optional)", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }

                Section("Role Preset") {
                    ForEach(rolePresets, id: \.key) { preset in
                        HStack {
                            Text(preset.label)
                            Spacer()
                            if selectedPreset == preset.key {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { selectedPreset = preset.key }
                    }
                }

                if let error = phoneError {
                    Section {
                        Text(error).foregroundColor(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Invite Staff")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send Invite") {
                        guard !phone.isEmpty else {
                            phoneError = "Phone is required"
                            return
                        }
                        phoneError = nil
                        Task {
                            await viewModel.inviteStaff(
                                businessId: business.id,
                                name: name,
                                phone: phone,
                                email: email.isEmpty ? nil : email,
                                preset: selectedPreset
                            )
                            dismiss()
                        }
                    }
                    .disabled(phone.isEmpty || viewModel.isLoading)
                }
            }
        }
    }
}

// MARK: - Toast View

private struct ToastView: View {
    let message: String
    var body: some View {
        VStack {
            Spacer()
            Text(message)
                .padding()
                .background(Color.black.opacity(0.75))
                .foregroundColor(.white)
                .cornerRadius(8)
                .padding(.bottom, 32)
        }
        .transition(.move(edge: .bottom))
        .animation(.easeInOut, value: message)
    }
}

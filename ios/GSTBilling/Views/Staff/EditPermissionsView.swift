import SwiftUI

private let permissionGroups: [(name: String, permissions: [String])] = [
    ("Dashboard", ["dashboard.view"]),
    ("Customers", ["customers.view", "customers.create", "customers.edit", "customers.delete"]),
    ("Products", ["products.view", "products.create", "products.edit", "products.delete"]),
    ("Invoices", ["invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.cancel"]),
    ("Payments", ["payments.view", "payments.create", "payments.delete"]),
    ("Reports", ["reports.view", "reports.export"]),
    ("Settings", ["settings.view", "settings.edit"]),
    ("Staff", ["staff.view", "staff.invite", "staff.edit", "staff.remove"]),
    ("Warehouses", ["warehouses.view", "warehouses.create", "warehouses.edit", "warehouses.delete"])
]

private let presetPermissions: [String: [String]] = [
    "admin": permissionGroups.flatMap(\.1).filter { $0 != "staff.remove" && $0 != "settings.edit" },
    "manager": [
        "customers.view", "customers.create", "customers.edit",
        "products.view", "products.create", "products.edit",
        "invoices.view", "invoices.create", "invoices.edit", "invoices.cancel",
        "payments.view", "payments.create",
        "reports.view",
        "warehouses.view", "warehouses.create", "warehouses.edit"
    ],
    "accountant": [
        "invoices.view", "invoices.create",
        "payments.view", "payments.create",
        "reports.view", "reports.export",
        "customers.view"
    ],
    "sales": [
        "invoices.view", "invoices.create",
        "customers.view", "customers.create"
    ],
    "viewer": permissionGroups.compactMap { $0.permissions.first { $0.hasSuffix(".view") } }
]

struct EditPermissionsView: View {
    let businessId: String
    let userId: String
    let currentName: String
    @State var currentPermissions: [String]
    @StateObject private var viewModel = StaffViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var isSaving = false

    var body: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 48, height: 48)
                        Text(currentName.prefix(1).uppercased())
                            .font(.title3).bold()
                            .foregroundColor(.white)
                    }
                    VStack(alignment: .leading) {
                        Text(currentName.isEmpty ? "Unknown" : currentName)
                            .font(.headline)
                        Text("\(currentPermissions.count) permissions selected")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section("Quick Presets") {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["admin", "manager", "accountant", "sales", "viewer"], id: \.self) { preset in
                            Button {
                                applyPreset(preset)
                            } label: {
                                Text(preset.capitalized)
                                    .font(.caption).bold()
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            ForEach(permissionGroups, id: \.name) { group in
                let allSelected = group.permissions.allSatisfy { currentPermissions.contains($0) }
                let someSelected = group.permissions.contains { currentPermissions.contains($0) }

                Section(group.name) {
                    ForEach(group.permissions, id: \.self) { permission in
                        let action = permission.split(separator: ".").last.map(String.init)?.capitalized ?? permission
                        HStack {
                            Text(action)
                            Spacer()
                            if currentPermissions.contains(permission) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            togglePermission(permission)
                        }
                    }
                }
            }
        }
        .navigationTitle("Edit Permissions")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    savePermissions()
                } label: {
                    if isSaving {
                        ProgressView()
                    } else {
                        Text("Save").bold()
                    }
                }
                .disabled(isSaving)
            }
        }
    }

    private func togglePermission(_ permission: String) {
        if currentPermissions.contains(permission) {
            currentPermissions.removeAll { $0 == permission }
        } else {
            currentPermissions.append(permission)
        }
    }

    private func applyPreset(_ preset: String) {
        if preset == "admin" {
            currentPermissions = presetPermissions["admin"] ?? []
        } else if preset == "manager" {
            currentPermissions = presetPermissions["manager"] ?? []
        } else if preset == "accountant" {
            currentPermissions = presetPermissions["accountant"] ?? []
        } else if preset == "sales" {
            currentPermissions = presetPermissions["sales"] ?? []
        } else if preset == "viewer" {
            currentPermissions = presetPermissions["viewer"] ?? []
        }
    }

    private func savePermissions() {
        isSaving = true
        Task {
            let success = await viewModel.updatePermissions(
                businessId: businessId,
                userId: userId,
                permissions: currentPermissions
            )
            isSaving = false
            if success {
                dismiss()
            }
        }
    }
}

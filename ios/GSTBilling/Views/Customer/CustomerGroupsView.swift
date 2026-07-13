import SwiftUI

struct CustomerGroupsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss
    @State private var groups: [CustomerGroup] = []
    @State private var showingAddSheet = false
    @State private var editingGroup: CustomerGroup?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var toastMessage: String?
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading && groups.isEmpty {
                    ProgressView("Loading groups...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if groups.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No customer groups")
                            .foregroundColor(.secondary)
                        Button("Create Group") {
                            showingAddSheet = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else {
                    List(groups) { group in
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.orange)
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text(String(group.name.prefix(1)))
                                        .font(.headline)
                                        .foregroundColor(.white)
                                )
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(group.name)
                                    .font(.headline)
                                if let count = group.customerCount {
                                    Text("\(count) customers")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                if let discount = group.discount, discount > 0 {
                                    Text("\(Helpers.formatNumber(discount))% discount")
                                        .font(.caption)
                                        .foregroundColor(.green)
                                }
                            }
                            Spacer()
                            Menu {
                                Button("Edit") { editingGroup = group }
                                Button("Delete", role: .destructive) {
                                    Task { await deleteGroup(group) }
                                }
                            } label: {
                                Image(systemName: "ellipsis.circle")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Customer Groups")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddGroupSheet(business: business, groups: $groups)
            }
            .sheet(item: $editingGroup) { group in
                EditGroupSheet(business: business, group: group, groups: $groups)
            }
            .task { await loadGroups() }
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
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                toastMessage = nil
                            }
                        }
                }
            }
        }
    }
    
    private func loadGroups() async {
        isLoading = true
        errorMessage = nil
        do {
            groups = try await APIService.shared.getCustomerGroups(businessId: business.id)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    private func deleteGroup(_ group: CustomerGroup) async {
        do {
            try await APIService.shared.deleteCustomerGroup(businessId: business.id, groupId: group.id)
            groups.removeAll { $0.id == group.id }
            toastMessage = "Group deleted"
        } catch {
            toastMessage = "Failed to delete: \(error.localizedDescription)"
        }
    }
}

struct AddGroupSheet: View {
    let business: Business
    @Binding var groups: [CustomerGroup]
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var discount = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section("Group Details") {
                    TextField("Group Name", text: $name)
                    TextField("Discount % (optional)", text: $discount)
                        .keyboardType(.decimalPad)
                }
                
                if let err = errorMessage {
                    Section { Text(err).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("New Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(name.isEmpty || isLoading)
                }
            }
            .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
        }
    }
    
    private func save() async {
        isLoading = true
        errorMessage = nil
        let discountValue = Double(discount)
        do {
            let group = try await APIService.shared.createCustomerGroup(
                businessId: business.id,
                name: name,
                discount: discountValue
            )
            groups.append(group)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct EditGroupSheet: View {
    let business: Business
    let group: CustomerGroup
    @Binding var groups: [CustomerGroup]
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var discount: String
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    init(business: Business, group: CustomerGroup, groups: Binding<[CustomerGroup]>) {
        self.business = business
        self.group = group
        self._groups = groups
        _name = State(initialValue: group.name)
        _discount = State(initialValue: group.discount.map { "\($0)" } ?? "")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Group Details") {
                    TextField("Group Name", text: $name)
                    TextField("Discount % (optional)", text: $discount)
                        .keyboardType(.decimalPad)
                }
                
                if let err = errorMessage {
                    Section { Text(err).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Edit Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Update") {
                        Task { await update() }
                    }
                    .disabled(name.isEmpty || isLoading)
                }
            }
            .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
        }
    }
    
    private func update() async {
        isLoading = true
        errorMessage = nil
        let discountValue = Double(discount)
        do {
            let updated = try await APIService.shared.updateCustomerGroup(
                businessId: business.id,
                groupId: group.id,
                name: name,
                discount: discountValue
            )
            if let idx = groups.firstIndex(where: { $0.id == group.id }) {
                groups[idx] = updated
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

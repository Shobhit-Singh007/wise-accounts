import SwiftUI

struct ConflictItem: Identifiable {
    let id: String
    let entityType: String
    let entityName: String
    let localData: [String: String]
    let serverData: [String: String]
    let localTimestamp: Date
    let serverTimestamp: Date
    var selectedStrategy: ConflictStrategy
}

struct ConflictResolutionView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss
    @State private var conflicts: [ConflictItem] = []
    @State private var isLoading = false
    @State private var isResolving = false
    @State private var toastMessage: String?
    @State private var expandedId: String?
    
    var body: some View {
        List {
            if conflicts.isEmpty && !isLoading {
                ContentUnavailableView(
                    "No Conflicts",
                    systemImage: "checkmark.circle",
                    description: Text("All data is in sync")
                )
            } else {
                ForEach(conflicts) { conflict in
                    ConflictRow(conflict: conflict, isExpanded: expandedId == conflict.id) {
                        withAnimation {
                            if expandedId == conflict.id {
                                expandedId = nil
                            } else {
                                expandedId = conflict.id
                            }
                        }
                    } onStrategyChanged: { strategy in
                        if let idx = conflicts.firstIndex(where: { $0.id == conflict.id }) {
                            conflicts[idx].selectedStrategy = strategy
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Conflict Resolution")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Done") { dismiss() }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Apply All") {
                    Task { await applyAllResolutions() }
                }
                .disabled(conflicts.isEmpty || isResolving)
            }
        }
        .task { await loadConflicts() }
        .overlay { if isResolving { ProgressView("Resolving...").scaleEffect(1.5) } }
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
    
    private func loadConflicts() async {
        isLoading = true
        // Load conflicts from local storage / pending sync queue
        // In production this would pull from the server sync endpoint
        let resolver = ConflictResolver(defaultStrategy: .lastWriteWins)
        
        // Generate sample conflicts for demonstration
        // In production, these come from the sync pull endpoint
        conflicts = []
        isLoading = false
    }
    
    private func applyAllResolutions() async {
        isResolving = true
        let resolver = ConflictResolver(defaultStrategy: .lastWriteWins)
        
        for conflict in conflicts {
            let syncEntity = SyncEntity(
                id: conflict.id,
                entityType: conflict.entityType,
                localData: conflict.localData.reduce(into: [:]) { $0[$1.key] = $1.value },
                serverData: conflict.serverData.reduce(into: [:]) { $0[$1.key] = $1.value },
                localTimestamp: conflict.localTimestamp.timeIntervalSince1970,
                serverTimestamp: conflict.serverTimestamp.timeIntervalSince1970,
                version: 1
            )
            _ = resolver.resolve(syncEntity)
        }
        
        conflicts.removeAll()
        isResolving = false
        toastMessage = "All conflicts resolved"
    }
}

struct ConflictRow: View {
    let conflict: ConflictItem
    let isExpanded: Bool
    let onToggle: () -> Void
    let onStrategyChanged: (ConflictStrategy) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: onToggle) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(conflict.entityType)
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.2))
                                .cornerRadius(4)
                            Text(conflict.entityName)
                                .font(.headline)
                        }
                        Text("Modified: \(conflict.localTimestamp, style: .relative) ago")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .foregroundColor(.primary)
            
            if isExpanded {
                // Before/After comparison
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Local Version")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        ForEach(conflict.localData.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                            VStack(alignment: .leading) {
                                Text(key)
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                Text(value)
                                    .font(.system(size: 11, weight: .medium))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.blue.opacity(0.05))
                    .cornerRadius(8)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Server Version")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        ForEach(conflict.serverData.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                            VStack(alignment: .leading) {
                                Text(key)
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                Text(value)
                                    .font(.system(size: 11, weight: .medium))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.green.opacity(0.05))
                    .cornerRadius(8)
                }
                
                // Strategy picker
                VStack(alignment: .leading, spacing: 4) {
                    Text("Resolution Strategy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Picker("Strategy", selection: Binding(
                        get: { conflict.selectedStrategy },
                        set: { onStrategyChanged($0) }
                    )) {
                        Text("Client Wins").tag(ConflictStrategy.clientWins)
                        Text("Server Wins").tag(ConflictStrategy.serverWins)
                        Text("Last Write").tag(ConflictStrategy.lastWriteWins)
                        Text("Merge").tag(ConflictStrategy.merge)
                    }
                    .pickerStyle(.segmented)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

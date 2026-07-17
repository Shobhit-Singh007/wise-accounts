import SwiftUI

struct SyncSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var autoSyncEnabled = true
    @State private var lastSynced: Date? = nil
    @State private var showClearDataAlert = false
    @State private var toastMessage: String?

    var body: some View {
        Form {
            Section("Sync Status") {
                LabeledContent("Last Synced", value: lastSynced != nil ? formatDate(lastSynced!) : "Never")
                Button("Sync Now") {
                    toastMessage = "Sync started"
                }
            }

            Section("Auto Sync") {
                Toggle("Enable Auto Sync", isOn: $autoSyncEnabled)
            }

            Section {
                Button("Clear Local Data", role: .destructive) {
                    showClearDataAlert = true
                }
            }
        }
        .navigationTitle("Sync Data")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Clear Local Data", isPresented: $showClearDataAlert) {
            Button("Clear", role: .destructive) {
                toastMessage = "Local data cleared"
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove all locally cached data. Data on the server will not be affected.")
        }
        .overlay {
            if let msg = toastMessage {
                VStack {
                    Spacer()
                    Text(msg)
                        .padding()
                        .background(Color.black.opacity(0.75))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 32)
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: toastMessage)
                .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2) { toastMessage = nil } }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f.string(from: date)
    }
}

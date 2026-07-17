import SwiftUI

struct BackupSettingsView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var autoBackupEnabled = false
    @State private var backupFrequency = "Daily"
    @State private var isBackingUp = false
    @State private var isRestoring = false
    @State private var toastMessage: String?

    private let frequencies = ["Daily", "Weekly", "Monthly"]

    var body: some View {
        Form {
            Section("Backup Now") {
                Button {
                    Task { await performBackup() }
                } label: {
                    HStack {
                        if isBackingUp {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                        }
                        Text("Backup Now")
                    }
                }
                .disabled(isBackingUp)
            }

            Section("Restore") {
                Button {
                    Task { await performRestore() }
                } label: {
                    HStack {
                        if isRestoring {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.down.circle.fill")
                        }
                        Text("Restore Backup")
                    }
                }
                .disabled(isRestoring)
            }

            Section("Auto Backup") {
                Toggle("Enable Auto Backup", isOn: $autoBackupEnabled)
                if autoBackupEnabled {
                    Picker("Frequency", selection: $backupFrequency) {
                        ForEach(frequencies, id: \.self) { Text($0) }
                    }
                }
            }
        }
        .navigationTitle("Backup")
        .navigationBarTitleDisplayMode(.inline)
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

    private func performBackup() async {
        isBackingUp = true
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        isBackingUp = false
        toastMessage = "Backup completed"
    }

    private func performRestore() async {
        isRestoring = true
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        isRestoring = false
        toastMessage = "Restore completed"
    }
}

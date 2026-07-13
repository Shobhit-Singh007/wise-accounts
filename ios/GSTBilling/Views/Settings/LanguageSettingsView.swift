import SwiftUI

struct LanguageSettingsView: View {
    @State private var selectedLanguage = AppLanguage.current
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(AppLanguage.allCases) { language in
                    HStack {
                        Text(language.displayName)
                            .font(.body)
                        Spacer()
                        if language == selectedLanguage {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedLanguage = language
                        language.set()
                    }
                }
            }
            .navigationTitle("Language")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

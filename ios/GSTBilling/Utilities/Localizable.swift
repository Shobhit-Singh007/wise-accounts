import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable {
    case english = "en"
    case hindi = "hi"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .english: return "English"
        case .hindi: return "हिन्दी"
        }
    }
    
    static var current: AppLanguage {
        let code = UserDefaults.standard.string(forKey: "app_language") ?? "en"
        return AppLanguage(rawValue: code) ?? .english
    }
    
    func set() {
        UserDefaults.standard.set(rawValue, forKey: "app_language")
        UserDefaults.standard.set([rawValue], forKey: "AppleLanguages")
        UserDefaults.standard.set(rawValue, forKey: "AppleLocale")
    }
    
    var bundle: Bundle? {
        guard let path = Bundle.main.path(forResource: rawValue, ofType: "lproj") else {
            return Bundle.main
        }
        return Bundle(path: path)
    }
}

struct L {
    static func localized(_ key: String) -> String {
        let lang = AppLanguage.current
        if let bundle = lang.bundle {
            return NSLocalizedString(key, tableName: "Localizable", bundle: bundle, value: key, comment: "")
        }
        return NSLocalizedString(key, comment: "")
    }
}

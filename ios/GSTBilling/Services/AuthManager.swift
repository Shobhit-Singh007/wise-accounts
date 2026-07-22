import Foundation
import Security

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var currentBusiness: Business?
    @Published var businesses: [Business] = []
    @Published var isLoading = false

    private let apiService = APIService.shared

    private let accessTokenKey = "access_token"
    private let refreshTokenKey = "refresh_token"
    private let userDataKey = "cached_user"
    private let businessDataKey = "cached_business"

    var accessToken: String? {
        get { KeychainHelper.read(key: accessTokenKey) }
        set {
            if let v = newValue {
                KeychainHelper.save(key: accessTokenKey, value: v)
            } else {
                KeychainHelper.delete(key: accessTokenKey)
            }
        }
    }

    var refreshToken: String? {
        get { KeychainHelper.read(key: refreshTokenKey) }
        set {
            if let v = newValue {
                KeychainHelper.save(key: refreshTokenKey, value: v)
            } else {
                KeychainHelper.delete(key: refreshTokenKey)
            }
        }
    }

    nonisolated init() {}

    nonisolated static let shared = AuthManager()

    func checkAuth() async {
        if let token = accessToken, !token.isEmpty {
            apiService.setAuthToken(token)
            loadCachedData()
            isAuthenticated = true
        }
    }

    func login(phone: String? = nil, email: String? = nil, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        let response: AuthResponse = try await apiService.request(.auth, endpoint: "auth/login", method: "POST", body: LoginRequest(phone: phone, email: email, password: password))
        accessToken = response.accessToken
        refreshToken = response.refreshToken
        apiService.setAuthToken(response.accessToken)
        currentUser = response.user
        businesses = response.businesses ?? []
        if let first = response.businesses?.first {
            currentBusiness = first
            cacheBusiness(first)
        }
        cacheUser(response.user)
        isAuthenticated = true
    }

    func register(phone: String? = nil, password: String, name: String, email: String? = nil) async throws {
        isLoading = true
        defer { isLoading = false }
        let response: AuthResponse = try await apiService.request(.auth, endpoint: "auth/register", method: "POST", body: RegisterRequest(name: name, password: password, email: email, phone: phone))
        accessToken = response.accessToken
        refreshToken = response.refreshToken
        apiService.setAuthToken(response.accessToken)
        currentUser = response.user
        businesses = response.businesses ?? []
        cacheUser(response.user)
        isAuthenticated = true
    }

    func logout() async {
        if let rt = refreshToken {
            try? await apiService.request(.auth, endpoint: "auth/logout", method: "POST", body: RefreshTokenRequest(refreshToken: rt))
        }
        accessToken = nil
        refreshToken = nil
        currentUser = nil
        currentBusiness = nil
        businesses = []
        clearCache()
        apiService.clearAuthToken()
        isAuthenticated = false
    }

    func refreshAccessToken() async throws -> String {
        guard let rt = refreshToken else { throw AppError.unauthorized }
        let response: RefreshResponse = try await apiService.requestNoAuth(endpoint: "auth/refresh", method: "POST", body: RefreshTokenRequest(refreshToken: rt))
        accessToken = response.accessToken
        apiService.setAuthToken(response.accessToken)
        return response.accessToken
    }

    func selectBusiness(_ business: Business) {
        currentBusiness = business
        cacheBusiness(business)
    }

    func loadBusinesses() async throws {
        let list: [Business] = try await apiService.request(.business, endpoint: "businesses")
        businesses = list
        if let current = currentBusiness {
            if let updated = list.first(where: { $0.id == current.id }) {
                currentBusiness = updated
                cacheBusiness(updated)
            }
        } else if let first = list.first {
            currentBusiness = first
            cacheBusiness(first)
        }
    }

    private func cacheUser(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: userDataKey)
        }
    }

    private func cacheBusiness(_ business: Business) {
        if let data = try? JSONEncoder().encode(business) {
            UserDefaults.standard.set(data, forKey: businessDataKey)
        }
    }

    private func loadCachedData() {
        if let data = UserDefaults.standard.data(forKey: userDataKey),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            currentUser = user
        }
        if let data = UserDefaults.standard.data(forKey: businessDataKey),
           let business = try? JSONDecoder().decode(Business.self, from: data) {
            currentBusiness = business
        }
    }

    private func clearCache() {
        UserDefaults.standard.removeObject(forKey: userDataKey)
        UserDefaults.standard.removeObject(forKey: businessDataKey)
    }
}

struct RefreshResponse: Codable {
    let accessToken: String
}

enum KeychainHelper {
    static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Constants.keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Constants.keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Constants.keychainService,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}

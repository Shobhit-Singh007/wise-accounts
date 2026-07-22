import Foundation

struct User: Codable, Identifiable {
    let id: String
    let phone: String
    let email: String?
    let name: String
    let role: String?
    let avatarUrl: String?
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?
}

struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: User
    let businesses: [Business]?
}

struct RegisterRequest: Codable {
    let name: String
    let password: String
    let email: String?
    let phone: String?
}

struct LoginRequest: Codable {
    let phone: String?
    let email: String?
    let password: String
}

struct RefreshTokenRequest: Codable {
    let refreshToken: String
}

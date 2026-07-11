import Foundation

enum AppError: LocalizedError {
    case networkError(String)
    case serverError(String)
    case unauthorized
    case validationError(String)
    case notFound(String)
    case decodingError(String)
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .networkError(let msg): return msg
        case .serverError(let msg): return msg
        case .unauthorized: return "Please login again"
        case .validationError(let msg): return msg
        case .notFound(let msg): return msg
        case .decodingError(let msg): return msg
        case .unknown(let msg): return msg
        }
    }
}

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid response from server"
        case .httpError(let code, let msg): return "Error \(code): \(msg)"
        case .decodingFailed(let err): return "Data error: \(err.localizedDescription)"
        }
    }
}

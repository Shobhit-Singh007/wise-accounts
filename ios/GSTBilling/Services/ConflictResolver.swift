import Foundation

enum ConflictStrategy: String {
    case clientWins = "CLIENT_WINS"
    case serverWins = "SERVER_WINS"
    case lastWriteWins = "LAST_WRITE_WINS"
    case merge = "MERGE"
}

struct SyncEntity {
    let id: String
    let entityType: String
    let localData: [String: Any?]
    let serverData: [String: Any?]?
    let localTimestamp: TimeInterval
    let serverTimestamp: TimeInterval?
    let version: Int
}

struct ConflictResolution {
    let entity: SyncEntity
    let strategy: ConflictStrategy
    let resolvedData: [String: Any?]
    let resolvedTimestamp: TimeInterval
    let resolvedVersion: Int
}

class ConflictResolver {
    private let defaultStrategy: ConflictStrategy
    
    init(defaultStrategy: ConflictStrategy = .lastWriteWins) {
        self.defaultStrategy = defaultStrategy
    }
    
    func resolve(_ entity: SyncEntity) -> ConflictResolution {
        let strategy = determineStrategy(entity)
        
        switch strategy {
        case .clientWins:
            return ConflictResolution(
                entity: entity,
                strategy: strategy,
                resolvedData: entity.localData,
                resolvedTimestamp: entity.localTimestamp,
                resolvedVersion: entity.version + 1
            )
        case .serverWins:
            return ConflictResolution(
                entity: entity,
                strategy: strategy,
                resolvedData: entity.serverData ?? entity.localData,
                resolvedTimestamp: entity.serverTimestamp ?? entity.localTimestamp,
                resolvedVersion: entity.version
            )
        case .lastWriteWins:
            let useClient = entity.localTimestamp >= (entity.serverTimestamp ?? 0)
            return ConflictResolution(
                entity: entity,
                strategy: strategy,
                resolvedData: useClient ? entity.localData : (entity.serverData ?? entity.localData),
                resolvedTimestamp: max(entity.localTimestamp, entity.serverTimestamp ?? 0),
                resolvedVersion: entity.version + 1
            )
        case .merge:
            return merge(entity)
        }
    }
    
    func resolveAll(_ entities: [SyncEntity]) -> [ConflictResolution] {
        return entities.map { resolve($0) }
    }
    
    private func determineStrategy(_ entity: SyncEntity) -> ConflictStrategy {
        if entity.serverData == nil { return .clientWins }
        if isEqual(entity.localData, entity.serverData!) { return .clientWins }
        return defaultStrategy
    }
    
    private func merge(_ entity: SyncEntity) -> ConflictResolution {
        var merged: [String: Any?] = [:]
        let allKeys = Set(entity.localData.keys).union(entity.serverData?.keys ?? [])
        
        for key in allKeys {
            let localValue = entity.localData[key]
            let serverValue = entity.serverData?[key]
            
            if localValue == nil {
                merged[key] = serverValue
            } else if serverValue == nil {
                merged[key] = localValue
            } else if isEqualValue(localValue!, serverValue!) {
                merged[key] = localValue
            } else {
                merged[key] = entity.localTimestamp >= (entity.serverTimestamp ?? 0) ? localValue : serverValue
            }
        }
        
        return ConflictResolution(
            entity: entity,
            strategy: .merge,
            resolvedData: merged,
            resolvedTimestamp: max(entity.localTimestamp, entity.serverTimestamp ?? 0),
            resolvedVersion: entity.version + 1
        )
    }
    
    private func isEqual(_ a: [String: Any?], _ b: [String: Any?]) -> Bool {
        guard a.count == b.count else { return false }
        for (key, value) in a {
            guard let bValue = b[key], isEqualValue(value ?? NSNull(), bValue ?? NSNull()) else { return false }
        }
        return true
    }
    
    private func isEqualValue(_ a: Any, _ b: Any) -> Bool {
        if let a = a as? String, let b = b as? String { return a == b }
        if let a = a as? Int, let b = b as? Int { return a == b }
        if let a = a as? Double, let b = b as? Double { return a == b }
        if let a = a as? Bool, let b = b as? Bool { return a == b }
        return false
    }
}

package com.gstbilling.app.data.sync

import java.util.*

enum class ConflictStrategy {
    CLIENT_WINS,     // Local changes overwrite server
    SERVER_WINS,     // Server data overwrites local
    LAST_WRITE_WINS, // Most recent timestamp wins
    MERGE            // Attempt automatic merge
}

data class SyncEntity(
    val id: String,
    val entityType: String,
    val localData: Map<String, Any?>,
    val serverData: Map<String, Any?>?,
    val localTimestamp: Long,
    val serverTimestamp: Long?,
    val version: Int
)

data class ConflictResolution(
    val entity: SyncEntity,
    val strategy: ConflictStrategy,
    val resolvedData: Map<String, Any?>,
    val resolvedTimestamp: Long,
    val resolvedVersion: Int
)

class ConflictResolver(private val defaultStrategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS) {

    fun resolve(entity: SyncEntity): ConflictResolution {
        val strategy = determineStrategy(entity)
        return when (strategy) {
            ConflictStrategy.CLIENT_WINS -> ConflictResolution(
                entity = entity,
                strategy = strategy,
                resolvedData = entity.localData,
                resolvedTimestamp = entity.localTimestamp,
                resolvedVersion = entity.version + 1
            )
            ConflictStrategy.SERVER_WINS -> ConflictResolution(
                entity = entity,
                strategy = strategy,
                resolvedData = entity.serverData ?: entity.localData,
                resolvedTimestamp = entity.serverTimestamp ?: entity.localTimestamp,
                resolvedVersion = (entity.version + 1).coerceAtLeast(entity.version)
            )
            ConflictStrategy.LAST_WRITE_WINS -> {
                val useClient = entity.localTimestamp >= (entity.serverTimestamp ?: 0L)
                ConflictResolution(
                    entity = entity,
                    strategy = strategy,
                    resolvedData = if (useClient) entity.localData else (entity.serverData ?: entity.localData),
                    resolvedTimestamp = maxOf(entity.localTimestamp, entity.serverTimestamp ?: 0L),
                    resolvedVersion = entity.version + 1
                )
            }
            ConflictStrategy.MERGE -> merge(entity)
        }
    }

    fun resolveAll(entities: List<SyncEntity>): List<ConflictResolution> {
        return entities.map { resolve(it) }
    }

    private fun determineStrategy(entity: SyncEntity): ConflictStrategy {
        if (entity.serverData == null) return ConflictStrategy.CLIENT_WINS
        if (entity.localData == entity.serverData) return ConflictStrategy.CLIENT_WINS
        return defaultStrategy
    }

    private fun merge(entity: SyncEntity): ConflictResolution {
        val merged = mutableMapOf<String, Any?>()
        val allKeys = (entity.localData.keys + (entity.serverData?.keys ?: emptySet()))

        for (key in allKeys) {
            val localValue = entity.localData[key]
            val serverValue = entity.serverData?.get[key]
            merged[key] = when {
                localValue == serverValue -> localValue
                localValue != null && serverValue == null -> localValue
                localValue == null && serverValue != null -> serverValue
                entity.localTimestamp >= (entity.serverTimestamp ?: 0L) -> localValue
                else -> serverValue
            }
        }

        return ConflictResolution(
            entity = entity,
            strategy = ConflictStrategy.MERGE,
            resolvedData = merged,
            resolvedTimestamp = maxOf(entity.localTimestamp, entity.serverTimestamp ?: 0L),
            resolvedVersion = entity.version + 1
        )
    }
}

package com.gstbilling.app.ui.dataimport

object ExportUtils {

    fun sanitizeCsvValue(cell: String): String {
        val escaped = cell.replace("\"", "\"\"")
        return if (cell.startsWith("=") || cell.startsWith("+") || cell.startsWith("-") ||
            cell.startsWith("@") || cell.contains(",") || cell.contains("\"") ||
            cell.contains("\n") || cell.contains("\r")) {
            "\"$escaped\""
        } else {
            escaped
        }
    }

    fun buildCsv(headers: List<String>, rows: List<List<String>>): String {
        val sb = StringBuilder("\uFEFF")
        sb.appendLine(headers.joinToString(","))
        for (row in rows) {
            sb.appendLine(row.joinToString(",") { sanitizeCsvValue(it) })
        }
        return sb.toString()
    }

    fun escapeJsonValue(value: String): String {
        val sb = StringBuilder(value.length)
        for (ch in value) {
            when (ch) {
                '\\' -> sb.append("\\\\")
                '"' -> sb.append("\\\"")
                '\n' -> sb.append("\\n")
                '\r' -> sb.append("\\r")
                '\t' -> sb.append("\\t")
                '\b' -> sb.append("\\b")
                '\u000C' -> sb.append("\\f")
                else -> {
                    if (ch.code < 0x20) {
                        sb.append("\\u")
                        sb.append(ch.code.toString(16).padStart(4, '0'))
                    } else {
                        sb.append(ch)
                    }
                }
            }
        }
        return sb.toString()
    }

    fun escapeJsonKey(key: String): String {
        val sb = StringBuilder(key.length)
        for (ch in key) {
            when (ch) {
                '\\' -> sb.append("\\\\")
                '"' -> sb.append("\\\"")
                else -> sb.append(ch)
            }
        }
        return sb.toString()
    }

    fun buildJsonString(headers: List<String>, rows: List<List<String>>): String {
        val sb = StringBuilder("[\n")
        rows.forEachIndexed { rowIdx, row ->
            sb.append("  {\n")
            headers.forEachIndexed { i, h ->
                val value = row.getOrElse(i) { "" }
                sb.append("    \"${escapeJsonKey(h)}\": \"${escapeJsonValue(value)}\"")
                if (i < headers.lastIndex) sb.append(",")
                sb.append("\n")
            }
            sb.append("  }")
            if (rowIdx < rows.lastIndex) sb.append(",")
            sb.append("\n")
        }
        sb.append("]")
        return sb.toString()
    }
}

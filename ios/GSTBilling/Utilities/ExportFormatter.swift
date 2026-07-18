import Foundation

struct ExportFormatter {

    static func sanitizeCsvValue(_ cell: String) -> String {
        let escaped = cell.replacingOccurrences(of: "\"", with: "\"\"")
        if cell.hasPrefix("=") || cell.hasPrefix("+") || cell.hasPrefix("-") ||
            cell.hasPrefix("@") || cell.contains(",") || cell.contains("\"") ||
            cell.contains("\n") || cell.contains("\r") {
            return "\"\(escaped)\""
        }
        return escaped
    }

    static func buildCsv(headers: [String], rows: [[String]]) -> String {
        var csv = "\u{FEFF}" + headers.joined(separator: ",") + "\n"
        for row in rows {
            csv += row.map { sanitizeCsvValue($0) }.joined(separator: ",") + "\n"
        }
        return csv
    }

    static func buildJson(headers: [String], rows: [[String]]) -> String {
        var objects: [[String: Any]] = []
        for row in rows {
            var dict: [String: Any] = [:]
            for (i, header) in headers.enumerated() {
                dict[header] = row.indices.contains(i) ? row[i] : ""
            }
            objects.append(dict)
        }
        if let data = try? JSONSerialization.data(withJSONObject: objects, options: [.prettyPrinted, .sortedKeys]),
           let str = String(data: data, encoding: .utf8) {
            return str
        }
        return "[]"
    }
}

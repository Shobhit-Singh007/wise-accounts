import XCTest
@testable import GSTBilling

final class ExportFormatterTests: XCTestCase {

    // MARK: - sanitizeCsvValue tests

    func testSanitizeCsvValuePlainString() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("Hello"), "Hello")
    }

    func testSanitizeCsvValueEscapesDoubleQuotes() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("He said \"hello\""), "\"He said \"\"hello\"\"\"")
    }

    func testSanitizeCsvValueWrapsEqualsPrefix() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("=SUM(A1:A10)"), "\"=SUM(A1:A10)\"")
    }

    func testSanitizeCsvValueWrapsPlusPrefix() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("+123"), "\"+123\"")
    }

    func testSanitizeCsvValueWrapsMinusPrefix() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("-500"), "\"-500\"")
    }

    func testSanitizeCsvValueWrapsAtPrefix() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("@gmail.com"), "\"@gmail.com\"")
    }

    func testSanitizeCsvValueWrapsComma() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("New York, NY"), "\"New York, NY\"")
    }

    func testSanitizeCsvValueWrapsNewline() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("Line1\nLine2"), "\"Line1\nLine2\"")
    }

    func testSanitizeCsvValueWrapsCarriageReturn() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue("Line1\rLine2"), "\"Line1\rLine2\"")
    }

    func testSanitizeCsvValueEmptyString() {
        XCTAssertEqual(ExportFormatter.sanitizeCsvValue(""), "")
    }

    // MARK: - buildCsv tests

    func testBuildCsvIncludesBOM() {
        let csv = ExportFormatter.buildCsv(headers: ["A"], rows: [["1"]])
        let bom = "\u{FEFF}"
        XCTAssertTrue(csv.hasPrefix(bom))
    }

    func testBuildCsvCorrectHeaderRow() {
        let csv = ExportFormatter.buildCsv(headers: ["Name", "Age"], rows: [["Alice", "30"]])
        let lines = csv.components(separatedBy: "\n").filter { !$0.isEmpty }
        XCTAssertEqual(lines[0], "Name,Age")
    }

    func testBuildCsvCorrectDataRow() {
        let csv = ExportFormatter.buildCsv(headers: ["Name", "Age"], rows: [["Alice", "30"]])
        let lines = csv.components(separatedBy: "\n").filter { !$0.isEmpty }
        XCTAssertEqual(lines[1], "Alice,30")
    }

    func testBuildCsvEscapesComma() {
        let csv = ExportFormatter.buildCsv(headers: ["City"], rows: [["New York, NY"]])
        XCTAssertTrue(csv.contains("\"New York, NY\""))
    }

    func testBuildCsvEscapesFormulaInjection() {
        let csv = ExportFormatter.buildCsv(headers: ["Name"], rows: [["=SUM(1)"]])
        XCTAssertTrue(csv.contains("\"=SUM(1)\""))
    }

    func testBuildCsvMultipleRows() {
        let csv = ExportFormatter.buildCsv(headers: ["Name"], rows: [["Alice"], ["Bob"], ["Charlie"]])
        let lines = csv.components(separatedBy: "\n").filter { !$0.isEmpty }
        XCTAssertEqual(lines.count, 4) // header + 3 rows
        XCTAssertEqual(lines[1], "Alice")
        XCTAssertEqual(lines[2], "Bob")
        XCTAssertEqual(lines[3], "Charlie")
    }

    func testBuildCsvEmptyRows() {
        let csv = ExportFormatter.buildCsv(headers: ["Name", "Phone"], rows: [])
        let lines = csv.components(separatedBy: "\n").filter { !$0.isEmpty }
        XCTAssertEqual(lines.count, 1) // only header
    }

    // MARK: - buildJson tests

    func testBuildJsonValidArray() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [["Alice"]])
        XCTAssertTrue(json.hasPrefix("["))
        XCTAssertTrue(json.hasSuffix("]"))
    }

    func testBuildJsonCorrectKeyValue() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [["Alice"]])
        XCTAssertTrue(json.contains("\"Name\" : \"Alice\""))
    }

    func testBuildJsonMultipleRows() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [["Alice"], ["Bob"]])
        XCTAssertTrue(json.contains("\"Name\" : \"Alice\""))
        XCTAssertTrue(json.contains("\"Name\" : \"Bob\""))
    }

    func testBuildJsonEscapesQuotes() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [["O\"Brien"]])
        XCTAssertTrue(json.contains("\\\""))
    }

    func testBuildJsonEscapesNewlines() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [["Line1\nLine2"]])
        XCTAssertTrue(json.contains("\\n"))
    }

    func testBuildJsonPrettyPrinted() {
        let json = ExportFormatter.buildJson(headers: ["A"], rows: [["1"]])
        XCTAssertTrue(json.contains("  {"))
        XCTAssertTrue(json.contains("    \"A\""))
    }

    func testBuildJsonEmptyRows() {
        let json = ExportFormatter.buildJson(headers: ["Name"], rows: [])
        XCTAssertEqual(json, "[\n]")
    }

    func testBuildJsonMissingRowValues() {
        let json = ExportFormatter.buildJson(headers: ["A", "B", "C"], rows: [["1"]])
        XCTAssertTrue(json.contains("\"A\" : \"1\""))
        XCTAssertTrue(json.contains("\"B\" : \"\""))
        XCTAssertTrue(json.contains("\"C\" : \"\""))
    }

    func testBuildJsonSortsKeys() {
        let json = ExportFormatter.buildJson(headers: ["Zebra", "Apple", "Mango"], rows: [["1", "2", "3"]])
        let appleRange = json.range(of: "\"Apple\"")
        let mangoRange = json.range(of: "\"Mango\"")
        let zebraRange = json.range(of: "\"Zebra\"")
        if let a = appleRange, let m = mangoRange, let z = zebraRange {
            XCTAssertTrue(a.lowerBound < m.lowerBound)
            XCTAssertTrue(m.lowerBound < z.lowerBound)
        }
    }
}

import XCTest
@testable import GSTBilling

final class CustomerTests: XCTestCase {

    // MARK: - GSTINLookupResult Decoding

    func testGSTINLookupResultDecodingFromJSON() throws {
        let json = """
        {
            "gstin": "27AABCU9603R1ZM",
            "tradeName": "Test Corp",
            "name": "Test Corp Pvt Ltd",
            "address": "123 Test Street, Mumbai",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "status": "Active"
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(GSTINLookupResult.self, from: json)

        XCTAssertEqual(result.gstin, "27AABCU9603R1ZM")
        XCTAssertEqual(result.tradeName, "Test Corp")
        XCTAssertEqual(result.name, "Test Corp Pvt Ltd")
        XCTAssertEqual(result.address, "123 Test Street, Mumbai")
        XCTAssertEqual(result.city, "Mumbai")
        XCTAssertEqual(result.state, "Maharashtra")
        XCTAssertEqual(result.pincode, "400001")
        XCTAssertEqual(result.status, "Active")
        XCTAssertEqual(result.displayName, "Test Corp")
    }

    func testGSTINLookupResultDisplayNameFallsBackToName() throws {
        let json = """
        {
            "gstin": "27AABCU9603R1ZM",
            "name": "Fallback Name"
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(GSTINLookupResult.self, from: json)
        XCTAssertEqual(result.displayName, "Fallback Name")
    }

    func testGSTINLookupResultDisplayNameReturnsEmptyWhenNil() throws {
        let json = """
        {
            "gstin": "27AABCU9603R1ZM"
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(GSTINLookupResult.self, from: json)
        XCTAssertEqual(result.displayName, "")
    }

    // MARK: - Customer Decoding

    func testCustomerDecodingWithAllFields() throws {
        let json = """
        {
            "id": "cust-001",
            "businessId": "biz-001",
            "groupId": "grp-001",
            "name": "Raj Kumar",
            "phone": "9876543210",
            "email": "raj@test.com",
            "gstin": "27AABCU9603R1ZM",
            "address": "123 Main Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "creditLimit": 50000.0,
            "balance": 12500.0,
            "openingBalance": 10000.0,
            "notes": "Premium customer",
            "isActive": true,
            "createdAt": "2024-01-15T10:30:00Z",
            "updatedAt": "2024-06-20T14:00:00Z"
        }
        """.data(using: .utf8)!

        let customer = try JSONDecoder().decode(Customer.self, from: json)

        XCTAssertEqual(customer.id, "cust-001")
        XCTAssertEqual(customer.businessId, "biz-001")
        XCTAssertEqual(customer.groupId, "grp-001")
        XCTAssertEqual(customer.name, "Raj Kumar")
        XCTAssertEqual(customer.phone, "9876543210")
        XCTAssertEqual(customer.email, "raj@test.com")
        XCTAssertEqual(customer.gstin, "27AABCU9603R1ZM")
        XCTAssertEqual(customer.address, "123 Main Street")
        XCTAssertEqual(customer.city, "Mumbai")
        XCTAssertEqual(customer.state, "Maharashtra")
        XCTAssertEqual(customer.pincode, "400001")
        XCTAssertEqual(customer.creditLimit, 50000.0)
        XCTAssertEqual(customer.balance, 12500.0)
        XCTAssertEqual(customer.openingBalance, 10000.0)
        XCTAssertEqual(customer.notes, "Premium customer")
        XCTAssertEqual(customer.isActive, true)
        XCTAssertNotNil(customer.createdAt)
        XCTAssertNotNil(customer.updatedAt)
    }

    func testCustomerDecodingWithNilOptionalFields() throws {
        let json = """
        {
            "id": "cust-002",
            "name": "Walk-in"
        }
        """.data(using: .utf8)!

        let customer = try JSONDecoder().decode(Customer.self, from: json)

        XCTAssertEqual(customer.id, "cust-002")
        XCTAssertEqual(customer.name, "Walk-in")
        XCTAssertNil(customer.businessId)
        XCTAssertNil(customer.groupId)
        XCTAssertNil(customer.phone)
        XCTAssertNil(customer.email)
        XCTAssertNil(customer.gstin)
        XCTAssertNil(customer.address)
        XCTAssertNil(customer.city)
        XCTAssertNil(customer.state)
        XCTAssertNil(customer.pincode)
        XCTAssertNil(customer.creditLimit)
        XCTAssertNil(customer.balance)
        XCTAssertNil(customer.openingBalance)
        XCTAssertNil(customer.notes)
        XCTAssertNil(customer.isActive)
        XCTAssertNil(customer.createdAt)
        XCTAssertNil(customer.updatedAt)
    }

    // MARK: - ImportResponse Decoding

    func testImportResponseDecoding() throws {
        let json = """
        {
            "imported": 10,
            "skipped": 2,
            "errors": ["Row 3: Missing name", "Row 7: Duplicate phone"]
        }
        """.data(using: .utf8)!

        struct ImportResponse: Codable {
            let imported: Int
            let skipped: Int
            let errors: [String]
        }

        let response = try JSONDecoder().decode(ImportResponse.self, from: json)

        XCTAssertEqual(response.imported, 10)
        XCTAssertEqual(response.skipped, 2)
        XCTAssertEqual(response.errors.count, 2)
        XCTAssertEqual(response.errors[0], "Row 3: Missing name")
        XCTAssertEqual(response.errors[1], "Row 7: Duplicate phone")
    }

    // MARK: - ImportRecordsRequest Encoding

    func testImportRecordsRequestEncoding() throws {
        struct ImportRecord: Codable {
            let name: String?
            let phone: String?
            let gstin: String?
        }

        struct ImportRecordsRequest: Codable {
            let records: [ImportRecord]
        }

        let request = ImportRecordsRequest(records: [
            ImportRecord(name: "Customer A", phone: "1234567890", gstin: nil),
            ImportRecord(name: "Customer B", phone: nil, gstin: "27AABCU9603R1ZM"),
        ])

        let encoded = try JSONEncoder().encode(request)
        let decoded = try JSONDecoder().decode(ImportRecordsRequest.self, from: encoded)

        XCTAssertEqual(decoded.records.count, 2)
        XCTAssertEqual(decoded.records[0].name, "Customer A")
        XCTAssertEqual(decoded.records[0].phone, "1234567890")
        XCTAssertNil(decoded.records[0].gstin)
        XCTAssertEqual(decoded.records[1].name, "Customer B")
        XCTAssertNil(decoded.records[1].phone)
        XCTAssertEqual(decoded.records[1].gstin, "27AABCU9603R1ZM")
    }

    // MARK: - Customer Equality & Hashing

    func testCustomerEqualityById() throws {
        let json1 = """
        {
            "id": "cust-001",
            "name": "First",
            "phone": "1111111111"
        }
        """.data(using: .utf8)!

        let json2 = """
        {
            "id": "cust-001",
            "name": "Second",
            "phone": "2222222222"
        }
        """.data(using: .utf8)!

        let c1 = try JSONDecoder().decode(Customer.self, from: json1)
        let c2 = try JSONDecoder().decode(Customer.self, from: json2)

        XCTAssertEqual(c1, c2, "Customers with same id should be equal")
    }

    func testCustomerHashingById() throws {
        let json1 = """
        {
            "id": "cust-001",
            "name": "First"
        }
        """.data(using: .utf8)!

        let json2 = """
        {
            "id": "cust-001",
            "name": "Second"
        }
        """.data(using: .utf8)!

        let c1 = try JSONDecoder().decode(Customer.self, from: json1)
        let c2 = try JSONDecoder().decode(Customer.self, from: json2)

        XCTAssertEqual(c1.hashValue, c2.hashValue, "Customers with same id should have same hash")
    }
}

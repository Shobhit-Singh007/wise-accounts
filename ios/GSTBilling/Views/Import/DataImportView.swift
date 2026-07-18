import SwiftUI
import UniformTypeIdentifiers

struct DataImportView: View {
    let business: Business
    @Environment(\.dismiss) private var dismiss

    @State private var currentStep = 1
    @State private var selectedImportType: ImportType? = nil
    @State private var selectedFileName: String? = nil
    @State private var parsedRows: [[String: String]] = []
    @State private var headers: [String] = []
    @State private var columnMappings: [String: String] = [:]
    @State private var isImporting = false
    @State private var showFilePicker = false
    @State private var importResult: ImportResult? = nil
    @State private var errorMessage: String?

    enum ImportType: String, CaseIterable {
        case customers = "Customers"
        case products = "Products"
        case invoices = "Invoices"

        var icon: String {
            switch self {
            case .customers: return "person.2.fill"
            case .products: return "cube.fill"
            case .invoices: return "doc.text.fill"
            }
        }

        var color: Color {
            switch self {
            case .customers: return .orange
            case .products: return .purple
            case .invoices: return .blue
            }
        }

        var targetFields: [String] {
            switch self {
            case .customers: return ["name", "phone", "email", "address", "gstin"]
            case .products: return ["name", "sku", "price", "hsn_code", "stock_quantity", "unit"]
            case .invoices: return ["invoice_no", "customer_name", "date", "subtotal", "tax", "total"]
            }
        }
    }

    struct ImportResult {
        let totalRows: Int
        let successCount: Int
        let errorCount: Int
    }

    var body: some View {
        VStack(spacing: 0) {
            stepIndicator

            switch currentStep {
            case 1: selectImportTypeStep
            case 2: fileSelectStep
            case 3: mappingStep
            default: EmptyView()
            }
        }
        .navigationTitle("Import Data")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [
                UTType.commaSeparatedText,
                UTType.json,
                UTType(filenameExtension: "csv") ?? .plainText
            ]
        ) { result in
            handleFileImport(result)
        }
    }

    // MARK: - Step Indicator

    private var stepIndicator: some View {
        HStack(spacing: 0) {
            ForEach(1...3, id: \.self) { step in
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(step <= currentStep ? Color.purple : Color(.systemGray4))
                            .frame(width: 28, height: 28)
                        Text("\(step)")
                            .font(.caption).bold()
                            .foregroundColor(.white)
                    }
                    if step < 3 {
                        Rectangle()
                            .fill(step < currentStep ? Color.purple : Color(.systemGray4))
                            .frame(height: 2)
                    }
                }
            }
        }
        .padding(.horizontal, 40)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
    }

    // MARK: - Step 1: Select Import Type

    private var selectImportTypeStep: some View {
        VStack(spacing: 16) {
            Text("What would you like to import?")
                .font(.headline)
                .padding(.top)

            ForEach(ImportType.allCases, id: \.self) { type in
                Button {
                    selectedImportType = type
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: type.icon)
                            .font(.title2)
                            .foregroundColor(type.color)
                            .frame(width: 40)
                        Text(type.rawValue)
                            .font(.body)
                            .foregroundColor(.primary)
                        Spacer()
                        if selectedImportType == type {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.purple)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(selectedImportType == type ? Color.purple : Color.clear, lineWidth: 2)
                    )
                }
                .padding(.horizontal)
            }

            Spacer()

            Button {
                withAnimation { currentStep = 2 }
            } label: {
                Text("Next")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
            .disabled(selectedImportType == nil)
            .padding(.horizontal)
            .padding(.bottom)
        }
    }

    // MARK: - Step 2: File Select

    private var fileSelectStep: some View {
        VStack(spacing: 16) {
            Text("Select a CSV or JSON file")
                .font(.headline)
                .padding(.top)

            Button {
                showFilePicker = true
            } label: {
                VStack(spacing: 12) {
                    Image(systemName: "doc.badge.plus")
                        .font(.largeTitle)
                        .foregroundColor(.purple)
                    Text(selectedFileName ?? "Choose File")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Text("Supports CSV and JSON")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(32)
                .background(Color(.systemGray6))
                .cornerRadius(16)
                .padding(.horizontal)
            }

            if !parsedRows.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Preview (\(parsedRows.count) rows)")
                        .font(.subheadline).bold()
                    ScrollView(.horizontal) {
                        HStack(spacing: 0) {
                            ForEach(headers, id: \.self) { header in
                                Text(header)
                                    .font(.caption).bold()
                                    .padding(6)
                                    .frame(minWidth: 80)
                                    .background(Color.purple.opacity(0.15))
                            }
                        }
                    }
                    ForEach(parsedRows.prefix(3), id: \.self) { row in
                        ScrollView(.horizontal) {
                            HStack(spacing: 0) {
                                ForEach(headers, id: \.self) { header in
                                    Text(row[header] ?? "")
                                        .font(.caption)
                                        .padding(6)
                                        .frame(minWidth: 80)
                                }
                            }
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
            }

            if let err = errorMessage {
                Text(err).foregroundColor(.red).font(.caption).padding(.horizontal)
            }

            Spacer()

            HStack(spacing: 12) {
                Button("Back") {
                    withAnimation { currentStep = 1 }
                }
                .buttonStyle(.bordered)

                Button("Next") {
                    withAnimation { currentStep = 3 }
                }
                .buttonStyle(.borderedProminent)
                .tint(.purple)
            }
            .disabled(parsedRows.isEmpty)
            .padding(.horizontal)
            .padding(.bottom)
        }
    }

    // MARK: - Step 3: Column Mapping

    private var mappingStep: some View {
        VStack(spacing: 16) {
            Text("Map columns")
                .font(.headline)
                .padding(.top)

            if let importType = selectedImportType {
                Form {
                    Section("Column Mapping") {
                        ForEach(importType.targetFields, id: \.self) { field in
                            HStack {
                                Text(field)
                                    .font(.callout)
                                Spacer()
                                Picker("", selection: Binding(
                                    get: { columnMappings[field] ?? "" },
                                    set: { columnMappings[field] = $0 }
                                )) {
                                    Text("—").tag("")
                                    ForEach(headers, id: \.self) { header in
                                        Text(header).tag(header)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: 160)
                            }
                        }
                    }

                    Section {
                        if let result = importResult {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Import Complete").font(.headline).foregroundColor(.green)
                                Text("Total: \(result.totalRows) | Success: \(result.successCount) | Errors: \(result.errorCount)")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }

            HStack(spacing: 12) {
                Button("Back") {
                    withAnimation { currentStep = 2 }
                }
                .buttonStyle(.bordered)

                Button {
                    Task { await performImport() }
                } label: {
                    if isImporting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Import")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.purple)
                .disabled(isImporting || importResult != nil)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
    }

    // MARK: - File Handling

    private func handleFileImport(_ result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            guard url.startAccessingSecurityScopedResource() else {
                errorMessage = "Unable to access file"
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            selectedFileName = url.lastPathComponent
            do {
                let data = try Data(contentsOf: url)
                if let text = String(data: data, encoding: .utf8) {
                    parseCSV(text)
                }
            } catch {
                errorMessage = "Failed to read file: \(error.localizedDescription)"
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }

    private func parseCSV(_ text: String) {
        let lines = text.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        guard lines.count >= 2 else {
            errorMessage = "File must have a header row and at least one data row"
            return
        }

        headers = lines[0].components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        parsedRows = []

        for line in lines.dropFirst() {
            let values = line.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            var row: [String: String] = [:]
            for (index, header) in headers.enumerated() {
                row[header] = index < values.count ? values[index] : ""
            }
            parsedRows.append(row)
        }

        autoMapColumns()
        errorMessage = nil
    }

    private func autoMapColumns() {
        guard let importType = selectedImportType else { return }
        columnMappings = [:]
        for field in importType.targetFields {
            let normalizedField = field.lowercased().replacingOccurrences(of: "_", with: "")
            for header in headers {
                let normalizedHeader = header.lowercased().replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "_", with: "")
                if normalizedHeader == normalizedField ||
                   normalizedHeader.contains(normalizedField) ||
                   normalizedField.contains(normalizedHeader) ||
                   (field == "name" && (normalizedHeader == "fullname" || normalizedHeader == "productname" || normalizedHeader == "customername")) ||
                   (field == "price" && (normalizedHeader == "sellingprice" || normalizedHeader == "rate" || normalizedHeader == "amount")) ||
                   (field == "phone" && (normalizedHeader == "mobile" || normalizedHeader == "mobilenumber" || normalizedHeader == "contactno")) ||
                   (field == "address" && (normalizedHeader == "addr" || normalizedHeader == "fulladdress")) ||
                   (field == "stock_quantity" && (normalizedHeader == "stock" || normalizedHeader == "qty" || normalizedHeader == "quantity")) ||
                   (field == "unit" && (normalizedHeader == "uom" || normalizedHeader == "unitofmeasure")) {
                    columnMappings[field] = header
                    break
                }
            }
        }
    }

    private func performImport() async {
        guard let businessId = AuthManager.shared.currentBusiness?.id else {
            errorMessage = "No business selected"
            return
        }
        isImporting = true
        errorMessage = nil

        do {
            var records: [[String: Any]] = []
            for row in parsedRows {
                var mapped: [String: Any] = [:]
                for (targetField, sourceHeader) in columnMappings {
                    if !sourceHeader.isEmpty, let value = row[sourceHeader] {
                        mapped[targetField] = value
                    }
                }
                records.append(mapped)
            }

            let result: ImportResponse
            switch selectedImportType {
            case .customers:
                result = try await APIService.shared.importCustomers(businessId: businessId, records: records)
            case .products:
                result = try await APIService.shared.importProducts(businessId: businessId, records: records)
            case .invoices:
                result = try await APIService.shared.importInvoices(businessId: businessId, records: records)
            case .none:
                fatalError("No import type selected")
            }

            await MainActor.run {
                importResult = ImportResult(
                    totalRows: parsedRows.count,
                    successCount: result.imported,
                    errorCount: result.errors.count
                )
                if !result.errors.isEmpty {
                    errorMessage = result.errors.joined(separator: "\n")
                }
                isImporting = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Import failed: \(error.localizedDescription)"
                isImporting = false
            }
        }
    }
}

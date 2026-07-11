import SwiftUI

struct AddProductView: View {
    let business: Business
    let product: Product?
    @StateObject private var viewModel = ProductViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var sku = ""
    @State private var hsnCode = ""
    @State private var unit = "piece"
    @State private var sellingPrice = ""
    @State private var purchasePrice = ""
    @State private var mrp = ""
    @State private var taxRate = 18.0
    @State private var taxType = "exclusive"
    @State private var lowStockThreshold = ""
    @State private var barcode = ""
    @State private var selectedCategoryId: String?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let units = ["piece", "kg", "g", "l", "ml", "box", "pack", "dozen", "m", "sqft"]

    private var isEditing: Bool { product != nil }

    var body: some View {
        Form {
            Section("Basic Information") {
                TextField("Product Name *", text: $name)
                    .autocapitalization(.words)
                TextField("SKU", text: $sku)
                    .autocapitalization(.allCharacters)
                TextField("HSN Code", text: $hsnCode)
                Picker("Unit", selection: $unit) {
                    ForEach(units, id: \.self) { Text($0).tag($0) }
                }
                TextField("Barcode", text: $barcode)
            }

            Section("Pricing") {
                TextField("Selling Price *", text: $sellingPrice)
                    .keyboardType(.decimalPad)
                TextField("Purchase Price", text: $purchasePrice)
                    .keyboardType(.decimalPad)
                TextField("MRP", text: $mrp)
                    .keyboardType(.decimalPad)
            }

            Section("GST") {
                Picker("Tax Rate", selection: $taxRate) {
                    ForEach(Constants.gstRateOptions, id: \.self) { rate in
                        Text(rate == 0 ? "0%" : "\(Helpers.formatNumber(rate))%").tag(rate)
                    }
                }
                Picker("Tax Type", selection: $taxType) {
                    Text("Exclusive").tag("exclusive")
                    Text("Inclusive").tag("inclusive")
                }
            }

            Section("Category") {
                if viewModel.categories.isEmpty {
                    Text("No categories").foregroundColor(.secondary)
                } else {
                    Picker("Category", selection: $selectedCategoryId) {
                        Text("None").tag(nil as String?)
                        ForEach(viewModel.categories) { cat in
                            Text(cat.name).tag(cat.id as String?)
                        }
                    }
                }
            }

            Section("Stock") {
                TextField("Low Stock Threshold", text: $lowStockThreshold)
                    .keyboardType(.numberPad)
            }

            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }
        }
        .navigationTitle(isEditing ? "Edit Product" : "Add Product")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(isEditing ? "Update" : "Save") {
                    Task { await save() }
                }
                .disabled(name.isEmpty || sellingPrice.isEmpty || isLoading)
            }
        }
        .task { await viewModel.loadCategories(businessId: business.id) }
        .onAppear {
            if let p = product {
                name = p.name
                sku = p.sku ?? ""
                hsnCode = p.hsnCode ?? ""
                unit = p.unit ?? "piece"
                sellingPrice = "\(p.sellingPrice)"
                purchasePrice = p.purchasePrice.map { "\($0)" } ?? ""
                mrp = p.mrp.map { "\($0)" } ?? ""
                taxRate = p.taxRate ?? 18
                taxType = p.taxType ?? "exclusive"
                lowStockThreshold = p.lowStockThreshold.map { "\($0)" } ?? ""
                barcode = p.barcode ?? ""
                selectedCategoryId = p.categoryId
            }
        }
        .overlay { if isLoading { ProgressView().scaleEffect(1.5) } }
    }

    private func save() async {
        guard let sp = Double(sellingPrice) else {
            errorMessage = "Invalid selling price"
            return
        }
        isLoading = true
        errorMessage = nil
        let dto = CreateProductRequest(
            name: name,
            sku: sku.isEmpty ? nil : sku,
            hsnCode: hsnCode.isEmpty ? nil : hsnCode,
            unit: unit,
            sellingPrice: sp,
            purchasePrice: Double(purchasePrice),
            mrp: Double(mrp),
            taxRate: taxRate,
            taxType: taxType,
            trackBatch: false,
            trackExpiry: false,
            lowStockThreshold: Int(lowStockThreshold),
            isService: false,
            categoryId: selectedCategoryId,
            barcode: barcode.isEmpty ? nil : barcode
        )
        do {
            if isEditing, let p = product {
                _ = try await viewModel.updateProduct(businessId: business.id, productId: p.id, dto)
            } else {
                _ = try await viewModel.createProduct(businessId: business.id, dto)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

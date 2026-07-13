import SwiftUI

struct ProductDetailView: View {
    let business: Business
    let productId: String
    @StateObject private var viewModel = ProductDetailViewModel()
    @State private var showStockAdjust = false
    @State private var showEdit = false

    var body: some View {
        List {
            if let err = viewModel.errorMessage {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(err))
            } else if let product = viewModel.product {
                Section("Basic Information") {
                    LabeledContent("Name", value: product.name)
                    if let sku = product.sku { LabeledContent("SKU", value: sku) }
                    if let hsn = product.hsnCode { LabeledContent("HSN Code", value: hsn) }
                    if let barcode = product.barcode { LabeledContent("Barcode", value: barcode) }
                    if let unit = product.unit { LabeledContent("Unit", value: unit) }
                    if let cat = product.category { LabeledContent("Category", value: cat.name) }
                }

                Section("Pricing") {
                    LabeledContent("Selling Price", value: Helpers.formatCurrency(product.sellingPrice))
                    if let pp = product.purchasePrice {
                        LabeledContent("Purchase Price", value: Helpers.formatCurrency(pp))
                    }
                    if let mrp = product.mrp {
                        LabeledContent("MRP", value: Helpers.formatCurrency(mrp))
                    }
                }

                Section("Tax") {
                    if let rate = product.taxRate {
                        LabeledContent("Tax Rate", value: "\(Helpers.formatNumber(rate))%")
                    }
                    if let type = product.taxType {
                        LabeledContent("Tax Type", value: type.capitalized)
                    }
                }

                Section("Stock") {
                    if let qty = product.stockQuantity {
                        LabeledContent("Current Stock", value: "\(qty)")
                    }
                    if let threshold = product.lowStockThreshold {
                        LabeledContent("Low Stock Threshold", value: "\(threshold)")
                    }
                }

                Section {
                    Button {
                        showStockAdjust = true
                    } label: {
                        Label("Adjust Stock", systemImage: "plus.minus")
                    }
                    Button {
                        showEdit = true
                    } label: {
                        Label("Edit Product", systemImage: "pencil")
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle(viewModel.product?.name ?? "Product")
        .task {
            await viewModel.loadProduct(businessId: business.id, productId: productId)
        }
        .sheet(isPresented: $showStockAdjust) {
            NavigationStack {
                StockAdjustView(business: business, productId: productId)
            }
        }
        .navigationDestination(isPresented: $showEdit) {
            if let product = viewModel.product {
                AddProductView(business: business, product: product)
            }
        }
        .overlay { if viewModel.isLoading { ProgressView().scaleEffect(1.5) } }
    }
}

@MainActor
class ProductDetailViewModel: ObservableObject {
    @Published var product: Product?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadProduct(businessId: String, productId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            product = try await APIService.shared.getProduct(businessId: businessId, productId: productId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

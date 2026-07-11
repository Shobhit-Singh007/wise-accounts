import SwiftUI

struct ProductListView: View {
    let business: Business
    @StateObject private var viewModel = ProductViewModel()

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.products.isEmpty {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No products", systemImage: "cube.box", description: Text("Add your first product"))
            } else {
                ForEach(viewModel.filteredProducts) { product in
                    NavigationLink(value: AppRoute.editProduct(product)) {
                        ProductRow(product: product)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { try? await viewModel.deleteProduct(businessId: business.id, productId: product.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "Search by name, SKU, HSN")
        .onSubmit(of: .search) {
            Task { await viewModel.searchProducts(businessId: business.id) }
        }
        .task {
            await viewModel.loadProducts(businessId: business.id)
            await viewModel.loadCategories(businessId: business.id)
        }
        .refreshable { await viewModel.loadProducts(businessId: business.id) }
        .navigationTitle("Products")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(value: AppRoute.addProduct) {
                    Image(systemName: "plus")
                }
            }
        }
    }
}

struct ProductRow: View {
    let product: Product

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.purple.opacity(0.1))
                .frame(width: 44, height: 44)
                .overlay(Image(systemName: "cube").foregroundColor(.purple))

            VStack(alignment: .leading, spacing: 2) {
                Text(product.name).font(.body)
                HStack {
                    if let sku = product.sku { Text(sku).font(.caption2).foregroundColor(.secondary) }
                    if let hsn = product.hsnCode { Text("HSN: \(hsn)").font(.caption2).foregroundColor(.secondary) }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(Helpers.formatCurrency(product.sellingPrice)).font(.callout)
                if let qty = product.stockQuantity {
                    Text("\(qty) in stock")
                        .font(.caption2)
                        .foregroundColor(qty <= (product.lowStockThreshold ?? 0) ? .red : .secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

import SwiftUI

struct CreateInvoiceView: View {
    let business: Business
    var editInvoiceId: String? = nil
    @StateObject private var viewModel = InvoiceViewModel()
    @StateObject private var customerVM = CustomerViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var showCustomerPicker = false
    @State private var showProductPicker = false
    @State private var editingItemIndex: Int?

    var isEditMode: Bool { editInvoiceId != nil }

    var body: some View {
        Form {
            Section("Invoice Details") {
                Picker("Type", selection: $viewModel.invoiceType) {
                    Text("B2C").tag("B2C")
                    Text("B2B").tag("B2B")
                }

                DatePicker("Invoice Date", selection: $viewModel.invoiceDate, displayedComponents: .date)
                DatePicker("Due Date", selection: Binding(get: { viewModel.dueDate ?? Date() }, set: { viewModel.dueDate = $0 }), displayedComponents: .date)
            }

            Section("Customer") {
                if let custId = viewModel.customerId, let cust = customerVM.customers.first(where: { $0.id == custId }) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(cust.name).font(.body).fontWeight(.medium)
                            Spacer()
                            Button("Change") { showCustomerPicker = true }
                        }
                        if let gstin = cust.gstin, !gstin.isEmpty {
                            Text("GSTIN: \(gstin)").font(.caption).foregroundColor(.blue)
                        }
                        if let state = cust.state, !state.isEmpty {
                            Text("State: \(state)").font(.caption).foregroundColor(.secondary)
                        }
                        if let address = cust.address, !address.isEmpty {
                            Text(address).font(.caption).foregroundColor(.secondary)
                        }
                        if let phone = cust.phone, !phone.isEmpty {
                            Text("Phone: \(phone)").font(.caption).foregroundColor(.secondary)
                        }
                        Text("Type: \(viewModel.invoiceType)").font(.caption2).foregroundColor(.purple)
                    }
                } else {
                    Button("Select Customer") { showCustomerPicker = true }
                }
            }

            Section("Items") {
                ForEach(viewModel.items.indices, id: \.self) { index in
                    InvoiceItemRow(
                        input: $viewModel.items[index],
                        businessId: business.id
                    )
                }
                .onDelete { viewModel.removeItem(at: $0.first ?? 0) }

                Button(action: viewModel.addItem) {
                    Label("Add Item", systemImage: "plus.circle")
                }
            }

            Section("Totals") {
                HStack {
                    Text("Subtotal")
                    Spacer()
                    Text(Helpers.formatCurrency(viewModel.subtotal))
                }
                let gst = viewModel.gstSummary
                if gst.cgst > 0 {
                    HStack {
                        Text("CGST").foregroundColor(.secondary)
                        Spacer()
                        Text(Helpers.formatCurrency(gst.cgst)).foregroundColor(.secondary)
                    }
                    HStack {
                        Text("SGST").foregroundColor(.secondary)
                        Spacer()
                        Text(Helpers.formatCurrency(gst.sgst)).foregroundColor(.secondary)
                    }
                }
                if gst.igst > 0 {
                    HStack {
                        Text("IGST").foregroundColor(.secondary)
                        Spacer()
                        Text(Helpers.formatCurrency(gst.igst)).foregroundColor(.secondary)
                    }
                }
                HStack {
                    Text("Grand Total").fontWeight(.bold)
                    Spacer()
                    Text(Helpers.formatCurrency(viewModel.grandTotal)).fontWeight(.bold)
                }
            }

            Section("Notes & Terms") {
                TextField("Notes", text: $viewModel.notes, axis: .vertical)
                    .lineLimit(3)
                TextField("Terms & Conditions", text: $viewModel.terms, axis: .vertical)
                    .lineLimit(3)
            }

            if let err = viewModel.saveError {
                Section { Text(err).foregroundColor(.red).font(.caption) }
            }
        }
        .navigationTitle(isEditMode ? "Edit Invoice" : "Create Invoice")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(isEditMode ? "Update" : "Save") { Task { await saveInvoice() } }
                    .disabled(viewModel.items.isEmpty || viewModel.isSaving)
            }
        }
        .task {
            await customerVM.loadCustomers(businessId: business.id)
            viewModel.customers = customerVM.customers
            if let invoiceId = editInvoiceId {
                await viewModel.loadInvoiceForEdit(businessId: business.id, invoiceId: invoiceId)
            }
        }
        .sheet(isPresented: $showCustomerPicker) {
            CustomerPickerView(
                businessId: business.id,
                customers: customerVM.customers,
                selectedId: $viewModel.customerId,
                onCustomerSelected: { customer in
                    viewModel.invoiceType = (customer.gstin != nil && !(customer.gstin ?? "").isEmpty) ? "B2B" : "B2C"
                }
            )
        }
        .overlay { if viewModel.isSaving { ProgressView().scaleEffect(1.5) } }
    }

    private func saveInvoice() async {
        do {
            if let invoiceId = editInvoiceId {
                _ = try await viewModel.updateInvoice(businessId: business.id, invoiceId: invoiceId)
            } else {
                _ = try await viewModel.createInvoice(businessId: business.id)
            }
            dismiss()
        } catch {
            viewModel.saveError = error.localizedDescription
        }
    }
}

struct InvoiceItemRow: View {
    @Binding var input: InvoiceItemInput
    let businessId: String

    @State private var showProductPicker = false

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                if let productId = input.productId, !input.itemName.isEmpty {
                    Text(input.itemName)
                        .font(.body)
                        .foregroundColor(.primary)
                    Spacer()
                    Button("Change") { showProductPicker = true }
                        .font(.caption)
                } else {
                    Button("Select Product") { showProductPicker = true }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .foregroundColor(.blue)
                }
            }

            if input.productId == nil {
                TextField("Item Name (manual)", text: $input.itemName)
                    .font(.body)
            }

            HStack {
                TextField("Qty", value: $input.quantity, format: .number)
                    .keyboardType(.decimalPad)
                    .frame(width: 60)
                Text(input.unit).font(.caption)
                Spacer()
                TextField("Rate", value: $input.rate, format: .number)
                    .keyboardType(.decimalPad)
                    .frame(width: 80)
            }
            HStack {
                Text("Disc %")
                TextField("0", value: $input.discount, format: .number)
                    .keyboardType(.decimalPad)
                    .frame(width: 50)
                Spacer()
                Text("GST %")
                Picker("", selection: $input.taxRate) {
                    ForEach(Constants.gstRateOptions, id: \.self) { rate in
                        Text("\(Helpers.formatNumber(rate))%").tag(rate)
                    }
                }
                .labelsHidden()
                .frame(width: 80)
            }
            HStack {
                Spacer()
                Text("Total: \(Helpers.formatCurrency(input.total))")
                    .font(.callout).fontWeight(.semibold)
            }
        }
        .padding(.vertical, 4)
        .sheet(isPresented: $showProductPicker) {
            ProductPickerView(businessId: businessId, input: $input)
        }
    }
}

struct CustomerPickerView: View {
    let businessId: String
    let customers: [Customer]
    @Binding var selectedId: String?
    var onCustomerSelected: ((Customer) -> Void)? = nil
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""
    @State private var searchResults: [Customer] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?

    var filteredCustomers: [Customer] {
        if searchText.isEmpty { return customers }
        return searchResults.isEmpty ? customers.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.phone?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.gstin?.localizedCaseInsensitiveContains(searchText) ?? false)
        } : searchResults
    }

    var body: some View {
        NavigationStack {
            List {
                Button("None (Walk-in Customer)") {
                    selectedId = nil
                    dismiss()
                }

                ForEach(filteredCustomers) { customer in
                    Button {
                        selectedId = customer.id
                        onCustomerSelected?(customer)
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(customer.name).font(.body)
                                HStack(spacing: 4) {
                                    if let phone = customer.phone, !phone.isEmpty {
                                        Text(phone).font(.caption).foregroundColor(.secondary)
                                    }
                                    if let gstin = customer.gstin, !gstin.isEmpty {
                                        Text("GSTIN: \(gstin)").font(.caption).foregroundColor(.blue)
                                    }
                                }
                                HStack(spacing: 4) {
                                    if let state = customer.state, !state.isEmpty {
                                        Text(state).font(.caption2).foregroundColor(.secondary)
                                    }
                                    if let city = customer.city, !city.isEmpty {
                                        Text(city).font(.caption2).foregroundColor(.secondary)
                                    }
                                }
                            }
                            Spacer()
                            if customer.id == selectedId {
                                Image(systemName: "checkmark").foregroundColor(.blue)
                            }
                        }
                    }
                    .foregroundColor(.primary)
                }
            }
            .searchable(text: $searchText, prompt: "Search by name, phone, or GSTIN")
            .onChange(of: searchText) { _, newValue in
                searchTask?.cancel()
                guard newValue.count >= 2 else {
                    searchResults = []
                    return
                }
                searchTask = Task {
                    isSearching = true
                    do {
                        let results = try await APIService.shared.getCustomers(businessId: businessId, search: newValue)
                        if !Task.isCancelled { searchResults = results }
                    } catch {
                        if !Task.isCancelled { searchResults = [] }
                    }
                    isSearching = false
                }
            }
            .navigationTitle("Select Customer")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

struct ProductPickerView: View {
    let businessId: String
    @Binding var input: InvoiceItemInput
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""
    @State private var products: [Product] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            List {
                if searchText.count < 2 {
                    Section {
                        Text("Type at least 2 characters to search")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                } else if products.isEmpty && !isSearching {
                    Section {
                        Text("No products found")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                } else {
                    Section {
                        ForEach(products) { product in
                            Button {
                                input.productId = product.id
                                input.itemName = product.name
                                input.rate = product.sellingPrice
                                input.unit = product.unit ?? "piece"
                                input.taxRate = product.taxRate ?? 18.0
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(product.name).font(.body)
                                    HStack(spacing: 4) {
                                        Text("₹\(product.sellingPrice, specifier: "%.2f")").font(.caption).foregroundColor(.blue)
                                        if let sku = product.sku, !sku.isEmpty {
                                            Text("SKU: \(sku)").font(.caption).foregroundColor(.secondary)
                                        }
                                        if let stock = product.stockQuantity {
                                            Text("Stock: \(stock)").font(.caption).foregroundColor(.secondary)
                                        }
                                    }
                                    if let unit = product.unit {
                                        Text("Unit: \(unit)").font(.caption2).foregroundColor(.secondary)
                                    }
                                }
                            }
                            .foregroundColor(.primary)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search product name, SKU, or barcode")
            .onChange(of: searchText) { _, newValue in
                searchTask?.cancel()
                guard newValue.count >= 2 else {
                    products = []
                    return
                }
                searchTask = Task {
                    isSearching = true
                    do {
                        let results = try await APIService.shared.getProducts(businessId: businessId, search: newValue)
                        if !Task.isCancelled { products = results }
                    } catch {
                        if !Task.isCancelled { products = [] }
                    }
                    isSearching = false
                }
            }
            .navigationTitle("Select Product")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

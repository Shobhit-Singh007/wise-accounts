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
                    HStack {
                        VStack(alignment: .leading) {
                            Text(cust.name).font(.body)
                            if let gstin = cust.gstin { Text(gstin).font(.caption).foregroundColor(.secondary) }
                        }
                        Spacer()
                        Button("Change") { showCustomerPicker = true }
                    }
                } else {
                    Button("Select Customer") { showCustomerPicker = true }
                }
            }

            Section("Items") {
                ForEach(viewModel.items.indices, id: \.self) { index in
                    InvoiceItemRow(input: $viewModel.items[index])
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
            CustomerPickerView(customers: customerVM.customers, selectedId: $viewModel.customerId)
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

    var body: some View {
        VStack(spacing: 8) {
            TextField("Item Name", text: $input.itemName)
                .font(.body)
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
    }
}

struct CustomerPickerView: View {
    let customers: [Customer]
    @Binding var selectedId: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Button("None (Walk-in Customer)") {
                    selectedId = nil
                    dismiss()
                }
                ForEach(customers) { customer in
                    Button {
                        selectedId = customer.id
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(customer.name)
                                if let phone = customer.phone { Text(phone).font(.caption).foregroundColor(.secondary) }
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
            .navigationTitle("Select Customer")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}

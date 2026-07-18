import SwiftUI

struct InvoiceListView: View {
    let business: Business
    @StateObject private var viewModel = InvoiceViewModel()

    var body: some View {
        VStack(spacing: 0) {
            Picker("Direction", selection: $viewModel.selectedDirection) {
                ForEach(SalePurchaseTab.allCases, id: \.self) { tab in
                    Text(tab.displayName).tag(tab.rawValue)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)
            .onChange(of: viewModel.selectedDirection) { _, _ in
                Task { await viewModel.loadInvoices(businessId: business.id) }
            }

            List {
                if viewModel.errorMessage != nil && viewModel.invoices.isEmpty {
                    ContentUnavailableView("Error loading invoices", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
                } else if viewModel.invoices.isEmpty && !viewModel.isLoading {
                    ContentUnavailableView("No invoices", systemImage: "doc.text", description: Text("Create your first invoice"))
                } else {
                    ForEach(viewModel.invoices) { invoice in
                        NavigationLink(value: AppRoute.invoiceDetail(invoice)) {
                            InvoiceRow(invoice: invoice)
                        }
                    }
                }
            }
        }
        .task { await viewModel.loadInvoices(businessId: business.id) }
        .refreshable { await viewModel.loadInvoices(businessId: business.id) }
        .navigationTitle("Invoices")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Menu {
                    ForEach(viewModel.statusFilterOptions, id: \.self) { opt in
                        Button(opt ?? "All") {
                            viewModel.statusFilter = opt
                            Task { await viewModel.loadInvoices(businessId: business.id) }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(viewModel.statusFilterLabel).font(.callout)
                        Image(systemName: "line.3.horizontal.decrease")
                    }
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(value: AppRoute.createInvoice) {
                    Image(systemName: "plus")
                }
            }
        }
    }
}

struct InvoiceRow: View {
    let invoice: Invoice

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(invoice.invoiceNo)
                        .font(.callout).fontWeight(.semibold)
                    Text(invoice.direction)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(invoice.direction == "SALE" ? .blue : .orange)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background((invoice.direction == "SALE" ? Color.blue : Color.orange).opacity(0.1))
                        .cornerRadius(3)
                }
                if let customer = invoice.customer {
                    Text(customer.name).font(.caption).foregroundColor(.secondary)
                } else if let supplier = invoice.supplier {
                    Text(supplier.name).font(.caption).foregroundColor(.secondary)
                }
                Text(Helpers.formatDate(invoice.invoiceDate))
                    .font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Helpers.formatCurrency(invoice.grandTotal ?? 0))
                    .font(.callout).fontWeight(.semibold)
                StatusBadge(status: invoice.status ?? "DRAFT")
                if let paid = invoice.paidAmount, paid > 0 {
                    Text("Paid: \(Helpers.formatCurrency(paid))")
                        .font(.caption2).foregroundColor(.green)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status)
            .font(.system(size: 10, weight: .medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .cornerRadius(4)
    }

    private var color: Color {
        switch status {
        case "CONFIRMED": return .blue
        case "DRAFT": return .gray
        case "CANCELLED": return .red
        case "CREDITED": return .orange
        default: return .gray
        }
    }
}

struct InvoiceDetailView: View {
    let business: Business
    let invoice: Invoice
    @StateObject private var viewModel = InvoiceViewModel()
    @State private var showCancelAlert = false
    @State private var showCreditNoteSheet = false
    @State private var showEwayBillSheet = false
    @State private var showEinvoiceSheet = false
    @State private var showGenerateBothSheet = false
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showPrintConfirm = false
    @State private var printMethod: PrintMethod = .airprint
    @State private var selectedDocType = "INVOICE"

    enum PrintMethod {
        case airprint, thermal
    }

    var body: some View {
        List {
            Section("Invoice \(invoice.invoiceNo)") {
                LabeledContent("Status") { StatusBadge(status: invoice.status ?? "DRAFT") }
                LabeledContent("Direction", value: invoice.direction)
                LabeledContent("Type", value: invoice.type ?? "-")
                LabeledContent("Date", value: Helpers.formatDate(invoice.invoiceDate))
                if let due = invoice.dueDate { LabeledContent("Due Date", value: Helpers.formatDate(due)) }
                if invoice.direction == "SALE" {
                    if let customer = invoice.customer {
                        LabeledContent("Customer", value: customer.name)
                        if let gstin = customer.gstin { LabeledContent("GSTIN", value: gstin) }
                    } else {
                        LabeledContent("Customer", value: "Walk-in")
                    }
                } else {
                    if let supplier = invoice.supplier {
                        LabeledContent("Supplier", value: supplier.name)
                        if let gstin = supplier.gstin { LabeledContent("GSTIN", value: gstin) }
                    } else {
                        LabeledContent("Supplier", value: "-")
                    }
                }
            }

            Section("Items") {
                if let items = invoice.items {
                    ForEach(items) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.itemName).font(.callout)
                                Text("\(Helpers.formatQuantity(item.quantity)) x \(Helpers.formatCurrency(item.rate))")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text(Helpers.formatCurrency(item.total ?? 0)).font(.callout)
                                if let cgst = item.cgst, cgst > 0 {
                                    Text("CGST: \(Helpers.formatCurrency(cgst))").font(.system(size: 10)).foregroundColor(.secondary)
                                }
                                if let sgst = item.sgst, sgst > 0 {
                                    Text("SGST: \(Helpers.formatCurrency(sgst))").font(.system(size: 10)).foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
            }

            Section("Totals") {
                LabeledContent("Subtotal", value: Helpers.formatCurrency(invoice.subtotal ?? 0))
                if let disc = invoice.discount, disc > 0 {
                    LabeledContent("Discount", value: "-\(Helpers.formatCurrency(disc))").foregroundColor(.red)
                }
                LabeledContent("Tax Amount", value: Helpers.formatCurrency(invoice.taxAmount ?? 0))
                LabeledContent("Grand Total", value: Helpers.formatCurrency(invoice.grandTotal ?? 0)).fontWeight(.bold)
                if let paid = invoice.paidAmount, paid > 0 {
                    LabeledContent("Paid", value: Helpers.formatCurrency(paid)).foregroundColor(.green)
                    LabeledContent("Balance", value: Helpers.formatCurrency((invoice.grandTotal ?? 0) - paid))
                        .foregroundColor(.red)
                }
            }

            if let notes = invoice.notes, !notes.isEmpty {
                Section("Notes") { Text(notes).font(.callout) }
            }

            if let ewayNo = invoice.ewayBillNo, !ewayNo.isEmpty {
                Section("E-Way Bill") {
                    LabeledContent("E-Way Bill No", value: ewayNo)
                    if let date = invoice.ewayBillDate { LabeledContent("Date", value: Helpers.formatDate(date)) }
                    if let vehicle = invoice.vehicleNo { LabeledContent("Vehicle No", value: vehicle) }
                    if let transporter = invoice.transporterName { LabeledContent("Transporter", value: transporter) }
                    if let dist = invoice.distanceKm { LabeledContent("Distance", value: "\(dist) km") }
                }
            }

            if let irn = invoice.irn, !irn.isEmpty {
                Section("e-Invoice") {
                    LabeledContent("IRN", value: irn)
                    if let date = invoice.irnDate { LabeledContent("IRN Date", value: Helpers.formatDate(date)) }
                    if let ackNo = invoice.ackNo { LabeledContent("Ack No", value: ackNo) }
                    if let ackDate = invoice.ackDate { LabeledContent("Ack Date", value: Helpers.formatDate(ackDate)) }
                }
            }

            Section("Actions") {
                Picker("Document Type", selection: $selectedDocType) {
                    Text("Tax Invoice").tag("INVOICE")
                    Text("Quotation").tag("QUOTATION")
                    Text("Proforma Invoice").tag("PROFORMA")
                    Text("Delivery Challan").tag("DELIVERY_CHALLAN")
                    Text("Jobwork Challan").tag("JOBWORK")
                    Text("Credit Note").tag("CREDIT_NOTE")
                    Text("Letterhead").tag("LETTERHEAD")
                }

                if let printUrl = APIService.shared.getInvoicePrintUrl(businessId: business.id, invoiceId: invoice.id, documentType: selectedDocType) {
                    Link(destination: printUrl) {
                        Label("Print Invoice", systemImage: "printer")
                    }
                }

                Button {
                    printMethod = .airprint
                    showPrintConfirm = true
                } label: {
                    Label("Print via AirPrint", systemImage: "printer.fill")
                }

                Button {
                    printMethod = .thermal
                    showPrintConfirm = true
                } label: {
                    Label("Print via Thermal Printer", systemImage: "printer.filled.and.paper")
                }

                Button {
                    Task { await downloadPdf() }
                } label: {
                    Label("Download PDF", systemImage: "arrow.down.doc")
                }

                NavigationLink(value: AppRoute.editInvoice(invoice)) {
                    Label("Edit Invoice", systemImage: "pencil")
                }

                if invoice.status == "CONFIRMED" {
                    let hasEwayBill = invoice.ewayBillNo != nil && !(invoice.ewayBillNo?.isEmpty ?? true)
                    let hasEinvoice = invoice.irn != nil && !(invoice.irn?.isEmpty ?? true)

                    Button { showGenerateBothSheet = true } label: {
                        Label("E-Way Bill & e-Invoice", systemImage: "bolt.fill")
                    }
                    .tint(.blue)

                    if !hasEwayBill {
                        Button { showEwayBillSheet = true } label: {
                            Label("E-Way Bill Only", systemImage: "truck")
                        }
                    }

                    if !hasEinvoice {
                        Button { showEinvoiceSheet = true } label: {
                            Label("e-Invoice Only", systemImage: "doc.text.magnifyingglass")
                        }
                    }
                }

                if invoice.status == "CONFIRMED" {
                    Button("Create Credit Note") { showCreditNoteSheet = true }
                    Button("Cancel Invoice", role: .destructive) { showCancelAlert = true }
                }
            }
        }
        .navigationTitle("Invoice Details")
        .alert("Cancel Invoice", isPresented: $showCancelAlert) {
            Button("Cancel", role: .destructive) { Task { await cancelInvoice() } }
            Button("Keep", role: .cancel) {}
        } message: { Text("This action cannot be undone. Are you sure?") }
        .sheet(isPresented: $showCreditNoteSheet) {
            CreditNoteView(business: business, invoice: invoice)
        }
        .sheet(isPresented: $showEwayBillSheet) {
            EwayBillSheet(businessId: business.id, invoiceId: invoice.id, isPresented: $showEwayBillSheet)
        }
        .sheet(isPresented: $showEinvoiceSheet) {
            EinvoiceSheet(businessId: business.id, invoiceId: invoice.id, isPresented: $showEinvoiceSheet)
        }
        .sheet(isPresented: $showGenerateBothSheet) {
            GenerateBothSheet(businessId: business.id, invoiceId: invoice.id, isPresented: $showGenerateBothSheet)
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") { showError = false }
        } message: {
            Text(errorMessage)
        }
        .alert("Print Invoice", isPresented: $showPrintConfirm) {
            Button("Print") {
                if printMethod == .airprint {
                    printViaAirPrint()
                } else {
                    printViaThermal()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(printMethod == .airprint ? "Send this invoice to AirPrint?" : "Send this invoice to the connected thermal printer?")
        }
    }

    private func printViaAirPrint() {
        let items: [(name: String, qty: Int, amount: Double)] = invoice.items?.map { ($0.itemName, Int($0.quantity), $0.total ?? 0) } ?? []
        AirPrintService.shared.printInvoice(
            businessName: business.name,
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customer?.name ?? "Walk-in",
            items: items,
            subtotal: invoice.subtotal ?? 0,
            tax: invoice.taxAmount ?? 0,
            total: invoice.grandTotal ?? 0
        )
    }

    private func printViaThermal() {
        let printItems: [PrintItem] = invoice.items?.map { PrintItem(name: $0.itemName, quantity: Int($0.quantity), amount: $0.total ?? 0) } ?? []
        ThermalPrinter.shared.printInvoice(
            businessName: business.name,
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customer?.name ?? "Walk-in",
            items: printItems,
            subtotal: invoice.subtotal ?? 0,
            tax: invoice.taxAmount ?? 0,
            total: invoice.grandTotal ?? 0,
            amountPaid: invoice.paidAmount ?? 0,
            balance: (invoice.grandTotal ?? 0) - (invoice.paidAmount ?? 0)
        )
    }

    private func cancelInvoice() async {
        isLoading = true
        do {
            _ = try await viewModel.cancelInvoice(businessId: business.id, invoiceId: invoice.id)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }

    private func downloadPdf() async {
        do {
            let docTypeParam = selectedDocType == "INVOICE" ? nil : selectedDocType
            let data = try await APIService.shared.getInvoicePdfData(businessId: business.id, invoiceId: invoice.id, documentType: docTypeParam)
            await MainActor.run {
                let labels = ["INVOICE": "Invoice", "QUOTATION": "Quotation", "PROFORMA": "Proforma", "DELIVERY_CHALLAN": "Challan", "JOBWORK": "Jobwork", "CREDIT_NOTE": "CreditNote", "LETTERHEAD": "Letterhead"]
                let label = labels[selectedDocType] ?? "Invoice"
                let tmpUrl = FileManager.default.temporaryDirectory.appendingPathComponent("\(label)_\(invoice.invoiceNo).pdf")
                try? data.write(to: tmpUrl)
                let activityVC = UIActivityViewController(activityItems: [tmpUrl], applicationActivities: nil)
                if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let root = scene.windows.first?.rootViewController {
                    root.present(activityVC, animated: true)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

struct CreditNoteView: View {
    let business: Business
    let invoice: Invoice
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InvoiceViewModel()
    @State private var reason = ""
    @State private var selectedItems: Set<String> = []
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Invoice: \(invoice.invoiceNo)") {
                    Text("Select items for credit note")
                        .font(.caption).foregroundColor(.secondary)
                }

                if let items = invoice.items {
                    Section("Items") {
                        ForEach(items) { item in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(item.itemName)
                                    Text("Qty: \(Helpers.formatQuantity(item.quantity)) | \(Helpers.formatCurrency(item.rate)) each")
                                        .font(.caption).foregroundColor(.secondary)
                                }
                                Spacer()
                                if selectedItems.contains(item.id ?? "") {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.blue)
                                }
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                if let id = item.id {
                                    if selectedItems.contains(id) { selectedItems.remove(id) }
                                    else { selectedItems.insert(id) }
                                }
                            }
                        }
                    }
                }

                Section("Reason") {
                    TextField("Reason for credit note", text: $reason, axis: .vertical)
                        .lineLimit(3)
                }
            }
            .navigationTitle("Credit Note")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await create() } }
                        .disabled(selectedItems.isEmpty || isLoading)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { showError = false }
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func create() async {
        isLoading = true
        let items = selectedItems.compactMap { itemId -> CreditNoteItemRequest? in
            guard let item = invoice.items?.first(where: { $0.id == itemId }) else { return nil }
            return CreditNoteItemRequest(invoiceItemId: itemId, quantity: item.quantity, reason: reason.isEmpty ? nil : reason)
        }
        let dto = CreateCreditNoteRequest(invoiceId: invoice.id, items: items, reason: reason.isEmpty ? nil : reason)
        do {
            _ = try await viewModel.createCreditNote(businessId: business.id, dto)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        isLoading = false
    }
}

struct EwayBillSheet: View {
    let businessId: String
    let invoiceId: String
    @Binding var isPresented: Bool
    @State var transporterId = ""
    @State var transporterName = ""
    @State var vehicleNo = ""
    @State var distanceKm = ""
    @State var supplyType = "Regular"
    @State var showingAlert = false
    @State var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Transporter Details")) {
                    TextField("Transporter ID (GSTIN/PAN)", text: $transporterId)
                    TextField("Transporter Name", text: $transporterName)
                }
                Section(header: Text("Vehicle Details")) {
                    TextField("Vehicle Number", text: $vehicleNo)
                    TextField("Distance (km)", text: $distanceKm)
                        .keyboardType(.numberPad)
                    Picker("Supply Type", selection: $supplyType) {
                        Text("Regular").tag("Regular")
                        Text("Job Work").tag("Job Work")
                        Text("SKD/CKD").tag("SKD/CKD")
                    }
                }
            }
            .navigationTitle("E-Way Bill")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generate") {
                        guard !vehicleNo.isEmpty, let dist = Int(distanceKm), dist > 0 else {
                            alertMessage = "Enter vehicle number and valid distance"
                            showingAlert = true
                            return
                        }
                        let request = EwayBillRequest(
                            transporterId: transporterId.isEmpty ? nil : transporterId,
                            transporterName: transporterName.isEmpty ? nil : transporterName,
                            vehicleNo: vehicleNo,
                            distanceKm: dist,
                            supplyType: supplyType
                        )
                        Task {
                            do {
                                let _ = try await APIService.shared.generateEwayBill(
                                    businessId: businessId, invoiceId: invoiceId, data: request
                                )
                                isPresented = false
                            } catch {
                                alertMessage = "Failed: \(error.localizedDescription)"
                                showingAlert = true
                            }
                        }
                    }
                }
            }
            .alert(isPresented: $showingAlert) {
                Alert(title: Text("Error"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
            }
        }
    }
}

struct EinvoiceSheet: View {
    let businessId: String
    let invoiceId: String
    @Binding var isPresented: Bool
    @State var autoGenerate = true
    @State var irn = ""
    @State var ackNo = ""
    @State var showingAlert = false
    @State var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Generation Method")) {
                    Toggle("Auto-generate via GSTN API", isOn: $autoGenerate)
                }
                if !autoGenerate {
                    Section(header: Text("Manual Entry")) {
                        TextField("IRN", text: $irn)
                        TextField("Acknowledgement No", text: $ackNo)
                    }
                }
            }
            .navigationTitle("e-Invoice")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generate") {
                        let request = EinvoiceRequest(
                            generateViaApi: autoGenerate,
                            irn: autoGenerate ? nil : irn,
                            ackNo: autoGenerate ? nil : ackNo
                        )
                        Task {
                            do {
                                let _ = try await APIService.shared.generateEinvoice(
                                    businessId: businessId, invoiceId: invoiceId, data: request
                                )
                                isPresented = false
                            } catch {
                                alertMessage = "Failed: \(error.localizedDescription)"
                                showingAlert = true
                            }
                        }
                    }
                }
            }
            .alert(isPresented: $showingAlert) {
                Alert(title: Text("Error"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
            }
        }
    }
}

struct GenerateBothSheet: View {
    let businessId: String
    let invoiceId: String
    @Binding var isPresented: Bool
    @State var transporterId = ""
    @State var transporterName = ""
    @State var vehicleNo = ""
    @State var distanceKm = ""
    @State var supplyType = "Regular"
    @State var generateEinvoice = true
    @State var showingAlert = false
    @State var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("E-Way Bill Details")) {
                    TextField("Transporter ID (GSTIN/PAN)", text: $transporterId)
                    TextField("Transporter Name", text: $transporterName)
                }
                Section(header: Text("Vehicle Details")) {
                    TextField("Vehicle Number", text: $vehicleNo)
                    TextField("Distance (km)", text: $distanceKm)
                        .keyboardType(.numberPad)
                    Picker("Supply Type", selection: $supplyType) {
                        Text("Regular").tag("Regular")
                        Text("Job Work").tag("Job Work")
                        Text("SKD/CKD").tag("SKD/CKD")
                    }
                }
                Section {
                    Toggle("Also generate e-Invoice", isOn: $generateEinvoice)
                }
            }
            .navigationTitle("Generate Both")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generate") {
                        guard !vehicleNo.isEmpty, let dist = Int(distanceKm), dist > 0 else {
                            alertMessage = "Enter vehicle number and valid distance"
                            showingAlert = true
                            return
                        }
                        let request = GenerateBothRequest(
                            vehicleNo: vehicleNo,
                            distanceKm: dist,
                            transporterId: transporterId.isEmpty ? nil : transporterId,
                            transporterName: transporterName.isEmpty ? nil : transporterName,
                            supplyType: supplyType,
                            generateEinvoice: generateEinvoice
                        )
                        Task {
                            do {
                                let _ = try await APIService.shared.generateBoth(
                                    businessId: businessId, invoiceId: invoiceId, data: request
                                )
                                isPresented = false
                            } catch {
                                alertMessage = "Failed: \(error.localizedDescription)"
                                showingAlert = true
                            }
                        }
                    }
                }
            }
            .alert(isPresented: $showingAlert) {
                Alert(title: Text("Error"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
            }
        }
    }
}

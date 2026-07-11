import SwiftUI
import WebKit
import UIKit

struct CustomerLedgerView: View {
    let business: Business
    let customer: Customer
    @StateObject private var viewModel = CustomerViewModel()
    @State private var showPaymentSheet = false
    @State private var showEntrySheet = false
    @State private var entryType = "GAVE"
    @State private var showSmsSheet = false
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if let response = viewModel.ledgerResponse {
                    ledgerHeader(response)
                    actionButtons
                    summaryCards(response)
                    ledgerTable(response)
                } else if viewModel.ledgerLoading {
                    ProgressView("Loading ledger...")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 60)
                } else {
                    ContentUnavailableView("No ledger data", systemImage: "tray", description: Text("Pull down to refresh"))
                }
            }
        }
        .background(Color(.systemGroupedBackground))
        .task { await viewModel.loadLedger(businessId: business.id, customerId: customer.id) }
        .refreshable { await viewModel.loadLedger(businessId: business.id, customerId: customer.id) }
        .navigationTitle("Ledger")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    Button {
                        Task { await downloadAndSharePdf() }
                    } label: {
                        Image(systemName: "arrow.down.doc")
                            .foregroundColor(.red)
                    }
                    Button {
                        showSmsSheet = true
                    } label: {
                        Image(systemName: "message")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .sheet(isPresented: $showPaymentSheet) {
            RecordPaymentSheet(business: business, customer: customer, viewModel: viewModel)
        }
        .sheet(isPresented: $showEntrySheet) {
            LedgerEntrySheet(
                entryType: entryType,
                businessId: business.id,
                customerId: customer.id,
                onSaved: {
                    showEntrySheet = false
                    Task { await viewModel.loadLedger(businessId: business.id, customerId: customer.id) }
                }
            )
        }
        .sheet(isPresented: $showSmsSheet) {
            LedgerSmsSheet(
                businessId: business.id,
                customerId: customer.id,
                customerName: customer.name,
                customerPhone: customer.phone ?? "",
                customerBalance: customer.balance ?? 0
            )
        }
        .alert("Delete Transaction", isPresented: .constant(viewModel.deleteTransactionId != nil)) {
            Button("Cancel", role: .cancel) { viewModel.deleteTransactionId = nil }
            Button("Delete", role: .destructive) {
                if let txId = viewModel.deleteTransactionId {
                    Task {
                        await viewModel.deleteLedgerEntry(businessId: business.id, customerId: customer.id, transactionId: txId)
                        await viewModel.loadLedger(businessId: business.id, customerId: customer.id)
                    }
                }
            }
        } message: {
            Text("Are you sure you want to delete this transaction?")
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                entryType = "GAVE"
                showEntrySheet = true
            } label: {
                HStack {
                    Image(systemName: "arrow.up.right.circle.fill")
                    Text("You Gave")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.red)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            Button {
                entryType = "RECEIVED"
                showEntrySheet = true
            } label: {
                HStack {
                    Image(systemName: "arrow.down.right.circle.fill")
                    Text("You Got")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    private func ledgerHeader(_ response: LedgerResponse) -> some View {
        let cust = response.customer
        return VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(String(cust.name.prefix(1)).uppercased())
                            .font(.title2).fontWeight(.semibold)
                            .foregroundColor(.white)
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(cust.name)
                        .font(.title3).fontWeight(.semibold)
                        .foregroundColor(.white)
                    if !cust.phone.isEmpty {
                        Text(cust.phone)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    if let gstin = cust.gstin, !gstin.isEmpty {
                        Text("GSTIN: \(gstin)")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Balance")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                    Text(Helpers.formatCurrency(cust.currentBalance))
                        .font(.title3).fontWeight(.bold)
                        .foregroundColor(.white)
                }
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.15, blue: 0.35), Color(red: 0.15, green: 0.2, blue: 0.45)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private func summaryCards(_ response: LedgerResponse) -> some View {
        let summary = response.summary
        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            LedgerSummaryCard(title: "Opening Balance", value: summary.openingBalance, color: .blue, icon: "arrow.up.circle")
            LedgerSummaryCard(title: "Total Debit", value: summary.totalDebit, color: .red, icon: "arrow.up.right.circle")
            LedgerSummaryCard(title: "Total Credit", value: summary.totalCredit, color: .green, icon: "arrow.down.right.circle")
            LedgerSummaryCard(title: "Closing Balance", value: summary.closingBalance, color: .purple, icon: "arrow.right.circle")
        }
        .padding()
    }

    private func ledgerTable(_ response: LedgerResponse) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text("Date").frame(width: 70, alignment: .leading)
                Text("Description").frame(minWidth: 0, alignment: .leading)
                Text("Dr").frame(width: 60, alignment: .trailing)
                Text("Cr").frame(width: 60, alignment: .trailing)
                Text("Balance").frame(width: 75, alignment: .trailing)
                Spacer().frame(width: 30)
            }
            .font(.caption).fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(red: 0.1, green: 0.15, blue: 0.35))

            ScrollView(.horizontal, showsIndicators: false) {
                VStack(spacing: 0) {
                    ForEach(response.entries) { entry in
                        ledgerRow(entry)
                        Divider().padding(.leading, 12)
                    }
                    ledgerFooter(response)
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.bottom)
    }

    private func ledgerRow(_ entry: LedgerEntryItem) -> some View {
        let isStandalone = entry.type == "LEDGER_GAVE" || entry.type == "LEDGER_RECEIVED"
        return HStack(spacing: 0) {
            Text(Helpers.formatDateShort(entry.date))
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 70, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.description)
                    .font(.caption)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    if let invNo = entry.invoiceNo, !invNo.isEmpty {
                        Text(invNo)
                            .font(.system(size: 8))
                            .foregroundColor(.blue)
                    }
                    Text(typeLabel(entry.type))
                        .font(.system(size: 8, weight: .medium))
                        .foregroundColor(typeColor(entry.type))
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(typeColor(entry.type).opacity(0.1))
                        .cornerRadius(3)
                }
            }
            .frame(minWidth: 0, alignment: .leading)
            
            if let imageUrl = entry.imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: 40, height: 40)
                        .clipped()
                        .cornerRadius(6)
                } placeholder: {
                    ProgressView()
                        .frame(width: 40, height: 40)
                }
                .onTapGesture {
                    let fullUrl = imageUrl.hasPrefix("http") ? imageUrl : Constants.baseURL.replacingOccurrences(of: "/api/v1", with: "") + imageUrl
                    if let url = URL(string: fullUrl) {
                        UIApplication.shared.open(url)
                    }
                }
            }

            Text(entry.debit > 0 ? Helpers.formatCurrency(entry.debit) : "-")
                .font(.caption)
                .foregroundColor(entry.debit > 0 ? .red : .secondary)
                .frame(width: 60, alignment: .trailing)

            Text(entry.credit > 0 ? Helpers.formatCurrency(entry.credit) : "-")
                .font(.caption)
                .foregroundColor(entry.credit > 0 ? .green : .secondary)
                .frame(width: 60, alignment: .trailing)

            Text(Helpers.formatCurrency(entry.balanceAfter))
                .font(.caption).fontWeight(.semibold)
                .foregroundColor(entry.balanceAfter >= 0 ? .primary : .red)
                .frame(width: 75, alignment: .trailing)

            if isStandalone {
                Button {
                    viewModel.deleteTransactionId = entry.id
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .frame(width: 30)
            } else {
                Spacer().frame(width: 30)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private func ledgerFooter(_ response: LedgerResponse) -> some View {
        let summary = response.summary
        return HStack(spacing: 0) {
            Text("Total").font(.caption).fontWeight(.bold).frame(width: 70, alignment: .leading)
            Spacer()
            Text(Helpers.formatCurrency(summary.totalDebit))
                .font(.caption).fontWeight(.bold).foregroundColor(.red)
                .frame(width: 60, alignment: .trailing)
            Text(Helpers.formatCurrency(summary.totalCredit))
                .font(.caption).fontWeight(.bold).foregroundColor(.green)
                .frame(width: 60, alignment: .trailing)
            Text(Helpers.formatCurrency(summary.closingBalance))
                .font(.caption).fontWeight(.bold)
                .foregroundColor(summary.closingBalance >= 0 ? .red : .green)
                .frame(width: 75, alignment: .trailing)
            Spacer().frame(width: 30)
        }
        .padding(12)
        .background(Color(.systemGray6))
    }

    private func downloadAndSharePdf() async {
        do {
            let data = try await APIService.shared.getLedgerPdfData(
                businessId: business.id,
                customerId: customer.id
            )
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("Ledger_\(customer.name.replacingOccurrences(of: " ", with: "_")).pdf")
            try data.write(to: url)
            
            await MainActor.run {
                let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let root = scene.windows.first?.rootViewController {
                    root.present(activityVC, animated: true)
                }
            }
        } catch {
            print("Failed to download PDF: \(error)")
        }
    }

    private func typeColor(_ type: String) -> Color {
        switch type {
        case _ where type.contains("INVOICE"), "LEDGER_GAVE": return .red
        case _ where type.contains("PAYMENT"), "LEDGER_RECEIVED": return .green
        case "OPENING_BALANCE": return .purple
        default: return .primary
        }
    }

    private func typeLabel(_ type: String) -> String {
        switch type {
        case _ where type.contains("INVOICE"), "LEDGER_GAVE": return "Dr"
        case _ where type.contains("PAYMENT"), "LEDGER_RECEIVED": return "Cr"
        case "OPENING_BALANCE": return "OB"
        default: return type
        }
    }
}

// MARK: - Ledger Entry Sheet
struct LedgerEntrySheet: View {
    let entryType: String
    let businessId: String
    let customerId: String
    let onSaved: () -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var paymentMode = "CASH"
    @State private var description = ""
    @State private var date = ""
    @State private var reference = ""
    @State private var showImagePicker = false
    @State private var selectedImage: UIImage?
    @State private var selectedImageData: Data?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showPaymentModePicker = false
    
    private let paymentModes = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Text("Amount (\(Constants.defaultCurrencyCode))")
                        Spacer()
                        TextField("0.00", text: $amount)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    HStack {
                        Text("Payment Mode")
                        Spacer()
                        Button(paymentMode.replacingOccurrences(of: "_", with: " ").capitalized) {
                            showPaymentModePicker = true
                        }
                        .foregroundColor(.blue)
                    }
                    .confirmationDialog("Select Payment Mode", isPresented: $showPaymentModePicker, titleVisibility: .visible) {
                        ForEach(paymentModes, id: \.self) { mode in
                            Button(mode.replacingOccurrences(of: "_", with: " ").capitalized) {
                                paymentMode = mode
                            }
                        }
                    }
                    
                    HStack {
                        Text("Date")
                        Spacer()
                        DatePicker("", selection: Binding(
                            get: { date.isEmpty ? Date() : (ISO8601DateFormatter().date(from: date) ?? Date()) },
                            set: { date = ISO8601DateFormatter().string(from: $0) }
                        ), displayedComponents: .date)
                        .labelsHidden()
                    }
                }
                
                Section("Optional Details") {
                    TextField("Description", text: $description)
                    TextField("Reference Number", text: $reference)
                }
                
                Section("Attachment (Optional)") {
                    Button {
                        showImagePicker = true
                    } label: {
                        if let image = selectedImage {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(height: 150)
                                .clipped()
                                .cornerRadius(8)
                        } else {
                            VStack(spacing: 8) {
                                Image(systemName: "camera.fill")
                                    .font(.title2)
                                    .foregroundColor(.secondary)
                                Text("Attach photo")
                                    .font(.subheadline)
                                Text("Receipt, payment proof, etc.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                        }
                    }
                }
                .sheet(isPresented: $showImagePicker) {
                    ImagePicker(image: $selectedImage, imageData: $selectedImageData)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error).foregroundColor(.red)
                    }
                }
            }
            .navigationTitle(entryType == "GAVE" ? "You Gave" : "You Got")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveEntry()
                    }
                    .disabled(amount.isEmpty || isSaving)
                }
            }
            .onAppear {
                if date.isEmpty {
                    date = ISO8601DateFormatter().string(from: Date())
                }
            }
        }
    }
    
    private func saveEntry() {
        guard let amountVal = Double(amount), amountVal > 0 else {
            errorMessage = "Enter a valid amount"
            return
        }
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                var imageUrl: String? = nil
                if let imageData = selectedImageData {
                    let uploadResult = try await APIService.shared.uploadLedgerImage(
                        businessId: businessId,
                        customerId: customerId,
                        imageData: imageData,
                        filename: "ledger_\(UUID().uuidString).jpg"
                    )
                    imageUrl = uploadResult.url
                }
                
                let request = CreateLedgerEntryRequest(
                    amount: amountVal,
                    type: entryType,
                    paymentMode: paymentMode,
                    description: description.isEmpty ? nil : description,
                    date: date.isEmpty ? nil : date,
                    reference: reference.isEmpty ? nil : reference,
                    imageUrl: imageUrl
                )
                
                _ = try await APIService.shared.createLedgerEntry(
                    businessId: businessId,
                    customerId: customerId,
                    entryRequest: request
                )
                isSaving = false
                onSaved()
            } catch {
                errorMessage = error.localizedDescription
                isSaving = false
            }
        }
    }
}

// MARK: - SMS Sheet
struct LedgerSmsSheet: View {
    let businessId: String
    let customerId: String
    let customerName: String
    let customerPhone: String
    let customerBalance: Double
    
    @Environment(\.dismiss) private var dismiss
    @State private var phone: String
    @State private var message = ""
    @State private var isSending = false
    @State private var resultMessage: String?
    @State private var sentSuccessfully = false
    
    init(businessId: String, customerId: String, customerName: String, customerPhone: String, customerBalance: Double) {
        self.businessId = businessId
        self.customerId = customerId
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.customerBalance = customerBalance
        _phone = State(initialValue: customerPhone)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Send Ledger SMS") {
                    TextField("Phone Number", text: $phone)
                        .keyboardType(.phonePad)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Custom Message (optional)")
                        TextEditor(text: $message)
                            .frame(minHeight: 80)
                        Text("Leave empty for default message with balance and ledger link")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let result = resultMessage {
                    Section {
                        Label(result, systemImage: sentSuccessfully ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundColor(sentSuccessfully ? .green : .red)
                    }
                }
            }
            .navigationTitle("Send SMS")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Send") {
                        sendSms()
                    }
                    .disabled(phone.isEmpty || isSending)
                }
            }
        }
    }
    
    private func sendSms() {
        isSending = true
        resultMessage = nil
        
        let request = SendLedgerSmsRequest(
            phone: phone.isEmpty ? nil : phone,
            message: message.isEmpty ? nil : message
        )
        
        Task {
            do {
                let response = try await APIService.shared.sendLedgerSms(
                    businessId: businessId,
                    customerId: customerId,
                    smsRequest: request
                )
                resultMessage = "SMS sent to \(response.phone)"
                sentSuccessfully = true
                isSending = false
            } catch {
                resultMessage = error.localizedDescription
                sentSuccessfully = false
                isSending = false
            }
        }
    }
}

// MARK: - WebView for PDF
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        var request = URLRequest(url: url)
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - Summary Card
struct LedgerSummaryCard: View {
    let title: String
    let value: Double
    let color: Color
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Text(Helpers.formatCurrency(value))
                .font(.callout).fontWeight(.semibold)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
    }
}

// MARK: - Record Payment Sheet
struct RecordPaymentSheet: View {
    let business: Business
    let customer: Customer
    @ObservedObject var viewModel: CustomerViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var amount = ""
    @State private var method = "CASH"
    @State private var notes = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Payment Details") {
                    TextField("Amount", text: $amount)
                        .keyboardType(.decimalPad)
                    Picker("Method", selection: $method) {
                        ForEach(Constants.paymentMethods, id: \.self) { m in
                            Text(m.replacingOccurrences(of: "_", with: " ").capitalized).tag(m)
                        }
                    }
                    TextField("Notes (optional)", text: $notes)
                }
            }
            .navigationTitle("Record Payment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(amount.isEmpty || isLoading)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { showError = false }
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func save() async {
        guard let amt = Double(amount), amt > 0 else { return }
        isLoading = true
        do {
            _ = try await viewModel.recordPayment(
                businessId: business.id,
                customerId: customer.id,
                RecordCustomerPaymentRequest(amount: amt, method: method, notes: notes.isEmpty ? nil : notes)
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
        }
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Binding var imageData: Data?
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        picker.allowsEditing = true
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let uiImage = info[.editedImage] as? UIImage {
                parent.image = uiImage
                parent.imageData = uiImage.jpegData(compressionQuality: 0.8)
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

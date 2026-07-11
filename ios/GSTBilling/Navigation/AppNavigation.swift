import SwiftUI

enum AppRoute: Hashable {
    case dashboard
    case customerList
    case addCustomer
    case editCustomer(Customer)
    case customerLedger(Customer)
    case productList
    case addProduct
    case editProduct(Product)
    case createInvoice
    case editInvoice(Invoice)
    case invoiceList
    case invoiceDetail(Invoice)
    case invoiceSettings
    case payments
    case reports
    case settings
}

struct AppNavigation: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var dashboardVM = DashboardViewModel()

    var body: some View {
        NavigationStack {
            if let business = authManager.currentBusiness {
                DashboardView(business: business)
                    .environmentObject(dashboardVM)
                    .navigationDestination(for: AppRoute.self) { route in
                        destination(for: route, business: business)
                    }
            } else {
                BusinessSetupView()
            }
        }
    }

    @ViewBuilder
    private func destination(for route: AppRoute, business: Business) -> some View {
        switch route {
        case .dashboard:
            DashboardView(business: business)
                .environmentObject(dashboardVM)
        case .customerList:
            CustomerListView(business: business)
        case .addCustomer:
            AddCustomerView(business: business, customer: nil)
        case .editCustomer(let customer):
            AddCustomerView(business: business, customer: customer)
        case .customerLedger(let customer):
            CustomerLedgerView(business: business, customer: customer)
        case .productList:
            ProductListView(business: business)
        case .addProduct:
            AddProductView(business: business, product: nil)
        case .editProduct(let product):
            AddProductView(business: business, product: product)
        case .createInvoice:
            CreateInvoiceView(business: business)
        case .editInvoice(let invoice):
            CreateInvoiceView(business: business, editInvoiceId: invoice.id)
        case .invoiceList:
            InvoiceListView(business: business)
        case .invoiceDetail(let invoice):
            InvoiceDetailView(business: business, invoice: invoice)
        case .invoiceSettings:
            InvoiceSettingsView(business: business)
        case .payments:
            PaymentView(business: business)
        case .reports:
            ReportsView(business: business)
        case .settings:
            SettingsView(business: business)
        }
    }
}

struct BusinessSetupView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var businessName = ""
    @State private var gstin = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "building.2")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            Text("Create Your Business")
                .font(.title2).bold()
            TextField("Business Name", text: $businessName)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)
            TextField("GSTIN (optional)", text: $gstin)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)
            if let err = errorMessage {
                Text(err).foregroundColor(.red).font(.caption)
            }
            Button(action: createBusiness) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text("Create Business")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
            .padding(.horizontal)
            .disabled(isLoading || businessName.isEmpty)
            Spacer()
        }
        .padding()
    }

    private func createBusiness() {
        Task {
            isLoading = true
            errorMessage = nil
            do {
                let dto = CreateBusinessRequest(name: businessName, gstin: gstin.isEmpty ? nil : gstin, phone: nil, email: nil, address: nil, city: nil, state: nil, pincode: nil)
                let business = try await APIService.shared.createBusiness(dto)
                authManager.selectBusiness(business)
                authManager.businesses.append(business)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

import SwiftUI

struct CustomerListView: View {
    let business: Business
    @StateObject private var viewModel = CustomerViewModel()

    var body: some View {
        List {
            if viewModel.errorMessage != nil && viewModel.customers.isEmpty {
                ContentUnavailableView("Error loading customers", systemImage: "exclamationmark.triangle", description: Text(viewModel.errorMessage ?? ""))
            } else if viewModel.filteredCustomers.isEmpty && !viewModel.isLoading {
                ContentUnavailableView("No customers found", systemImage: "person.slash", description: Text("Add your first customer to get started"))
            } else {
                ForEach(viewModel.filteredCustomers) { customer in
                    NavigationLink(value: AppRoute.customerLedger(customer)) {
                        CustomerRow(customer: customer)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { try? await viewModel.deleteCustomer(businessId: business.id, customerId: customer.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        NavigationLink(value: AppRoute.editCustomer(customer)) {
                            Text("Edit")
                        }.tint(.orange)
                    }
                }
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "Search by name, phone, GSTIN")
        .onSubmit(of: .search) {
            Task { await viewModel.searchCustomers(businessId: business.id) }
        }
        .task { await viewModel.loadCustomers(businessId: business.id) }
        .refreshable { await viewModel.loadCustomers(businessId: business.id) }
        .navigationTitle("Customers")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(value: AppRoute.addCustomer) {
                    Image(systemName: "plus")
                }
            }
        }
    }
}

struct CustomerRow: View {
    let customer: Customer

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay(Text(String(customer.name.prefix(1))).fontWeight(.semibold))

            VStack(alignment: .leading, spacing: 2) {
                Text(customer.name).font(.body)
                if let phone = customer.phone {
                    Text(phone).font(.caption).foregroundColor(.secondary)
                }
                if let gstin = customer.gstin {
                    Text(gstin).font(.caption2).foregroundColor(.secondary)
                }
            }

            Spacer()

            if let balance = customer.balance, balance != 0 {
                Text(Helpers.formatCurrency(balance))
                    .font(.callout)
                    .foregroundColor(balance > 0 ? .red : .green)
            }
        }
        .padding(.vertical, 4)
    }
}

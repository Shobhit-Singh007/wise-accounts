package com.gstbilling.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.gstbilling.app.ui.billing.InvoiceListScreen
import com.gstbilling.app.ui.customer.CustomerListScreen
import com.gstbilling.app.ui.inventory.InventoryDashboardScreen
import com.gstbilling.app.ui.inventory.ProductListScreen

enum class MainTab(val label: String) {
    INVOICES("Invoices"),
    CUSTOMERS("Customers"),
    PRODUCTS("Products"),
    INVENTORY("Inventory")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainTabsScreen(
    onNavigateToCreateInvoice: () -> Unit,
    onNavigateToAddCustomer: () -> Unit,
    onNavigateToAddProduct: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToStaff: () -> Unit,
    onNavigateToCustomerGroups: () -> Unit,
    onNavigateToBarcodeScanner: () -> Unit,
    onNavigateToStockTransfer: () -> Unit,
    onNavigateToBatchExpiry: () -> Unit,
    onNavigateToLowStock: () -> Unit,
    onNavigateToPurchaseOrders: () -> Unit,
    onNavigateToSuppliers: () -> Unit,
    onNavigateToWarehouses: () -> Unit,
    onNavigateToStockMovements: () -> Unit,
    onInvoiceClick: (String) -> Unit,
    onEditProduct: (String) -> Unit,
    onEditCustomer: (String) -> Unit,
    onCustomerClick: (String) -> Unit,
    onOpenLedger: (String) -> Unit,
) {
    var selectedTab by remember { mutableStateOf(MainTab.INVOICES) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == MainTab.INVOICES,
                    onClick = { selectedTab = MainTab.INVOICES },
                    icon = { Icon(Icons.Default.Receipt, contentDescription = null) },
                    label = { Text("Invoices") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.CUSTOMERS,
                    onClick = { selectedTab = MainTab.CUSTOMERS },
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Customers") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.PRODUCTS,
                    onClick = { selectedTab = MainTab.PRODUCTS },
                    icon = { Icon(Icons.Default.Inventory2, contentDescription = null) },
                    label = { Text("Products") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.INVENTORY,
                    onClick = { selectedTab = MainTab.INVENTORY },
                    icon = { Icon(Icons.Default.Storefront, contentDescription = null) },
                    label = { Text("Inventory") }
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (selectedTab) {
                MainTab.INVOICES -> InvoiceListScreen(
                    onBack = {},
                    onInvoiceClick = onInvoiceClick,
                    onBulkInvoices = onNavigateToCreateInvoice
                )
                MainTab.CUSTOMERS -> CustomerListScreen(
                    onAddCustomer = onNavigateToAddCustomer,
                    onEditCustomer = onEditCustomer,
                    onCustomerClick = onCustomerClick,
                    onOpenLedger = onOpenLedger,
                    onBack = {},
                    onCustomerGroups = onNavigateToCustomerGroups
                )
                MainTab.PRODUCTS -> ProductListScreen(
                    onAddProduct = onNavigateToAddProduct,
                    onEditProduct = onEditProduct,
                    onBack = {},
                    onBarcodeScanner = onNavigateToBarcodeScanner,
                    onStockTransfer = onNavigateToStockTransfer
                )
                MainTab.INVENTORY -> InventoryDashboardScreen(
                    onBack = {},
                    onNavigateToStockMovements = onNavigateToStockMovements,
                    onNavigateToLowStock = onNavigateToLowStock
                )
            }
        }
    }
}

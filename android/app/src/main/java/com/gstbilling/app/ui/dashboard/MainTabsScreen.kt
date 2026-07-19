package com.gstbilling.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.gstbilling.app.ui.billing.InvoiceListScreen
import com.gstbilling.app.ui.customer.CustomerListScreen
import com.gstbilling.app.ui.inventory.InventoryDashboardScreen
import com.gstbilling.app.ui.inventory.ProductListScreen

enum class MainTab(val label: String, val route: String) {
    DASHBOARD("Dashboard", "tab_dashboard"),
    INVOICES("Invoices", "tab_invoices"),
    CUSTOMERS("Customers", "tab_customers"),
    PRODUCTS("Products", "tab_products"),
    INVENTORY("Inventory", "tab_inventory")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainTabsHost(
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
    onNavigateToBusinessList: () -> Unit = {},
    onNavigateToNotifications: () -> Unit,
    onInvoiceClick: (String) -> Unit,
    onEditProduct: (String) -> Unit,
    onEditCustomer: (String) -> Unit,
    onCustomerClick: (String) -> Unit,
    onOpenLedger: (String) -> Unit,
) {
    val tabNavController = rememberNavController()
    val navBackStackEntry by tabNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val selectedTab = when (currentRoute) {
        MainTab.INVOICES.route -> MainTab.INVOICES
        MainTab.CUSTOMERS.route -> MainTab.CUSTOMERS
        MainTab.PRODUCTS.route -> MainTab.PRODUCTS
        MainTab.INVENTORY.route -> MainTab.INVENTORY
        else -> MainTab.DASHBOARD
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == MainTab.DASHBOARD,
                    onClick = { tabNavController.navigate(MainTab.DASHBOARD.route) { popUpTo(MainTab.DASHBOARD.route) { inclusive = true } } },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Dashboard") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.INVOICES,
                    onClick = { tabNavController.navigate(MainTab.INVOICES.route) { popUpTo(MainTab.DASHBOARD.route) } },
                    icon = { Icon(Icons.Default.Receipt, contentDescription = null) },
                    label = { Text("Invoices") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.CUSTOMERS,
                    onClick = { tabNavController.navigate(MainTab.CUSTOMERS.route) { popUpTo(MainTab.DASHBOARD.route) } },
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Customers") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.PRODUCTS,
                    onClick = { tabNavController.navigate(MainTab.PRODUCTS.route) { popUpTo(MainTab.DASHBOARD.route) } },
                    icon = { Icon(Icons.Default.Inventory2, contentDescription = null) },
                    label = { Text("Products") }
                )
                NavigationBarItem(
                    selected = selectedTab == MainTab.INVENTORY,
                    onClick = { tabNavController.navigate(MainTab.INVENTORY.route) { popUpTo(MainTab.DASHBOARD.route) } },
                    icon = { Icon(Icons.Default.Storefront, contentDescription = null) },
                    label = { Text("Inventory") }
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            NavHost(
                navController = tabNavController,
                startDestination = MainTab.DASHBOARD.route
            ) {
                composable(MainTab.DASHBOARD.route) {
                    DashboardScreen(
                        onNavigateToCustomers = { tabNavController.navigate(MainTab.CUSTOMERS.route) { popUpTo(MainTab.DASHBOARD.route) } },
                        onNavigateToProducts = { tabNavController.navigate(MainTab.PRODUCTS.route) { popUpTo(MainTab.DASHBOARD.route) } },
                        onNavigateToCreateInvoice = onNavigateToCreateInvoice,
                        onNavigateToInvoices = { tabNavController.navigate(MainTab.INVOICES.route) { popUpTo(MainTab.DASHBOARD.route) } },
                        onNavigateToReports = onNavigateToReports,
                        onNavigateToSettings = onNavigateToSettings,
                        onNavigateToStaff = onNavigateToStaff,
                        onNavigateToAddCustomer = onNavigateToAddCustomer,
                        onNavigateToAddProduct = onNavigateToAddProduct,
                        onNavigateToNotifications = onNavigateToNotifications,
                        onNavigateToBarcodeScanner = onNavigateToBarcodeScanner,
                        onNavigateToStockTransfer = onNavigateToStockTransfer,
                        onNavigateToBatchExpiry = onNavigateToBatchExpiry,
                        onNavigateToCustomerGroups = onNavigateToCustomerGroups,
                        onNavigateToInventoryDashboard = { tabNavController.navigate(MainTab.INVENTORY.route) { popUpTo(MainTab.DASHBOARD.route) } },
                        onNavigateToBusinessList = onNavigateToBusinessList,
                        onInvoiceClick = onInvoiceClick
                    )
                }
                composable(MainTab.INVOICES.route) {
                    InvoiceListScreen(
                        onBack = { tabNavController.navigate(MainTab.DASHBOARD.route) { popUpTo(MainTab.DASHBOARD.route) { inclusive = true } } },
                        onInvoiceClick = onInvoiceClick,
                        onBulkInvoices = onNavigateToCreateInvoice
                    )
                }
                composable(MainTab.CUSTOMERS.route) {
                    CustomerListScreen(
                        onAddCustomer = onNavigateToAddCustomer,
                        onEditCustomer = onEditCustomer,
                        onCustomerClick = onCustomerClick,
                        onOpenLedger = onOpenLedger,
                        onBack = { tabNavController.navigate(MainTab.DASHBOARD.route) { popUpTo(MainTab.DASHBOARD.route) { inclusive = true } } },
                        onCustomerGroups = onNavigateToCustomerGroups
                    )
                }
                composable(MainTab.PRODUCTS.route) {
                    ProductListScreen(
                        onAddProduct = onNavigateToAddProduct,
                        onEditProduct = onEditProduct,
                        onBack = { tabNavController.navigate(MainTab.DASHBOARD.route) { popUpTo(MainTab.DASHBOARD.route) { inclusive = true } } },
                        onBarcodeScanner = onNavigateToBarcodeScanner,
                        onStockTransfer = onNavigateToStockTransfer
                    )
                }
                composable(MainTab.INVENTORY.route) {
                    InventoryDashboardScreen(
                        onBack = { tabNavController.navigate(MainTab.DASHBOARD.route) { popUpTo(MainTab.DASHBOARD.route) { inclusive = true } } },
                        onNavigateToStockMovements = onNavigateToStockMovements,
                        onNavigateToLowStock = onNavigateToLowStock
                    )
                }
            }
        }
    }
}

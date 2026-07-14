package com.gstbilling.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.gstbilling.app.ui.auth.LoginScreen
import com.gstbilling.app.ui.auth.RegisterScreen
import com.gstbilling.app.ui.inventory.BatchExpiryScreen
import com.gstbilling.app.ui.inventory.BarcodeScannerScreen
import com.gstbilling.app.ui.inventory.InventoryDashboardScreen
import com.gstbilling.app.ui.inventory.StockMovementsScreen
import com.gstbilling.app.ui.billing.BulkInvoiceScreen
import com.gstbilling.app.ui.billing.CreateInvoiceScreen
import com.gstbilling.app.ui.billing.InvoiceDetailScreen
import com.gstbilling.app.ui.billing.InvoiceListScreen
import com.gstbilling.app.ui.billing.InvoicePreviewScreen
import com.gstbilling.app.ui.billing.InvoiceShareScreen
import com.gstbilling.app.ui.customer.AddCustomerScreen
import com.gstbilling.app.ui.customer.CustomerLedgerScreen
import com.gstbilling.app.ui.customer.CustomerGroupsScreen
import com.gstbilling.app.ui.customer.CustomerListScreen
import com.gstbilling.app.ui.dashboard.DashboardScreen
import com.gstbilling.app.ui.inventory.AddProductScreen
import com.gstbilling.app.ui.inventory.LowStockAlertsScreen
import com.gstbilling.app.ui.inventory.ProductDetailScreen
import com.gstbilling.app.ui.inventory.ProductListScreen
import com.gstbilling.app.ui.inventory.PurchaseOrderScreen
import com.gstbilling.app.ui.inventory.StockAdjustScreen
import com.gstbilling.app.ui.inventory.StockTransferScreen
import com.gstbilling.app.ui.inventory.SupplierManagementScreen
import com.gstbilling.app.ui.inventory.WarehouseManagementScreen
import com.gstbilling.app.ui.notifications.NotificationsScreen
import com.gstbilling.app.ui.payments.PaymentCollectionScreen
import com.gstbilling.app.ui.payments.PaymentHistoryScreen
import com.gstbilling.app.ui.payments.PaymentRemindersScreen
import com.gstbilling.app.ui.payments.RecordPaymentScreen
import com.gstbilling.app.ui.payments.RazorpayCheckoutScreen
import com.gstbilling.app.ui.payments.UpiPaymentScreen
import com.gstbilling.app.ui.reports.CustomerReportScreen
import com.gstbilling.app.ui.reports.ProductReportScreen
import com.gstbilling.app.ui.reports.ProfitLossScreen
import com.gstbilling.app.ui.reports.ReportsScreen
import com.gstbilling.app.ui.settings.SettingsScreen
import com.gstbilling.app.ui.staff.EditPermissionsScreen
import com.gstbilling.app.ui.staff.StaffScreen
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    sessionManager: SessionManager
) : ViewModel() {
    val isLoggedIn: StateFlow<Boolean?> = sessionManager.isLoggedIn
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
}

@Composable
fun NavGraph(
    navController: NavHostController = rememberNavController(),
    viewModel: MainViewModel = hiltViewModel()
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()

    if (isLoggedIn == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn == true) Routes.DASHBOARD else Routes.LOGIN
    ) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Routes.REGISTER)
                }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onBackToLogin = {
                    navController.popBackStack()
                }
            )
        }

        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onNavigateToCustomers = { navController.navigate(Routes.CUSTOMERS) },
                onNavigateToProducts = { navController.navigate(Routes.PRODUCTS) },
                onNavigateToCreateInvoice = { navController.navigate(Routes.CREATE_INVOICE) },
                onNavigateToInvoices = { navController.navigate(Routes.INVOICES) },
                onNavigateToReports = { navController.navigate(Routes.REPORTS) },
                onNavigateToSettings = { navController.navigate(Routes.SETTINGS) },
                onNavigateToStaff = { navController.navigate(Routes.STAFF) },
                onNavigateToAddCustomer = { navController.navigate(Routes.ADD_CUSTOMER) },
                onNavigateToAddProduct = { navController.navigate(Routes.ADD_PRODUCT) },
                onNavigateToNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onNavigateToBarcodeScanner = { navController.navigate(Routes.BARCODE_SCANNER) },
                onNavigateToStockTransfer = { navController.navigate(Routes.STOCK_TRANSFER) },
                onNavigateToBatchExpiry = { navController.navigate(Routes.BATCH_EXPIRY) },
                onNavigateToCustomerGroups = { navController.navigate(Routes.CUSTOMER_GROUPS) },
                onNavigateToInventoryDashboard = { navController.navigate(Routes.INVENTORY_DASHBOARD) },
                onInvoiceClick = { invoiceId -> navController.navigate(Routes.invoiceDetail(invoiceId)) }
            )
        }

        composable(Routes.CUSTOMERS) {
            CustomerListScreen(
                onAddCustomer = { navController.navigate(Routes.ADD_CUSTOMER) },
                onEditCustomer = { id -> navController.navigate(Routes.editCustomer(id)) },
                onCustomerClick = { id -> navController.navigate(Routes.createInvoice(id)) },
                onOpenLedger = { id -> navController.navigate(Routes.customerLedger(id)) },
                onBack = { navController.popBackStack() },
                onCustomerGroups = { navController.navigate(Routes.CUSTOMER_GROUPS) }
            )
        }

        composable(Routes.ADD_CUSTOMER) {
            AddCustomerScreen(
                customerId = null,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.EDIT_CUSTOMER,
            arguments = listOf(navArgument("customerId") { type = NavType.StringType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
            AddCustomerScreen(
                customerId = customerId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.CUSTOMER_LEDGER,
            arguments = listOf(navArgument("customerId") { type = NavType.StringType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
            CustomerLedgerScreen(
                customerId = customerId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PRODUCTS) {
            ProductListScreen(
                onAddProduct = { navController.navigate(Routes.ADD_PRODUCT) },
                onEditProduct = { id -> navController.navigate(Routes.editProduct(id)) },
                onBack = { navController.popBackStack() },
                onBarcodeScanner = { navController.navigate(Routes.BARCODE_SCANNER) },
                onStockTransfer = { navController.navigate(Routes.STOCK_TRANSFER) }
            )
        }

        composable(Routes.ADD_PRODUCT) {
            AddProductScreen(
                productId = null,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.EDIT_PRODUCT,
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: ""
            AddProductScreen(
                productId = productId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.PRODUCT_DETAIL,
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: ""
            ProductDetailScreen(
                productId = productId,
                onBack = { navController.popBackStack() },
                onEdit = { navController.navigate(Routes.editProduct(productId)) },
                onAdjustStock = { navController.navigate(Routes.stockAdjust(productId)) },
                onViewStockBatches = { /* TODO */ }
            )
        }

        composable(
            route = Routes.STOCK_ADJUST,
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: ""
            StockAdjustScreen(
                productId = productId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.WAREHOUSES) {
            WarehouseManagementScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.STOCK_TRANSFER) {
            StockTransferScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.LOW_STOCK_ALERTS) {
            LowStockAlertsScreen(
                onBack = { navController.popBackStack() },
                onProductClick = { productId -> navController.navigate(Routes.productDetail(productId)) }
            )
        }

        composable(Routes.PURCHASE_ORDERS) {
            PurchaseOrderScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.SUPPLIERS) {
            SupplierManagementScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.CREATE_INVOICE) {
            CreateInvoiceScreen(
                customerId = null,
                onBack = { navController.popBackStack() },
                onInvoiceCreated = { navController.navigate(Routes.INVOICES) { popUpTo(Routes.DASHBOARD) } }
            )
        }

        composable(
            route = Routes.CREATE_INVOICE_WITH_CUSTOMER,
            arguments = listOf(navArgument("customerId") { type = NavType.StringType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
            CreateInvoiceScreen(
                customerId = customerId,
                onBack = { navController.popBackStack() },
                onInvoiceCreated = { navController.navigate(Routes.INVOICES) { popUpTo(Routes.DASHBOARD) } }
            )
        }

        composable(Routes.INVOICES) {
            InvoiceListScreen(
                onBack = { navController.popBackStack() },
                onInvoiceClick = { invoiceId -> navController.navigate(Routes.invoiceDetail(invoiceId)) },
                onBulkInvoices = { navController.navigate(Routes.BULK_INVOICES) }
            )
        }

        composable(
            route = Routes.INVOICE_DETAIL,
            arguments = listOf(navArgument("invoiceId") { type = NavType.StringType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
            InvoiceDetailScreen(
                invoiceId = invoiceId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.INVOICE_SHARE,
            arguments = listOf(navArgument("invoiceId") { type = NavType.StringType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
            InvoiceShareScreen(
                invoiceId = invoiceId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.INVOICE_PREVIEW,
            arguments = listOf(navArgument("invoiceId") { type = NavType.StringType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
            InvoicePreviewScreen(
                invoiceId = invoiceId,
                onBack = { navController.popBackStack() },
                onShare = { /* TODO: Share invoice */ }
            )
        }

        composable(Routes.BULK_INVOICES) {
            BulkInvoiceScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.STAFF) {
            StaffScreen(
                onBack = { navController.popBackStack() },
                onEditPermissions = { userId, currentName ->
                    navController.navigate(Routes.editPermissions(userId, currentName))
                }
            )
        }

        composable(
            route = Routes.EDIT_PERMISSIONS,
            arguments = listOf(
                navArgument("userId") { type = NavType.StringType },
                navArgument("currentName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            val currentName = backStackEntry.arguments?.getString("currentName") ?: ""
            EditPermissionsScreen(
                userId = userId,
                currentName = currentName,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.REPORTS) {
            ReportsScreen(
                onBack = { navController.popBackStack() },
                onCustomerReport = { navController.navigate(Routes.CUSTOMER_REPORT) },
                onProductReport = { navController.navigate(Routes.PRODUCT_REPORT) },
                onProfitLoss = { navController.navigate(Routes.PROFIT_LOSS) }
            )
        }

        composable(Routes.CUSTOMER_REPORT) {
            CustomerReportScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PRODUCT_REPORT) {
            ProductReportScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PROFIT_LOSS) {
            ProfitLossScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onNavigateToStaff = { navController.navigate(Routes.STAFF) },
                onNavigateToWarehouses = { navController.navigate(Routes.WAREHOUSES) },
                onNavigateToSuppliers = { navController.navigate(Routes.SUPPLIERS) },
                onNavigateToLowStock = { navController.navigate(Routes.LOW_STOCK_ALERTS) },
                onNavigateToPurchaseOrders = { navController.navigate(Routes.PURCHASE_ORDERS) },
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.PAYMENTS) {
            PaymentCollectionScreen(
                onBack = { navController.popBackStack() },
                onRecordPayment = { navController.navigate(Routes.RECORD_PAYMENT) },
                onPaymentClick = { paymentId -> /* payment detail */ },
                onPaymentHistory = { navController.navigate(Routes.PAYMENT_HISTORY) },
                onPaymentReminders = { navController.navigate(Routes.PAYMENT_REMINDERS) }
            )
        }

        composable(Routes.RECORD_PAYMENT) {
            RecordPaymentScreen(
                invoiceId = null,
                customerId = null,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.RECORD_PAYMENT_FOR_INVOICE,
            arguments = listOf(navArgument("invoiceId") { type = NavType.StringType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
            RecordPaymentScreen(
                invoiceId = invoiceId,
                customerId = null,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.UPI_PAYMENT) {
            UpiPaymentScreen(
                onBack = { navController.popBackStack() },
                initialAmount = null,
                initialDescription = null
            )
        }

        composable(Routes.PAYMENT_HISTORY) {
            PaymentHistoryScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.CUSTOMER_GROUPS) {
            CustomerGroupsScreen(
                onBack = { navController.popBackStack() },
                onGroupClick = { groupId ->
                    // Group detail coming soon
                }
            )
        }

        composable(Routes.PAYMENT_REMINDERS) {
            PaymentRemindersScreen(
                onBack = { navController.popBackStack() },
                onSendReminder = { reminder ->
                    // TODO: Send reminder via API
                }
            )
        }

        composable(Routes.BATCH_EXPIRY) {
            BatchExpiryScreen(onBack = { navController.popBackStack() })
        }
        composable(
            Routes.RAZORPAY_CHECKOUT,
            arguments = listOf(
                navArgument("amount") { type = NavType.StringType },
                navArgument("invoiceNo") { type = NavType.StringType },
                navArgument("customerName") { type = NavType.StringType },
                navArgument("razorpayKeyId") { type = NavType.StringType },
            )
        ) { backStackEntry ->
            val amount = backStackEntry.arguments?.getString("amount")?.toDoubleOrNull() ?: 0.0
            val invoiceNo = backStackEntry.arguments?.getString("invoiceNo")?.let { if (it == "none") null else it }
            val customerName = java.net.URLDecoder.decode(backStackEntry.arguments?.getString("customerName") ?: "", "UTF-8")
            val razorpayKeyId = backStackEntry.arguments?.getString("razorpayKeyId") ?: ""

            RazorpayCheckoutScreen(
                amount = amount,
                invoiceNo = invoiceNo,
                customerName = customerName,
                razorpayKeyId = razorpayKeyId,
                onBack = { navController.popBackStack() },
                onPaymentSuccess = { paymentId ->
                    navController.popBackStack()
                },
                onPaymentError = { error ->
                    navController.popBackStack()
                }
            )
        }

        composable(Routes.BARCODE_SCANNER) {
            BarcodeScannerScreen(
                onBack = { navController.popBackStack() },
                onBarcodeScanned = { barcode ->
                    navController.navigate(Routes.PRODUCTS) {
                        popUpTo(Routes.BARCODE_SCANNER) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.INVENTORY_DASHBOARD) {
            InventoryDashboardScreen(
                onBack = { navController.popBackStack() },
                onNavigateToStockMovements = { navController.navigate(Routes.STOCK_MOVEMENTS) },
                onNavigateToLowStock = { navController.navigate(Routes.LOW_STOCK_ALERTS) }
            )
        }

        composable(Routes.STOCK_MOVEMENTS) {
            StockMovementsScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}

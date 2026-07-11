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
import com.gstbilling.app.ui.billing.CreateInvoiceScreen
import com.gstbilling.app.ui.billing.InvoiceDetailScreen
import com.gstbilling.app.ui.billing.InvoiceListScreen
import com.gstbilling.app.ui.customer.AddCustomerScreen
import com.gstbilling.app.ui.customer.CustomerLedgerScreen
import com.gstbilling.app.ui.customer.CustomerListScreen
import com.gstbilling.app.ui.dashboard.DashboardScreen
import com.gstbilling.app.ui.inventory.AddProductScreen
import com.gstbilling.app.ui.inventory.ProductListScreen
import com.gstbilling.app.ui.reports.ReportsScreen
import com.gstbilling.app.ui.settings.SettingsScreen
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
                onNavigateToSettings = { navController.navigate(Routes.SETTINGS) }
            )
        }

        composable(Routes.CUSTOMERS) {
            CustomerListScreen(
                onAddCustomer = { navController.navigate(Routes.ADD_CUSTOMER) },
                onEditCustomer = { id -> navController.navigate(Routes.editCustomer(id)) },
                onCustomerClick = { id -> navController.navigate(Routes.createInvoice(id)) },
                onOpenLedger = { id -> navController.navigate(Routes.customerLedger(id.toString())) },
                onBack = { navController.popBackStack() }
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
            arguments = listOf(navArgument("customerId") { type = NavType.LongType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getLong("customerId")
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
                onBack = { navController.popBackStack() }
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
            arguments = listOf(navArgument("productId") { type = NavType.LongType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getLong("productId")
            AddProductScreen(
                productId = productId,
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
            arguments = listOf(navArgument("customerId") { type = NavType.LongType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getLong("customerId")
            CreateInvoiceScreen(
                customerId = customerId,
                onBack = { navController.popBackStack() },
                onInvoiceCreated = { navController.navigate(Routes.INVOICES) { popUpTo(Routes.DASHBOARD) } }
            )
        }

        composable(Routes.INVOICES) {
            InvoiceListScreen(
                onBack = { navController.popBackStack() },
                onInvoiceClick = { invoiceId -> navController.navigate(Routes.invoiceDetail(invoiceId)) }
            )
        }

        composable(
            route = Routes.INVOICE_DETAIL,
            arguments = listOf(navArgument("invoiceId") { type = NavType.LongType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getLong("invoiceId") ?: 0L
            InvoiceDetailScreen(
                invoiceId = invoiceId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.REPORTS) {
            ReportsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

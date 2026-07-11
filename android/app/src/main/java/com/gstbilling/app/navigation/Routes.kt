package com.gstbilling.app.navigation

object Routes {
    const val LOGIN = "auth/login"
    const val DASHBOARD = "dashboard"
    const val CUSTOMERS = "customers"
    const val ADD_CUSTOMER = "customers/add"
    const val EDIT_CUSTOMER = "customers/{customerId}/edit"
    const val CUSTOMER_LEDGER = "customers/{customerId}/ledger"
    const val PRODUCTS = "products"
    const val ADD_PRODUCT = "products/add"
    const val EDIT_PRODUCT = "products/{productId}/edit"
    const val CREATE_INVOICE = "billing/create"
    const val CREATE_INVOICE_WITH_CUSTOMER = "billing/create/{customerId}"
    const val INVOICES = "invoices"
    const val INVOICE_DETAIL = "invoices/{invoiceId}"
    const val REPORTS = "reports"
    const val SETTINGS = "settings"

    fun editCustomer(customerId: Long) = "customers/$customerId/edit"
    fun customerLedger(customerId: String) = "customers/$customerId/ledger"
    fun editProduct(productId: Long) = "products/$productId/edit"
    fun createInvoice(customerId: Long? = null) =
        if (customerId != null) "billing/create/$customerId" else "billing/create"
    fun invoiceDetail(invoiceId: Long) = "invoices/$invoiceId"
}

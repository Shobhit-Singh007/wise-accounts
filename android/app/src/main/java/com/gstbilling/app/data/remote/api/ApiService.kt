package com.gstbilling.app.data.remote.api

import com.google.gson.annotations.SerializedName
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ── Auth ──
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<TokenResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<TokenResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<TokenResponse>

    // ── Businesses ──
    @GET("businesses")
    suspend fun getBusinesses(): Response<ApiResponse<List<Business>>>

    @GET("businesses/{id}")
    suspend fun getBusiness(@Path("id") id: Long): Response<ApiResponse<Business>>

    @PUT("businesses/{id}")
    suspend fun updateBusiness(@Path("id") id: Long, @Body business: Business): Response<ApiResponse<Business>>

    @GET("businesses/{id}/dashboard")
    suspend fun getDashboard(@Path("id") id: Long): Response<ApiResponse<DashboardData>>

    @GET("businesses/{id}/warehouses")
    suspend fun getWarehouses(@Path("id") id: Long): Response<ApiResponse<List<Warehouse>>>

    // ── Customers ──
    @GET("customers")
    suspend fun getCustomers(
        @Query("business_id") businessId: Long,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null
    ): Response<ApiResponse<List<Customer>>>

    @GET("customers/{id}")
    suspend fun getCustomer(@Path("id") id: Long): Response<ApiResponse<Customer>>

    @POST("customers")
    suspend fun createCustomer(@Body customer: Customer): Response<ApiResponse<Customer>>

    @PUT("customers/{id}")
    suspend fun updateCustomer(@Path("id") id: Long, @Body customer: Customer): Response<ApiResponse<Customer>>

    @DELETE("customers/{id}")
    suspend fun deleteCustomer(@Path("id") id: Long): Response<ApiResponse<Unit>>

    @GET("customers/{id}/ledger")
    suspend fun getCustomerLedger(@Path("id") id: Long): Response<ApiResponse<LedgerResponse>>

    @POST("customers/{id}/payments")
    suspend fun recordCustomerPayment(
        @Path("id") id: Long,
        @Body payment: PaymentRequest
    ): Response<ApiResponse<Payment>>

    // ── Products ──
    @GET("products")
    suspend fun getProducts(
        @Query("business_id") businessId: Long,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null
    ): Response<ApiResponse<List<Product>>>

    @GET("products/{id}")
    suspend fun getProduct(@Path("id") id: Long): Response<ApiResponse<Product>>

    @POST("products")
    suspend fun createProduct(@Body product: Product): Response<ApiResponse<Product>>

    @PUT("products/{id}")
    suspend fun updateProduct(@Path("id") id: Long, @Body product: Product): Response<ApiResponse<Product>>

    @DELETE("products/{id}")
    suspend fun deleteProduct(@Path("id") id: Long): Response<ApiResponse<Unit>>

    @POST("products/{id}/stock/adjust")
    suspend fun adjustStock(
        @Path("id") id: Long,
        @Body request: StockAdjustRequest
    ): Response<ApiResponse<Product>>

    @POST("products/stock/transfer")
    suspend fun transferStock(@Body request: StockTransferRequest): Response<ApiResponse<Unit>>

    // ── Categories ──
    @GET("categories")
    suspend fun getCategories(@Query("business_id") businessId: Long): Response<ApiResponse<List<Category>>>

    @POST("categories")
    suspend fun createCategory(@Body category: Category): Response<ApiResponse<Category>>

    @DELETE("categories/{id}")
    suspend fun deleteCategory(@Path("id") id: Long): Response<ApiResponse<Unit>>

    // ── Suppliers ──
    @GET("suppliers")
    suspend fun getSuppliers(@Query("business_id") businessId: Long): Response<ApiResponse<List<Supplier>>>

    @POST("suppliers")
    suspend fun createSupplier(@Body supplier: Supplier): Response<ApiResponse<Supplier>>

    @PUT("suppliers/{id}")
    suspend fun updateSupplier(@Path("id") id: Long, @Body supplier: Supplier): Response<ApiResponse<Supplier>>

    // ── Purchase Orders ──
    @GET("purchase-orders")
    suspend fun getPurchaseOrders(
        @Query("business_id") businessId: Long
    ): Response<ApiResponse<List<PurchaseOrder>>>

    @POST("purchase-orders")
    suspend fun createPurchaseOrder(@Body order: PurchaseOrder): Response<ApiResponse<PurchaseOrder>>

    @PUT("purchase-orders/{id}")
    suspend fun updatePurchaseOrder(
        @Path("id") id: Long,
        @Body order: PurchaseOrder
    ): Response<ApiResponse<PurchaseOrder>>

    // ── Invoices ──
    @GET("invoices")
    suspend fun getInvoices(
        @Query("business_id") businessId: Long,
        @Query("status") status: String? = null,
        @Query("direction") direction: String? = null,
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null
    ): Response<ApiResponse<List<Invoice>>>

    @GET("invoices/{id}")
    suspend fun getInvoice(@Path("id") id: Long): Response<ApiResponse<Invoice>>

    @POST("invoices")
    suspend fun createInvoice(@Body request: CreateInvoiceRequest): Response<ApiResponse<Invoice>>

    @PUT("invoices/{id}")
    suspend fun updateInvoice(
        @Path("id") id: Long,
        @Body request: CreateInvoiceRequest
    ): Response<ApiResponse<Invoice>>

    @POST("invoices/{id}/cancel")
    suspend fun cancelInvoice(@Path("id") id: Long): Response<ApiResponse<Invoice>>

    @POST("invoices/{id}/credit-note")
    suspend fun createCreditNote(
        @Path("id") id: Long,
        @Body request: CreditNoteRequest
    ): Response<ApiResponse<Invoice>>

    // ── Invoice Settings ──
    @GET("businesses/{businessId}/invoices/settings")
    suspend fun getInvoiceSettings(
        @Path("businessId") businessId: String
    ): Response<ApiResponse<InvoiceSettings>>

    @PUT("businesses/{businessId}/invoices/settings")
    suspend fun updateInvoiceSettings(
        @Path("businessId") businessId: String,
        @Body settings: InvoiceSettingsRequest
    ): Response<ApiResponse<Map<String, Any>>>

    // ── E-Way Bill ──
    @POST("businesses/{businessId}/invoices/{invoiceId}/eway-bill")
    suspend fun generateEwayBill(
        @Path("businessId") businessId: String,
        @Path("invoiceId") invoiceId: String,
        @Body request: EwayBillRequest
    ): Response<ApiResponse<EwayBillResponse>>

    // ── e-Invoice ──
    @POST("businesses/{businessId}/invoices/{invoiceId}/e-invoice")
    suspend fun generateEinvoice(
        @Path("businessId") businessId: String,
        @Path("invoiceId") invoiceId: String,
        @Body request: EinvoiceRequest
    ): Response<ApiResponse<EinvoiceResponse>>

    // ── Generate Both (One-Click) ──
    @POST("businesses/{businessId}/invoices/{invoiceId}/generate-both")
    suspend fun generateBoth(
        @Path("businessId") businessId: String,
        @Path("invoiceId") invoiceId: String,
        @Body request: GenerateBothRequest
    ): Response<ApiResponse<GenerateBothResponse>>

    // ── Invoice Templates ──
    @GET("businesses/{businessId}/invoices/templates")
    suspend fun getInvoiceTemplates(
        @Path("businessId") businessId: String
    ): Response<ApiResponse<List<InvoiceTemplate>>>

    // ── Payments ──
    @GET("payments")
    suspend fun getPayments(
        @Query("invoice_id") invoiceId: Long? = null
    ): Response<ApiResponse<List<Payment>>>

    @POST("payments")
    suspend fun recordPayment(@Body request: RecordPaymentRequest): Response<ApiResponse<Payment>>

    @POST("payments/razorpay/order")
    suspend fun createRazorpayOrder(
        @Body request: RazorpayOrderRequest
    ): Response<ApiResponse<RazorpayOrderResponse>>

    @POST("payments/upi/link")
    suspend fun generateUpiLink(
        @Body request: UpiLinkRequest
    ): Response<ApiResponse<UpiLinkResponse>>

    // ── Staff Management ──
    @GET("businesses/{businessId}/staff")
    suspend fun getStaff(
        @Path("businessId") businessId: String
    ): Response<ApiResponse<List<StaffMember>>>

    @POST("businesses/{businessId}/staff/invite")
    suspend fun inviteStaff(
        @Path("businessId") businessId: String,
        @Body request: InviteStaffRequest
    ): Response<ApiResponse<Map<String, Any>>>

    @PUT("businesses/{businessId}/staff/{userId}/permissions")
    suspend fun updateStaffPermissions(
        @Path("businessId") businessId: String,
        @Path("userId") userId: String,
        @Body request: UpdatePermissionsRequest
    ): Response<ApiResponse<Map<String, Any>>>

    @DELETE("businesses/{businessId}/staff/{userId}")
    suspend fun removeStaff(
        @Path("businessId") businessId: String,
        @Path("userId") userId: String
    ): Response<ApiResponse<Map<String, Any>>>

    @GET("businesses/{businessId}/staff/invites")
    suspend fun getStaffInvites(
        @Path("businessId") businessId: String
    ): Response<ApiResponse<List<StaffInvite>>>

    @DELETE("businesses/{businessId}/staff/invites/{inviteId}")
    suspend fun cancelStaffInvite(
        @Path("businessId") businessId: String,
        @Path("inviteId") inviteId: String
    ): Response<ApiResponse<Map<String, Any>>>

    // ── Reports ──
    @GET("reports/sales")
    suspend fun getSalesReport(
        @Query("business_id") businessId: Long,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<ApiResponse<SalesReport>>

    @GET("reports/gstr1")
    suspend fun getGstr1Report(
        @Query("business_id") businessId: Long,
        @Query("period") period: String? = null,
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null
    ): Response<ApiResponse<Gstr1Report>>

    @GET("reports/gstr3b")
    suspend fun getGstr3bReport(
        @Query("business_id") businessId: Long,
        @Query("period") period: String? = null,
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null
    ): Response<ApiResponse<Gstr3bReport>>

    @GET("reports/customers")
    suspend fun getCustomerReport(
        @Query("business_id") businessId: Long
    ): Response<ApiResponse<List<CustomerReport>>>

    @GET("reports/profit-loss")
    suspend fun getProfitLoss(
        @Query("business_id") businessId: Long,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<ApiResponse<ProfitLossReport>>

    // ── Sync ──
    @POST("sync/push")
    suspend fun pushChanges(@Body request: SyncPushRequest): Response<ApiResponse<SyncResponse>>

    @GET("sync/pull")
    suspend fun pullChanges(
        @Query("last_synced_at") lastSyncedAt: String? = null
    ): Response<ApiResponse<SyncResponse>>

    // ── Notifications ──
    @POST("notifications/payment-reminder")
    suspend fun sendPaymentReminder(
        @Body request: PaymentReminderRequest
    ): Response<ApiResponse<Unit>>

    @POST("notifications/low-stock-alert")
    suspend fun sendLowStockAlert(
        @Body request: LowStockAlertRequest
    ): Response<ApiResponse<Unit>>

    // -- Ledger Entries --
    @POST("customers/{id}/ledger")
    suspend fun createLedgerEntry(
        @Path("id") id: Long,
        @Body request: CreateLedgerEntryRequest
    ): Response<ApiResponse<LedgerEntryResponse>>

    @DELETE("customers/{customerId}/ledger/{transactionId}")
    suspend fun deleteLedgerEntry(
        @Path("customerId") customerId: Long,
        @Path("transactionId") transactionId: String
    ): Response<ApiResponse<Unit>>

    @POST("customers/{id}/ledger/sms")
    suspend fun sendLedgerSms(
        @Path("id") id: Long,
        @Body request: SendLedgerSmsRequest
    ): Response<ApiResponse<LedgerSmsResponse>>

    @Multipart
    @POST("customers/{id}/ledger/upload")
    suspend fun uploadLedgerImage(
        @Path("id") id: Long,
        @Part file: MultipartBody.Part
    ): Response<ApiResponse<LedgerImageUploadResponse>>

    @GET("customers/{id}/ledger/pdf")
    @Streaming
    suspend fun getLedgerPdf(
        @Path("id") id: Long
    ): Response<okhttp3.ResponseBody>
}

// ── Auth Models ──
data class LoginRequest(
    val phone: String,
    val password: String,
    val fcm_token: String? = null
)

data class RegisterRequest(
    val business_name: String,
    val owner_name: String,
    val phone: String,
    val email: String,
    val password: String,
    val gstin: String? = null
)

data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val token_type: String = "Bearer",
    val expires_in: Int = 3600,
    val user: UserInfo
)

data class UserInfo(
    val id: Long,
    val name: String,
    val phone: String,
    val email: String?,
    val business_id: Long,
    val business_name: String
)

data class RefreshTokenRequest(val refresh_token: String)

// ── Business Models ──
data class Business(
    val id: Long = 0,
    val name: String,
    val owner_name: String,
    val phone: String,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    val business_type: String? = null,
    val logo: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)

data class DashboardData(
    val total_sales: Double = 0.0,
    val total_customers: Int = 0,
    val total_products: Int = 0,
    val pending_amount: Double = 0.0,
    val total_invoices: Int = 0,
    val recent_invoices: List<Invoice> = emptyList()
)

data class Warehouse(
    val id: Long = 0,
    val name: String,
    val address: String? = null,
    val business_id: Long
)

// ── Customer Models ──
data class Customer(
    val id: Long = 0,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    val opening_balance: Double = 0.0,
    val credit_limit: Double = 0.0,
    val business_id: Long = 0,
    val created_at: String? = null,
    val updated_at: String? = null
)

data class LedgerCustomer(
    val id: String,
    val name: String,
    val phone: String,
    val email: String,
    val gstin: String?,
    val address: String?,
    val city: String?,
    val state: String?,
    val creditLimit: Double,
    val currentBalance: Double
)

data class LedgerSummary(
    val openingBalance: Double,
    val totalDebit: Double,
    val totalCredit: Double,
    val closingBalance: Double,
    val totalEntries: Int
)

data class LedgerEntry(
    val id: String,
    val date: String,
    val type: String,
    val description: String,
    val invoiceNo: String?,
    val debit: Double,
    val credit: Double,
    val balanceAfter: Double,
    val imageUrl: String? = null
)

data class LedgerResponse(
    val customer: LedgerCustomer,
    val summary: LedgerSummary,
    val entries: List<LedgerEntry>
)

data class PaymentRequest(
    val amount: Double,
    val date: String,
    val mode: String,
    val reference: String? = null,
    val notes: String? = null
)

// ── Product Models ──
data class Product(
    val id: Long = 0,
    val name: String,
    val sku: String? = null,
    val hsn_code: String? = null,
    val unit: String? = null,
    val selling_price: Double = 0.0,
    val purchase_price: Double = 0.0,
    val gst_rate: Double = 0.0,
    val stock: Int = 0,
    val low_stock_alert: Int? = null,
    val category_id: Long? = null,
    val category_name: String? = null,
    val business_id: Long = 0,
    val created_at: String? = null,
    val updated_at: String? = null
)

data class StockAdjustRequest(
    val quantity: Int,
    val reason: String,
    val type: String
)

data class StockTransferRequest(
    val product_id: Long,
    val from_warehouse_id: Long,
    val to_warehouse_id: Long,
    val quantity: Int
)

// ── Category Models ──
data class Category(
    val id: Long = 0,
    val name: String,
    val description: String? = null,
    val business_id: Long = 0
)

// ── Supplier Models ──
data class Supplier(
    val id: Long = 0,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val gstin: String? = null,
    val business_id: Long = 0
)

// ── Purchase Order Models ──
data class PurchaseOrder(
    val id: Long = 0,
    val supplier_id: Long,
    val supplier_name: String? = null,
    val order_date: String,
    val delivery_date: String? = null,
    val status: String = "pending",
    val total_amount: Double = 0.0,
    val items: List<PurchaseOrderItem>? = null,
    val business_id: Long = 0
)

data class PurchaseOrderItem(
    val id: Long? = null,
    val product_id: Long,
    val product_name: String? = null,
    val quantity: Int,
    val unit_price: Double,
    val gst_rate: Double = 0.0,
    val total_price: Double = 0.0
)

// ── Invoice Models ──
data class Invoice(
    val id: Long = 0,
    val invoice_number: String = "",
    val customer_id: Long,
    val customer_name: String? = null,
    val customer_gstin: String? = null,
    val business_id: Long = 0,
    val invoice_date: String,
    val due_date: String? = null,
    val subtotal: Double = 0.0,
    val discount: Double = 0.0,
    val taxable_amount: Double = 0.0,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val total_amount: Double = 0.0,
    val round_off: Double = 0.0,
    val status: String = "draft",
    val direction: String = "SALE",
    val supplierId: String? = null,
    val supplier: Supplier? = null,
    val notes: String? = null,
    val terms: String? = null,
    val items: List<InvoiceItem>? = null,
    val payments: List<Payment>? = null,
    val ewayBillNo: String? = null,
    val ewayBillDate: String? = null,
    val transporterId: String? = null,
    val transporterName: String? = null,
    val vehicleNo: String? = null,
    val distanceKm: Int? = null,
    val supplyType: String? = null,
    val docType: String? = null,
    val valueOfGoods: Double? = null,
    val irn: String? = null,
    val irnDate: String? = null,
    val ackNo: String? = null,
    val ackDate: String? = null,
    val qrCode: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)

data class InvoiceItem(
    val id: Long? = null,
    val product_id: Long,
    val product_name: String? = null,
    val hsn_code: String? = null,
    val quantity: Double = 1.0,
    val unit: String? = null,
    val unit_price: Double = 0.0,
    val discount: Double = 0.0,
    val taxable_amount: Double = 0.0,
    val gst_rate: Double = 0.0,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val total_price: Double = 0.0
)

data class CreateInvoiceRequest(
    val customer_id: Long,
    val invoice_date: String,
    val due_date: String? = null,
    val items: List<InvoiceItemRequest>,
    val discount: Double = 0.0,
    val notes: String? = null
)

data class InvoiceItemRequest(
    val product_id: Long,
    val quantity: Double = 1.0,
    val unit_price: Double = 0.0,
    val discount: Double = 0.0,
    val gst_rate: Double = 0.0
)

data class CreditNoteRequest(
    val reason: String,
    val items: List<Long>? = null
)

// ── Invoice Settings ──
data class InvoiceSettings(
    val invoicePrefix: String = "INV-",
    val startingNumber: Int = 1,
    val defaultNotes: String = "",
    val defaultTerms: String = "",
    val bankName: String = "",
    val bankAccountNo: String = "",
    val bankIfsc: String = "",
    val bankBranch: String = "",
    val upiId: String = "",
    val showGstin: Boolean = true,
    val showBankDetails: Boolean = false,
    val showQrCode: Boolean = false,
    val signatureUrl: String = "",
    val activeTemplate: String = "classic"
)

data class InvoiceSettingsRequest(
    val invoicePrefix: String? = null,
    val startingNumber: Int? = null,
    val defaultNotes: String? = null,
    val defaultTerms: String? = null,
    val bankName: String? = null,
    val bankAccountNo: String? = null,
    val bankIfsc: String? = null,
    val bankBranch: String? = null,
    val upiId: String? = null,
    val showGstin: Boolean? = null,
    val showBankDetails: Boolean? = null,
    val showQrCode: Boolean? = null,
    val activeTemplate: String? = null
)

// ── E-Way Bill ──
data class EwayBillRequest(
    val transporterId: String? = null,
    val transporterName: String? = null,
    val vehicleNo: String,
    val distanceKm: Int,
    val supplyType: String? = "Outward",
    val docType: String? = "Tax Invoice",
    val transportMode: String? = "Road"
)

data class EwayBillResponse(
    val ewayBillNo: String,
    val ewayBillDate: String,
    val vehicleNo: String? = null,
    val distanceKm: Int? = null,
    val transporterName: String? = null,
    val message: String
)

// ── e-Invoice ──
data class EinvoiceRequest(
    val generateViaApi: Boolean? = false,
    val irn: String? = null,
    val ackNo: String? = null,
    val ackDate: String? = null
)

data class EinvoiceResponse(
    val irn: String,
    val irnDate: String,
    val ackNo: String? = null,
    val ackDate: String? = null,
    val qrCode: String? = null,
    val message: String
)

// ── Generate Both (One-Click) ──
data class GenerateBothRequest(
    val vehicleNo: String,
    val distanceKm: Int,
    val transporterId: String? = null,
    val transporterName: String? = null,
    val supplyType: String? = "Outward",
    val docType: String? = "Tax Invoice",
    val generateEinvoice: Boolean? = true,
    val irn: String? = null,
    val ackNo: String? = null,
    val ackDate: String? = null
)

data class GenerateBothResponse(
    val ewayBill: EwayBillResponse? = null,
    val einvoice: EinvoiceResponse? = null,
    val errors: List<GenerateError>? = null,
    val invoice: Invoice? = null
)

data class GenerateError(
    val type: String,
    val message: String
)

// ── Invoice Template ──
data class InvoiceTemplate(
    val id: String,
    val name: String,
    val description: String,
    val layout: String,
    val accentColor: String,
    val headerStyle: String,
    val tableStyle: String,
    val font: String,
    val isActive: Boolean
)

// ── Payment Models ──
data class Payment(
    val id: Long = 0,
    val invoice_id: Long,
    val amount: Double,
    val date: String,
    val mode: String,
    val reference: String? = null,
    val notes: String? = null
)

data class RecordPaymentRequest(
    val invoice_id: Long,
    val amount: Double,
    val date: String,
    val mode: String,
    val reference: String? = null,
    val notes: String? = null
)

data class RazorpayOrderRequest(
    val invoice_id: Long,
    val amount: Double,
    val currency: String = "INR"
)

data class RazorpayOrderResponse(
    val order_id: String,
    val amount: Double,
    val currency: String,
    val key: String? = null
)

data class UpiLinkRequest(
    val invoice_id: Long,
    val amount: Double,
    val upi_id: String? = null
)

data class UpiLinkResponse(
    val upi_link: String,
    val qr_code: String? = null
)

// ── Report Models ──
data class SalesReport(
    val period: SalesPeriod,
    val summary: SalesSummary,
    val categorySales: List<CategorySale>
)

data class SalesPeriod(val startDate: String?, val endDate: String?)

data class SalesSummary(
    val totalSales: Double,
    val totalTax: Double,
    val totalInvoices: Int,
    val averageInvoice: Double
)

data class CategorySale(val name: String, val count: Double, val total: Double)

data class Gstr1Report(
    val fromDate: String,
    val toDate: String,
    val summary: Gstr1Summary,
    val b2b: List<Gstr1B2bEntry>,
    val b2c: Gstr1B2cSummary
)

data class Gstr1Summary(
    val totalInvoices: Int,
    val totalTaxableValue: Double,
    val totalTax: Double
)

data class Gstr1B2bEntry(
    val invoiceNo: String,
    val date: String,
    val customerName: String?,
    val customerGstin: String?,
    val taxableValue: Double,
    val taxAmount: Double,
    val grandTotal: Double
)

data class Gstr1B2cSummary(
    val count: Int,
    val totalTaxableValue: Double,
    val totalTax: Double
)

data class Gstr3bReport(
    val month: Int,
    val year: Int,
    val summary: Gstr3bSummary
)

data class Gstr3bSummary(
    val totalInvoices: Int,
    val totalTaxableValue: Double,
    val totalTax: Double,
    val totalPaid: Double,
    val outstanding: Double
)

data class CustomerReport(
    val customer_id: Long,
    val customer_name: String,
    val phone: String? = null,
    val total_purchases: Int = 0,
    val total_amount: Double = 0.0,
    val outstanding: Double = 0.0,
    val last_purchase_date: String? = null
)

data class ProfitLossReport(
    val period: String,
    val total_revenue: Double = 0.0,
    val total_expenses: Double = 0.0,
    val gross_profit: Double = 0.0,
    val net_profit: Double = 0.0,
    val revenue_breakdown: List<BreakdownItem>? = null,
    val expense_breakdown: List<BreakdownItem>? = null
)

data class BreakdownItem(
    val label: String,
    val amount: Double
)

// ── Sync Models ──
data class SyncPushRequest(
    val products: List<Product>? = null,
    val customers: List<Customer>? = null,
    val invoices: List<Invoice>? = null
)

data class SyncResponse(
    val synced_at: String,
    val products: List<Product>? = null,
    val customers: List<Customer>? = null,
    val invoices: List<Invoice>? = null,
    val deleted_ids: List<Long>? = null
)

// ── Notification Models ──
data class PaymentReminderRequest(
    val customer_id: Long,
    val amount: Double,
    val due_date: String,
    val message: String? = null
)

data class LowStockAlertRequest(
    val product_id: Long,
    val current_stock: Int,
    val threshold: Int
)

// ── Staff Management Models ──
data class StaffMember(
    val userId: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String? = null,
    val avatarUrl: String? = null,
    val role: String = "BUSINESS_VIEWER",
    val permissions: List<String> = emptyList(),
    val isDefault: Boolean = false,
    val joinedAt: String = ""
)

data class StaffInvite(
    val id: String = "",
    val phone: String = "",
    val email: String? = null,
    val name: String? = null,
    val role: String = "BUSINESS_EDITOR",
    val permissions: List<String> = emptyList(),
    val token: String = "",
    val invitedBy: String = "",
    val expiresAt: String = "",
    val createdAt: String = ""
)

data class InviteStaffRequest(
    val phone: String,
    val email: String? = null,
    val name: String? = null,
    val rolePreset: String? = null,
    val permissions: List<String>? = null,
    val role: String? = null
)

data class UpdatePermissionsRequest(
    val permissions: List<String>,
    val role: String? = null
)

// ── Ledger Entry Models --
data class CreateLedgerEntryRequest(
    val amount: Double,
    val type: String,
    val paymentMode: String? = null,
    val description: String? = null,
    val date: String? = null,
    val reference: String? = null,
    val imageUrl: String? = null
)

data class LedgerEntryResponse(
    val transaction: Any,
    val newBalance: Double
)

data class SendLedgerSmsRequest(
    val phone: String? = null,
    val message: String? = null
)

data class LedgerSmsResponse(
    val success: Boolean,
    val phone: String,
    val message: String,
    val ledgerUrl: String,
    val sentAt: String
)

// ── Generic Wrapper ──
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null
)

data class LedgerImageUploadResponse(
    val url: String,
    val filename: String,
    val size: Long,
    val mimetype: String
)

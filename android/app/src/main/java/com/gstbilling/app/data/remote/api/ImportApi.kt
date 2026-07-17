package com.gstbilling.app.data.remote.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

data class ParseCsvRequest(
    val csvContent: String,
    val fileType: String,
    val columnMapping: Map<String, String>? = null
)

data class ParsedRow(
    val index: Int,
    val data: Map<String, String>,
    val isValid: Boolean = true,
    val errors: List<String> = emptyList()
)

data class ParseCsvResponse(
    val fileName: String,
    val totalRows: Int,
    val headers: List<String>,
    val suggestedMapping: Map<String, String>,
    val rows: List<ParsedRow>,
    val errors: List<String> = emptyList()
)

data class ImportRequest(
    val data: List<Map<String, Any>>,
    val columnMapping: Map<String, String>,
    val overwriteExisting: Boolean = false
)

data class ImportResult(
    val totalRows: Int,
    val imported: Int,
    val skipped: Int,
    val errors: List<ImportError>,
    val warnings: List<String> = emptyList()
)

data class ImportError(
    val row: Int,
    val field: String? = null,
    val message: String,
    val value: String? = null
)

interface ImportApi {

    @POST("businesses/{businessId}/import/parse-csv")
    suspend fun parseCsv(
        @Path("businessId") businessId: String,
        @Body request: ParseCsvRequest
    ): Response<ApiResponse<ParseCsvResponse>>

    @POST("businesses/{businessId}/import/customers")
    suspend fun importCustomers(
        @Path("businessId") businessId: String,
        @Body request: ImportRequest
    ): Response<ApiResponse<ImportResult>>

    @POST("businesses/{businessId}/import/products")
    suspend fun importProducts(
        @Path("businessId") businessId: String,
        @Body request: ImportRequest
    ): Response<ApiResponse<ImportResult>>

    @POST("businesses/{businessId}/import/invoices")
    suspend fun importInvoices(
        @Path("businessId") businessId: String,
        @Body request: ImportRequest
    ): Response<ApiResponse<ImportResult>>
}

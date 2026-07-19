package com.gstbilling.app.data.remote.api

import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import retrofit2.http.*

/**
 * Interface-level tests for ApiService.
 * These tests verify that the API service interface methods exist
 * with the correct annotations and method signatures.
 *
 * Run with: ./gradlew testDebugUnitTest --tests "com.gstbilling.app.data.remote.api.ApiServiceTest"
 */
@RunWith(JUnit4::class)
class ApiServiceTest {

    @Test
    fun `lookupGstin endpoint URL is correct`() {
        val methods = ApiService::class.java.methods
        val lookupMethod = methods.find { it.name == "lookupGstin" }

        assertNotNull("lookupGstin method should exist", lookupMethod)

        val getAnnotation = lookupMethod!!.getAnnotation(GET::class.java)
        assertNotNull("lookupGstin should have @GET annotation", getAnnotation)
        assertEquals(
            "lookupGstin URL should be correct",
            "businesses/{businessId}/customers/gstin/{gstin}",
            getAnnotation.value
        )
    }

    @Test
    fun `lookupGstin accepts businessId and gstin path parameters`() {
        val methods = ApiService::class.java.methods
        val lookupMethod = methods.find { it.name == "lookupGstin" }!!

        val params = lookupMethod.parameterAnnotations
        val pathAnnotations = params.flatten().filterIsInstance<Path>()

        assertEquals("Should have 2 path parameters", 2, pathAnnotations.size)
        assertTrue(
            "Should have businessId path param",
            pathAnnotations.any { it.value == "businessId" }
        )
        assertTrue(
            "Should have gstin path param",
            pathAnnotations.any { it.value == "gstin" }
        )
    }

    @Test
    fun `createCustomer endpoint exists`() {
        val methods = ApiService::class.java.methods
        val createMethod = methods.find { it.name == "createCustomer" }

        assertNotNull("createCustomer method should exist", createMethod)

        val postAnnotation = createMethod!!.getAnnotation(POST::class.java)
        assertNotNull("createCustomer should have @POST annotation", postAnnotation)
        assertEquals("customers", postAnnotation.value)
    }

    @Test
    fun `selectiveExport endpoint accepts entities parameter`() {
        val methods = ApiService::class.java.methods
        val exportMethod = methods.find { it.name == "selectiveExport" }

        assertNotNull("selectiveExport method should exist", exportMethod)

        val getAnnotation = exportMethod!!.getAnnotation(GET::class.java)
        assertNotNull("selectiveExport should have @GET annotation", getAnnotation)
        assertEquals(
            "selectiveExport URL should be correct",
            "businesses/{businessId}/export/selective",
            getAnnotation.value
        )

        val params = exportMethod.parameterAnnotations
        val queryAnnotations = params.flatten().filterIsInstance<Query>()
        assertTrue(
            "Should accept entities query parameter",
            queryAnnotations.any { it.value == "entities" }
        )
        assertTrue(
            "Should accept format query parameter",
            queryAnnotations.any { it.value == "format" }
        )
    }

    @Test
    fun `getInvoicePrintHtml accepts documentType parameter`() {
        val methods = ApiService::class.java.methods
        val printMethod = methods.find { it.name == "getInvoicePrintHtml" }

        assertNotNull("getInvoicePrintHtml method should exist", printMethod)

        val getAnnotation = printMethod!!.getAnnotation(GET::class.java)
        assertNotNull("getInvoicePrintHtml should have @GET annotation", getAnnotation)
        assertEquals(
            "getInvoicePrintHtml URL should be correct",
            "businesses/{businessId}/invoices/{invoiceId}/print",
            getAnnotation.value
        )

        val params = printMethod.parameterAnnotations
        val queryAnnotations = params.flatten().filterIsInstance<Query>()
        assertTrue(
            "Should accept documentType query parameter",
            queryAnnotations.any { it.value == "documentType" }
        )
    }

    @Test
    fun `createInvoice endpoint exists with POST`() {
        val methods = ApiService::class.java.methods
        val createMethod = methods.find { it.name == "createInvoice" }

        assertNotNull("createInvoice method should exist", createMethod)

        val postAnnotation = createMethod!!.getAnnotation(POST::class.java)
        assertNotNull("createInvoice should have @POST annotation", postAnnotation)
        assertEquals("invoices", postAnnotation.value)
    }

    @Test
    fun `getInvoices endpoint accepts pagination parameters`() {
        val methods = ApiService::class.java.methods
        val listMethod = methods.find { it.name == "getInvoices" }

        assertNotNull("getInvoices method should exist", listMethod)

        val params = listMethod!!.parameterAnnotations
        val queryAnnotations = params.flatten().filterIsInstance<Query>()

        assertTrue("Should accept page param", queryAnnotations.any { it.value == "page" })
        assertTrue("Should accept limit param", queryAnnotations.any { it.value == "limit" })
        assertTrue("Should accept status param", queryAnnotations.any { it.value == "status" })
    }
}

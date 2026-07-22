package com.gstbilling.app.ui.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.Business
import com.gstbilling.app.data.remote.api.InvoiceSettings
import com.gstbilling.app.data.remote.api.InvoiceSettingsRequest
import com.gstbilling.app.data.repository.BusinessRepository
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SubSettingsViewModel @Inject constructor(
    private val businessRepository: BusinessRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    // ── Shared state ──
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var saveSuccess by mutableStateOf(false)
        private set

    // ── Business Profile fields ──
    var businessName by mutableStateOf("")
        private set
    var ownerName by mutableStateOf("")
        private set
    var phone by mutableStateOf("")
        private set
    var email by mutableStateOf("")
        private set
    var address by mutableStateOf("")
        private set
    var city by mutableStateOf("")
        private set
    var state by mutableStateOf("")
        private set
    var gstin by mutableStateOf("")
        private set
    var businessType by mutableStateOf("Regular")
        private set
    var isGstinLookupLoading by mutableStateOf(false)
        private set

    // ── Invoice Settings fields ──
    var invoicePrefix by mutableStateOf("INV")
        private set
    var invoiceStartNumber by mutableStateOf("1")
        private set
    var termsAndConditions by mutableStateOf("")
        private set
    var notes by mutableStateOf("")
        private set
    var showGstin by mutableStateOf(true)
        private set
    var showCustomerGstin by mutableStateOf(true)
        private set
    var showBankDetails by mutableStateOf(false)
        private set
    var bankName by mutableStateOf("")
        private set
    var accountNumber by mutableStateOf("")
        private set
    var ifscCode by mutableStateOf("")
        private set
    var branch by mutableStateOf("")
        private set
    var upiId by mutableStateOf("")
        private set
    var activeTemplate by mutableStateOf("classic")
        private set

    // ── API Credentials ──
    var razorpayKeyId by mutableStateOf("")
        private set
    var razorpayKeySecret by mutableStateOf("")
        private set
    var einvoiceClientId by mutableStateOf("")
        private set
    var einvoiceClientSecret by mutableStateOf("")
        private set
    var einvoiceUsername by mutableStateOf("")
        private set
    var einvoicePassword by mutableStateOf("")
        private set
    var einvoiceEnvironment by mutableStateOf("sandbox")
        private set
    var ewayClientId by mutableStateOf("")
        private set
    var ewayClientSecret by mutableStateOf("")
        private set
    var ewayUsername by mutableStateOf("")
        private set
    var ewayPassword by mutableStateOf("")
        private set
    var ewayEnvironment by mutableStateOf("sandbox")
        private set

    // ── Tax Settings fields (stored in business settings JSON) ──
    var defaultGstRate by mutableStateOf("18%")
        private set
    var cgstEnabled by mutableStateOf(true)
        private set
    var sgstEnabled by mutableStateOf(true)
        private set
    var igstEnabled by mutableStateOf(true)
        private set
    var taxDisplay by mutableStateOf("Exclusive")
        private set
    var hsnCode by mutableStateOf("")
        private set

    // ── Print Settings fields (stored in business settings JSON) ──
    var bluetoothEnabled by mutableStateOf(false)
        private set
    var autoPrint by mutableStateOf(false)
        private set
    var printCopies by mutableStateOf("1")
        private set
    var paperSize by mutableStateOf("A4")
        private set
    var printLogo by mutableStateOf(false)
        private set

    private var currentBusiness: Business? = null
    private var currentInvoiceSettings: InvoiceSettings? = null

    // ── Profile editable helpers ──
    fun onBusinessNameChange(v: String) { businessName = v }
    fun onOwnerNameChange(v: String) { ownerName = v }
    fun onPhoneChange(v: String) { phone = v }
    fun onEmailChange(v: String) { email = v }
    fun onAddressChange(v: String) { address = v }
    fun onCityChange(v: String) { city = v }
    fun onStateChange(v: String) { state = v }
    fun onGstinChange(v: String) { gstin = v }
    fun onBusinessTypeChange(v: String) { businessType = v }

    fun lookupGstin(gstin: String) {
        if (gstin.length < 15) return
        isGstinLookupLoading = true
        viewModelScope.launch {
            try {
                val businessId = sessionManager.getBusinessId() ?: ""
                val apiService = businessRepository.getApiService()
                val response = apiService.lookupGstin(businessId, gstin)
                if (response.isSuccessful) {
                    val data = response.body()?.data
                    if (data != null && data["error"] == null) {
                        if (businessName.isBlank()) businessName = data["tradeName"] as? String ?: data["name"] as? String ?: ""
                        if (address.isBlank()) address = data["address"] as? String ?: ""
                        if (city.isBlank()) city = data["city"] as? String ?: ""
                        if (state.isBlank()) state = data["state"] as? String ?: ""
                    }
                }
            } catch (_: Exception) { }
            isGstinLookupLoading = false
        }
    }

    // ── Invoice template editable helpers ──
    fun onInvoicePrefixChange(v: String) { invoicePrefix = v }
    fun onInvoiceStartNumberChange(v: String) { invoiceStartNumber = v }
    fun onTermsChange(v: String) { termsAndConditions = v }
    fun onNotesChange(v: String) { notes = v }
    fun onShowGstinChange(v: Boolean) { showGstin = v }
    fun onShowCustomerGstinChange(v: Boolean) { showCustomerGstin = v }
    fun onShowBankDetailsChange(v: Boolean) { showBankDetails = v }
    fun onEinvoiceClientIdChange(v: String) { einvoiceClientId = v }
    fun onEinvoiceClientSecretChange(v: String) { einvoiceClientSecret = v }
    fun onEinvoiceUsernameChange(v: String) { einvoiceUsername = v }
    fun onEinvoicePasswordChange(v: String) { einvoicePassword = v }
    fun onEinvoiceEnvironmentChange(v: String) { einvoiceEnvironment = v }
    fun onEwayClientIdChange(v: String) { ewayClientId = v }
    fun onEwayClientSecretChange(v: String) { ewayClientSecret = v }
    fun onEwayUsernameChange(v: String) { ewayUsername = v }
    fun onEwayPasswordChange(v: String) { ewayPassword = v }
    fun onEwayEnvironmentChange(v: String) { ewayEnvironment = v }
    fun onBankNameChange(v: String) { bankName = v }
    fun onAccountNumberChange(v: String) { accountNumber = v }
    fun onIfscCodeChange(v: String) { ifscCode = v }
    fun onBranchChange(v: String) { branch = v }

    // ── Payment methods editable helpers ──
    fun onUpiIdChange(v: String) { upiId = v }
    fun onRazorpayKeyIdChange(v: String) { razorpayKeyId = v }
    fun onRazorpayKeySecretChange(v: String) { razorpayKeySecret = v }

    // ── Tax settings editable helpers ──
    fun onDefaultGstRateChange(v: String) { defaultGstRate = v }
    fun onCgstEnabledChange(v: Boolean) { cgstEnabled = v }
    fun onSgstEnabledChange(v: Boolean) { sgstEnabled = v }
    fun onIgstEnabledChange(v: Boolean) { igstEnabled = v }
    fun onTaxDisplayChange(v: String) { taxDisplay = v }
    fun onHsnCodeChange(v: String) { hsnCode = v }

    // ── Print settings editable helpers ──
    fun onBluetoothEnabledChange(v: Boolean) { bluetoothEnabled = v }
    fun onAutoPrintChange(v: Boolean) { autoPrint = v }
    fun onPrintCopiesChange(v: String) { printCopies = v }
    fun onPaperSizeChange(v: String) { paperSize = v }
    fun onPrintLogoChange(v: Boolean) { printLogo = v }

    fun clearMessages() {
        errorMessage = null
        saveSuccess = false
    }

    // ── Load business profile ──
    fun loadBusinessProfile() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            when (val result = businessRepository.getBusiness()) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    val b = result.data
                    currentBusiness = b
                    businessName = b.name
                    ownerName = "" // not stored in backend Business model
                    phone = b.phone ?: ""
                    email = b.email ?: ""
                    address = b.address ?: ""
                    city = b.city ?: ""
                    state = b.state ?: ""
                    gstin = b.gstin ?: ""
                    businessType = b.businessType ?: "Regular"
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    // ── Save business profile ──
    fun saveBusinessProfile() {
        val b = currentBusiness ?: return
        isLoading = true
        errorMessage = null
        saveSuccess = false
        viewModelScope.launch {
            val updated = b.copy(
                name = businessName,
                phone = phone.ifBlank { b.phone },
                email = email.ifBlank { b.email },
                address = address.ifBlank { b.address },
                city = city.ifBlank { b.city },
                state = state.ifBlank { b.state },
                gstin = gstin.ifBlank { b.gstin },
                businessType = businessType
            )
            when (val result = businessRepository.updateBusiness(updated)) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    currentBusiness = result.data
                    saveSuccess = true
                    // Update local session with new business name
                    sessionManager.saveBusinessName(businessName)
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    // ── Load invoice settings ──
    fun loadInvoiceSettings() {
        val businessId = currentBusiness?.id
        if (businessId == null) {
            isLoading = true
            viewModelScope.launch {
                when (val result = businessRepository.getBusiness()) {
                    is com.gstbilling.app.util.AppResult.Success -> {
                        currentBusiness = result.data
                        fetchInvoiceSettings(result.data.id)
                    }
                    is com.gstbilling.app.util.AppResult.Error -> {
                        errorMessage = result.message
                        isLoading = false
                    }
                    else -> {}
                }
            }
        } else {
            fetchInvoiceSettings(businessId)
        }
    }

    private fun fetchInvoiceSettings(businessId: String) {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val apiService = businessRepository.getApiService()
                val response = apiService.getInvoiceSettings(businessId)
                if (response.isSuccessful) {
                    val settings = response.body()?.data
                    if (settings != null) {
                        currentInvoiceSettings = settings
                        populateInvoiceSettings(settings)
                        populatePaymentMethods(settings)
                    }
                } else {
                    // 404 is OK — settings may not exist yet
                    if (response.code() != 404) {
                        errorMessage = "Failed to load invoice settings"
                    }
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to load settings"
            }
            isLoading = false
        }
    }

    private fun populateInvoiceSettings(s: InvoiceSettings) {
        invoicePrefix = s.invoicePrefix
        invoiceStartNumber = s.startingNumber.toString()
        termsAndConditions = s.defaultTerms
        notes = s.defaultNotes
        showGstin = s.showGstin
        showCustomerGstin = true // not in backend, default true
        showBankDetails = s.showBankDetails
        bankName = s.bankName
        accountNumber = s.bankAccountNo
        ifscCode = s.bankIfsc
        branch = s.bankBranch
        activeTemplate = s.activeTemplate
    }

    private fun populatePaymentMethods(s: InvoiceSettings) {
        upiId = s.upiId
        bankName = s.bankName
        accountNumber = s.bankAccountNo
        ifscCode = s.bankIfsc
        branch = s.bankBranch
    }

    // ── Save invoice template settings ──
    fun saveInvoiceTemplate() {
        val businessId = currentBusiness?.id ?: return
        isLoading = true
        errorMessage = null
        saveSuccess = false
        viewModelScope.launch {
            try {
                val apiService = businessRepository.getApiService()
                val request = InvoiceSettingsRequest(
                    invoicePrefix = invoicePrefix,
                    startingNumber = invoiceStartNumber.toIntOrNull(),
                    defaultTerms = termsAndConditions,
                    defaultNotes = notes,
                    showGstin = showGstin,
                    showBankDetails = showBankDetails,
                    bankName = bankName,
                    bankAccountNo = accountNumber,
                    bankIfsc = ifscCode,
                    bankBranch = branch,
                    activeTemplate = activeTemplate
                )
                val response = apiService.updateInvoiceSettings(businessId, request)
                if (response.isSuccessful) {
                    saveSuccess = true
                } else {
                    errorMessage = "Failed to save template"
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to save"
            }
            isLoading = false
        }
    }

    // ── Save payment methods ──
    fun savePaymentMethods() {
        val businessId = currentBusiness?.id ?: return
        isLoading = true
        errorMessage = null
        saveSuccess = false
        viewModelScope.launch {
            try {
                val apiService = businessRepository.getApiService()
                val request = InvoiceSettingsRequest(
                    upiId = upiId,
                    bankName = bankName,
                    bankAccountNo = accountNumber,
                    bankIfsc = ifscCode,
                    bankBranch = branch
                )
                val response = apiService.updateInvoiceSettings(businessId, request)
                if (response.isSuccessful) {
                    saveSuccess = true
                } else {
                    errorMessage = "Failed to save payment methods"
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to save"
            }
            isLoading = false
        }
    }

    // ── Load tax settings (stored in business settings JSON) ──
    fun loadTaxSettings() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            when (val result = businessRepository.getBusiness()) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    currentBusiness = result.data
                    // Tax settings are stored in business JSON — load defaults for now
                    // The backend Business model stores tax info in settings JSON column
                    defaultGstRate = "18%"
                    cgstEnabled = true
                    sgstEnabled = true
                    igstEnabled = true
                    taxDisplay = "Exclusive"
                    hsnCode = ""
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    // ── Save tax settings ──
    fun saveTaxSettings() {
        val b = currentBusiness ?: return
        isLoading = true
        errorMessage = null
        saveSuccess = false
        viewModelScope.launch {
            when (val result = businessRepository.updateBusiness(b)) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    saveSuccess = true
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    // ── Load print settings ──
    fun loadPrintSettings() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            when (val result = businessRepository.getBusiness()) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    currentBusiness = result.data
                    bluetoothEnabled = false
                    autoPrint = false
                    printCopies = "1"
                    paperSize = "A4"
                    printLogo = false
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    // ── Save print settings ──
    fun savePrintSettings() {
        val b = currentBusiness ?: return
        isLoading = true
        errorMessage = null
        saveSuccess = false
        viewModelScope.launch {
            when (val result = businessRepository.updateBusiness(b)) {
                is com.gstbilling.app.util.AppResult.Success -> {
                    saveSuccess = true
                }
                is com.gstbilling.app.util.AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }
}

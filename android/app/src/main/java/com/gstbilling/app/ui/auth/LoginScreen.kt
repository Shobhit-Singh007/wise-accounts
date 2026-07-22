package com.gstbilling.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource
import com.gstbilling.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.repository.AuthRepository
import com.gstbilling.app.util.AppResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    var loginMethod by mutableStateOf("phone")
    var phone by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    // Forgot password
    var showForgotDialog by mutableStateOf(false)
    var forgotPhone by mutableStateOf("")
    var forgotEmail by mutableStateOf("")
    var forgotOtp by mutableStateOf("")
    var forgotNewPassword by mutableStateOf("")
    var forgotStep by mutableStateOf("input") // input → otp → done
    var forgotMsg by mutableStateOf("")
    var forgotLoading by mutableStateOf(false)

    fun login(onSuccess: () -> Unit) {
        val identifier = if (loginMethod == "email") email else phone
        if (identifier.isBlank() || password.isBlank()) {
            errorMessage = "Please fill in all fields"
            return
        }
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            when (val result = authRepository.login(identifier, password)) {
                is AppResult.Success -> {
                    isLoading = false
                    onSuccess()
                }
                is AppResult.Error -> {
                    isLoading = false
                    errorMessage = result.message
                }
                is AppResult.Loading -> { }
            }
        }
    }

    fun sendForgotOtp() {
        if (forgotPhone.isBlank() && forgotEmail.isBlank()) return
        forgotLoading = true; forgotMsg = ""
        viewModelScope.launch {
            when (val result = authRepository.forgotPassword(forgotPhone.ifBlank { null }, forgotEmail.ifBlank { null })) {
                is AppResult.Success -> { forgotStep = "otp"; forgotLoading = false }
                is AppResult.Error -> { forgotMsg = result.message ?: "Failed"; forgotLoading = false }
                is AppResult.Loading -> {}
            }
        }
    }

    fun resetForgotPassword() {
        val identifier = forgotPhone.ifBlank { forgotEmail }
        if (identifier.isBlank() || forgotOtp.length < 6 || forgotNewPassword.length < 8) return
        forgotLoading = true; forgotMsg = ""
        viewModelScope.launch {
            when (val result = authRepository.resetPassword(identifier, forgotOtp, forgotNewPassword)) {
                is AppResult.Success -> { forgotStep = "done"; forgotMsg = "Password reset successfully!"; forgotLoading = false }
                is AppResult.Error -> { forgotMsg = result.message ?: "Failed"; forgotLoading = false }
                is AppResult.Loading -> {}
            }
        }
    }

    fun resetForgotState() {
        showForgotDialog = false; forgotStep = "input"; forgotOtp = ""; forgotNewPassword = ""; forgotMsg = ""
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel()
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.splash_logo),
                contentDescription = "Wise Accounts Logo",
                modifier = Modifier.size(80.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Sign in to your account",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("phone" to "Phone", "email" to "Email").forEach { (value, label) ->
                    FilterChip(
                        selected = viewModel.loginMethod == value,
                        onClick = { viewModel.loginMethod = value },
                        label = { Text(label) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            if (viewModel.loginMethod == "email") {
                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = { Text("Email Address") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                OutlinedTextField(
                    value = viewModel.phone,
                    onValueChange = { viewModel.phone = it },
                    label = { Text("Phone Number") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Next
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = viewModel.password,
                onValueChange = { viewModel.password = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password"
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(24.dp))

            viewModel.errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            Button(
                onClick = { viewModel.login(onLoginSuccess) },
                enabled = !viewModel.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (viewModel.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Sign In", style = MaterialTheme.typography.titleMedium)
                }
            }

            TextButton(onClick = { viewModel.showForgotDialog = true }) {
                Text("Forgot Password?", color = MaterialTheme.colorScheme.primary)
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onNavigateToRegister,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text("Create Account", style = MaterialTheme.typography.titleMedium)
            }
        }
    }

    if (viewModel.showForgotDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.resetForgotState() },
            title = { Text(if (viewModel.forgotStep == "done") "Success" else "Reset Password") },
            text = {
                Column {
                    if (viewModel.forgotStep == "done") {
                        Text(viewModel.forgotMsg, color = MaterialTheme.colorScheme.primary)
                    } else if (viewModel.forgotStep == "otp") {
                        OutlinedTextField(value = viewModel.forgotOtp, onValueChange = { viewModel.forgotOtp = it }, label = { Text("Enter OTP") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(value = viewModel.forgotNewPassword, onValueChange = { viewModel.forgotNewPassword = it }, label = { Text("New Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                    } else {
                        OutlinedTextField(value = viewModel.forgotPhone, onValueChange = { viewModel.forgotPhone = it }, label = { Text("Phone Number") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Text("OR", modifier = Modifier.padding(vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
                        OutlinedTextField(value = viewModel.forgotEmail, onValueChange = { viewModel.forgotEmail = it }, label = { Text("Email Address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    }
                    if (viewModel.forgotMsg.isNotEmpty() && viewModel.forgotStep != "done") {
                        Text(viewModel.forgotMsg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (viewModel.forgotStep == "otp") viewModel.resetForgotPassword()
                        else if (viewModel.forgotStep == "done") { viewModel.resetForgotState() }
                        else viewModel.sendForgotOtp()
                    },
                    enabled = !viewModel.forgotLoading
                ) {
                    if (viewModel.forgotLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text(if (viewModel.forgotStep == "otp") "Reset" else if (viewModel.forgotStep == "done") "OK" else "Send OTP")
                }
            },
            dismissButton = {
                if (viewModel.forgotStep != "done") TextButton(onClick = { viewModel.resetForgotState() }) { Text("Cancel") }
            }
        )
    }
}

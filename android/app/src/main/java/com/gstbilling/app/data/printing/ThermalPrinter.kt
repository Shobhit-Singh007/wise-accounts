package com.gstbilling.app.data.printing

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.*

class ThermalPrinter {
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    fun connect(deviceAddress: String): Boolean {
        return try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            val device = adapter.getRemoteDevice(deviceAddress)
            socket = device.createRfcommSocketToServiceRecord(
                java.util.UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
            )
            socket?.connect()
            outputStream = socket?.outputStream
            true
        } catch (e: Exception) {
            false
        }
    }

    fun disconnect() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (_: Exception) {}
    }

    fun printInvoice(
        businessName: String,
        invoiceNo: String,
        customerName: String,
        items: List<PrintItem>,
        subtotal: Double,
        tax: Double,
        total: Double,
        amountPaid: Double,
        balance: Double
    ) {
        val sb = StringBuilder()
        sb.appendLine(centerText(businessName, 32))
        sb.appendLine("=".repeat(32))
        sb.appendLine("Invoice: $invoiceNo")
        sb.appendLine("Date: ${SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())}")
        sb.appendLine("Customer: $customerName")
        sb.appendLine("-".repeat(32))
        sb.appendLine(String.format("%-15s %4s %8s", "Item", "Qty", "Amount"))
        sb.appendLine("-".repeat(32))

        for (item in items) {
            sb.appendLine(String.format("%-15s %4d %8.2f", item.name, item.quantity, item.amount))
        }

        sb.appendLine("-".repeat(32))
        sb.appendLine(String.format("%24s %8.2f", "Subtotal:", subtotal))
        sb.appendLine(String.format("%24s %8.2f", "Tax:", tax))
        sb.appendLine("=".repeat(32))
        sb.appendLine(String.format("%24s %8.2f", "TOTAL:", total))
        sb.appendLine(String.format("%24s %8.2f", "Paid:", amountPaid))
        sb.appendLine(String.format("%24s %8.2f", "Balance:", balance))
        sb.appendLine("=".repeat(32))
        sb.appendLine(centerText("Thank you!", 32))
        sb.appendLine()
        sb.appendLine()

        outputStream?.write(sb.toString().toByteArray())
        outputStream?.flush()
    }

    fun feedPaper() {
        outputStream?.write(byteArrayOf(0x1B, 0x64, 3))
        outputStream?.flush()
    }

    private fun centerText(text: String, width: Int): String {
        val padding = ((width - text.length) / 2).coerceAtLeast(0)
        return " ".repeat(padding) + text
    }
}

data class PrintItem(
    val name: String,
    val quantity: Int,
    val amount: Double
)

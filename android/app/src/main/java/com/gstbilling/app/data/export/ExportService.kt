package com.gstbilling.app.data.export

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Environment
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

class ExportService(private val context: Context) {

    fun exportInvoiceToPdf(
        invoiceNo: String,
        customerName: String,
        items: List<ExportItem>,
        subtotal: Double,
        tax: Double,
        total: Double,
        fileName: String? = null
    ): Uri? {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = document.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val titlePaint = Paint().apply { textSize = 20f; color = Color.parseColor("#1565C0"); isFakeBoldText = true }
        val headerPaint = Paint().apply { textSize = 14f; color = Color.DKGRAY; isFakeBoldText = true }
        val textPaint = Paint().apply { textSize = 12f; color = Color.BLACK }
        val linePaint = Paint().apply { color = Color.LTGRAY; strokeWidth = 1f }

        var y = 40f

        canvas.drawText("INVOICE", 40f, y, titlePaint)
        y += 25f
        canvas.drawText("No: $invoiceNo", 40f, y, headerPaint)
        y += 20f
        canvas.drawText("Customer: $customerName", 40f, y, headerPaint)
        y += 15f
        canvas.drawText("Date: ${SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(Date())}", 40f, y, textPaint)
        y += 25f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f

        canvas.drawText("Item", 40f, y, headerPaint)
        canvas.drawText("Qty", 300f, y, headerPaint)
        canvas.drawText("Rate", 370f, y, headerPaint)
        canvas.drawText("Amount", 460f, y, headerPaint)
        y += 15f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 15f

        for (item in items) {
            canvas.drawText(item.name, 40f, y, textPaint)
            canvas.drawText("${item.quantity}", 300f, y, textPaint)
            canvas.drawText("₹${String.format("%.2f", item.rate)}", 370f, y, textPaint)
            canvas.drawText("₹${String.format("%.2f", item.amount)}", 460f, y, textPaint)
            y += 18f
        }

        y += 10f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f
        canvas.drawText("Subtotal: ₹${String.format("%.2f", subtotal)}", 350f, y, textPaint)
        y += 18f
        canvas.drawText("Tax: ₹${String.format("%.2f", tax)}", 350f, y, textPaint)
        y += 18f
        canvas.drawText("Total: ₹${String.format("%.2f", total)}", 350f, y, headerPaint)

        document.finishPage(page)

        val file = File(
            context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
            "${fileName ?: "invoice_$invoiceNo"}.pdf"
        )
        FileOutputStream(file).use { document.writeTo(it) }
        document.close()

        return FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
    }

    fun exportToCsv(data: List<Map<String, String>>, fileName: String, headers: List<String>): Uri? {
        val file = File(
            context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
            "$fileName.csv"
        )

        file.bufferedWriter().use { writer ->
            writer.appendLine(headers.joinToString(","))
            for (row in data) {
                writer.appendLine(headers.joinToString(",") { header ->
                    "\"${row[header]?.replace("\"", "\"\"") ?: ""}\""
                })
            }
        }

        return FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
    }

    fun shareFile(uri: Uri, mimeType: String, title: String = "Share file") {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, title))
    }
}

data class ExportItem(
    val name: String,
    val quantity: Int,
    val rate: Double,
    val amount: Double
)

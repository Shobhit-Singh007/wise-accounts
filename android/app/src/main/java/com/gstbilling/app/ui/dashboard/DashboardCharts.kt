package com.gstbilling.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberColumnCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.columnSeries
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun SalesBarChart(
    dailySales: List<Pair<String, Double>>,
    modifier: Modifier = Modifier
) {
    if (dailySales.isEmpty()) return

    val modelProducer = remember { CartesianChartModelProducer() }

    LaunchedEffect(dailySales) {
        modelProducer.runTransaction {
            columnSeries { series(dailySales.map { it.second }) }
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Sales (Last 7 Days)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberColumnCartesianLayer(),
                    startAxis = rememberStartAxis(),
                    bottomAxis = rememberBottomAxis(
                        valueFormatter = { x, _, _ ->
                            dailySales.getOrNull(x.toInt())?.first ?: ""
                        }
                    ),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(200.dp),
            )
        }
    }
}

@Composable
fun InvoiceStatusPieChart(
    draft: Int, confirmed: Int, cancelled: Int, credited: Int,
    modifier: Modifier = Modifier
) {
    val total = draft + confirmed + cancelled + credited
    if (total == 0) return

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Invoice Status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatusChip("Draft", draft, Color.Gray)
                StatusChip("Confirmed", confirmed, Color(0xFF1565C0))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatusChip("Cancelled", cancelled, Color(0xFFC62828))
                StatusChip("Credited", credited, Color(0xFFF57F17))
            }
        }
    }
}

@Composable
private fun StatusChip(label: String, count: Int, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.size(12.dp),
            shape = MaterialTheme.shapes.extraSmall,
            color = color
        ) {}
        Spacer(modifier = Modifier.width(6.dp))
        Text("$label: $count", style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun TopProductsChart(
    products: List<Pair<String, Double>>,
    modifier: Modifier = Modifier
) {
    if (products.isEmpty()) return

    val modelProducer = remember { CartesianChartModelProducer() }

    LaunchedEffect(products) {
        modelProducer.runTransaction {
            columnSeries { series(products.map { it.second }) }
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Top Products", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberColumnCartesianLayer(),
                    startAxis = rememberStartAxis(),
                    bottomAxis = rememberBottomAxis(
                        valueFormatter = { x, _, _ ->
                            products.getOrNull(x.toInt())?.first?.take(10) ?: ""
                        }
                    ),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(200.dp),
            )
        }
    }
}

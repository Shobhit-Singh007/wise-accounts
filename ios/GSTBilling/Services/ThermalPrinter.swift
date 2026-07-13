import Foundation
import CoreBluetooth

class ThermalPrinter: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    static let shared = ThermalPrinter()
    private var centralManager: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var writeCharacteristic: CBCharacteristic?
    private var onConnect: ((Bool) -> Void)?
    
    var isConnected: Bool { peripheral?.state == .connected }
    
    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    func scanAndConnect(completion: @escaping (Bool) -> Void) {
        onConnect = completion
        guard centralManager?.state == .poweredOn else { return }
        centralManager?.scanForPeripherals(withServices: nil, options: nil)
    }
    
    func disconnect() {
        if let peripheral = peripheral {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
    }
    
    func printInvoice(
        businessName: String,
        invoiceNo: String,
        customerName: String,
        items: [PrintItem],
        subtotal: Double,
        tax: Double,
        total: Double,
        amountPaid: Double,
        balance: Double
    ) {
        guard let peripheral = peripheral, let characteristic = writeCharacteristic else { return }
        
        var text = centerText(businessName, width: 32) + "\n"
        text += String(repeating: "=", count: 32) + "\n"
        text += "Invoice: \(invoiceNo)\n"
        text += "Date: \(formatDate())\n"
        text += "Customer: \(customerName)\n"
        text += String(repeating: "-", count: 32) + "\n"
        text += String(format: "%-15s %4s %8s", "Item", "Qty", "Amount") + "\n"
        text += String(repeating: "-", count: 32) + "\n"
        
        for item in items {
            text += String(format: "%-15s %4d %8.2f", item.name, item.quantity, item.amount) + "\n"
        }
        
        text += String(repeating: "-", count: 32) + "\n"
        text += String(format: "%24s %8.2f", "Subtotal:", subtotal) + "\n"
        text += String(format: "%24s %8.2f", "Tax:", tax) + "\n"
        text += String(repeating: "=", count: 32) + "\n"
        text += String(format: "%24s %8.2f", "TOTAL:", total) + "\n"
        text += String(format: "%24s %8.2f", "Paid:", amountPaid) + "\n"
        text += String(format: "%24s %8.2f", "Balance:", balance) + "\n"
        text += String(repeating: "=", count: 32) + "\n"
        text += centerText("Thank you!", width: 32) + "\n\n\n"
        
        if let data = text.data(using: .ascii) {
            peripheral.writeValue(data, for: characteristic, type: .withResponse)
        }
    }
    
    func feedPaper() {
        guard let peripheral = peripheral, let characteristic = writeCharacteristic else { return }
        let cmd = Data([0x1B, 0x64, 0x03])
        peripheral.writeValue(cmd, for: characteristic, type: .withResponse)
    }
    
    private func centerText(_ text: String, width: Int) -> String {
        let padding = max(0, (width - text.count) / 2)
        return String(repeating: " ", count: padding) + text
    }
    
    private func formatDate() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy HH:mm"
        return formatter.string(from: Date())
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        if let name = peripheral.name, name.lowercased().contains("printer") || name.lowercased().contains("thermal") {
            self.peripheral = peripheral
            centralManager?.stopScan()
            centralManager?.connect(peripheral, options: nil)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.delegate = self
        peripheral.discoverServices(nil)
        onConnect?(true)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        onConnect?(false)
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        for char in characteristics {
            if char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) {
                writeCharacteristic = char
                break
            }
        }
    }
}

struct PrintItem {
    let name: String
    let quantity: Int
    let amount: Double
}

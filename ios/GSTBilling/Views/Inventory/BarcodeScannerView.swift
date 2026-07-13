import SwiftUI
import AVFoundation

struct BarcodeScannerView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isScanning = true
    @State private var scannedCode: String?
    @State private var showingCamera = false
    @State private var permissionGranted = false
    
    var onBarcodeScanned: (String) -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                if permissionGranted {
                    CameraView(scannedCode: $scannedCode, isScanning: $isScanning)
                        .ignoresSafeArea()
                    
                    VStack {
                        Spacer()
                        
                        Text("Point camera at barcode")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(8)
                        
                        Spacer()
                        
                        if let code = scannedCode {
                            VStack(spacing: 12) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 40))
                                    .foregroundColor(.green)
                                
                                Text("Scanned!")
                                    .font(.headline)
                                
                                Text(code)
                                    .font(.title3)
                                    .fontWeight(.medium)
                                
                                HStack(spacing: 16) {
                                    Button("Scan Again") {
                                        scannedCode = nil
                                        isScanning = true
                                    }
                                    .buttonStyle(.bordered)
                                    
                                    Button("Use This") {
                                        onBarcodeScanned(code)
                                        dismiss()
                                    }
                                    .buttonStyle(.borderedProminent)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(16)
                            .padding()
                        }
                    }
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        
                        Text("Camera permission required")
                            .font(.headline)
                        
                        Button("Grant Permission") {
                            requestCameraPermission()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            }
            .navigationTitle("Scan Barcode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                requestCameraPermission()
            }
        }
    }
    
    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                permissionGranted = granted
            }
        }
    }
}

struct CameraView: UIViewControllerRepresentable {
    @Binding var scannedCode: String?
    @Binding var isScanning: Bool
    
    func makeUIViewController(context: Context) -> CameraViewController {
        let controller = CameraViewController()
        controller.scannedCode = $scannedCode
        controller.isScanning = $isScanning
        return controller
    }
    
    func updateUIViewController(_ uiViewController: CameraViewController, context: Context) {}
}

class CameraViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var scannedCode: Binding<String?>?
    var isScanning: Binding<Bool>?
    
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        DispatchQueue.global(qos: .userInitiated).async {
            self.captureSession?.startRunning()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        captureSession?.stopRunning()
    }
    
    private func setupCamera() {
        let session = AVCaptureSession()
        self.captureSession = session
        
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else { return }
        
        if session.canAddInput(input) {
            session.addInput(input)
        }
        
        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            output.metadataObjectTypes = [.qr, .ean13, .ean8, .code128, .code39, .upce, .code93, .interleaved2of5]
        }
        
        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        self.previewLayer = preview
        
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }
    
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard isScanning?.wrappedValue == true,
              let metadataObject = metadataObjects.first,
              let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
              let stringValue = readableObject.stringValue else { return }
        
        AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
        isScanning?.wrappedValue = false
        scannedCode?.wrappedValue = stringValue
    }
}

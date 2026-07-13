import SwiftUI

struct UpiPaymentView: View {
    let business: Business
    let amount: Double
    let description: String

    @StateObject private var viewModel = UpiPaymentViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            if viewModel.isLoading {
                ProgressView("Generating UPI link...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let qrData = viewModel.qrCodeData {
                VStack(spacing: 16) {
                    Text(Helpers.formatCurrency(amount))
                        .font(.title).bold()

                    if !description.isEmpty {
                        Text(description)
                            .font(.callout).foregroundColor(.secondary)
                    }

                    Image(uiImage: qrData)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 200, height: 200)
                        .padding()

                    Text("Scan to Pay")
                        .font(.headline)
                        .foregroundColor(.secondary)

                    HStack(spacing: 16) {
                        Button {
                            copyUpiLink()
                        } label: {
                            Label("Copy Link", systemImage: "doc.on.doc")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(10)
                        }

                        Button {
                            shareUpiLink()
                        } label: {
                            Label("Share", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green.opacity(0.1))
                                .cornerRadius(10)
                        }
                    }
                    .padding(.horizontal)
                }
            } else if let err = viewModel.errorMessage {
                ContentUnavailableView("Error", systemImage: "exclamationmark.triangle", description: Text(err))
            }
        }
        .navigationTitle("UPI Payment")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            let bizId = authManager.businessId
            await viewModel.generateUpiLink(businessId: bizId, amount: amount, description: description)
        }
    }

    private func copyUpiLink() {
        UIPasteboard.general.string = viewModel.upiLink
    }

    private func shareUpiLink() {
        guard let link = viewModel.upiLink else { return }
        let activityVC = UIActivityViewController(activityItems: [link], applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(activityVC, animated: true)
        }
    }
}

@MainActor
class UpiPaymentViewModel: ObservableObject {
    @Published var upiLink: String?
    @Published var qrCodeData: UIImage?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    func generateUpiLink(businessId: String, amount: Double, description: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let response: UpiLinkResponse = try await apiService.generateUpiLink(businessId: businessId, amount: amount, description: description)
            upiLink = response.upiLink
            if let qrBase64 = response.qrCode, let data = Data(base64Encoded: qrBase64) {
                qrCodeData = UIImage(data: data)
            } else if let link = response.upiLink {
                qrCodeData = generateQRCode(from: link)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func generateQRCode(from string: String) -> UIImage? {
        let data = Data(string.utf8)
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let image = filter.outputImage else { return nil }
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = image.transformed(by: transform)
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

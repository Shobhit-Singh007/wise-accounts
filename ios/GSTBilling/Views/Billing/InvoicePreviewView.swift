import SwiftUI

struct InvoicePreviewView: View {
    let business: Business
    let invoiceId: String
    let invoiceNo: String

    @StateObject private var viewModel = InvoicePreviewViewModel()
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                ProgressView("Loading preview...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let html = viewModel.htmlContent {
                InvoiceWebView(htmlString: html)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = viewModel.errorMessage {
                ContentUnavailableView("Preview Error", systemImage: "exclamationmark.triangle", description: Text(err))
            }
        }
        .navigationTitle("Preview")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    Button {
                        printInvoice()
                    } label: {
                        Image(systemName: "printer")
                    }
                    Button {
                        sharePdf()
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .task {
            let bizId = authManager.businessId
            await viewModel.loadPrintHtml(businessId: bizId, invoiceId: invoiceId)
        }
    }

    private func printInvoice() {
        guard let url = APIService.shared.getInvoicePrintUrl(businessId: authManager.businessId, invoiceId: invoiceId) else { return }
        UIApplication.shared.open(url)
    }

    private func sharePdf() {
        Task {
            do {
                let data = try await APIService.shared.getInvoicePdfData(businessId: authManager.businessId, invoiceId: invoiceId)
                await MainActor.run {
                    let tmpUrl = FileManager.default.temporaryDirectory.appendingPathComponent("\(invoiceNo).pdf")
                    try? data.write(to: tmpUrl)
                    let activityVC = UIActivityViewController(activityItems: [tmpUrl], applicationActivities: nil)
                    if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let root = scene.windows.first?.rootViewController {
                        root.present(activityVC, animated: true)
                    }
                }
            } catch {}
        }
    }
}

@MainActor
class InvoicePreviewViewModel: ObservableObject {
    @Published var htmlContent: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadPrintHtml(businessId: String, invoiceId: String) async {
        isLoading = true
        errorMessage = nil
        guard let url = APIService.shared.getInvoicePrintUrl(businessId: businessId, invoiceId: invoiceId) else {
            errorMessage = "Invalid print URL"
            isLoading = false
            return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                errorMessage = "Failed to load preview"
                isLoading = false
                return
            }
            htmlContent = String(data: data, encoding: .utf8)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct InvoiceWebView: UIViewRepresentable {
    let htmlString: String

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.loadHTMLString(htmlString, baseURL: nil)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

import WebKit

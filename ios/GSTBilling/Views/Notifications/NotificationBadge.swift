import SwiftUI

struct NotificationBadge: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Image(systemName: "bell.fill")
                .font(.body)
            if count > 0 {
                Text(count > 99 ? "99+" : "\(count)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, count > 9 ? 4 : 5)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .clipShape(Capsule())
                    .offset(x: 8, y: -8)
            }
        }
    }
}

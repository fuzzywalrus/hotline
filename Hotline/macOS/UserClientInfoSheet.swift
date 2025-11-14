import SwiftUI

struct UserClientInfoSheet: View {
  @Environment(\.dismiss) private var dismiss
  
  let info: HotlineUserClientInfo
  
  var body: some View {
    ScrollView(.vertical) {
      Text(self.info.details)
        .fontDesign(.monospaced)
        .textSelection(.enabled)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding()
    }
    .frame(width: 350, height: 400)
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("OK") {
          self.dismiss()
        }
      }
    }
  }
}

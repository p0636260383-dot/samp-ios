import SwiftUI

private struct UIPreview: UIViewControllerRepresentable {
    let path: String
    let report: (String) -> Void
    func makeUIViewController(context: Context) -> MobileUIController {
        let controller = MobileUIController()
        controller.report = report
        controller.preview(path)
        return controller
    }
    func updateUIViewController(_ controller: MobileUIController, context: Context) {}
    static func dismantleUIViewController(_ controller: MobileUIController, coordinator: ()) { controller.closeAll() }
}

struct UICatalogView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selected = "rotcity-login/index.html"
    @State private var message = "ตัวอย่าง UI จาก Android · ยังไม่มีข้อมูลผู้เล่นจากเซิร์ฟเวอร์"
    private let pages: [String] = {
        guard let url = Bundle.main.url(forResource: "pages", withExtension: "json", subdirectory: "rot-ui"),
              let data = try? Data(contentsOf: url), let registry = try? JSONDecoder().decode([String: String].self, from: data) else { return [] }
        return registry.keys.sorted()
    }()
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button("กลับ") { dismiss() }
                Picker("หน้า UI", selection: $selected) {
                    ForEach(pages, id: \.self) { path in Text(path.replacingOccurrences(of: "/index.html", with: "")).tag(path) }
                }.pickerStyle(.menu)
                Spacer()
                Text("Android UI → WKWebView").font(.caption).foregroundColor(.secondary)
            }.padding(.horizontal).padding(.vertical, 6).background(Color.black)
            UIPreview(path: selected) { message = $0 }.id(selected).frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 0.05, green: 0.08, blue: 0.1))
            Text(message).font(.caption2).lineLimit(1).padding(5).frame(maxWidth: .infinity).background(Color.black)
        }
    }
}

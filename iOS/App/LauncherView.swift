import SwiftUI
import RotCityIOS

struct LauncherView: View {
    private static let cover = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_cover.png").path)
    @AppStorage("rotcity.nickname") private var nickname = ""
    @State private var serverStatus: ServerStatus?
    @State private var checking = false
    @State private var queried = false
    @State private var showingUI = false
    @StateObject private var microphone = VoiceCapture()
    private let accent = Color(red: 0.35, green: 0.78, blue: 1)

    var body: some View {
        GeometryReader { size in
            ZStack {
                Color(red: 0.02, green: 0.04, blue: 0.08).ignoresSafeArea()
                if let image = Self.cover {
                    Image(uiImage: image).resizable().scaledToFill().frame(width: size.size.width, height: size.size.height).clipped().opacity(0.22).ignoresSafeArea()
                }
                ScrollView {
                    HStack(alignment: .top, spacing: 32) {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("ROT CITY").font(.system(size: 46, weight: .black)).foregroundColor(accent)
                            Text("SAN ANDREAS MULTIPLAYER · iOS").font(.caption).tracking(2)
                            Text(ServerConfiguration.rotCity.address).font(.system(.body, design: .monospaced))
                            Text(serverStatus.map { "\($0.name)\n\($0.players)/\($0.maxPlayers) ผู้เล่น · \($0.pingMilliseconds) ms" }
                                 ?? (checking ? "กำลังตรวจสถานะ…" : queried ? "เซิร์ฟเวอร์ไม่ตอบคำขอสถานะ" : "ยังไม่ได้ตรวจสถานะเซิร์ฟเวอร์"))
                                .foregroundColor(.secondary)
                            Button("ตรวจสถานะเซิร์ฟเวอร์", action: refresh).disabled(checking)
                            TextField("ชื่อผู้เล่น", text: $nickname).textInputAutocapitalization(.never).disableAutocorrection(true).textFieldStyle(.roundedBorder)
                        }.frame(maxWidth: 400, alignment: .leading)
                        VStack(alignment: .leading, spacing: 14) {
                            Text("เวอร์ชันทดสอบระบบ iOS").font(.title3.bold())
                            Text("ยังเข้าเล่นเกม 3D ไม่ได้: อยู่ระหว่างพอร์ต GTA engine, player sync และม็อดสำหรับ iOS")
                                .font(.callout).foregroundColor(.yellow)
                            Button { microphone.stop(); showingUI = true } label: { Label("เปิด UI เดียวกับ Android", systemImage: "square.grid.2x2") }
                                .buttonStyle(.borderedProminent).tint(accent)
                            Button { microphone.isCapturing ? microphone.stop() : microphone.requestAndStart() } label: {
                                Label(microphone.isCapturing ? "หยุดทดสอบไมค์" : "ทดสอบไมค์", systemImage: microphone.isCapturing ? "mic.fill" : "mic")
                            }.buttonStyle(.bordered)
                            ProgressView(value: microphone.level).tint(.green)
                            Text(microphone.status).font(.caption).foregroundColor(.secondary)
                            Text("การทดสอบไมค์อ่านระดับเสียงในเครื่อง ยังไม่ส่งเสียงไปเซิร์ฟเวอร์")
                                .font(.caption).foregroundColor(.secondary)
                        }.frame(maxWidth: 430, alignment: .leading)
                    }.padding(32).frame(minWidth: size.size.width, minHeight: size.size.height)
                }
            }
        }
        .fullScreenCover(isPresented: $showingUI) { UICatalogView() }
        .onDisappear { microphone.stop() }
    }

    private func refresh() {
        guard !checking else { return }
        checking = true
        DispatchQueue.global(qos: .userInitiated).async {
            let result = ServerStatus.query()
            DispatchQueue.main.async { serverStatus = result; checking = false; queried = true }
        }
    }
}

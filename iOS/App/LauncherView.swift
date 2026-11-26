import SwiftUI
import RotCityIOS

struct LauncherView: View {
    private static let cover = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_cover.png").path)
    @AppStorage("rotcity.nickname") private var nickname = ""
    @State private var serverStatus: ServerStatus?
    @State private var checking = false
    @State private var queried = false
    @State private var showingUI = false
    @State private var showingGame = false
    @State private var nicknameError: String?
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
                            TextField("ชื่อผู้เล่น (3-20 ตัวอักษร A-Z, 0-9, _)", text: $nickname)
                                .textInputAutocapitalization(.never)
                                .disableAutocorrection(true)
                                .textFieldStyle(.roundedBorder)
                            if let nicknameError {
                                Text(nicknameError).font(.caption).foregroundColor(.red)
                            }
                            Button {
                                enterGame()
                            } label: {
                                Label("เข้าเกม (เชื่อมต่อเซิร์ฟเวอร์)", systemImage: "play.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                        }.frame(maxWidth: 400, alignment: .leading)
                        VStack(alignment: .leading, spacing: 14) {
                            Text("เวอร์ชันทดสอบระบบ iOS").font(.title3.bold())
                            Text("เชื่อมต่อเซิร์ฟเวอร์ SA-MP, แชท, Dialog และ /dweb UI ได้แล้ว (3D GTA engine ยังอยู่ระหว่างพอร์ต)")
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
        .fullScreenCover(isPresented: $showingGame) {
            GameSessionView(nickname: nickname.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        .onAppear { refresh() }
        .onDisappear { microphone.stop() }
    }

    private func enterGame() {
        let trimmed = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard SampClient.isValidNickname(trimmed) else {
            nicknameError = "ชื่อผู้เล่นต้องเป็นภาษาอังกฤษ/ตัวเลข 3-20 ตัวอักษร (เช่น Somchai หรือ Player_1)"
            return
        }
        nicknameError = nil
        microphone.stop()
        showingGame = true
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

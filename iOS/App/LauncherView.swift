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
    @StateObject private var dataManager = GameDataManager()
    private let accent = Color(red: 0.35, green: 0.78, blue: 1)

    var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < 760
            let colWidth = max(240, min(420, (geo.size.width - (compact ? 48 : 96)) / 2))

            ZStack {
                Color(red: 0.02, green: 0.04, blue: 0.08).ignoresSafeArea()
                if let image = Self.cover {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .opacity(0.22)
                        .ignoresSafeArea()
                }
                ScrollView(.vertical, showsIndicators: true) {
                    HStack(alignment: .top, spacing: compact ? 16 : 32) {
                        VStack(alignment: .leading, spacing: compact ? 10 : 14) {
                            Text("ROT CITY")
                                .font(.system(size: compact ? 30 : 44, weight: .black))
                                .foregroundColor(accent)
                            Text("SAN ANDREAS MULTIPLAYER · iOS")
                                .font(.caption2)
                                .tracking(1.5)
                            Text(ServerConfiguration.rotCity.address)
                                .font(.system(compact ? .caption : .body, design: .monospaced))
                            Text(serverStatus.map { "\($0.name) · \($0.players)/\($0.maxPlayers) ผู้เล่น · \($0.pingMilliseconds) ms" }
                                 ?? (checking ? "กำลังตรวจสถานะ…" : queried ? "เซิร์ฟเวอร์ไม่ตอบคำขอสถานะ" : "ยังไม่ได้ตรวจสถานะเซิร์ฟเวอร์"))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Button("ตรวจสถานะเซิร์ฟเวอร์", action: refresh)
                                .font(.caption)
                                .disabled(checking)
                            TextField("ชื่อผู้เล่น (3-20 ตัวอักษร A-Z, 0-9, _)", text: $nickname)
                                .textInputAutocapitalization(.never)
                                .disableAutocorrection(true)
                                .textFieldStyle(.roundedBorder)
                            if let nicknameError {
                                Text(nicknameError).font(.caption2).foregroundColor(.red)
                            }
                            Button {
                                enterGame()
                            } label: {
                                Label("เข้าเกม (เชื่อมต่อเซิร์ฟเวอร์)", systemImage: "play.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                        }
                        .frame(width: colWidth, alignment: .leading)

                        VStack(alignment: .leading, spacing: compact ? 8 : 12) {
                            Text("ดาต้าเกม & แพตช์ UI")
                                .font(compact ? .headline : .title3.bold())
                            Text(dataManager.dataStatusText)
                                .font(.caption)
                                .foregroundColor(dataManager.dataInstalled ? .green : .yellow)
                            Button {
                                dataManager.startDataDownload()
                            } label: {
                                Label(dataManager.dataInstalled ? "อัปเดตดาต้าเกม (~623 MB)" : "ติดตั้งดาต้าเกม (~623 MB)", systemImage: "arrow.down.circle")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .disabled(dataManager.isDownloading)

                            Text(dataManager.patchStatusText)
                                .font(.caption2)
                                .foregroundColor(dataManager.pendingManifest != nil ? .cyan : .secondary)
                            HStack(spacing: 8) {
                                Button("ตรวจสอบแพตช์ UI") {
                                    dataManager.checkPatchManifest(autoApply: true)
                                }
                                .font(.caption)
                                .buttonStyle(.bordered)
                                .disabled(dataManager.checkingPatch || dataManager.isDownloading)

                                if let manifest = dataManager.pendingManifest {
                                    Button("อัปเดต v\(manifest.version)") {
                                        dataManager.downloadAndApplyPatch(manifest)
                                    }
                                    .font(.caption)
                                    .buttonStyle(.borderedProminent)
                                    .tint(accent)
                                }
                            }

                            if let err = dataManager.downloadError {
                                Text("ดาวน์โหลดไม่สำเร็จ: \(err)")
                                    .font(.caption2)
                                    .foregroundColor(.red)
                            }

                            Divider().padding(.vertical, 2)

                            HStack(spacing: 8) {
                                Button { microphone.stop(); showingUI = true } label: {
                                    Label("เปิด UI", systemImage: "square.grid.2x2")
                                }
                                .font(.caption)
                                .buttonStyle(.borderedProminent)
                                .tint(accent)

                                Button { microphone.isCapturing ? microphone.stop() : microphone.requestAndStart() } label: {
                                    Label(microphone.isCapturing ? "หยุดไมค์" : "ทดสอบไมค์", systemImage: microphone.isCapturing ? "mic.fill" : "mic")
                                }
                                .font(.caption)
                                .buttonStyle(.bordered)
                            }
                            ProgressView(value: microphone.level).tint(.green)
                            Text(microphone.status).font(.caption2).foregroundColor(.secondary)
                        }
                        .frame(width: colWidth, alignment: .leading)
                    }
                    .padding(compact ? 16 : 28)
                    .frame(minWidth: geo.size.width, minHeight: geo.size.height)
                }

                if dataManager.isDownloading {
                    downloadOverlay
                }
            }
        }
        .fullScreenCover(isPresented: $showingUI) { UICatalogView() }
        .fullScreenCover(isPresented: $showingGame) {
            GameSessionView(nickname: nickname.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        .onAppear {
            refresh()
            dataManager.checkPatchManifest(autoApply: false)
        }
        .onDisappear { microphone.stop() }
    }

    private var downloadOverlay: some View {
        ZStack {
            Color.black.opacity(0.7).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 12) {
                Text(dataManager.downloadTitle).font(.headline)
                ProgressView(value: dataManager.downloadProgress).tint(accent)
                Text(dataManager.downloadDetail).font(.caption).foregroundColor(.secondary)
                HStack {
                    Spacer()
                    Button("ยกเลิกการดาวน์โหลด") { dataManager.cancelDownload() }
                        .buttonStyle(.bordered)
                }
            }
            .padding(20)
            .frame(maxWidth: 420)
            .background(Color(red: 0.04, green: 0.10, blue: 0.18))
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(accent.opacity(0.4)))
        }
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

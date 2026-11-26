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
        GeometryReader { size in
            ZStack {
                Color(red: 0.02, green: 0.04, blue: 0.08).ignoresSafeArea()
                if let image = Self.cover {
                    Image(uiImage: image).resizable().scaledToFill().frame(width: size.size.width, height: size.size.height).clipped().opacity(0.22).ignoresSafeArea()
                }
                ScrollView {
                    HStack(alignment: .top, spacing: 32) {
                        VStack(alignment: .leading, spacing: 14) {
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

                        VStack(alignment: .leading, spacing: 12) {
                            Text("ดาต้าเกม & แพตช์ UI (เหมือน Android)").font(.title3.bold())
                            Text(dataManager.dataStatusText)
                                .font(.caption)
                                .foregroundColor(dataManager.dataInstalled ? .green : .yellow)
                            Button {
                                dataManager.startDataDownload()
                            } label: {
                                Label(dataManager.dataInstalled ? "อัปเดตดาต้าเกม (~623 MB)" : "ติดตั้งดาต้าเกม (~623 MB)", systemImage: "arrow.down.circle")
                            }
                            .buttonStyle(.bordered)
                            .disabled(dataManager.isDownloading)

                            Text(dataManager.patchStatusText)
                                .font(.caption)
                                .foregroundColor(dataManager.pendingManifest != nil ? .cyan : .secondary)
                            HStack(spacing: 10) {
                                Button("ตรวจสอบแพตช์ UI") {
                                    dataManager.checkPatchManifest(autoApply: true)
                                }
                                .buttonStyle(.bordered)
                                .disabled(dataManager.checkingPatch || dataManager.isDownloading)

                                if let manifest = dataManager.pendingManifest {
                                    Button("อัปเดต v\(manifest.version)") {
                                        dataManager.downloadAndApplyPatch(manifest)
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(accent)
                                }
                            }

                            if let err = dataManager.downloadError {
                                Text("ดาวน์โหลดไม่สำเร็จ: \(err)").font(.caption).foregroundColor(.red)
                            }

                            Divider().padding(.vertical, 4)

                            Button { microphone.stop(); showingUI = true } label: { Label("เปิด UI เดียวกับ Android", systemImage: "square.grid.2x2") }
                                .buttonStyle(.borderedProminent).tint(accent)
                            Button { microphone.isCapturing ? microphone.stop() : microphone.requestAndStart() } label: {
                                Label(microphone.isCapturing ? "หยุดทดสอบไมค์" : "ทดสอบไมค์", systemImage: microphone.isCapturing ? "mic.fill" : "mic")
                            }.buttonStyle(.bordered)
                            ProgressView(value: microphone.level).tint(.green)
                            Text(microphone.status).font(.caption).foregroundColor(.secondary)
                        }.frame(maxWidth: 430, alignment: .leading)
                    }.padding(32).frame(minWidth: size.size.width, minHeight: size.size.height)
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
            Color.black.opacity(0.65).ignoresSafeArea()
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
            .frame(maxWidth: 440)
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

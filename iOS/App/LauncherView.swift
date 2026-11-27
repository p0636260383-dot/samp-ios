import SwiftUI
import RotCityIOS

struct LauncherView: View {
    private static let cover = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_cover.png").path)
    private static let logo = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_logo.png").path)

    @AppStorage("rotcity.nickname") private var nickname = ""
    @State private var serverStatus: ServerStatus?
    @State private var checking = false
    @State private var queried = false
    @State private var showingUI = false
    @State private var showingGame = false
    @State private var showingHelp = false
    @State private var nicknameError: String?
    @StateObject private var microphone = VoiceCapture()
    @StateObject private var dataManager = GameDataManager()

    private let accent = Color(red: 0.35, green: 0.78, blue: 1.0)
    private let border = Color(red: 0.16, green: 0.31, blue: 0.45)
    private let cardBg = Color(red: 0.04, green: 0.10, blue: 0.18).opacity(0.92)
    private let muted = Color(red: 0.67, green: 0.79, blue: 0.88)

    var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < 760
            let cardWidth = min(370, max(270, geo.size.width * (compact ? 0.48 : 0.39)))

            ZStack {
                Color(red: 0.02, green: 0.05, blue: 0.10).ignoresSafeArea()
                if let image = Self.cover {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .ignoresSafeArea()
                }
                LinearGradient(
                    colors: [
                        Color(red: 0.02, green: 0.06, blue: 0.12).opacity(0.92),
                        Color(red: 0.02, green: 0.06, blue: 0.12).opacity(0.15),
                        Color(red: 0.02, green: 0.06, blue: 0.12).opacity(0.15),
                        Color(red: 0.02, green: 0.06, blue: 0.12).opacity(0.92)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Top bar
                    HStack {
                        HStack(spacing: 10) {
                            if let logo = Self.logo {
                                Image(uiImage: logo)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 28, height: 28)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            Text("ROT CITY")
                                .font(.system(size: 16, weight: .bold))
                                .tracking(1.5)
                                .foregroundColor(.white)
                        }
                        Spacer()
                        HStack(spacing: 8) {
                            Button(action: refresh) {
                                Text(checking ? "กำลังรีเฟรช..." : "รีเฟรช")
                                    .font(.caption.bold())
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(cardBg)
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(border))
                            }
                            .disabled(checking)

                            Button { showingHelp = true } label: {
                                Text("วิธีเล่น")
                                    .font(.caption.bold())
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(cardBg)
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(border))
                            }
                        }
                        .foregroundColor(.white)
                    }
                    .padding(.horizontal, compact ? 16 : 24)
                    .padding(.top, compact ? 10 : 14)

                    // Main split content
                    HStack(alignment: .bottom, spacing: 16) {
                        // Bottom-left branding
                        VStack(alignment: .leading, spacing: 4) {
                            Spacer()
                            Text("— SAN ANDREAS MULTIPLAYER")
                                .font(.system(size: compact ? 10 : 11, weight: .bold))
                                .tracking(1.5)
                                .foregroundColor(accent)
                            Text("ROT CITY")
                                .font(.system(size: compact ? 28 : 38, weight: .black))
                                .foregroundColor(.white)
                            Text("ROLEPLAY")
                                .font(.system(size: compact ? 13 : 16, weight: .medium))
                                .tracking(3)
                                .foregroundColor(.white.opacity(0.9))
                            Text("เมืองของคุณ เรื่องราวของคุณ")
                                .font(.caption)
                                .foregroundColor(muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.bottom, compact ? 12 : 20)

                        // Right server & launcher card
                        ScrollView(.vertical, showsIndicators: false) {
                            VStack(alignment: .leading, spacing: compact ? 8 : 10) {
                                Text("◆ OFFICIAL SERVER")
                                    .font(.system(size: 10, weight: .bold))
                                    .tracking(1)
                                    .foregroundColor(accent)
                                Text(serverStatus?.name ?? "Rot City Roleplay")
                                    .font(.system(size: compact ? 17 : 20, weight: .bold))
                                    .foregroundColor(.white)
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(serverStatus != nil ? Color.green : (checking ? Color.yellow : Color.red))
                                        .frame(width: 7, height: 7)
                                    Text(serverStatus != nil ? "เซิร์ฟเวอร์ออนไลน์" : (checking ? "กำลังตรวจสอบ..." : (queried ? "เซิร์ฟเวอร์ไม่ตอบสนอง" : "รอตรวจสอบ")))
                                        .font(.caption2)
                                        .foregroundColor(serverStatus != nil ? .green : muted)
                                }

                                HStack(spacing: 8) {
                                    statBox(
                                        label: "ผู้เล่นออนไลน์",
                                        value: serverStatus.map { "\($0.players) / \($0.maxPlayers)" } ?? "-- / --"
                                    )
                                    statBox(
                                        label: "เวลาตอบกลับ",
                                        value: serverStatus.map { "\($0.pingMilliseconds) ms" } ?? "-- ms"
                                    )
                                }

                                Text("ชื่อผู้เล่น")
                                    .font(.caption2)
                                    .foregroundColor(muted)
                                TextField("กรอกชื่อตัวละคร (เช่น Diamond)", text: $nickname)
                                    .textInputAutocapitalization(.never)
                                    .disableAutocorrection(true)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 9)
                                    .background(Color.black.opacity(0.45))
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(border))
                                    .foregroundColor(.white)

                                if let nicknameError {
                                    Text(nicknameError).font(.caption2).foregroundColor(.red)
                                }

                                Button(action: enterGame) {
                                    HStack {
                                        Spacer()
                                        Image(systemName: "play.fill")
                                        Text("เข้าเกม Rot City")
                                            .fontWeight(.bold)
                                        Text("→")
                                        Spacer()
                                    }
                                    .padding(.vertical, 10)
                                    .foregroundColor(.white)
                                    .background(
                                        LinearGradient(
                                            colors: [Color(red: 0.17, green: 0.56, blue: 0.90), Color(red: 0.11, green: 0.44, blue: 0.78)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(9)
                                }

                                Text("• " + dataManager.dataStatusText)
                                    .font(.caption2)
                                    .foregroundColor(dataManager.dataInstalled ? .green : .yellow)

                                Button { dataManager.startDataDownload() } label: {
                                    HStack {
                                        Spacer()
                                        Text(dataManager.dataInstalled ? "🔄 ตรวจสอบอัปเดตดาต้า" : "📥 ติดตั้งดาต้าเกม (~623 MB)")
                                            .font(.caption.bold())
                                        Spacer()
                                    }
                                    .padding(.vertical, 8)
                                    .foregroundColor(.white)
                                    .background(Color.white.opacity(0.06))
                                    .cornerRadius(8)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(border))
                                }
                                .disabled(dataManager.isDownloading)

                                Text(dataManager.patchStatusText)
                                    .font(.caption2)
                                    .foregroundColor(dataManager.pendingManifest != nil ? accent : muted)

                                HStack(spacing: 8) {
                                    Button {
                                        dataManager.checkPatchManifest(autoApply: true)
                                    } label: {
                                        HStack {
                                            Spacer()
                                            Text("⚡ ตรวจสอบ / อัปเดตแพตช์ UI")
                                                .font(.caption.bold())
                                            Spacer()
                                        }
                                        .padding(.vertical, 8)
                                        .foregroundColor(.white)
                                        .background(Color.white.opacity(0.06))
                                        .cornerRadius(8)
                                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(border))
                                    }
                                    .disabled(dataManager.checkingPatch || dataManager.isDownloading)
                                }

                                if let err = dataManager.downloadError {
                                    Text("ดาวน์โหลดไม่สำเร็จ: \(err)")
                                        .font(.caption2)
                                        .foregroundColor(.red)
                                }

                                HStack(spacing: 8) {
                                    Button("เปิด UI") {
                                        microphone.stop()
                                        showingUI = true
                                    }
                                    .font(.caption2)
                                    .buttonStyle(.bordered)
                                    Button(microphone.isCapturing ? "หยุดไมค์" : "ทดสอบไมค์") {
                                        microphone.isCapturing ? microphone.stop() : microphone.requestAndStart()
                                    }
                                    .font(.caption2)
                                    .buttonStyle(.bordered)
                                }
                            }
                            .padding(compact ? 12 : 16)
                            .background(cardBg)
                            .cornerRadius(14)
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(border))
                        }
                        .frame(width: cardWidth)
                    }
                    .padding(.horizontal, compact ? 16 : 24)
                    .padding(.vertical, 10)
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
        .sheet(isPresented: $showingHelp) {
            VStack(alignment: .leading, spacing: 12) {
                Text("วิธีเข้าเล่น ROT CITY (iOS)").font(.title3.bold())
                Text("1. กรอกชื่อตัวละครภาษาอังกฤษ 3–20 ตัวอักษร (เช่น Diamond หรือ Somchai)")
                Text("2. กดปุ่ม \"เข้าเกม Rot City\" เพื่อเชื่อมต่อเซิร์ฟเวอร์จริง")
                Text("3. กรอกรหัสผ่านเข้าสู่ระบบและพิมพ์แชท/คำสั่งได้ทันที")
                Text("หมายเหตุ: เวอร์ชัน iOS กำลังอยู่ระหว่างพอร์ตตัวเรนเดอร์โลก 3D ของ GTA")
                    .font(.caption).foregroundColor(.secondary)
                Spacer()
                Button("ปิด") { showingHelp = false }
                    .buttonStyle(.borderedProminent)
            }
            .padding(24)
        }
        .onAppear {
            refresh()
            dataManager.checkPatchManifest(autoApply: false)
        }
        .onDisappear { microphone.stop() }
    }

    private func statBox(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 10)).foregroundColor(muted)
            Text(value).font(.system(size: 14, weight: .bold)).foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(Color.black.opacity(0.35))
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(border.opacity(0.8)))
    }

    private var downloadOverlay: some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 12) {
                Text(dataManager.downloadTitle).font(.headline).foregroundColor(.white)
                ProgressView(value: dataManager.downloadProgress).tint(accent)
                Text(dataManager.downloadDetail).font(.caption).foregroundColor(muted)
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
            nicknameError = "ชื่อผู้เล่นต้องเป็นภาษาอังกฤษ/ตัวเลข 3-20 ตัวอักษร (เช่น Diamond)"
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

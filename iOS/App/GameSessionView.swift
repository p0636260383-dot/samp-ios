import SwiftUI
import UIKit
import RotCityIOS

final class GameSessionModel: ObservableObject {
    @Published var state: SampConnectionState = .disconnected
    @Published var statusText: String = "กำลังเตรียมการเชื่อมต่อ..."
    @Published var hostName: String = ServerConfiguration.rotCity.address
    @Published var chatLines: [SampChatMessage] = []
    @Published var activeDialog: SampDialog?
    @Published var dialogInput: String = ""
    @Published var selectedListIndex: Int = 0

    let client = SampClient()
    weak var uiController: MobileUIController?

    private var timer: Timer?
    private let networkQueue = DispatchQueue(label: "com.rotcity.ios.net", qos: .userInitiated)
    private var started = false

    func start(nickname: String, server: ServerConfiguration = .rotCity) {
        guard !started else { return }
        started = true
        statusText = "กำลังเชื่อมต่อไปยัง \(server.address)..."
        let ok = client.connect(host: server.host, port: server.port, nickname: nickname)
        if !ok {
            statusText = "ไม่สามารถเริ่มการเชื่อมต่อ RakNet ได้"
            return
        }
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        started = false
        client.disconnect()
    }

    func sendUserInput(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if trimmed.hasPrefix("/") {
            client.sendCommand(trimmed)
        } else {
            client.sendChat(trimmed)
        }
    }

    func sendCommand(_ command: String) {
        client.sendCommand(command)
    }

    func submitDialog(buttonId: UInt8) {
        guard let dialog = activeDialog else { return }
        let input = (dialog.style == 2 || dialog.style == 4 || dialog.style == 5)
            ? selectedListLineText(dialog.message, index: selectedListIndex)
            : dialogInput
        client.sendDialogResponse(
            dialogId: dialog.id,
            buttonId: buttonId,
            listItem: UInt16(max(0, selectedListIndex)),
            input: input
        )
        activeDialog = nil
        dialogInput = ""
        selectedListIndex = 0
    }

    private func selectedListLineText(_ message: String, index: Int) -> String {
        let lines = message.components(separatedBy: "\n")
        guard index >= 0 && index < lines.count else { return "" }
        return lines[index].components(separatedBy: "\t").first ?? lines[index]
    }

    private func tick() {
        networkQueue.async { [weak self] in
            guard let self else { return }
            self.client.poll()
            DispatchQueue.main.async { [weak self] in
                self?.drainEvents()
            }
        }
    }

    private func drainEvents() {
        while let event = client.popEvent() {
            switch event {
            case .stateChanged(let next, let host, let info, let playerId):
                state = next
                if !host.isEmpty { hostName = host }
                switch next {
                case .connecting: statusText = "กำลังเชื่อมต่อ..."
                case .awaitJoin: statusText = "เชื่อมต่อแล้ว กำลังเข้าเกม (ID \(playerId))..."
                case .connected: statusText = "เชื่อมต่อแล้ว: \(hostName)"
                case .disconnected: statusText = info.isEmpty ? "ตัดการเชื่อมต่อแล้ว" : info
                }
            case .duiPacket(let packet):
                uiController?.receive(packet)
            case .chatMessage(let msg):
                chatLines.append(msg)
                if chatLines.count > 120 { chatLines.removeFirst(chatLines.count - 120) }
            case .showDialog(let dialog):
                selectedListIndex = 0
                dialogInput = ""
                activeDialog = dialog
            case .disconnected(let reason):
                state = .disconnected
                statusText = reason.isEmpty ? "เซิร์ฟเวอร์ปิดการเชื่อมต่อ" : reason
            }
        }
    }
}

private struct LiveMobileUIView: UIViewControllerRepresentable {
    @ObservedObject var session: GameSessionModel

    func makeUIViewController(context: Context) -> MobileUIController {
        let controller = MobileUIController()
        controller.sendCommand = { [weak session] cmd in
            session?.sendCommand(cmd)
        }
        session.uiController = controller
        return controller
    }

    func updateUIViewController(_ uiViewController: MobileUIController, context: Context) {}
}

struct GameSessionView: View {
    private static let cover = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_cover.png").path)
    private static let logo = UIImage(contentsOfFile: Bundle.main.bundleURL.appendingPathComponent("Brand/rotcity_logo.png").path)

    let nickname: String
    @Environment(\.dismiss) private var dismiss
    @StateObject private var session = GameSessionModel()
    @StateObject private var voice = VoiceCapture()
    @StateObject private var worldState = World3DState()
    @State private var showChat = true
    @State private var showInputBar = false
    @State private var chatText = ""

    private let shortcuts: [(String, String)] = [
        ("ALL", "/all"), ("TAB", "/tab"), ("ALT", "/alt"),
        ("F", "/f"), ("N", "/n"), ("F2", "/help")
    ]

    var body: some View {
        ZStack {
            // OpenGL ES 3.0 3D World + RenderWare gta3.img/.dff/.ipl Renderer
            GLES3RenderView(worldState: worldState)
                .ignoresSafeArea()

            // Live Android-compatible /dweb WebView UI layer
            LiveMobileUIView(session: session)
                .ignoresSafeArea()

            // Top HUD + Chat + Shortcuts (matches Android in-game layout)
            VStack(spacing: 6) {
                HStack(spacing: 8) {
                    HStack(spacing: 6) {
                        Circle().fill(stateColor).frame(width: 8, height: 8)
                        Text("\(session.statusText) · \(nickname)")
                            .font(.caption2.bold())
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.black.opacity(0.45))
                    .cornerRadius(8)

                    Spacer()

                    Button { showInputBar.toggle() } label: {
                        Image(systemName: "text.bubble")
                    }
                    .buttonStyle(.bordered)
                    .tint(.cyan)

                    Button {
                        voice.isCapturing ? voice.stop() : voice.requestAndStart()
                    } label: {
                        Image(systemName: voice.isCapturing ? "mic.fill" : "mic")
                    }
                    .buttonStyle(.bordered)
                    .tint(voice.isCapturing ? .green : .white)

                    Button(showChat ? "ซ่อนแชท" : "แชท") { showChat.toggle() }
                        .font(.caption2)
                        .buttonStyle(.bordered)

                    Button("ออกเกม") {
                        voice.stop()
                        session.stop()
                        dismiss()
                    }
                    .font(.caption2.bold())
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)

                if showChat {
                    VStack(alignment: .leading, spacing: 6) {
                        ScrollViewReader { proxy in
                            ScrollView {
                                LazyVStack(alignment: .leading, spacing: 2) {
                                    ForEach(Array(session.chatLines.enumerated()), id: \.offset) { idx, line in
                                        styledSampText(line.text)
                                            .font(.system(size: 12, weight: .semibold))
                                            .shadow(color: .black, radius: 1, x: 1, y: 1)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .id(idx)
                                    }
                                }
                                .padding(6)
                            }
                            .onChange(of: session.chatLines.count) { count in
                                if count > 0 { proxy.scrollTo(count - 1, anchor: .bottom) }
                            }
                        }
                        .frame(maxWidth: 480, maxHeight: 145)

                        // Android-style shortcut strip
                        HStack(spacing: 6) {
                            ForEach(shortcuts, id: \.0) { label, cmd in
                                Button(label) {
                                    session.sendCommand(cmd)
                                }
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color(red: 0.06, green: 0.14, blue: 0.24).opacity(0.85))
                                .foregroundColor(.white)
                                .cornerRadius(7)
                                .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color.cyan.opacity(0.45)))
                            }
                        }

                        if showInputBar {
                            HStack(spacing: 8) {
                                TextField("พิมพ์แชทหรือคำสั่ง (/...)", text: $chatText)
                                    .textFieldStyle(.roundedBorder)
                                    .frame(maxWidth: 340)
                                    .onSubmit(sendChat)
                                Button("ส่ง", action: sendChat)
                                    .buttonStyle(.borderedProminent)
                                    .disabled(session.state != .connected)
                            }
                        }
                    }
                    .padding(.leading, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()

                HStack(alignment: .bottom) {
                    VirtualJoystickView(worldState: worldState)
                        .padding(.leading, 22)
                        .padding(.bottom, 18)
                    Spacer()
                    Text("3D: \(worldState.loadedPedName) · \(worldState.loadedBuildings) อาคาร")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.65))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.4))
                        .cornerRadius(6)
                        .padding(.trailing, 14)
                        .padding(.bottom, 12)
                }
            }

            // Loading screen while connecting (matches Android LoadingScreen)
            if session.state == .connecting || session.state == .awaitJoin {
                loadingOverlay
                    .zIndex(90)
            }

            if let dialog = session.activeDialog {
                if isAuthDialog(dialog) {
                    authOverlay(dialog).zIndex(100)
                } else {
                    dialogOverlay(dialog).zIndex(100)
                }
            }
        }
        .onAppear { session.start(nickname: nickname) }
        .onDisappear {
            voice.stop()
            session.stop()
        }
    }

    private var loadingOverlay: some View {
        ZStack {
            Color(red: 0.02, green: 0.05, blue: 0.10).ignoresSafeArea()
            if let cover = Self.cover {
                Image(uiImage: cover)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .opacity(0.45)
            }
            VStack(spacing: 18) {
                if let logo = Self.logo {
                    Image(uiImage: logo)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 110, height: 110)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                ProgressView()
                    .progressViewStyle(.linear)
                    .tint(Color(red: 0.35, green: 0.78, blue: 1.0))
                    .frame(width: 220)
                Text(session.statusText)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.85))
            }
        }
    }

    private func isAuthDialog(_ dialog: SampDialog) -> Bool {
        dialog.style == 3 || dialog.title.contains("เข้าสู่ระบบ") || dialog.title.contains("สมัคร")
    }

    private var stateColor: Color {
        switch session.state {
        case .connected: return .green
        case .connecting, .awaitJoin: return .yellow
        case .disconnected: return .red
        }
    }

    private func sendChat() {
        session.sendUserInput(chatText)
        chatText = ""
    }

    private func styledSampText(_ raw: String) -> Text {
        var result = Text("")
        var currentColor = Color.white
        var i = raw.startIndex
        while i < raw.endIndex {
            if raw[i] == "{",
               let end = raw.index(i, offsetBy: 7, limitedBy: raw.endIndex),
               end < raw.endIndex,
               raw[end] == "}" {
                let hex = String(raw[raw.index(after: i)..<end])
                if let val = UInt32(hex, radix: 16), hex.count == 6 {
                    currentColor = Color(
                        red: Double((val >> 16) & 0xFF) / 255.0,
                        green: Double((val >> 8) & 0xFF) / 255.0,
                        blue: Double(val & 0xFF) / 255.0
                    )
                    i = raw.index(after: end)
                    continue
                }
            }
            let nextBrace = raw[raw.index(after: i)...].firstIndex(of: "{") ?? raw.endIndex
            result = result + Text(String(raw[i..<nextBrace])).foregroundColor(currentColor)
            i = nextBrace
        }
        return result
    }

    private func authOverlay(_ dialog: SampDialog) -> some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.18))
                                .frame(width: 34, height: 34)
                            Text("☣")
                                .font(.title3)
                                .foregroundColor(.green)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text("Rot City").font(.caption.bold()).foregroundColor(.white)
                                Text("ROLEPLAY").font(.caption2).foregroundColor(.red.opacity(0.85))
                            }
                            styledSampText(dialog.title)
                                .font(.headline.bold())
                            Text("SURVIVOR AUTHENTICATION")
                                .font(.system(size: 9, weight: .bold))
                                .tracking(1.2)
                                .foregroundColor(.white.opacity(0.55))
                        }
                    }
                    Spacer()
                    Text("ROT CITY\nZONE 01")
                        .font(.system(size: 8, weight: .bold))
                        .multilineTextAlignment(.center)
                        .foregroundColor(.orange.opacity(0.85))
                        .padding(5)
                        .overlay(Rectangle().stroke(Color.orange.opacity(0.5)))
                        .rotationEffect(.degrees(-6))
                }

                Divider().background(Color.white.opacity(0.15))

                HStack(spacing: 8) {
                    Text("◆").foregroundColor(.yellow).font(.caption)
                    styledSampText(dialog.message)
                        .font(.callout)
                    Spacer()
                }
                .padding(10)
                .background(Color(red: 0.08, green: 0.16, blue: 0.22))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.cyan.opacity(0.25)))

                Text("รหัสผ่าน")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.75))

                Group {
                    if dialog.style == 3 {
                        SecureField("กรอกรหัสผ่าน", text: $session.dialogInput)
                    } else {
                        TextField("กรอกรหัสผ่าน", text: $session.dialogInput)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.black.opacity(0.45))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.white.opacity(0.18)))
                .foregroundColor(.white)

                HStack(spacing: 10) {
                    if !dialog.button2.isEmpty {
                        Button {
                            session.submitDialog(buttonId: 0)
                        } label: {
                            Text(dialog.button2)
                                .font(.callout.bold())
                                .padding(.horizontal, 16)
                                .padding(.vertical, 11)
                                .foregroundColor(.white.opacity(0.85))
                                .background(Color.white.opacity(0.08))
                                .cornerRadius(6)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.white.opacity(0.18)))
                        }
                    }
                    Button {
                        session.submitDialog(buttonId: 1)
                    } label: {
                        Text(dialog.button1.isEmpty ? "เข้าสู่ระบบ" : dialog.button1)
                            .font(.callout.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .foregroundColor(.white)
                            .background(
                                LinearGradient(
                                    colors: [Color(red: 0.14, green: 0.56, blue: 0.68), Color(red: 0.12, green: 0.45, blue: 0.62)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(6)
                    }
                }

                HStack {
                    Text(dialog.title.contains("สมัคร") ? "ลงทะเบียน" : "เข้าสู่ระบบ")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                    Text("INFECTED AREA · ACCESS CONTROL")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.orange.opacity(0.65))
                }
            }
            .padding(18)
            .frame(maxWidth: 460)
            .background(Color(red: 0.06, green: 0.11, blue: 0.16))
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.cyan.opacity(0.35)))
        }
    }

    @ViewBuilder
    private func dialogOverlay(_ dialog: SampDialog) -> some View {
        ZStack {
            Color.black.opacity(0.65).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 12) {
                styledSampText(dialog.title).font(.headline)
                if dialog.style == 2 || dialog.style == 4 || dialog.style == 5 {
                    let lines = dialog.message.components(separatedBy: "\n")
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(Array(lines.enumerated()), id: \.offset) { idx, line in
                                Button {
                                    session.selectedListIndex = idx
                                } label: {
                                    styledSampText(line.replacingOccurrences(of: "\t", with: "   "))
                                        .font(.callout)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(8)
                                        .background(session.selectedListIndex == idx ? Color.accentColor.opacity(0.35) : Color.white.opacity(0.06))
                                        .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .frame(maxHeight: 180)
                } else {
                    ScrollView {
                        styledSampText(dialog.message)
                            .font(.callout)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxHeight: 150)
                }

                if dialog.style == 1 {
                    TextField("กรอกข้อความ", text: $session.dialogInput)
                        .textFieldStyle(.roundedBorder)
                } else if dialog.style == 3 {
                    SecureField("รหัสผ่าน", text: $session.dialogInput)
                        .textFieldStyle(.roundedBorder)
                }

                HStack {
                    Spacer()
                    if !dialog.button2.isEmpty {
                        Button(dialog.button2) { session.submitDialog(buttonId: 0) }
                            .buttonStyle(.bordered)
                    }
                    Button(dialog.button1.isEmpty ? "ตกลง" : dialog.button1) {
                        session.submitDialog(buttonId: 1)
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(20)
            .frame(maxWidth: 460)
            .background(Color(red: 0.08, green: 0.11, blue: 0.17))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.15)))
        }
    }
}

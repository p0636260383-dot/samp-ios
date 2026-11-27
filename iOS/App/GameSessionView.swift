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
    let nickname: String
    @Environment(\.dismiss) private var dismiss
    @StateObject private var session = GameSessionModel()
    @StateObject private var voice = VoiceCapture()
    @State private var showChat = true
    @State private var chatText = ""

    var body: some View {
        ZStack {
            Color(red: 0.03, green: 0.05, blue: 0.09).ignoresSafeArea()

            // Live Android-compatible /dweb WebView UI layer
            LiveMobileUIView(session: session)
                .ignoresSafeArea()

            // Top HUD bar + Chat + Controls
            VStack(spacing: 6) {
                HStack(spacing: 10) {
                    Circle()
                        .fill(stateColor)
                        .frame(width: 9, height: 9)
                    Text("\(session.statusText) · \(nickname)")
                        .font(.caption.bold())
                        .lineLimit(1)
                    Spacer()
                    Button {
                        voice.isCapturing ? voice.stop() : voice.requestAndStart()
                    } label: {
                        Label(voice.isCapturing ? "MIC ON" : "MIC", systemImage: voice.isCapturing ? "mic.fill" : "mic")
                    }
                    .font(.caption)
                    .buttonStyle(.bordered)
                    .tint(voice.isCapturing ? .green : .secondary)

                    Button(showChat ? "ซ่อนแชท" : "แชท") { showChat.toggle() }
                        .font(.caption)
                        .buttonStyle(.bordered)

                    Button("ออกเกม") {
                        voice.stop()
                        session.stop()
                        dismiss()
                    }
                    .font(.caption)
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial)

                if showChat {
                    VStack(alignment: .leading, spacing: 6) {
                        ScrollViewReader { proxy in
                            ScrollView {
                                LazyVStack(alignment: .leading, spacing: 3) {
                                    ForEach(Array(session.chatLines.enumerated()), id: \.offset) { idx, line in
                                        styledSampText(line.text)
                                            .font(.caption)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .id(idx)
                                    }
                                }
                                .padding(8)
                            }
                            .onChange(of: session.chatLines.count) { count in
                                if count > 0 { proxy.scrollTo(count - 1, anchor: .bottom) }
                            }
                        }
                        .frame(maxWidth: 460, maxHeight: 150)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(8)

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
                    .padding(.leading, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()
            }

            if let dialog = session.activeDialog {
                dialogOverlay(dialog)
                    .zIndex(100)
            }
        }
        .onAppear { session.start(nickname: nickname) }
        .onDisappear {
            voice.stop()
            session.stop()
        }
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

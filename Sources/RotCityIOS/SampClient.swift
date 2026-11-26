import Foundation
import RotCityNativeBridge

public enum SampConnectionState: Int32, Equatable {
    case disconnected = 0
    case connecting = 1
    case awaitJoin = 2
    case connected = 3
}

public struct SampDialog: Equatable {
    public let id: UInt16
    public let style: Int
    public let title: String
    public let message: String
    public let button1: String
    public let button2: String

    public init(id: UInt16, style: Int, title: String, message: String, button1: String, button2: String) {
        self.id = id
        self.style = style
        self.title = title
        self.message = message
        self.button1 = button1
        self.button2 = button2
    }
}

public struct SampChatMessage: Equatable {
    public let color: UInt32
    public let playerId: Int
    public let text: String

    public init(color: UInt32, playerId: Int, text: String) {
        self.color = color
        self.playerId = playerId
        self.text = text
    }
}

public enum SampEvent: Equatable {
    case stateChanged(SampConnectionState, hostName: String, info: String, playerId: Int)
    case duiPacket(String)
    case chatMessage(SampChatMessage)
    case showDialog(SampDialog)
    case disconnected(reason: String)
}

public final class SampClient {
    private var handle: UnsafeMutableRawPointer?

    public init() {
        self.handle = rotcity_client_create()
    }

    deinit {
        if let handle {
            rotcity_client_destroy(handle)
            self.handle = nil
        }
    }

    /// Exact parity with Android SAMP.isValidNickname: 3-20 ASCII characters from [A-Za-z0-9_[]()$@.=].
    public static func isValidNickname(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 3 && trimmed.count <= 20 else { return false }
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_[]()$@.=")
        return trimmed.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    public var state: SampConnectionState {
        guard let handle else { return .disconnected }
        return SampConnectionState(rawValue: Int32(rotcity_client_state(handle).rawValue)) ?? .disconnected
    }

    @discardableResult
    public func connect(host: String, port: UInt16, nickname: String, password: String = "") -> Bool {
        guard let handle else { return false }
        return host.withCString { cHost in
            nickname.withCString { cNick in
                password.withCString { cPass in
                    rotcity_client_connect(handle, cHost, port, cNick, cPass)
                }
            }
        }
    }

    public func disconnect() {
        guard let handle else { return }
        rotcity_client_disconnect(handle)
    }

    public func poll() {
        guard let handle else { return }
        rotcity_client_poll(handle)
    }

    public func popEvent() -> SampEvent? {
        guard let handle else { return nil }
        var raw = rotcity_event_t()
        guard rotcity_client_pop_event(handle, &raw) else { return nil }

        let title = withUnsafePointer(to: &raw.title) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: 256) { String(cString: $0) }
        }
        let textData = withUnsafePointer(to: &raw.text) { ptr -> Data in
            ptr.withMemoryRebound(to: UInt8.self, capacity: 4096) { buf in
                let len = strnlen(UnsafeRawPointer(buf).assumingMemoryBound(to: CChar.self), 4096)
                return Data(bytes: buf, count: len)
            }
        }
        let button1 = withUnsafePointer(to: &raw.button1) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: 64) { String(cString: $0) }
        }
        let button2 = withUnsafePointer(to: &raw.button2) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: 64) { String(cString: $0) }
        }
        let decodedText = ThaiServerEncoding.decode(textData)

        switch raw.type {
        case ROTCITY_EVENT_STATE_CHANGED:
            let next = SampConnectionState(rawValue: raw.int_arg1) ?? .disconnected
            return .stateChanged(next, hostName: title, info: decodedText, playerId: Int(raw.int_arg2))
        case ROTCITY_EVENT_DUI_PACKET:
            let ascii = String(data: textData, encoding: .utf8) ?? decodedText
            return .duiPacket(ascii)
        case ROTCITY_EVENT_CHAT_MESSAGE:
            return .chatMessage(SampChatMessage(
                color: UInt32(bitPattern: raw.int_arg1),
                playerId: Int(raw.int_arg2),
                text: decodedText
            ))
        case ROTCITY_EVENT_SHOW_DIALOG:
            let titleData = withUnsafePointer(to: &raw.title) { ptr -> Data in
                ptr.withMemoryRebound(to: UInt8.self, capacity: 256) { buf in
                    let len = strnlen(UnsafeRawPointer(buf).assumingMemoryBound(to: CChar.self), 256)
                    return Data(bytes: buf, count: len)
                }
            }
            return .showDialog(SampDialog(
                id: UInt16(truncatingIfNeeded: raw.int_arg1),
                style: Int(raw.int_arg2),
                title: ThaiServerEncoding.decode(titleData),
                message: decodedText,
                button1: button1,
                button2: button2
            ))
        case ROTCITY_EVENT_DISCONNECTED:
            return .disconnected(reason: decodedText)
        default:
            return nil
        }
    }

    @discardableResult
    public func sendChat(_ message: String) -> Bool {
        guard let handle else { return false }
        let data = ThaiServerEncoding.encode(message) ?? Data(message.utf8)
        guard !data.isEmpty, data.count <= 255 else { return false }
        return data.withUnsafeBytes { raw in
            guard let base = raw.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return false }
            return rotcity_client_send_chat(handle, base, Int32(data.count))
        }
    }

    @discardableResult
    public func sendCommand(_ command: String) -> Bool {
        guard let handle else { return false }
        let data = ThaiServerEncoding.encode(command) ?? Data(command.utf8)
        guard !data.isEmpty else { return false }
        return data.withUnsafeBytes { raw in
            guard let base = raw.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return false }
            return rotcity_client_send_command(handle, base, Int32(data.count))
        }
    }

    @discardableResult
    public func sendDialogResponse(dialogId: UInt16, buttonId: UInt8, listItem: UInt16 = 0, input: String = "") -> Bool {
        guard let handle else { return false }
        let data = ThaiServerEncoding.encode(input) ?? Data(input.utf8)
        return data.withUnsafeBytes { raw in
            let ptr = raw.baseAddress?.assumingMemoryBound(to: UInt8.self)
            return rotcity_client_send_dialog_response(handle, dialogId, buttonId, listItem, ptr, Int32(data.count))
        }
    }

    public static func buildClientJoinPayload(nickname: String, challenge: UInt32) -> Data? {
        var buf = [UInt8](repeating: 0, count: 512)
        let n = nickname.withCString { cNick in
            rotcity_build_client_join_payload(cNick, challenge, &buf, 512)
        }
        guard n > 0 else { return nil }
        return Data(buf.prefix(Int(n)))
    }
}

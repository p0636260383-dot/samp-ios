import Foundation

public enum UIArgument: Equatable {
    case string(String)
    case number(Double)
    public var jsonValue: Any {
        switch self { case .string(let value): return value; case .number(let value): return value }
    }
}

public enum MobileUIAction: Equatable {
    case reset
    case command(String)
    case create(id: Int, path: String, hidden: Bool, focused: Bool)
    case hidden(id: Int, value: Bool)
    case focused(id: Int, value: Bool)
    case event(name: String, arguments: [UIArgument])
}

/// Matches RotGameUi.java: dialog 65000 / @DUI@ and @DUI@ client messages.
public struct MobileUIProtocol {
    private var incoming = ""
    public init() {}

    public mutating func receive(_ packet: String) -> MobileUIAction? {
        if packet == "reset" { incoming = ""; return .reset }
        guard let mode = packet.first, mode == "+" || mode == "=" else { return nil }
        guard incoming.utf16.count + packet.utf16.count <= 4097 else { incoming = ""; return nil }
        incoming += packet.dropFirst()
        guard mode == "=" else { return nil }
        let fields = incoming.components(separatedBy: "|")
        incoming = ""
        switch fields.first {
        case "A" where fields.count == 1: return .command("/dweb auth ROTCITY_MOB_2026_V2")
        case "R" where fields.count == 1: return .command("/dweb ready")
        case "C" where fields.count == 5:
            guard let id = Int(fields[1]), id >= 0,
                  ["0", "1"].contains(fields[2]), ["0", "1"].contains(fields[3]) else { return nil }
            return .create(id: id, path: fields[4], hidden: fields[2] == "1", focused: fields[3] == "1")
        case "H", "F":
            guard fields.count == 3, let id = Int(fields[1]), ["0", "1"].contains(fields[2]) else { return nil }
            return fields[0] == "H" ? .hidden(id: id, value: fields[2] == "1") : .focused(id: id, value: fields[2] == "1")
        case "E" where fields.count >= 2:
            guard validEvent(fields[1]) else { return nil }
            var arguments: [UIArgument] = []
            for field in fields.dropFirst(2) {
                if field.first == "s", let bytes = Self.unhex(String(field.dropFirst())) {
                    arguments.append(.string(ThaiServerEncoding.decode(bytes)))
                } else if field.first == "n", field.dropFirst().range(of: "^-?[0-9]+(\\.[0-9]+)?$", options: .regularExpression) != nil,
                          let value = Double(field.dropFirst()), value.isFinite {
                    arguments.append(.number(value))
                } else { return nil }
            }
            return .event(name: fields[1], arguments: arguments)
        default: return nil
        }
    }

    public func commands(event: String, arguments: String) -> [String]? {
        guard validEvent(event), arguments.utf16.count <= 700,
              let bytes = ThaiServerEncoding.encode(arguments), !bytes.contains(where: { $0 < 32 || $0 == 127 }) else { return nil }
        let frame = event + "|" + bytes.map { String(format: "%02X", $0) }.joined()
        guard frame.count < 1500 else { return nil }
        let chars = Array(frame)
        return ["/dweb !"] + stride(from: 0, to: chars.count, by: 108).map { offset in
            let end = min(offset + 108, chars.count)
            return "/dweb " + (end == chars.count ? "=" : "+") + String(chars[offset..<end])
        }
    }

    public static func canonicalPath(_ path: String, registry: [String: String]) -> String? {
        var clean = String(path.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)[0])
        clean = String(clean.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)[0])
        if clean.hasPrefix("/") { clean.removeFirst() }
        for prefix in ["cef/assets/", "cef/", "rot-ui/"] where clean.hasPrefix(prefix) { clean = String(clean.dropFirst(prefix.count)) }
        guard !clean.contains(".."), !clean.contains("\\"), registry[clean] != nil else { return nil }
        return clean
    }

    private func validEvent(_ name: String) -> Bool {
        name.range(of: "^[a-z0-9_.:-]{1,64}$", options: .regularExpression) != nil
    }
    private static func unhex(_ text: String) -> Data? {
        let chars = Array(text)
        guard chars.count % 2 == 0 else { return nil }
        var bytes = Data()
        for i in stride(from: 0, to: chars.count, by: 2) {
            guard let byte = UInt8(String(chars[i...i+1]), radix: 16) else { return nil }
            bytes.append(byte)
        }
        return bytes
    }
}

import Foundation
import RotCityNativeBridge

public struct ServerStatus: Equatable {
    public let players: Int
    public let maxPlayers: Int
    public let name: String
    public let gameMode: String
    public let language: String
    public let pingMilliseconds: Int

    public static func query(_ server: ServerConfiguration = .rotCity) -> ServerStatus? {
        var buffer = [UInt8](repeating: 0, count: 4096)
        var ping: Int32 = 0
        let count = server.host.withCString { host in
            rotcity_query_info(host, server.port, &buffer, 4096, &ping)
        }
        guard count > 0 else { return nil }
        return parse(Data(buffer.prefix(Int(count))), pingMilliseconds: Int(ping))
    }

    public static func parse(_ data: Data, pingMilliseconds: Int) -> ServerStatus? {
        let bytes = Array(data)
        guard bytes.count >= 16, Array(bytes[0..<4]) == Array("SAMP".utf8), bytes[10] == 105 else { return nil }
        let players = Int(bytes[12]) | Int(bytes[13]) << 8
        let maxPlayers = Int(bytes[14]) | Int(bytes[15]) << 8
        var offset = 16
        func readString() -> String? {
            guard offset + 4 <= bytes.count else { return nil }
            let length = (0..<4).reduce(UInt32(0)) { $0 | UInt32(bytes[offset + $1]) << ($1 * 8) }
            offset += 4
            guard length <= 2048, Int(length) <= bytes.count - offset else { return nil }
            let text = ThaiServerEncoding.decode(Data(bytes[offset..<offset + Int(length)]))
            offset += Int(length)
            return text
        }
        guard let name = readString(), let gameMode = readString(), let language = readString() else { return nil }
        return ServerStatus(players: players, maxPlayers: maxPlayers, name: name,
                            gameMode: gameMode, language: language, pingMilliseconds: pingMilliseconds)
    }
}

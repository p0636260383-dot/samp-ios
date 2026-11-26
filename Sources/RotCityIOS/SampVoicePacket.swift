import Foundation

/// SampVoice v11 wire format from Android voice/{Header,VoicePacket,Network}.
public struct SampVoicePacket: Equatable {
    public let serverKey: UInt32
    public let kind: UInt32
    public let stream: UInt32
    public let sender: UInt16
    public let sequence: UInt32
    public let opus: Data

    public init(serverKey: UInt32, kind: UInt32 = 1, stream: UInt32 = 0, sender: UInt16 = 0,
                sequence: UInt32, opus: Data) {
        self.serverKey = serverKey; self.kind = kind; self.stream = stream
        self.sender = sender; self.sequence = sequence; self.opus = opus
    }
    public static func connectExtension(microphoneAvailable: Bool) -> Data {
        Data([0xef, 0xbe, 0xad, 0xde, 11, microphoneAvailable ? 1 : 0])
    }
    public static func crc32c(_ data: Data) -> UInt32 {
        var crc: UInt32 = 0xffffffff
        for byte in data {
            crc ^= UInt32(byte)
            for _ in 0..<8 { crc = (crc >> 1) ^ (crc & 1 == 1 ? 0x82f63b78 : 0) }
        }
        return ~crc
    }
    public func serialize() -> Data? {
        guard kind <= 1, opus.count <= 1376, kind != 0 || opus.isEmpty else { return nil }
        var header = Data()
        header.appendLE(serverKey); header.appendLE(kind); header.appendLE(stream)
        header.appendLE(sender); header.appendLE(UInt16(opus.count)); header.appendLE(sequence)
        var result = Data(); result.appendLE(Self.crc32c(header)); result.append(header); result.append(opus)
        return result
    }
    public static func parse(_ data: Data, expectedServerKey: UInt32) -> SampVoicePacket? {
        let bytes = Array(data)
        guard (24...1400).contains(bytes.count) else { return nil }
        func u32(_ index: Int) -> UInt32 { (0..<4).reduce(UInt32(0)) { $0 | UInt32(bytes[index+$1]) << ($1*8) } }
        func u16(_ index: Int) -> UInt16 { UInt16(bytes[index]) | UInt16(bytes[index+1]) << 8 }
        guard u32(0) == crc32c(Data(bytes[4..<24])), u32(4) == expectedServerKey,
              u32(8) <= 1, Int(u16(18)) == bytes.count - 24, u32(8) != 0 || bytes.count == 24 else { return nil }
        return SampVoicePacket(serverKey: u32(4), kind: u32(8), stream: u32(12), sender: u16(16), sequence: u32(20), opus: Data(bytes.dropFirst(24)))
    }
}

private extension Data {
    mutating func appendLE<T: FixedWidthInteger>(_ value: T) {
        for index in 0..<MemoryLayout<T>.size { append(UInt8(truncatingIfNeeded: value >> (index * 8))) }
    }
}

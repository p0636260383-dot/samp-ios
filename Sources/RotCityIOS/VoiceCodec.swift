import Foundation
import RotCityOpus

/// Use one instance per capture/remote speaker on its audio queue.
public final class VoiceCodec {
    private let handle: OpaquePointer
    public init?(bitrate: Int32 = 24000) {
        guard let handle = rotcity_codec_create(bitrate) else { return nil }
        self.handle = handle
    }
    deinit { rotcity_codec_destroy(handle) }
    public func encode(_ pcm: [Int16]) -> Data? {
        guard [120, 240, 480, 960, 1920, 2880, 3840, 4800, 5760].contains(pcm.count) else { return nil }
        var output = [UInt8](repeating: 0, count: 1376)
        let count = rotcity_codec_encode(handle, pcm, Int32(pcm.count), &output, 1376)
        return count > 0 ? Data(output.prefix(Int(count))) : nil
    }
    public func decode(_ packet: Data) -> [Int16]? {
        guard !packet.isEmpty, packet.count <= 1376 else { return nil }
        var output = [Int16](repeating: 0, count: 5760)
        let count = packet.withUnsafeBytes { raw in
            rotcity_codec_decode(handle, raw.bindMemory(to: UInt8.self).baseAddress, Int32(packet.count), &output, 5760)
        }
        return count > 0 ? Array(output.prefix(Int(count))) : nil
    }
}

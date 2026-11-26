import XCTest
@testable import RotCityIOS

final class VoiceTests: XCTestCase {
    func testAndroidVoiceHeaderAndChecksum() {
        XCTAssertEqual(SampVoicePacket.crc32c(Data("123456789".utf8)), 0xe3069283)
        XCTAssertEqual(SampVoicePacket.connectExtension(microphoneAvailable: true), Data([0xef, 0xbe, 0xad, 0xde, 11, 1]))
        let packet = SampVoicePacket(serverKey: 0x12345678, sequence: 7, opus: Data([1,2,3]))
        let wire = packet.serialize()!
        XCTAssertEqual(wire.count, 27)
        XCTAssertEqual(Array(wire[4..<8]), [0x78, 0x56, 0x34, 0x12])
        XCTAssertEqual(SampVoicePacket.parse(wire, expectedServerKey: 0x12345678), packet)
        XCTAssertNil(SampVoicePacket.parse(wire, expectedServerKey: 0))
        var corrupt = wire; corrupt[12] ^= 1
        XCTAssertNil(SampVoicePacket.parse(corrupt, expectedServerKey: 0x12345678))
        XCTAssertNil(SampVoicePacket.parse(wire.dropLast(), expectedServerKey: 0x12345678))
    }
    func testOpusAndroidFrameRoundTrip() throws {
        let codec = try XCTUnwrap(VoiceCodec())
        // Android accumulates five 960-sample capture chunks into a 100 ms voice frame.
        let samples = (0..<4800).map { Int16(sin(Double($0) * 2 * .pi * 440 / 48000) * 12000) }
        let encoded = try XCTUnwrap(codec.encode(samples))
        XCTAssertLessThanOrEqual(encoded.count, 1376)
        let decoded = try XCTUnwrap(codec.decode(encoded))
        XCTAssertEqual(decoded.count, samples.count)
        XCTAssertTrue(decoded.contains(where: { abs(Int($0)) > 100 }))
        XCTAssertNil(codec.encode([0, 1, 2]))
    }
}

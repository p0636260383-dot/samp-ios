import XCTest
@testable import RotCityIOS

final class ServerStatusTests: XCTestCase {
    func testRealSAMPQueryLayoutAndTruncatedPayload() throws {
        var packet = Data([83,65,77,80,127,0,0,1,0x10,0x18,105,0,3,0,100,0])
        for text in ["ROT CITY", "Zombie", "Thai"] {
            let bytes = Array(text.utf8)
            packet.append(contentsOf: [UInt8(bytes.count), 0, 0, 0]); packet.append(contentsOf: bytes)
        }
        let status = try XCTUnwrap(ServerStatus.parse(packet, pingMilliseconds: 30))
        XCTAssertEqual(status.players, 3); XCTAssertEqual(status.maxPlayers, 100)
        XCTAssertEqual(status.name, "ROT CITY"); XCTAssertEqual(status.pingMilliseconds, 30)
        XCTAssertNil(ServerStatus.parse(packet.dropLast(), pingMilliseconds: 0))
        packet[16] = 255; packet[17] = 255
        XCTAssertNil(ServerStatus.parse(packet, pingMilliseconds: 0))
    }
}

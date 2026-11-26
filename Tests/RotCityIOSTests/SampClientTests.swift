import XCTest
@testable import RotCityIOS

final class SampClientTests: XCTestCase {
    func testNicknameValidationMatchesAndroid() {
        XCTAssertTrue(SampClient.isValidNickname("Somchai"))
        XCTAssertTrue(SampClient.isValidNickname("Player_1"))
        XCTAssertTrue(SampClient.isValidNickname("[ROT]Boss$1"))
        XCTAssertFalse(SampClient.isValidNickname("ab"))
        XCTAssertFalse(SampClient.isValidNickname("123456789012345678901"))
        XCTAssertFalse(SampClient.isValidNickname("Player 1"))
        XCTAssertFalse(SampClient.isValidNickname("สมชาย"))
    }

    func testClientJoinWireLayoutMatchesAndroidNetGame() throws {
        let payload = try XCTUnwrap(SampClient.buildClientJoinPayload(nickname: "Somchai", challenge: 0x12345678))
        let bytes = Array(payload)
        // 4 (iVersion=4057) + 1 (byteMod=1) + 1 (nameLen=7) + 7 ("Somchai") + 4 (challenge) + 1 (authLen=42) + 42 + 1 (verLen=5) + 5 ("0.3.7") = 66
        XCTAssertEqual(bytes.count, 66)
        XCTAssertEqual(Array(bytes[0..<4]), [0xD9, 0x0F, 0x00, 0x00]) // 4057 little-endian
        XCTAssertEqual(bytes[4], 1)
        XCTAssertEqual(bytes[5], 7)
        XCTAssertEqual(String(bytes: bytes[6..<13], encoding: .ascii), "Somchai")
        XCTAssertEqual(Array(bytes[13..<17]), [0x78, 0x56, 0x34, 0x12])
        XCTAssertEqual(bytes[17], 42)
        XCTAssertEqual(String(bytes: bytes[18..<60], encoding: .ascii), "E02262CF28BC542486C558D4BE9EFB716592AFAF8B")
        XCTAssertEqual(bytes[60], 5)
        XCTAssertEqual(String(bytes: bytes[61..<66], encoding: .ascii), "0.3.7")
    }

    func testClientInitialStateAndSafeDisconnectedCalls() {
        let client = SampClient()
        XCTAssertEqual(client.state, .disconnected)
        client.poll()
        XCTAssertNil(client.popEvent())
        XCTAssertFalse(client.sendChat("สวัสดี"))
        XCTAssertFalse(client.sendCommand("/dweb ready"))
        XCTAssertFalse(client.sendDialogResponse(dialogId: 1, buttonId: 1, listItem: 0, input: "ok"))
        client.disconnect()
        XCTAssertEqual(client.state, .disconnected)
    }
}

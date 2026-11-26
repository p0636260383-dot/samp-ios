import XCTest
@testable import RotCityIOS

final class MobileUIProtocolTests: XCTestCase {
    func testAndroidHandshakeAndFragmentedPage() {
        var transport = MobileUIProtocol()
        XCTAssertEqual(transport.receive("=A"), .command("/dweb auth ROTCITY_MOB_2026_V2"))
        XCTAssertNil(transport.receive("+C|8|0|"))
        XCTAssertEqual(transport.receive("=1|cef/assets/rotcity-login/index.html"),
                       .create(id: 8, path: "cef/assets/rotcity-login/index.html", hidden: false, focused: true))
        XCTAssertEqual(transport.receive("=R"), .command("/dweb ready"))
    }
    func testThaiWireCompatibility() {
        let thai = "สวัสดี"
        let bytes = ThaiServerEncoding.encode(thai)!
        XCTAssertEqual(Array(bytes), [0xca, 0xc7, 0xd1, 0xca, 0xb4, 0xd5])
        XCTAssertEqual(ThaiServerEncoding.decode(bytes), thai)
        XCTAssertEqual(ThaiServerEncoding.decode(Data(thai.utf8)), thai)
        XCTAssertNil(ThaiServerEncoding.encode("😀"))
        var transport = MobileUIProtocol()
        XCTAssertEqual(transport.receive("=E|rotui.message|sCAC7D1CAB4D5|n3"), .event(name: "rotui.message", arguments: [.string(thai), .number(3)]))
    }
    func testCommandChunkingAndInjectionRejection() {
        let transport = MobileUIProtocol()
        let commands = transport.commands(event: "rotinv.move", arguments: String(repeating: "ก", count: 200))!
        XCTAssertEqual(commands.first, "/dweb !")
        XCTAssertTrue(commands.last!.hasPrefix("/dweb ="))
        XCTAssertTrue(commands.dropFirst().allSatisfy { $0.count <= 115 })
        XCTAssertNil(transport.commands(event: "bad event", arguments: "ok"))
        XCTAssertNil(transport.commands(event: "rotui.login", arguments: "a\n/quit"))
    }
    func testInvalidFramesAndPathsAreRejected() {
        var transport = MobileUIProtocol()
        XCTAssertNil(transport.receive("=H"))
        XCTAssertNil(transport.receive("=E|rotui.x|sQ0"))
        XCTAssertNil(transport.receive("+" + String(repeating: "x", count: 4100)))
        XCTAssertEqual(transport.receive("=reset"), nil)
        let registry = ["rotcity-login/index.html": "rotui."]
        XCTAssertEqual(MobileUIProtocol.canonicalPath("cef/assets/rotcity-login/index.html?v=1", registry: registry), "rotcity-login/index.html")
        XCTAssertNil(MobileUIProtocol.canonicalPath("../secret", registry: registry))
        XCTAssertNil(MobileUIProtocol.canonicalPath("https://example.com/", registry: registry))
    }
}

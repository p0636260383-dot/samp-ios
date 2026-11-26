import XCTest
@testable import RotCityIOS

final class PatchAndDataTests: XCTestCase {
    func testManifestParsingMatchesAndroidKeys() throws {
        let primary = Data("""
        {
          "version": 3,
          "name": "Rot City UI Patch v1.0.3",
          "zip_url": "http://diamond1412.thddns.net:8080/patch/cef_patch.zip",
          "changelog": "อัปเดตกระเป๋า"
        }
        """.utf8)
        let m1 = try XCTUnwrap(PatchManifest.parse(primary))
        XCTAssertEqual(m1.version, 3)
        XCTAssertEqual(m1.name, "Rot City UI Patch v1.0.3")
        XCTAssertEqual(m1.zipURL.absoluteString, "http://diamond1412.thddns.net:8080/patch/cef_patch.zip")
        XCTAssertEqual(m1.changelog, "อัปเดตกระเป๋า")

        let alt = Data("""
        {
          "patch_version": 5,
          "patch_name": "Alt Patch",
          "patch_url": "http://diamond1412.thddns.net:8787/ui.zip",
          "description": "Fixes"
        }
        """.utf8)
        let m2 = try XCTUnwrap(PatchManifest.parse(alt))
        XCTAssertEqual(m2.version, 5)
        XCTAssertEqual(m2.name, "Alt Patch")
        XCTAssertEqual(m2.changelog, "Fixes")

        XCTAssertNil(PatchManifest.parse(Data(#"{"version": 0, "zip_url": "http://example.com/a.zip"}"#.utf8)))
        XCTAssertNil(PatchManifest.parse(Data(#"{"version": 1}"#.utf8)))
    }

    func testSafeRelativePathRejectsTraversal() {
        XCTAssertEqual(PatchAndDataConfig.safeRelativePath("rot-ui/pages.json"), "rot-ui/pages.json")
        XCTAssertNil(PatchAndDataConfig.safeRelativePath("../etc/passwd"))
        XCTAssertNil(PatchAndDataConfig.safeRelativePath("a/../b"))
        XCTAssertNil(PatchAndDataConfig.safeRelativePath("/abs/path"))
        XCTAssertNil(PatchAndDataConfig.safeRelativePath("win\\path"))
    }
}

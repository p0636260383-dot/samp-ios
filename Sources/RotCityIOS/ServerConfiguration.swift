import Foundation

public struct ServerConfiguration: Codable, Equatable {
    public let host: String
    public let port: UInt16
    public let patchManifestURL: URL

    // Same defaults as the Android launcher's MainActivity.java.
    public static let rotCity = ServerConfiguration(
        host: "diamond1412.thddns.net", port: 6160,
        patchManifestURL: URL(string: "http://diamond1412.thddns.net:8787/mobile-patch.json")!
    )
    public var address: String { "\(host):\(port)" }
}

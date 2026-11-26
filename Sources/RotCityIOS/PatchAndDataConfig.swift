import Foundation

public struct PatchManifest: Equatable {
    public let version: Int
    public let zipURL: URL
    public let name: String
    public let changelog: String

    public init(version: Int, zipURL: URL, name: String, changelog: String) {
        self.version = version
        self.zipURL = zipURL
        self.name = name
        self.changelog = changelog
    }

    /// Parses Android MainActivity.java manifest JSON (`version` / `patch_version`, `zip_url` / `patch_url`, `name` / `patch_name`, `changelog` / `description`).
    public static func parse(_ data: Data) -> PatchManifest? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        let version = (json["version"] as? Int) ?? (json["patch_version"] as? Int) ?? 0
        let urlString = ((json["zip_url"] as? String) ?? (json["patch_url"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard version > 0, let url = URL(string: urlString), !urlString.isEmpty else { return nil }
        let name = (json["name"] as? String) ?? (json["patch_name"] as? String) ?? "Rot City UI Patch"
        let changelog = (json["changelog"] as? String) ?? (json["description"] as? String) ?? ""
        return PatchManifest(version: version, zipURL: url, name: name, changelog: changelog)
    }
}

public enum PatchAndDataConfig {
    /// Same Google Drive data archive URL as Android MainActivity.java (`DATA_DOWNLOAD_URL`).
    public static let dataDownloadURL = URL(
        string: "https://drive.usercontent.google.com/download?id=1-D7dqo_BI3AxmwrEcQGIs84Ezv0YAmyG&export=download&confirm=t"
    )!

    public static let estimatedDataSizeMB = 623.0

    /// Same manifest fallback order as Android MainActivity.java (`checkPatchManifest`).
    public static let patchManifestURLs: [URL] = [
        URL(string: "http://diamond1412.thddns.net:8787/mobile-patch.json")!,
        URL(string: "http://diamond1412.thddns.net:8080/patch/version.json")!,
        URL(string: "http://diamond1412.thddns.net/patch/version.json")!
    ]

    /// Normalizes a zip entry path and rejects path traversal (`..`, `\`, absolute paths).
    public static func safeRelativePath(_ entry: String) -> String? {
        guard !entry.isEmpty, !entry.contains("\\"), !entry.hasPrefix("/") else { return nil }
        let parts = entry.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
        guard !parts.isEmpty, !parts.contains(".."), !parts.contains(".") else { return nil }
        return parts.joined(separator: "/")
    }
}

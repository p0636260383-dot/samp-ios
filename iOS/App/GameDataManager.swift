import Foundation
import RotCityIOS

final class GameDataManager: NSObject, ObservableObject, URLSessionDownloadDelegate {
    private static let patchVersionKey = "rotcity_patch_version"
    private static let dataVersionKey = "rotcity_data_version"

    @Published var dataInstalled = false
    @Published var dataStatusText = "ยังไม่ได้ติดตั้งดาต้าเกม"
    @Published var patchStatusText = "แพตช์ UI: ยังไม่ได้ตรวจสอบ"
    @Published var installedPatchVersion: Int = 0
    @Published var pendingManifest: PatchManifest?
    @Published var checkingPatch = false

    @Published var isDownloading = false
    @Published var downloadTitle = ""
    @Published var downloadProgress: Double = 0
    @Published var downloadDetail = ""
    @Published var downloadError: String?

    private var downloadTask: URLSessionDownloadTask?
    private var activeCompletion: ((URL) -> Void)?
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 1800
        return URLSession(configuration: config, delegate: self, delegateQueue: .main)
    }()

    static var documentsDir: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    static var gtaDataDir: URL {
        documentsDir.appendingPathComponent("GTA", isDirectory: true)
    }

    static var uiPatchDir: URL {
        documentsDir.appendingPathComponent("rot-ui", isDirectory: true)
    }

    override init() {
        super.init()
        refreshLocalStatus()
    }

    func refreshLocalStatus() {
        let fm = FileManager.default
        let settingsIni = Self.gtaDataDir.appendingPathComponent("SAMP/settings.ini").path
        let dataFolder = Self.gtaDataDir.appendingPathComponent("data").path
        let hasFiles = fm.fileExists(atPath: settingsIni) || fm.fileExists(atPath: dataFolder)
        dataInstalled = hasFiles
        let savedVer = UserDefaults.standard.integer(forKey: Self.dataVersionKey)
        dataStatusText = hasFiles
            ? (savedVer > 0 ? "ติดตั้งดาต้าเกมแล้ว (v\(savedVer))" : "ติดตั้งดาต้าเกมแล้ว (Documents/GTA)")
            : "ยังไม่ได้ติดตั้งดาต้าเกม (~623 MB)"

        installedPatchVersion = UserDefaults.standard.integer(forKey: Self.patchVersionKey)
        if installedPatchVersion > 0 {
            patchStatusText = "แพตช์ UI: v\(installedPatchVersion) (พร้อมใช้งาน)"
        }
    }

    func checkPatchManifest(autoApply: Bool = false) {
        guard !checkingPatch else { return }
        checkingPatch = true
        patchStatusText = "⚡ แพตช์ UI: กำลังตรวจสอบ..."

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            var found: PatchManifest?
            for url in PatchAndDataConfig.patchManifestURLs {
                var request = URLRequest(url: url, timeoutInterval: 4)
                request.setValue("RotCityLauncher/1.0", forHTTPHeaderField: "User-Agent")
                let sem = DispatchSemaphore(value: 0)
                URLSession.shared.dataTask(with: request) { data, response, _ in
                    if let http = response as? HTTPURLResponse, http.statusCode == 200, let data {
                        found = PatchManifest.parse(data)
                    }
                    sem.signal()
                }.resume()
                sem.wait()
                if found != nil { break }
            }

            DispatchQueue.main.async {
                guard let self else { return }
                self.checkingPatch = false
                guard let manifest = found else {
                    self.pendingManifest = nil
                    self.patchStatusText = "⚡ แพตช์ UI: เชื่อมต่อเซิร์ฟเวอร์แพตช์ไม่ได้ (ใช้ไฟล์ในแอป)"
                    return
                }
                if manifest.version > self.installedPatchVersion {
                    self.pendingManifest = manifest
                    self.patchStatusText = "⚡ พบแพตช์ UI ใหม่ v\(manifest.version): \(manifest.name)"
                    if autoApply && !self.isDownloading {
                        self.downloadAndApplyPatch(manifest)
                    }
                } else {
                    self.pendingManifest = nil
                    self.patchStatusText = "⚡ แพตช์ UI: เป็นเวอร์ชันล่าสุด (v\(self.installedPatchVersion))"
                }
            }
        }
    }

    func startDataDownload() {
        guard !isDownloading else { return }
        isDownloading = true
        downloadError = nil
        downloadTitle = "📥 ดาวน์โหลดและติดตั้งดาต้า ROT CITY"
        downloadProgress = 0
        downloadDetail = "กำลังเชื่อมต่อ Google Drive (~623 MB)..."

        activeCompletion = { [weak self] localZip in
            self?.extractArchive(localZip, to: Self.gtaDataDir, stripPrefix: nil, title: "กำลังแตกไฟล์ดาต้าเกม...") {
                UserDefaults.standard.set(1, forKey: Self.dataVersionKey)
                self?.refreshLocalStatus()
            }
        }
        downloadTask = session.downloadTask(with: PatchAndDataConfig.dataDownloadURL)
        downloadTask?.resume()
    }

    func downloadAndApplyPatch(_ manifest: PatchManifest) {
        guard !isDownloading else { return }
        isDownloading = true
        downloadError = nil
        downloadTitle = "⚡ อัปเดต \(manifest.name) (v\(manifest.version))"
        downloadProgress = 0
        downloadDetail = "กำลังดาวน์โหลดแพตช์ UI..."

        activeCompletion = { [weak self] localZip in
            self?.extractArchive(localZip, to: Self.uiPatchDir, stripPrefix: "rot-ui/", title: "กำลังติดตั้งแพตช์ UI...") {
                UserDefaults.standard.set(manifest.version, forKey: Self.patchVersionKey)
                self?.pendingManifest = nil
                self?.refreshLocalStatus()
            }
        }
        downloadTask = session.downloadTask(with: manifest.zipURL)
        downloadTask?.resume()
    }

    func cancelDownload() {
        downloadTask?.cancel()
        downloadTask = nil
        activeCompletion = nil
        isDownloading = false
        downloadDetail = "ยกเลิกแล้ว"
    }

    private func extractArchive(
        _ zipURL: URL,
        to destination: URL,
        stripPrefix: String?,
        title: String,
        onSuccess: @escaping () -> Void
    ) {
        downloadDetail = title
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            defer { try? FileManager.default.removeItem(at: zipURL) }
            do {
                try ZipExtractor.extract(zipURL: zipURL, to: destination, stripLeadingPrefix: stripPrefix) { done, total in
                    DispatchQueue.main.async {
                        self?.downloadProgress = total > 0 ? Double(done) / Double(total) : 0
                        self?.downloadDetail = "\(title) (\(done)/\(total) ไฟล์)"
                    }
                }
                DispatchQueue.main.async {
                    self?.isDownloading = false
                    self?.downloadProgress = 1
                    onSuccess()
                }
            } catch {
                DispatchQueue.main.async {
                    self?.isDownloading = false
                    self?.downloadError = error.localizedDescription
                }
            }
        }
    }

    // MARK: - URLSessionDownloadDelegate

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didWriteData bytesWritten: Int64,
        totalBytesWritten: Int64,
        totalBytesExpectedToWrite: Int64
    ) {
        let writtenMB = Double(totalBytesWritten) / (1024 * 1024)
        let totalMB = totalBytesExpectedToWrite > 0
            ? Double(totalBytesExpectedToWrite) / (1024 * 1024)
            : PatchAndDataConfig.estimatedDataSizeMB
        let pct = min(1.0, writtenMB / max(totalMB, 1.0))
        downloadProgress = pct
        downloadDetail = String(format: "%.1f / %.1f MB (%d%%)", writtenMB, totalMB, Int(pct * 100))
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".zip")
        do {
            try FileManager.default.moveItem(at: location, to: tmp)
            let completion = activeCompletion
            activeCompletion = nil
            self.downloadTask = nil
            completion?(tmp)
        } catch {
            isDownloading = false
            downloadError = error.localizedDescription
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let error else { return }
        if (error as NSError).code == NSURLErrorCancelled { return }
        isDownloading = false
        downloadTask = nil
        activeCompletion = nil
        downloadError = error.localizedDescription
    }
}

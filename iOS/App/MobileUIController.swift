import UIKit
import WebKit
import RotCityIOS
import UniformTypeIdentifiers

/// The same registered pages and event prefixes as the Android APK.
/// Attach `sendCommand` and call `receive` from a future SA-MP session adapter.
final class MobileUIController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private struct Page {
        let web: WKWebView
        let prefixes: [String]
        var hidden: Bool
        var focused: Bool
        var loaded = false
        var pending: [String] = []
    }
    var sendCommand: ((String) -> Void)?
    var report: ((String) -> Void)?
    private var transport = MobileUIProtocol()
    private var pages: [Int: Page] = [:]
    private(set) var registry: [String: String] = [:]
    private let assets: URL
    private let patchedAssets: URL

    init() {
        assets = Bundle.main.bundleURL.appendingPathComponent("rot-ui", isDirectory: true)
        patchedAssets = GameDataManager.uiPatchDir
        super.init(nibName: nil, bundle: nil)
        let patchedPages = patchedAssets.appendingPathComponent("pages.json")
        let bundledPages = assets.appendingPathComponent("pages.json")
        if let data = (try? Data(contentsOf: patchedPages)) ?? (try? Data(contentsOf: bundledPages)),
           let decoded = try? JSONDecoder().decode([String: String].self, from: data) { registry = decoded }
    }
    required init?(coder: NSCoder) { fatalError("Use init()") }
    override func viewDidLoad() { super.viewDidLoad(); view.backgroundColor = .clear }

    func receive(_ packet: String) {
        precondition(Thread.isMainThread)
        guard let action = transport.receive(packet) else { return }
        switch action {
        case .reset: closeAll()
        case .command(let command):
            if command == "/dweb ready" { closeAll() }
            sendCommand?(command)
        case .create(let id, let path, let hidden, let focused): open(id: id, path: path, hidden: hidden, focused: focused)
        case .hidden(let id, let value): pages[id]?.hidden = value; apply(id)
        case .focused(let id, let value): pages[id]?.focused = value; apply(id)
        case .event(let name, let arguments):
            guard let json = try? JSONSerialization.data(withJSONObject: [name, arguments.map(\.jsonValue)]),
                  let literal = String(data: json, encoding: .utf8) else { return }
            let script = "window.diamondUiReceive.apply(null,\(literal));"
            for id in Array(pages.keys) {
                guard let page = pages[id], page.prefixes.contains(where: { name.lowercased().hasPrefix($0.lowercased()) }) else { continue }
                if page.loaded { page.web.evaluateJavaScript(script, completionHandler: nil) }
                else if page.pending.count < 512 { pages[id]?.pending.append(script) }
            }
        }
    }

    func preview(_ path: String) { loadViewIfNeeded(); closeAll(); open(id: 1, path: path, hidden: false, focused: true) }

    private func open(id: Int, path: String, hidden: Bool, focused: Bool) {
        guard let clean = MobileUIProtocol.canonicalPath(path, registry: registry), let prefix = registry[clean] else { return }
        if let old = pages.removeValue(forKey: id) { destroy(old) }
        guard pages.count < 24 else { return }
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(UIAssetHandler(root: assets, overrideRoot: patchedAssets), forURLScheme: "rotui")
        let content = WKUserContentController()
        content.add(WeakScriptHandler(self), name: "DiamondUi")
        let panel = clean.components(separatedBy: "/")[0]
        let panelJSON = String(data: try! JSONSerialization.data(withJSONObject: [panel]), encoding: .utf8)!
        let bootstrap = """
        (()=>{const events=new Map();
        window.cef=Object.freeze({on:(n,f)=>{if(typeof f!=='function')return;
          if(!events.has(n))events.set(n,[]);events.get(n).push(f)},
          emit:(n,...a)=>window.webkit.messageHandlers.DiamondUi.postMessage({name:String(n),args:a.map(String).join(' ')})});
        window.diamondUiReceive=(n,a)=>{for(const f of events.get(n)||[]){try{f(...a)}catch(e){console.error(e)}}};
        const panel=\(panelJSON)[0];
        document.addEventListener('DOMContentLoaded',()=>{
          document.documentElement.dataset.rotPage=panel;document.documentElement.dataset.mobileUi=panel;
          if(!document.querySelector('meta[name="viewport"]')){const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m)}
          for(const name of ['mobile.css','mobile-layout.css']){const l=document.createElement('link');l.rel='stylesheet';l.href='rotui://bundle/rotcity-shared/'+name;document.head.appendChild(l)}
        });})();
        """
        content.addUserScript(WKUserScript(source: bootstrap, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        configuration.userContentController = content
        let web = WKWebView(frame: .zero, configuration: configuration)
        web.isOpaque = false; web.backgroundColor = .clear; web.scrollView.backgroundColor = .clear
        web.scrollView.bounces = false
        web.navigationDelegate = self
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.topAnchor), web.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        pages[id] = Page(web: web, prefixes: prefix.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }, hidden: hidden, focused: focused)
        apply(id)
        var url = URLComponents(); url.scheme = "rotui"; url.host = "bundle"; url.path = "/" + clean
        if let url = url.url { web.load(URLRequest(url: url)) }
    }

    private func apply(_ id: Int) {
        guard let page = pages[id] else { return }
        page.web.isHidden = page.hidden || !page.loaded
        page.web.isUserInteractionEnabled = page.focused && !page.hidden
        page.web.layer.zPosition = page.focused ? 2 : 0.5
        if !page.focused { page.web.endEditing(true) }
    }
    func closeAll() { for page in pages.values { destroy(page) }; pages.removeAll() }
    private func destroy(_ page: Page) {
        page.web.stopLoading()
        page.web.configuration.userContentController.removeScriptMessageHandler(forName: "DiamondUi")
        page.web.navigationDelegate = nil
        page.web.removeFromSuperview()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "rotui", message.frameInfo.request.url?.host == "bundle",
              let web = message.webView, pages.values.contains(where: { $0.web === web }),
              let body = message.body as? [String: String], let name = body["name"], let args = body["args"],
              let commands = transport.commands(event: name, arguments: args) else { return }
        guard let sendCommand = sendCommand else { report?("UI: \(name) · ยังไม่ได้เชื่อมต่อเกม"); return }
        commands.forEach(sendCommand)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let id = pages.first(where: { $0.value.web === webView })?.key else { return }
        pages[id]?.loaded = true
        let pending = pages[id]?.pending ?? []
        pages[id]?.pending.removeAll()
        pending.forEach { webView.evaluateJavaScript($0, completionHandler: nil) }
        apply(id)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        decisionHandler(url?.scheme == "rotui" && url?.host == "bundle" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        report?("เปิด UI ไม่ได้: \(error.localizedDescription)")
    }
}

private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    private weak var handler: WKScriptMessageHandler?
    init(_ handler: WKScriptMessageHandler) { self.handler = handler }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        handler?.userContentController(userContentController, didReceive: message)
    }
}

private final class UIAssetHandler: NSObject, WKURLSchemeHandler {
    let root: URL
    let overrideRoot: URL
    init(root: URL, overrideRoot: URL) {
        self.root = root.standardizedFileURL
        self.overrideRoot = overrideRoot.standardizedFileURL
    }
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.host == "bundle" else {
            urlSchemeTask.didFailWithError(URLError(.badURL)); return
        }
        let path = url.path
        let rel = String(path.dropFirst())
        let patched = overrideRoot.appendingPathComponent(rel).standardizedFileURL
        let bundled = root.appendingPathComponent(rel).standardizedFileURL
        guard !path.contains("\\") else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let target: URL
        let data: Data
        if patched.path.hasPrefix(overrideRoot.path + "/"), let d = try? Data(contentsOf: patched) {
            target = patched; data = d
        } else if bundled.path.hasPrefix(root.path + "/"), let d = try? Data(contentsOf: bundled) {
            target = bundled; data = d
        } else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let ext = target.pathExtension.lowercased()
        let mime = ["js": "application/javascript", "css": "text/css", "html": "text/html", "json": "application/json", "svg": "image/svg+xml"][ext]
            ?? UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        let encoding = mime.hasPrefix("text/") || ["application/javascript", "application/json", "image/svg+xml"].contains(mime) ? "utf-8" : nil
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: encoding))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

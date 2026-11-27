import SwiftUI
import UIKit
import GLKit
import OpenGLES
import RotCityIOS

final class World3DState: ObservableObject {
    @Published var playerX: Float = 2495.0
    @Published var playerY: Float = -1687.0
    @Published var playerZ: Float = 13.5
    @Published var playerYaw: Float = 0.0
    @Published var cameraYaw: Float = 0.0
    @Published var cameraPitch: Float = 0.32
    @Published var joyX: Float = 0.0
    @Published var joyY: Float = 0.0
    @Published var loadedBuildings: Int = 0
    @Published var loadedPedName: String = "Default Ped"
}

private struct GLMeshBuffer {
    var vao: GLuint = 0
    var vbo: GLuint = 0
    var ebo: GLuint = 0
    var indexCount: GLsizei = 0
    var baseColor: (Float, Float, Float) = (0.78, 0.80, 0.84)
}

private struct WorldBuildingInstance {
    let mesh: GLMeshBuffer
    let x, y, z: Float
    let yaw: Float
}

final class GLES3WorldViewController: GLKViewController {
    let worldState: World3DState

    private var context: EAGLContext?
    private var program: GLuint = 0
    private var uMVP: GLint = -1
    private var uModel: GLint = -1
    private var uTint: GLint = -1

    private var groundMesh = GLMeshBuffer()
    private var pedMeshes: [GLMeshBuffer] = []
    private var hasDffPed = false
    private var buildingInstances: [WorldBuildingInstance] = []
    private var pendingDffLoads: [(RwMesh, Float, Float, Float, Float, Bool)] = []
    private let loadLock = NSLock()
    private var lastTouchPoint: CGPoint?

    init(worldState: World3DState) {
        self.worldState = worldState
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("Use init(worldState:)") }

    override func viewDidLoad() {
        super.viewDidLoad()
        preferredFramesPerSecond = 60

        guard let ctx = EAGLContext(api: .openGLES3), let glkView = view as? GLKView else { return }
        context = ctx
        glkView.context = ctx
        glkView.drawableDepthFormat = .format24
        EAGLContext.setCurrent(ctx)

        setupShaders()
        setupGroundAndFallbackPed()
        loadGtaAssetsInBackground()
    }

    deinit {
        if let ctx = context {
            EAGLContext.setCurrent(ctx)
            deleteMesh(&groundMesh)
            for i in pedMeshes.indices { deleteMesh(&pedMeshes[i]) }
            for i in buildingInstances.indices {
                var m = buildingInstances[i].mesh
                deleteMesh(&m)
            }
            if program != 0 { glDeleteProgram(program) }
        }
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        lastTouchPoint = touches.first?.location(in: view)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let prev = lastTouchPoint else { return }
        let cur = touch.location(in: view)
        let dx = Float(cur.x - prev.x)
        let dy = Float(cur.y - prev.y)
        worldState.cameraYaw -= dx * 0.008
        worldState.cameraPitch = max(0.08, min(1.15, worldState.cameraPitch + dy * 0.006))
        lastTouchPoint = cur
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        lastTouchPoint = nil
    }

    private func loadGtaAssetsInBackground() {
        let gtaDir = GameDataManager.gtaDataDir
        let gta3Img = gtaDir.appendingPathComponent("texdb/gta3.img").path
        let sampImg = gtaDir.appendingPathComponent("texdb/samp.img").path
        let idePath = gtaDir.appendingPathComponent("data/maps/LA/LAe2.ide").path
        let iplPath = gtaDir.appendingPathComponent("data/maps/LA/LAe2.ipl").path

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            // Try loading a real ped DFF from gta3.img or samp.img
            let pedCandidates = ["male01.dff", "wmybmx.dff", "bmybe.dff", "fam1.dff", "ballas1.dff"]
            for candidate in pedCandidates {
                if let data = RwWorldLoader.readImgEntry(imgPath: gta3Img, entryName: candidate)
                    ?? RwWorldLoader.readImgEntry(imgPath: sampImg, entryName: candidate),
                   let mesh = RwWorldLoader.parseDff(data) {
                    self.loadLock.lock()
                    self.pendingDffLoads.append((mesh, 0, 0, 0, 0, true))
                    self.loadLock.unlock()
                    DispatchQueue.main.async { self.worldState.loadedPedName = candidate }
                    break
                }
            }

            // Load nearby Grove Street buildings from LAe2.ide / LAe2.ipl
            let nearby = RwWorldLoader.collectNearbyInstances(
                idePath: idePath,
                iplPath: iplPath,
                origin: (2495.0, -1687.0, 13.5),
                maxDistance: 160.0,
                limit: 36
            )
            var loadedCount = 0
            for inst in nearby {
                if let data = RwWorldLoader.readImgEntry(imgPath: gta3Img, entryName: inst.dffName),
                   let mesh = RwWorldLoader.parseDff(data) {
                    self.loadLock.lock()
                    self.pendingDffLoads.append((mesh, inst.x, inst.y, inst.z, inst.yawRad, false))
                    self.loadLock.unlock()
                    loadedCount += 1
                }
            }
            DispatchQueue.main.async {
                self.worldState.loadedBuildings = loadedCount
            }
        }
    }

    private func flushPendingUploads() {
        loadLock.lock()
        let items = pendingDffLoads
        pendingDffLoads.removeAll()
        loadLock.unlock()

        for (rwMesh, x, y, z, yaw, isPed) in items {
            let glMesh = uploadRwMesh(rwMesh)
            if isPed {
                for i in pedMeshes.indices { deleteMesh(&pedMeshes[i]) }
                pedMeshes = [glMesh]
                hasDffPed = true
            } else {
                buildingInstances.append(WorldBuildingInstance(mesh: glMesh, x: x, y: y, z: z, yaw: yaw))
            }
        }
    }

    override func glkView(_ view: GLKView, drawIn rect: CGRect) {
        if let ctx = context { EAGLContext.setCurrent(ctx) }
        flushPendingUploads()

        // Update player movement from joystick
        let mag = hypotf(worldState.joyX, worldState.joyY)
        if mag > 0.05 {
            let speed: Float = 0.14 * min(1.0, mag)
            let moveAngle = atan2f(worldState.joyX, -worldState.joyY) + worldState.cameraYaw
            worldState.playerYaw = moveAngle
            worldState.playerX += sinf(moveAngle) * speed
            worldState.playerY += cosf(moveAngle) * speed
        }

        // Sunset/twilight sky matching Rot City
        glClearColor(0.11, 0.16, 0.24, 1.0)
        glClear(GLbitfield(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT))
        glEnable(GLenum(GL_DEPTH_TEST))
        glUseProgram(program)

        let aspect = Float(max(1.0, view.bounds.width / max(1.0, view.bounds.height)))
        let proj = GLKMatrix4MakePerspective(GLKMathDegreesToRadians(62), aspect, 0.2, 450.0)

        let px = worldState.playerX
        let py = worldState.playerY
        let pz = worldState.playerZ
        let camDist: Float = 5.5
        let camX = px - sinf(worldState.cameraYaw) * cosf(worldState.cameraPitch) * camDist
        let camY = py - cosf(worldState.cameraYaw) * cosf(worldState.cameraPitch) * camDist
        let camZ = pz + 1.4 + sinf(worldState.cameraPitch) * camDist

        // GTA coordinates use +Z up!
        let viewMat = GLKMatrix4MakeLookAt(camX, camY, camZ, px, py, pz + 0.9, 0, 0, 1)
        let vp = GLKMatrix4Multiply(proj, viewMat)

        // Draw ground centered near player
        let groundModel = GLKMatrix4MakeTranslation(px, py, pz - 0.05)
        drawMesh(groundMesh, model: groundModel, vp: vp, tint: (0.20, 0.24, 0.28))

        // Draw nearby GTA buildings
        for b in buildingInstances {
            var m = GLKMatrix4MakeTranslation(b.x, b.y, b.z)
            m = GLKMatrix4RotateZ(m, b.yaw)
            drawMesh(b.mesh, model: m, vp: vp, tint: (0.76, 0.72, 0.68))
        }

        // Draw player character
        var pedModel = GLKMatrix4MakeTranslation(px, py, pz + (hasDffPed ? 0.95 : 0.0))
        pedModel = GLKMatrix4RotateZ(pedModel, -worldState.playerYaw)
        for part in pedMeshes {
            drawMesh(part, model: pedModel, vp: vp, tint: part.baseColor)
        }
    }

    private func drawMesh(_ mesh: GLMeshBuffer, model: GLKMatrix4, vp: GLKMatrix4, tint: (Float, Float, Float)) {
        guard mesh.vao != 0, mesh.indexCount > 0 else { return }
        var mvp = GLKMatrix4Multiply(vp, model)
        var mdl = model
        withUnsafePointer(to: &mvp.m) { ptr in
            ptr.withMemoryRebound(to: GLfloat.self, capacity: 16) {
                glUniformMatrix4fv(uMVP, 1, GLboolean(GL_FALSE), $0)
            }
        }
        withUnsafePointer(to: &mdl.m) { ptr in
            ptr.withMemoryRebound(to: GLfloat.self, capacity: 16) {
                glUniformMatrix4fv(uModel, 1, GLboolean(GL_FALSE), $0)
            }
        }
        glUniform3f(uTint, tint.0, tint.1, tint.2)
        glBindVertexArray(mesh.vao)
        glDrawElements(GLenum(GL_TRIANGLES), mesh.indexCount, GLenum(GL_UNSIGNED_SHORT), nil)
        glBindVertexArray(0)
    }

    private func setupShaders() {
        let vs = """
        #version 300 es
        layout(location = 0) in vec3 aPos;
        layout(location = 1) in vec3 aNorm;
        uniform mat4 uMVP;
        uniform mat4 uModel;
        out vec3 vNormal;
        void main() {
            vNormal = mat3(uModel) * aNorm;
            gl_Position = uMVP * vec4(aPos, 1.0);
        }
        """
        let fs = """
        #version 300 es
        precision mediump float;
        in vec3 vNormal;
        uniform vec3 uTint;
        out vec4 fragColor;
        void main() {
            vec3 sun = normalize(vec3(0.4, 0.3, 0.85));
            float diff = max(dot(normalize(vNormal), sun), 0.0);
            vec3 color = uTint * (0.42 + 0.58 * diff);
            fragColor = vec4(color, 1.0);
        }
        """
        let vShader = compileShader(GLenum(GL_VERTEX_SHADER), source: vs)
        let fShader = compileShader(GLenum(GL_FRAGMENT_SHADER), source: fs)
        program = glCreateProgram()
        glAttachShader(program, vShader)
        glAttachShader(program, fShader)
        glLinkProgram(program)
        glDeleteShader(vShader)
        glDeleteShader(fShader)

        uMVP = glGetUniformLocation(program, "uMVP")
        uModel = glGetUniformLocation(program, "uModel")
        uTint = glGetUniformLocation(program, "uTint")
    }

    private func compileShader(_ type: GLenum, source: String) -> GLuint {
        let shader = glCreateShader(type)
        source.withCString { cStr in
            var p: UnsafePointer<GLchar>? = cStr
            glShaderSource(shader, 1, &p, nil)
        }
        glCompileShader(shader)
        return shader
    }

    private func setupGroundAndFallbackPed() {
        groundMesh = createBoxMesh(sx: 240, sy: 240, sz: 0.1, cz: -0.05, color: (0.20, 0.24, 0.28))
        pedMeshes = [
            createBoxMesh(sx: 0.42, sy: 0.26, sz: 0.65, cz: 1.05, color: (0.14, 0.16, 0.20)), // hoodie torso
            createBoxMesh(sx: 0.26, sy: 0.26, sz: 0.28, cz: 1.54, color: (0.20, 0.55, 0.90)), // head/hair
            createBoxMesh(sx: 0.36, sy: 0.22, sz: 0.72, cz: 0.36, color: (0.12, 0.12, 0.14))  // legs
        ]
    }

    private func uploadRwMesh(_ rw: RwMesh) -> GLMeshBuffer {
        var flat: [GLfloat] = []
        flat.reserveCapacity(rw.vertices.count * 6)
        for v in rw.vertices {
            flat.append(v.x); flat.append(v.y); flat.append(v.z)
            flat.append(v.nx); flat.append(v.ny); flat.append(v.nz)
        }
        return uploadInterleaved(vertices: flat, indices: rw.indices, color: (0.78, 0.80, 0.84))
    }

    private func createBoxMesh(sx: Float, sy: Float, sz: Float, cz: Float, color: (Float, Float, Float)) -> GLMeshBuffer {
        let hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5
        let z0 = cz - hz, z1 = cz + hz
        let v: [GLfloat] = [
            -hx,-hy,z1, 0,0,1,   hx,-hy,z1, 0,0,1,   hx, hy,z1, 0,0,1,  -hx, hy,z1, 0,0,1,
            -hx,-hy,z0, 0,0,-1,  hx,-hy,z0, 0,0,-1,  hx, hy,z0, 0,0,-1, -hx, hy,z0, 0,0,-1,
            -hx,-hy,z0, 0,-1,0,  hx,-hy,z0, 0,-1,0,  hx,-hy,z1, 0,-1,0, -hx,-hy,z1, 0,-1,0,
            -hx, hy,z0, 0,1,0,   hx, hy,z0, 0,1,0,   hx, hy,z1, 0,1,0,  -hx, hy,z1, 0,1,0,
            -hx,-hy,z0,-1,0,0,  -hx, hy,z0,-1,0,0,  -hx, hy,z1,-1,0,0, -hx,-hy,z1,-1,0,0,
             hx,-hy,z0, 1,0,0,   hx, hy,z0, 1,0,0,   hx, hy,z1, 1,0,0,  hx,-hy,z1, 1,0,0
        ]
        let idx: [UInt16] = [
            0,1,2, 0,2,3,  4,6,5, 4,7,6,
            8,9,10, 8,10,11,  12,14,13, 12,15,14,
            16,17,18, 16,18,19,  20,22,21, 20,23,22
        ]
        return uploadInterleaved(vertices: v, indices: idx, color: color)
    }

    private func uploadInterleaved(vertices: [GLfloat], indices: [UInt16], color: (Float, Float, Float)) -> GLMeshBuffer {
        var m = GLMeshBuffer()
        m.baseColor = color
        m.indexCount = GLsizei(indices.count)

        glGenVertexArrays(1, &m.vao)
        glGenBuffers(1, &m.vbo)
        glGenBuffers(1, &m.ebo)

        glBindVertexArray(m.vao)
        glBindBuffer(GLenum(GL_ARRAY_BUFFER), m.vbo)
        vertices.withUnsafeBytes { ptr in
            glBufferData(GLenum(GL_ARRAY_BUFFER), ptr.count, ptr.baseAddress, GLenum(GL_STATIC_DRAW))
        }
        glBindBuffer(GLenum(GL_ELEMENT_ARRAY_BUFFER), m.ebo)
        indices.withUnsafeBytes { ptr in
            glBufferData(GLenum(GL_ELEMENT_ARRAY_BUFFER), ptr.count, ptr.baseAddress, GLenum(GL_STATIC_DRAW))
        }

        let stride = GLsizei(6 * MemoryLayout<GLfloat>.size)
        glEnableVertexAttribArray(0)
        glVertexAttribPointer(0, 3, GLenum(GL_FLOAT), GLboolean(GL_FALSE), stride, nil)
        glEnableVertexAttribArray(1)
        glVertexAttribPointer(1, 3, GLenum(GL_FLOAT), GLboolean(GL_FALSE), stride, UnsafeRawPointer(bitPattern: 3 * MemoryLayout<GLfloat>.size))
        glBindVertexArray(0)
        return m
    }

    private func deleteMesh(_ m: inout GLMeshBuffer) {
        if m.ebo != 0 { glDeleteBuffers(1, &m.ebo); m.ebo = 0 }
        if m.vbo != 0 { glDeleteBuffers(1, &m.vbo); m.vbo = 0 }
        if m.vao != 0 { glDeleteVertexArrays(1, &m.vao); m.vao = 0 }
    }
}

struct GLES3RenderView: UIViewControllerRepresentable {
    @ObservedObject var worldState: World3DState

    func makeUIViewController(context: Context) -> GLES3WorldViewController {
        GLES3WorldViewController(worldState: worldState)
    }

    func updateUIViewController(_ uiViewController: GLES3WorldViewController, context: Context) {}
}

struct VirtualJoystickView: View {
    @ObservedObject var worldState: World3DState
    @State private var knobOffset: CGSize = .zero
    private let radius: CGFloat = 46

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.black.opacity(0.35))
                .frame(width: radius * 2, height: radius * 2)
                .overlay(Circle().stroke(Color.white.opacity(0.28), lineWidth: 1.5))

            Circle()
                .fill(Color.white.opacity(0.65))
                .frame(width: 36, height: 36)
                .offset(knobOffset)
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    let dx = value.translation.width
                    let dy = value.translation.height
                    let dist = hypot(dx, dy)
                    let clamped = min(dist, radius)
                    let angle = atan2(dy, dx)
                    let nx = cos(angle) * clamped
                    let ny = sin(angle) * clamped
                    knobOffset = CGSize(width: nx, height: ny)
                    worldState.joyX = Float(nx / radius)
                    worldState.joyY = Float(ny / radius)
                }
                .onEnded { _ in
                    knobOffset = .zero
                    worldState.joyX = 0
                    worldState.joyY = 0
                }
        )
    }
}

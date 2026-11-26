// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RotCityIOS",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RotCityIOS", targets: ["RotCityIOS"]),
    ],
    targets: [
        .target(name: "RotCityIOS", path: "Sources/RotCityIOS"),
    ]
)

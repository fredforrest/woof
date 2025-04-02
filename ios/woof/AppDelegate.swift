import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore // Required for Firebase initialization
import GoogleSignIn // Required for Google Sign-In
import FBSDKCoreKit // Required for Facebook SDK (if applicable)

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    // Initialize Firebase
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    // Initialize Facebook SDK (if applicable)
    ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)

    self.moduleName = "woof"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Handle URL callbacks for Google Sign-In and other SDKs
  override func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    // Handle Facebook SDK URL (if applicable)
    let handledByFacebook = ApplicationDelegate.shared.application(app, open: url, options: options)

    // Handle Google Sign-In URL
    let handledByGoogle = GIDSignIn.sharedInstance.handle(url)

    return handledByFacebook || handledByGoogle
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
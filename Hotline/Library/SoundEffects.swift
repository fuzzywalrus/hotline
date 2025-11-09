import Foundation
import AppKit

enum SoundEffect: String {
  case loggedIn = "logged-in"
  case chatMessage = "chat-message"
  case transferComplete = "transfer-complete"
  case userLogin = "user-login"
  case userLogout = "user-logout"
  case newNews = "new-news"
  case serverMessage = "server-message"
  case error = "error"
  
  static var all: [SoundEffect] = [.loggedIn, .chatMessage, .transferComplete, .userLogin, .userLogout, .newNews, .serverMessage, .error]
}

@Observable
class SoundEffects {
  static let shared = SoundEffects()
  
  private var preloadedSounds: [SoundEffect: NSSound] = [:]
  
  private init() {
    // Preload sound effects
    for effect in SoundEffect.all {
      if let soundFileURL = Bundle.main.url(forResource: effect.rawValue, withExtension: "aiff"),
         let sound = NSSound(contentsOf: soundFileURL, byReference: true) {
        sound.volume = 0.75
        self.preloadedSounds[effect] = sound
      }
    }
  }
  
  static func play(_ name: SoundEffect) {
    Self.shared.play(name)
  }
  
  func play(_ name: SoundEffect) {
    self.preloadedSounds[name]?.play()
  }
}
